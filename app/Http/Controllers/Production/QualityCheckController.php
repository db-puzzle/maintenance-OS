<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\ManufacturingStepExecution;
use App\Models\Production\ManufacturingOrder;
use App\Services\Production\ManufacturingOrderService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class QualityCheckController extends Controller
{
    protected ManufacturingOrderService $orderService;

    public function __construct(ManufacturingOrderService $orderService)
    {
        $this->orderService = $orderService;
    }

    /**
     * Display a listing of quality checks.
     */
    public function index(Request $request)
    {
        $this->authorize('production.quality.executeCheck');

        $qualityChecks = ManufacturingStepExecution::with([
            'manufacturingStep.manufacturingRoute.manufacturingOrder.item',
            'workCell',
            'executedBy',
        ])
        ->qualityChecks()
        ->when($request->status, function ($query, $status) {
            $query->where('status', $status);
        })
        ->when($request->quality_result, function ($query, $result) {
            $query->where('quality_result', $result);
        })
        ->when($request->work_cell_id, function ($query, $workCellId) {
            $query->where('work_cell_id', $workCellId);
        })
        ->when($request->date_from, function ($query, $dateFrom) {
            $query->whereDate('created_at', '>=', $dateFrom);
        })
        ->when($request->date_to, function ($query, $dateTo) {
            $query->whereDate('created_at', '<=', $dateTo);
        })
        ->orderBy('created_at', 'desc')
        ->paginate(20)
        ->withQueryString();

        // Method temporarily disabled - page not implemented yet
        return response()->json(["message" => "This feature is not yet implemented"], 501);
    }

    /**
     * Display pending quality checks.
     */
    public function pending(Request $request)
    {
        $this->authorize('production.quality.executeCheck');

        $pendingChecks = ManufacturingStep::with([
            'manufacturingRoute.manufacturingOrder.item',
            'workCell',
            'executions' => function ($query) {
                $query->where('status', 'in_progress')
                    ->whereNull('quality_result');
            },
        ])
        ->qualityChecks()
        ->whereIn('status', ['queued', 'in_progress'])
        ->when($request->work_cell_id, function ($query, $workCellId) {
            $query->where('work_cell_id', $workCellId);
        })
        ->orderBy('step_number')
        ->get();

        // Method temporarily disabled - page not implemented yet
        return response()->json(["message" => "This feature is not yet implemented"], 501);
    }

    /**
     * Record quality check result.
     */
    public function recordResult(Request $request, ManufacturingStepExecution $execution)
    {
        $this->authorize('production.quality.recordResult');

        if (!$execution->isQualityCheck()) {
            return back()->with('error', 'This execution is not a quality check.');
        }

        $validated = $request->validate([
            'quality_result' => 'required|in:passed,failed',
            'quality_notes' => 'nullable|string|max:1000',
            'measurements' => 'nullable|array',
            'measurements.*.parameter' => 'required|string',
            'measurements.*.value' => 'required|numeric',
            'measurements.*.unit' => 'required|string',
            'defects' => 'nullable|array',
            'defects.*.type' => 'required|string',
            'defects.*.description' => 'required|string',
            'defects.*.severity' => 'required|in:minor,major,critical',
        ]);

        try {
            // Complete the execution with quality result
            $this->orderService->completeExecution($execution, [
                'quality_result' => $validated['quality_result'],
                'quality_notes' => $validated['quality_notes'] ?? null,
            ]);

            // Store additional quality data if needed
            if (isset($validated['measurements']) || isset($validated['defects'])) {
                // This would store detailed quality data in a separate table
                // For now, we'll include it in the notes
                $detailedData = json_encode([
                    'measurements' => $validated['measurements'] ?? [],
                    'defects' => $validated['defects'] ?? [],
                ]);
                $execution->update(['quality_notes' => $execution->quality_notes . "\nData: " . $detailedData]);
            }

            if ($validated['quality_result'] === 'failed') {
                return redirect()->route('production.quality.rework-decision', $execution)
                    ->with('warning', 'Quality check failed. Please select rework action.');
            }

            return redirect()->route('production.quality.index')
                ->with('success', 'Quality check result recorded successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Display rework decision form.
     */
    public function reworkDecision(ManufacturingStepExecution $execution)
    {
        $this->authorize('production.quality.initiateRework');

        if ($execution->quality_result !== 'failed' || $execution->failure_action) {
            return redirect()->route('production.quality.index')
                ->with('error', 'Invalid execution for rework decision.');
        }

        $execution->load([
            'manufacturingStep.manufacturingRoute.manufacturingOrder.item',
            'workCell',
            'executedBy',
        ]);

        // Method temporarily disabled - page not implemented yet
        return response()->json(["message" => "This feature is not yet implemented"], 501);
    }

    /**
     * Handle rework decision.
     */
    public function handleRework(Request $request, ManufacturingStepExecution $execution)
    {
        $this->authorize('production.quality.initiateRework');

        if ($execution->quality_result !== 'failed' || $execution->failure_action) {
            return back()->with('error', 'Invalid execution for rework decision.');
        }

        $validated = $request->validate([
            'failure_action' => 'required|in:scrap,rework',
            'reason' => 'required|string|max:500',
        ]);

        try {
            $this->orderService->handleQualityFailure($execution, $validated['failure_action']);
            
            // Add reason to notes
            $execution->update([
                'quality_notes' => $execution->quality_notes . "\nAction: " . $validated['failure_action'] . " - " . $validated['reason'],
            ]);

            if ($validated['failure_action'] === 'scrap') {
                return redirect()->route('production.quality.index')
                    ->with('success', 'Part marked as scrapped.');
            } else {
                return redirect()->route('production.quality.index')
                    ->with('success', 'Rework process initiated.');
            }
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Display quality metrics dashboard.
     */
    public function metrics(Request $request)
    {
        $this->authorize('production.reports.viewQualityMetrics');

        $dateFrom = $request->date_from ?? now()->subDays(30)->format('Y-m-d');
        $dateTo = $request->date_to ?? now()->format('Y-m-d');

        // Get quality metrics
        $totalChecks = ManufacturingStepExecution::qualityChecks()
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->count();

        $passedChecks = ManufacturingStepExecution::qualityChecks()
            ->where('quality_result', 'passed')
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->count();

        $failedChecks = ManufacturingStepExecution::qualityChecks()
            ->where('quality_result', 'failed')
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->count();

        $scrappedParts = ManufacturingStepExecution::qualityChecks()
            ->where('quality_result', 'failed')
            ->where('failure_action', 'scrap')
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->count();

        $reworkedParts = ManufacturingStepExecution::qualityChecks()
            ->where('quality_result', 'failed')
            ->where('failure_action', 'rework')
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->count();

        // Get quality trends by day
        $qualityTrends = ManufacturingStepExecution::qualityChecks()
            ->selectRaw('DATE(created_at) as date')
            ->selectRaw('COUNT(*) as total')
            ->selectRaw('SUM(CASE WHEN quality_result = ? THEN 1 ELSE 0 END) as passed', ['passed'])
            ->selectRaw('SUM(CASE WHEN quality_result = ? THEN 1 ELSE 0 END) as failed', ['failed'])
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Get quality by work cell
        $qualityByWorkCell = ManufacturingStepExecution::qualityChecks()
            ->with('workCell')
            ->selectRaw('work_cell_id')
            ->selectRaw('COUNT(*) as total')
            ->selectRaw('SUM(CASE WHEN quality_result = ? THEN 1 ELSE 0 END) as passed', ['passed'])
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->groupBy('work_cell_id')
            ->get();

        // Method temporarily disabled - page not implemented yet
        return response()->json(["message" => "This feature is not yet implemented"], 501);
    }
}