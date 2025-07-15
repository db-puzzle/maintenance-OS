<?php

namespace App\Services;

use App\Models\WorkOrders\WorkOrder;
use App\Models\WorkOrders\WorkOrderExecution;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PDFGeneratorService
{
    /**
     * Generate PDF for a single work order execution
     */
    public function generateExecutionReport(
        WorkOrderExecution $execution,
        array $options = []
    ): string {
        $workOrder = $execution->workOrder;
        
        // Get task responses
        $taskResponses = $execution->taskResponses()
            ->with(['task', 'attachments'])
            ->get()
            ->map(function ($response) {
                return [
                    'task' => $response->task->description ?? '',
                    'type' => $response->task->type ?? 'text',
                    'response' => $this->formatResponse($response),
                    'completed_at' => $response->completed_at,
                ];
            })
            ->toArray();

        // Generate HTML content
        $html = $this->generateExecutionReportHtml($workOrder, $execution, $taskResponses, $options);

        // Create PDF
        $pdf = Pdf::loadHTML($html);
        $pdf->setPaper('A4', 'portrait');

        // Generate filename
        $filename = $this->generateFilename($workOrder, 'execution-report');

        // Store PDF
        $path = "exports/work-orders/{$filename}";
        Storage::put($path, $pdf->output());

        return $path;
    }

    /**
     * Generate HTML for execution report
     */
    private function generateExecutionReportHtml(
        WorkOrder $workOrder,
        WorkOrderExecution $execution,
        array $taskResponses,
        array $options
    ): string {
        $includePhotos = $options['include_photos'] ?? false;
        $includeSignatures = $options['include_signatures'] ?? true;

        $html = '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    font-size: 12px;
                }
                .header {
                    border-bottom: 2px solid #333;
                    padding-bottom: 20px;
                    margin-bottom: 20px;
                }
                .header h1 {
                    margin: 0;
                    font-size: 24px;
                    color: #333;
                }
                .header .subtitle {
                    color: #666;
                    font-size: 14px;
                    margin-top: 5px;
                }
                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 15px;
                    margin-bottom: 30px;
                }
                .info-item {
                    border: 1px solid #ddd;
                    padding: 10px;
                    border-radius: 4px;
                }
                .info-item label {
                    font-weight: bold;
                    color: #666;
                    display: block;
                    margin-bottom: 5px;
                }
                .section {
                    margin-bottom: 30px;
                }
                .section-title {
                    font-size: 18px;
                    font-weight: bold;
                    color: #333;
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 10px;
                    margin-bottom: 15px;
                }
                .task-item {
                    margin-bottom: 20px;
                    padding: 15px;
                    border: 1px solid #e0e0e0;
                    border-radius: 4px;
                    page-break-inside: avoid;
                }
                .task-description {
                    font-weight: bold;
                    margin-bottom: 10px;
                    color: #333;
                }
                .task-response {
                    background-color: #f5f5f5;
                    padding: 10px;
                    border-radius: 4px;
                    margin-top: 5px;
                }
                .measurement {
                    font-size: 16px;
                    font-weight: bold;
                    color: #2196F3;
                }
                .footer {
                    margin-top: 50px;
                    padding-top: 20px;
                    border-top: 1px solid #ddd;
                }
                .signature-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 50px;
                    margin-top: 30px;
                }
                .signature-box {
                    text-align: center;
                }
                .signature-line {
                    border-bottom: 1px solid #333;
                    margin-bottom: 5px;
                    height: 40px;
                }
                .signature-label {
                    font-size: 11px;
                    color: #666;
                }
                @page {
                    margin: 2cm;
                }
                .page-break {
                    page-break-after: always;
                }
            </style>
        </head>
        <body>';

        // Header
        $html .= '
        <div class="header">
            <h1>Relatório de Execução - Ordem de Serviço</h1>
            <div class="subtitle">WO #' . $workOrder->work_order_number . '</div>
        </div>';

        // Work Order Information
        $html .= '
        <div class="info-grid">
            <div class="info-item">
                <label>Ordem de Serviço:</label>
                ' . $workOrder->work_order_number . '
            </div>
            <div class="info-item">
                <label>Status:</label>
                ' . ucfirst($workOrder->status) . '
            </div>
            <div class="info-item">
                <label>Título:</label>
                ' . htmlspecialchars($workOrder->title) . '
            </div>
            <div class="info-item">
                <label>Ativo:</label>
                ' . ($workOrder->asset->tag ?? 'N/A') . ' - ' . ($workOrder->asset->name ?? '') . '
            </div>
            <div class="info-item">
                <label>Executado por:</label>
                ' . ($execution->executedBy->name ?? 'N/A') . '
            </div>
            <div class="info-item">
                <label>Data de Execução:</label>
                ' . ($execution->completed_at ? $execution->completed_at->format('d/m/Y H:i') : 'Em andamento') . '
            </div>
        </div>';

        // Task Responses
        if (!empty($taskResponses)) {
            $html .= '
            <div class="section">
                <div class="section-title">Tarefas Executadas</div>';

            foreach ($taskResponses as $index => $response) {
                $html .= '
                <div class="task-item">
                    <div class="task-description">' . ($index + 1) . '. ' . htmlspecialchars($response['task']) . '</div>
                    <div class="task-response">';

                if ($response['type'] === 'measurement') {
                    $html .= '<span class="measurement">' . htmlspecialchars($response['response']) . '</span>';
                } else {
                    $html .= htmlspecialchars($response['response']);
                }

                $html .= '</div>
                </div>';
            }

            $html .= '</div>';
        }

        // Work Summary
        if ($execution->work_performed || $execution->observations) {
            $html .= '
            <div class="section">
                <div class="section-title">Resumo do Trabalho</div>';

            if ($execution->work_performed) {
                $html .= '
                <div class="info-item">
                    <label>Trabalho Realizado:</label>
                    ' . nl2br(htmlspecialchars($execution->work_performed)) . '
                </div>';
            }

            if ($execution->observations) {
                $html .= '
                <div class="info-item">
                    <label>Observações:</label>
                    ' . nl2br(htmlspecialchars($execution->observations)) . '
                </div>';
            }

            $html .= '</div>';
        }

        // Signatures
        if ($includeSignatures) {
            $html .= '
            <div class="footer">
                <div class="signature-grid">
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div class="signature-label">Executado por: ' . ($execution->executedBy->name ?? '') . '</div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div class="signature-label">Verificado por: _________________</div>
                    </div>
                </div>
            </div>';
        }

        $html .= '
        </body>
        </html>';

        return $html;
    }

    /**
     * Generate batch report for multiple work orders
     */
    public function generateBatchReport(array $workOrderIds, array $options = []): string
    {
        $workOrders = WorkOrder::whereIn('id', $workOrderIds)
            ->with(['asset', 'execution.executedBy', 'execution.taskResponses'])
            ->get();

        if ($workOrders->isEmpty()) {
            throw new \Exception('No work orders found for the provided IDs');
        }

        // Generate HTML for batch report
        $html = $this->generateBatchReportHtml($workOrders, $options);

        // Create PDF
        $pdf = Pdf::loadHTML($html);
        $pdf->setPaper('A4', 'portrait');

        // Generate filename
        $filename = 'batch-report-' . now()->format('Y-m-d-His') . '.pdf';

        // Store PDF
        $path = "exports/work-orders/batch/{$filename}";
        Storage::put($path, $pdf->output());

        return $path;
    }

    /**
     * Generate HTML for batch report
     */
    private function generateBatchReportHtml($workOrders, array $options): string
    {
        $html = '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    font-size: 11px;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                }
                .header h1 {
                    margin: 0;
                    font-size: 20px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }
                th {
                    background-color: #f5f5f5;
                    font-weight: bold;
                }
                .summary {
                    margin-top: 30px;
                    padding: 15px;
                    background-color: #f5f5f5;
                    border-radius: 4px;
                }
                .page-break {
                    page-break-after: always;
                }
            </style>
        </head>
        <body>';

        // Header
        $html .= '
        <div class="header">
            <h1>Relatório de Ordens de Serviço</h1>
            <p>Período: ' . now()->format('d/m/Y H:i') . '</p>
        </div>';

        // Summary
        $totalCount = $workOrders->count();
        $completedCount = $workOrders->where('status', 'completed')->count();
        $inProgressCount = $workOrders->where('status', 'in_progress')->count();

        $html .= '
        <div class="summary">
            <h3>Resumo</h3>
            <p>Total de Ordens: ' . $totalCount . '</p>
            <p>Concluídas: ' . $completedCount . '</p>
            <p>Em Andamento: ' . $inProgressCount . '</p>
        </div>';

        // Work Orders Table
        $html .= '
        <table>
            <thead>
                <tr>
                    <th>WO #</th>
                    <th>Título</th>
                    <th>Ativo</th>
                    <th>Status</th>
                    <th>Executado por</th>
                    <th>Data</th>
                </tr>
            </thead>
            <tbody>';

        foreach ($workOrders as $workOrder) {
            $html .= '
            <tr>
                <td>' . $workOrder->work_order_number . '</td>
                <td>' . htmlspecialchars($workOrder->title) . '</td>
                <td>' . ($workOrder->asset->tag ?? 'N/A') . '</td>
                <td>' . ucfirst($workOrder->status) . '</td>
                <td>' . ($workOrder->execution->executedBy->name ?? 'N/A') . '</td>
                <td>' . ($workOrder->actual_end_date ? $workOrder->actual_end_date->format('d/m/Y') : '-') . '</td>
            </tr>';
        }

        $html .= '
            </tbody>
        </table>';

        $html .= '
        </body>
        </html>';

        return $html;
    }

    /**
     * Generate CSV export for work orders
     */
    public function generateCSVExport(array $workOrderIds): string
    {
        $workOrders = WorkOrder::whereIn('id', $workOrderIds)
            ->with(['asset', 'execution.executedBy'])
            ->get();

        $csvData = [];
        $csvData[] = ['WO Number', 'Title', 'Asset', 'Status', 'Executed By', 'Start Date', 'End Date'];

        foreach ($workOrders as $workOrder) {
            $csvData[] = [
                $workOrder->work_order_number,
                $workOrder->title,
                $workOrder->asset->tag ?? 'N/A',
                $workOrder->status,
                $workOrder->execution->executedBy->name ?? 'N/A',
                $workOrder->actual_start_date ? $workOrder->actual_start_date->format('Y-m-d H:i') : '',
                $workOrder->actual_end_date ? $workOrder->actual_end_date->format('Y-m-d H:i') : '',
            ];
        }

        $filename = 'work-orders-export-' . now()->format('Y-m-d-His') . '.csv';
        $path = "exports/work-orders/csv/{$filename}";

        $handle = fopen('php://temp', 'r+');
        foreach ($csvData as $row) {
            fputcsv($handle, $row);
        }
        rewind($handle);
        $content = stream_get_contents($handle);
        fclose($handle);

        Storage::put($path, $content);

        return $path;
    }

    /**
     * Format response based on type
     */
    private function formatResponse($response): string
    {
        if (!$response->response && !$response->response_data) {
            return 'N/A';
        }

        $taskType = $response->getTaskType();

        switch ($taskType) {
            case 'measurement':
                $config = $response->getTaskConfiguration();
                $value = $response->response ?? $response->response_data['value'] ?? '';
                $unit = $config['unit'] ?? '';
                return $value . ' ' . $unit;

            case 'multiple_choice':
            case 'multiple_select':
                if (is_array($response->response_data)) {
                    return implode(', ', $response->response_data);
                }
                return $response->response ?? '';

            case 'photo':
                return $response->attachments->count() . ' foto(s) anexada(s)';

            default:
                return $response->response ?? '';
        }
    }

    /**
     * Generate filename
     */
    private function generateFilename(WorkOrder $workOrder, string $type): string
    {
        $slug = Str::slug($workOrder->work_order_number);
        $timestamp = now()->format('Y-m-d-His');

        return "{$type}-{$slug}-{$timestamp}.pdf";
    }
}
