<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Batch Execution Report</title>
    <style>
        @page { margin: 2cm; }
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.4;
            color: #333;
        }
        .header { 
            border-bottom: 2px solid #333; 
            margin-bottom: 30px; 
            padding-bottom: 20px;
            text-align: center;
        }
        .logo { max-width: 200px; margin-bottom: 10px; }
        .summary { 
            background: #f8f9fa; 
            padding: 20px; 
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .summary table {
            width: 100%;
            border-collapse: collapse;
        }
        .summary td {
            padding: 8px 12px;
            border-bottom: 1px solid #dee2e6;
        }
        .summary td:first-child {
            font-weight: bold;
            width: 30%;
        }
        .execution-item { 
            margin: 20px 0; 
            page-break-inside: avoid;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            overflow: hidden;
        }
        .execution-header {
            background: #e9ecef;
            padding: 15px;
            font-weight: bold;
            font-size: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .execution-content {
            padding: 15px;
        }
        .execution-meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
        }
        .meta-item {
            display: flex;
            justify-content: space-between;
        }
        .meta-label {
            font-weight: bold;
            color: #6c757d;
        }
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-completed { background: #d4edda; color: #155724; }
        .status-in-progress { background: #d1ecf1; color: #0c5460; }
        .status-pending { background: #fff3cd; color: #856404; }
        .status-cancelled { background: #f8d7da; color: #721c24; }
        .task-summary {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            margin-top: 10px;
        }
        .task-summary-item {
            display: inline-block;
            margin-right: 15px;
            font-size: 14px;
        }
        .footer { 
            position: fixed; 
            bottom: 0; 
            width: 100%; 
            text-align: center; 
            font-size: 12px;
            color: #6c757d;
            padding: 10px 0;
            border-top: 1px solid #dee2e6;
        }
        h1 { color: #333; margin: 10px 0; }
        h2 { color: #495057; border-bottom: 1px solid #dee2e6; padding-bottom: 5px; }
        h3 { color: #6c757d; margin-top: 20px; }
        .page-break { page-break-before: always; }
        .index-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px dotted #dee2e6;
        }
        .cover-page {
            text-align: center;
            padding: 50px 0;
        }
        .cover-page h1 {
            font-size: 36px;
            margin: 30px 0;
        }
        .cover-page .subtitle {
            font-size: 18px;
            color: #6c757d;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    @if($includeCoverPage)
    <div class="cover-page">
        @if(file_exists($logoPath))
            <img src="{{ $logoPath }}" class="logo" alt="Company Logo">
        @endif
        <h1>Batch Execution Report</h1>
        <div class="subtitle">{{ count($executions) }} Executions</div>
        <div class="subtitle">Generated on {{ $generatedAt->format('d/m/Y H:i:s') }}</div>
    </div>
    <div class="page-break"></div>
    @endif

    <div class="header">
        @if(!$includeCoverPage)
            @if(file_exists($logoPath))
                <img src="{{ $logoPath }}" class="logo" alt="Company Logo">
            @endif
            <h1>Batch Execution Report</h1>
            <p>Generated on {{ $generatedAt->format('d/m/Y H:i:s') }}</p>
        @endif
    </div>

    <div class="summary">
        <h2>Report Summary</h2>
        <table>
            <tr>
                <td>Total Executions</td>
                <td>{{ count($executions) }}</td>
            </tr>
            <tr>
                <td>Completed</td>
                <td>{{ $executions->where('status', 'completed')->count() }}</td>
            </tr>
            <tr>
                <td>In Progress</td>
                <td>{{ $executions->where('status', 'in_progress')->count() }}</td>
            </tr>
            <tr>
                <td>Pending</td>
                <td>{{ $executions->where('status', 'pending')->count() }}</td>
            </tr>
            <tr>
                <td>Cancelled</td>
                <td>{{ $executions->where('status', 'cancelled')->count() }}</td>
            </tr>
            <tr>
                <td>Date Range</td>
                <td>
                    @if($executions->isNotEmpty())
                        {{ $executions->min('started_at')?->format('d/m/Y') }} - 
                        {{ $executions->max('started_at')?->format('d/m/Y') }}
                    @else
                        N/A
                    @endif
                </td>
            </tr>
            <tr>
                <td>Completion Rate</td>
                <td>
                    @if(count($executions) > 0)
                        {{ round(($executions->where('status', 'completed')->count() / count($executions)) * 100, 1) }}%
                    @else
                        0%
                    @endif
                </td>
            </tr>
        </table>
    </div>

    @if($includeIndex && $executions->isNotEmpty())
    <div class="index">
        <h2>Execution Index</h2>
        @foreach($executions as $execution)
        <div class="index-item">
            <span>
                #{{ $execution->id }} - {{ $execution->routine->name }} 
                ({{ $execution->routine->assets->pluck('tag')->join(', ') }})
            </span>
            <span>
                <span class="status-badge status-{{ $execution->status }}">
                    {{ ucwords(str_replace('_', ' ', $execution->status)) }}
                </span>
                {{ $execution->started_at?->format('d/m/Y') }}
            </span>
        </div>
        @endforeach
    </div>
    <div class="page-break"></div>
    @endif

    <div class="executions">
        <h2>Execution Details</h2>
        
        @forelse($executions as $execution)
            @if($grouping === 'by_asset' && ($loop->first || $execution->routine->assets->first()?->tag !== $executions[$loop->index - 1]->routine->assets->first()?->tag))
                <h3>Asset: {{ $execution->routine->assets->first()?->tag ?? 'Unknown' }}</h3>
            @elseif($grouping === 'by_routine' && ($loop->first || $execution->routine->name !== $executions[$loop->index - 1]->routine->name))
                <h3>Routine: {{ $execution->routine->name }}</h3>
            @endif

            <div class="execution-item">
                <div class="execution-header">
                    <span>Execution #{{ $execution->id }} - {{ $execution->routine->name }}</span>
                    <span class="status-badge status-{{ $execution->status }}">
                        {{ ucwords(str_replace('_', ' ', $execution->status)) }}
                    </span>
                </div>
                
                <div class="execution-content">
                    <div class="execution-meta">
                        <div class="meta-item">
                            <span class="meta-label">Asset(s):</span>
                            <span>{{ $execution->routine->assets->pluck('tag')->join(', ') }}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Executor:</span>
                            <span>{{ $execution->executor->name }}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Started:</span>
                            <span>{{ $execution->started_at?->format('d/m/Y H:i:s') ?? 'N/A' }}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Completed:</span>
                            <span>{{ $execution->completed_at?->format('d/m/Y H:i:s') ?? 'N/A' }}</span>
                        </div>
                        @if($execution->duration_minutes)
                        <div class="meta-item">
                            <span class="meta-label">Duration:</span>
                            <span>{{ $execution->duration_minutes }} minutes</span>
                        </div>
                        @endif
                        <div class="meta-item">
                            <span class="meta-label">Progress:</span>
                            <span>{{ $execution->progress_percentage }}%</span>
                        </div>
                    </div>

                    @if($execution->formExecution && $execution->formExecution->taskResponses)
                        @php
                            $taskSummary = $execution->task_summary;
                        @endphp
                        <div class="task-summary">
                            <strong>Task Summary:</strong>
                            <span class="task-summary-item">
                                <strong>Total:</strong> {{ $taskSummary['total'] }}
                            </span>
                            <span class="task-summary-item">
                                <strong>Completed:</strong> {{ $taskSummary['completed'] }}
                            </span>
                            @if($taskSummary['with_issues'] > 0)
                            <span class="task-summary-item" style="color: #dc3545;">
                                <strong>With Issues:</strong> {{ $taskSummary['with_issues'] }}
                            </span>
                            @endif
                        </div>
                    @endif

                    @if($execution->notes)
                    <div style="margin-top: 10px;">
                        <strong>Notes:</strong> {{ $execution->notes }}
                    </div>
                    @endif
                </div>
            </div>

            @if(!$loop->last && ($loop->iteration % 3 === 0))
                <div class="page-break"></div>
            @endif
        @empty
            <p><em>No executions found for this report.</em></p>
        @endforelse
    </div>

    <div class="footer">
        <p>
            Batch Execution Report | {{ count($executions) }} Executions | 
            Generated on {{ $generatedAt->format('d/m/Y H:i:s') }} | 
            Page <span class="pagenum"></span>
        </p>
    </div>
</body>
</html>