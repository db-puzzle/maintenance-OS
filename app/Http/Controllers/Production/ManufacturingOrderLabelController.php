<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\ManufacturingOrder;
use App\Services\Production\ManufacturingOrderLabelService;
use Illuminate\Http\Request;

class ManufacturingOrderLabelController extends Controller
{
    private ManufacturingOrderLabelService $labelService;

    public function __construct(ManufacturingOrderLabelService $labelService)
    {
        $this->labelService = $labelService;
    }

    /**
     * Generate a label for a manufacturing order.
     */
    public function generate(ManufacturingOrder $order, Request $request)
    {
        \Log::info('=== LABEL GENERATION START ===');
        \Log::info('Label generation requested', [
            'order_id' => $order->id,
            'order_number' => $order->order_number,
            'size' => $request->input('size', 'standard'),
            'download' => $request->input('download', false),
            'url' => $request->fullUrl(),
            'method' => $request->method(),
            'is_ajax' => $request->ajax(),
            'wants_json' => $request->wantsJson(),
            'accept_header' => $request->header('Accept'),
            'x_inertia' => $request->header('X-Inertia'),
            'user_agent' => $request->userAgent(),
        ]);

        \Log::info('About to authorize');
        $this->authorize('view', $order);
        \Log::info('Authorization passed');

        \Log::info('About to validate', [
            'size_param' => $request->input('size'),
            'download_param' => $request->input('download'),
            'all_params' => $request->all(),
        ]);

        $validated = $request->validate([
            'size' => 'nullable|in:standard,large,small',
            'download' => 'nullable|string|in:true,false',
            '_t' => 'nullable', // timestamp for cache busting
        ]);

        \Log::info('Validation passed', ['validated' => $validated]);

        try {
            \Log::info('About to generate PDF');

            $pdf = $this->labelService->generateLabel($order, [
                'size' => $validated['size'] ?? 'standard',
            ]);

            \Log::info('PDF generated successfully', [
                'order_id' => $order->id,
                'pdf_size' => strlen($pdf),
                'is_valid_pdf' => substr($pdf, 0, 4) === '%PDF',
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to generate label', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Return a simple error response that won't trigger Inertia
            return response('Failed to generate label: ' . $e->getMessage(), 500)
                ->header('Content-Type', 'text/plain');
        }

        $headers = [
            'Content-Type' => 'application/pdf',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ];

        // Check if download is requested (handle both boolean and string)
        $shouldDownload = filter_var($request->input('download', false), FILTER_VALIDATE_BOOLEAN);

        if ($shouldDownload) {
            $headers['Content-Disposition'] = 'attachment; filename="MO-' . $order->order_number . '-label.pdf"';
            \Log::info('Returning PDF as download');
        } else {
            $headers['Content-Disposition'] = 'inline; filename="MO-' . $order->order_number . '-label.pdf"';
            \Log::info('Returning PDF as inline');
        }

        \Log::info('Creating response with headers', ['headers' => $headers]);

        return response($pdf, 200, $headers);
    }

    /**
     * Generate labels for multiple orders.
     */
    public function generateBatch(Request $request)
    {
        $validated = $request->validate([
            'order_ids' => 'required|array|min:1',
            'order_ids.*' => 'exists:manufacturing_orders,id',
            'size' => 'in:standard,large,small',
        ]);

        $orders = ManufacturingOrder::whereIn('id', $validated['order_ids'])
            ->get()
            ->filter(function ($order) {
                return auth()->user()->can('view', $order);
            });

        if ($orders->isEmpty()) {
            return response()->json(['message' => 'No authorized orders found'], 403);
        }

        $pdf = $this->labelService->generateBatchLabels($orders->all(), [
            'size' => $validated['size'] ?? 'standard',
        ]);

        return response($pdf)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'attachment; filename="MO-labels-batch.pdf"');
    }
}
