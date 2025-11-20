<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\Item;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingStepExecution;
use App\Models\QrScanLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Jenssegers\Agent\Agent;

class QrCodeController extends Controller
{
    public function __construct()
    {
        // Authentication is handled in methods to allow proper redirect
    }

    public function handleItemScan(Request $request, string $itemNumber)
    {
        // Check authentication and redirect if needed
        if (! auth()->check()) {
            return redirect()->guest(route('login'))->with('url.intended', $request->fullUrl());
        }

        $item = Item::where('item_number', $itemNumber)->firstOrFail();

        // Log the scan
        $this->logScan($request, 'item', $itemNumber);

        // Check if request is from in-app scanner
        if ($this->isInAppRequest($request)) {
            // Return data for in-app navigation
            return response()->json([
                'type' => 'item',
                'redirect' => route('production.items.show', $item),
                'data' => $item,
            ]);
        }

        // Return mobile-optimized Inertia page
        return Inertia::render('production/qr/ItemScan', [
            'item' => $item->load(['category', 'primaryBom']),
            'can' => [
                'view' => $request->user()?->can('view', $item) ?? false,
                'update' => $request->user()?->can('update', $item) ?? false,
                'execute_steps' => $request->user()?->can('production.steps.execute') ?? false,
            ],
            'actions' => $this->getAvailableActions($request->user(), $item),
        ]);
    }

    public function handleOrderScan(Request $request, string $orderNumber)
    {
        // Check authentication and redirect if needed
        if (! auth()->check()) {
            return redirect()->guest(route('login'))->with('url.intended', $request->fullUrl());
        }

        $order = ManufacturingOrder::where('order_number', $orderNumber)
            ->with(['item.media', 'manufacturingRoute.steps' => function ($query) {
                $query->with(['executions' => function ($q) {
                    $q->orderBy('id', 'desc')->limit(1);
                }]);
            }, 'children'])
            ->firstOrFail();

        // Log the scan
        $this->logScan($request, 'order', $orderNumber);

        // Get current active step execution
        $activeExecution = ManufacturingStepExecution::where('manufacturing_order_id', $order->id)
            ->whereIn('status', ['in_progress', 'queued'])
            ->with(['manufacturingStep', 'media'])
            ->orderBy('manufacturing_step_id')
            ->first();

        // Detect if mobile/tablet for appropriate view
        $agent = new Agent;
        $agent->setUserAgent($request->userAgent());
        $isMobile = $agent->isMobile() || $agent->isTablet();

        if ($isMobile || $request->input('mobile')) {
            // Render mobile-optimized page with MOStepActionDialog
            return Inertia::render('qr/manufacturing-order-mobile', [
                'order' => $order,
                'activeStepId' => $activeExecution?->manufacturing_step_id,
                'canExecuteSteps' => $request->user()->can('production.steps.execute'),
                'isMobile' => true,
            ]);
        }

        // Desktop users get redirected to production reporting page
        return redirect()->route('production.reporting.index', [
            'selected_mo' => $order->id,
            'active_step' => $activeExecution?->manufacturing_step_id,
        ]);
    }

    private function logScan(Request $request, string $type, string $resourceId): void
    {
        $agent = new Agent;
        $agent->setUserAgent($request->userAgent());

        QrScanLog::create([
            'resource_type' => $type,
            'resource_id' => $resourceId,
            'user_id' => $request->user()?->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'device_type' => $agent->isMobile() ? 'mobile' : ($agent->isTablet() ? 'tablet' : 'desktop'),
            'in_app' => $this->isInAppRequest($request),
            'metadata' => [
                'referer' => $request->header('referer'),
                'platform' => $agent->platform(),
                'browser' => $agent->browser(),
            ],
            'scanned_at' => now(),
        ]);
    }

    private function isInAppRequest(Request $request): bool
    {
        // Check for custom header set by in-app scanner
        return $request->hasHeader('X-App-Scanner') ||
               $request->expectsJson() ||
               str_contains($request->userAgent() ?? '', 'AppWebView');
    }

    private function getAvailableActions($user, Item $item): array
    {
        $actions = [];

        if ($user?->can('production.orders.create')) {
            $actions[] = [
                'label' => 'Criar Ordem de Manufatura',
                'route' => route('production.orders.create', ['item_id' => $item->id]),
                'icon' => 'Factory',
            ];
        }

        if ($item->primaryBom && $user?->can('view', $item->primaryBom)) {
            $actions[] = [
                'label' => 'Ver BOM',
                'route' => route('production.bom.show', $item->primaryBom),
                'icon' => 'Package',
            ];
        }

        return $actions;
    }

    private function getAvailableOrderActions($user, ManufacturingOrder $order): array
    {
        $actions = [];
        $currentStep = $order->getCurrentStep();

        if ($currentStep && $user?->can('production.steps.execute')) {
            $actions[] = [
                'label' => $currentStep->status === 'pending' ? 'Iniciar Etapa' : 'Concluir Etapa',
                'route' => route('production.steps.execute', $currentStep),
                'icon' => 'Play',
                'primary' => true,
            ];
        }

        if ($currentStep && $currentStep->step_type === 'quality_check' && $user?->can('production.quality.executeCheck')) {
            $actions[] = [
                'label' => 'Executar Verificação de Qualidade',
                'route' => route('production.steps.execute', $currentStep),
                'icon' => 'CheckCircle',
            ];
        }

        return $actions;
    }
}
