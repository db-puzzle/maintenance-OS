<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Routine Execution Report #{{ $execution->id }}</title>
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
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .logo { max-width: 200px; }
        .header-text { text-align: right; }
        .metadata { 
            background: #f8f9fa; 
            padding: 20px; 
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .metadata table {
            width: 100%;
            border-collapse: collapse;
        }
        .metadata td {
            padding: 8px 12px;
            border-bottom: 1px solid #dee2e6;
        }
        .metadata td:first-child {
            font-weight: bold;
            width: 25%;
        }
        .task-response { 
            margin: 30px 0; 
            page-break-inside: avoid;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            overflow: hidden;
        }
        .task-header {
            background: #e9ecef;
            padding: 15px;
            font-weight: bold;
            font-size: 16px;
        }
        .task-content {
            padding: 20px;
        }
        .task-meta {
            color: #6c757d;
            font-size: 14px;
            margin-bottom: 10px;
        }
        .measurement { 
            display: inline-block; 
            padding: 8px 15px; 
            border-radius: 20px;
            font-weight: bold;
            font-size: 18px;
        }
        .in-range { 
            background: #d4edda; 
            color: #155724; 
            border: 1px solid #c3e6cb;
        }
        .out-range { 
            background: #f8d7da; 
            color: #721c24; 
            border: 1px solid #f5c6cb;
        }
        .response-value {
            font-size: 16px;
            font-weight: bold;
            margin: 10px 0;
        }
        .photo-container {
            text-align: center;
            margin: 15px 0;
        }
        .photo-container img {
            max-width: 300px;
            max-height: 200px;
            border: 1px solid #dee2e6;
            border-radius: 4px;
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
        .timeline {
            margin: 20px 0;
        }
        .timeline-item {
            margin: 10px 0;
            padding: 10px;
            border-left: 3px solid #007bff;
            background: #f8f9fa;
        }
        .timeline-time {
            font-weight: bold;
            color: #007bff;
        }
        h1 { color: #333; margin: 0; }
        h2 { color: #495057; border-bottom: 1px solid #dee2e6; padding-bottom: 5px; }
        h3 { color: #6c757d; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            @if(file_exists($logoPath))
                <img src="{{ $logoPath }}" class="logo" alt="Company Logo">
            @endif
        </div>
        <div class="header-text">
            <h1>Routine Execution Report</h1>
            <p>Generated on {{ $generatedAt->format('d/m/Y H:i:s') }}</p>
        </div>
    </div>

    <div class="metadata">
        <h2>Execution Details</h2>
        <table>
            <tr>
                <td>Execution ID</td>
                <td>#{{ $execution->id }}</td>
                <td>Status</td>
                <td>
                    <span class="status-badge status-{{ $execution->status }}">
                        {{ ucwords(str_replace('_', ' ', $execution->status)) }}
                    </span>
                </td>
            </tr>
            <tr>
                <td>Routine</td>
                <td>{{ $execution->routine->name }}</td>
                <td>Assets</td>
                <td>{{ $execution->routine->assets->pluck('tag')->join(', ') }}</td>
            </tr>
            <tr>
                <td>Executor</td>
                <td>{{ $execution->executor->name }}</td>
                <td>Started At</td>
                <td>{{ $execution->started_at ? $execution->started_at->format('d/m/Y H:i:s') : 'N/A' }}</td>
            </tr>
            <tr>
                <td>Completed At</td>
                <td>{{ $execution->completed_at ? $execution->completed_at->format('d/m/Y H:i:s') : 'N/A' }}</td>
                <td>Duration</td>
                <td>{{ $execution->duration_minutes ? $execution->duration_minutes . ' minutes' : 'N/A' }}</td>
            </tr>
            @if($execution->notes)
            <tr>
                <td>Notes</td>
                <td colspan="3">{{ $execution->notes }}</td>
            </tr>
            @endif
        </table>
    </div>

    @if($execution->timeline)
    <div class="timeline">
        <h2>Execution Timeline</h2>
        @foreach($execution->timeline as $event)
        <div class="timeline-item">
            <div class="timeline-time">{{ $event['timestamp']->format('H:i:s') }}</div>
            <div>{{ $event['description'] }}</div>
        </div>
        @endforeach
    </div>
    @endif

    <div class="responses">
        <h2>Task Responses</h2>
        @forelse($execution->formExecution->taskResponses ?? [] as $response)
            <div class="task-response">
                <div class="task-header">
                    {{ $loop->iteration }}. {{ $response->formTask->description }}
                    @if($response->formTask->is_required)
                        <span style="color: #dc3545; font-size: 12px;">(Required)</span>
                    @else
                        <span style="color: #6c757d; font-size: 12px;">(Optional)</span>
                    @endif
                </div>
                
                <div class="task-content">
                    <div class="task-meta">
                        <strong>Type:</strong> {{ ucwords(str_replace('_', ' ', $response->formTask->type)) }}
                        @if($response->responded_at)
                            | <strong>Completed:</strong> {{ $response->responded_at->format('d/m/Y H:i:s') }}
                        @endif
                    </div>
                    
                    @switch($response->formTask->type)
                        @case('measurement')
                            @php
                                $config = $response->formTask->getMeasurementConfig();
                                $value = $response->response['value'] ?? null;
                                $isWithinRange = false;
                                
                                if ($value !== null && $config) {
                                    $numericValue = (float) $value;
                                    $min = $config['min'] ?? null;
                                    $max = $config['max'] ?? null;
                                    $isWithinRange = $min !== null && $max !== null && 
                                                   $numericValue >= $min && $numericValue <= $max;
                                }
                            @endphp
                            
                            @if($value !== null)
                                <div class="response-value">
                                    <span class="measurement {{ $isWithinRange ? 'in-range' : 'out-range' }}">
                                        {{ $value }} {{ $config['unit'] ?? '' }}
                                    </span>
                                </div>
                                
                                @if($config && isset($config['min'], $config['max']))
                                    <p><strong>Target Range:</strong> 
                                        {{ $config['min'] }} - {{ $config['max'] }} {{ $config['unit'] ?? '' }}
                                        @if(isset($config['target']))
                                            (Target: {{ $config['target'] }} {{ $config['unit'] ?? '' }})
                                        @endif
                                    </p>
                                @endif
                            @else
                                <p><em>No measurement recorded</em></p>
                            @endif
                            @break
                        
                        @case('multiple_choice')
                            <div class="response-value">
                                {{ $response->response['value'] ?? 'No selection made' }}
                            </div>
                            @break
                        
                        @case('multiple_select')
                            @php
                                $values = $response->response['values'] ?? [];
                                $options = $response->formTask->getOptions();
                                $selectedLabels = collect($options)
                                    ->whereIn('value', $values)
                                    ->pluck('label')
                                    ->toArray();
                            @endphp
                            <div class="response-value">
                                {{ !empty($selectedLabels) ? implode(', ', $selectedLabels) : 'No selections made' }}
                            </div>
                            @break
                        
                        @case('question')
                            <div class="response-value">
                                {{ $response->response['answer'] ?? 'No answer provided' }}
                            </div>
                            @break
                        
                        @case('photo')
                            @if($includeImages && $response->attachments->count() > 0)
                                @foreach($response->attachments as $attachment)
                                    @if(in_array(strtolower(pathinfo($attachment->file_path, PATHINFO_EXTENSION)), ['jpg', 'jpeg', 'png', 'gif', 'webp']))
                                        <div class="photo-container">
                                            <img src="{{ storage_path('app/' . $attachment->file_path) }}" 
                                                 alt="Task Photo">
                                            <p style="font-size: 12px; color: #6c757d; margin-top: 5px;">
                                                {{ $attachment->filename }} - 
                                                Uploaded: {{ $attachment->created_at->format('d/m/Y H:i:s') }}
                                            </p>
                                        </div>
                                    @endif
                                @endforeach
                            @else
                                <p><em>{{ $response->attachments->count() }} photo(s) captured</em></p>
                            @endif
                            @break
                        
                        @case('file_upload')
                            <p><strong>Files uploaded:</strong> {{ $response->attachments->count() }}</p>
                            @foreach($response->attachments as $attachment)
                                <p style="margin: 5px 0;">
                                    📎 {{ $attachment->filename }} 
                                    <span style="color: #6c757d;">({{ $attachment->created_at->format('d/m/Y H:i:s') }})</span>
                                </p>
                            @endforeach
                            @break
                        
                        @case('code_reader')
                            <div class="response-value">
                                {{ $response->response['code'] ?? 'No code scanned' }}
                            </div>
                            @break
                        
                        @default
                            <div class="response-value">
                                {{ json_encode($response->response ?? []) }}
                            </div>
                    @endswitch
                </div>
            </div>
        @empty
            <p><em>No task responses recorded for this execution.</em></p>
        @endforelse
    </div>

    <div class="footer">
        <p>
            Routine Execution Report | Generated on {{ $generatedAt->format('d/m/Y H:i:s') }} | 
            Page <span class="pagenum"></span>
        </p>
    </div>
</body>
</html>