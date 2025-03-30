<?php

namespace App\Http\Controllers;

use App\Models\Equipment;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;

class EquipmentImportExportController extends Controller
{
    public function import()
    {
        return Inertia::render('cadastro/equipamentos/import');
    }

    public function export()
    {
        return Inertia::render('cadastro/equipamentos/export');
    }

    public function exportData(Request $request)
    {
        // Busca todos os equipamentos com seus relacionamentos
        $equipment = Equipment::with([
            'equipmentType:id,name',
            'plant:id,name',
            'area:id,name,plant_id',
            'sector:id,name,area_id'
        ])->get();

        // Prepara os dados para exportação
        $data = $equipment->map(function ($item) {
            return [
                'Tag' => $item->tag,
                'Número de Série' => $item->serial_number,
                'Tipo de Equipamento' => $item->equipmentType?->name,
                'Descrição' => $item->description,
                'Fabricante' => $item->manufacturer,
                'Ano de Fabricação' => $item->manufacturing_year,
                'Planta' => $item->plant?->name,
                'Área' => $item->area?->name,
                'Setor' => $item->sector?->name,
            ];
        })->toArray();

        // Cria o arquivo CSV
        $filename = 'equipamentos_' . date('Y-m-d_His') . '.csv';
        $filepath = storage_path('app/public/exports/' . $filename);

        // Cria o diretório se não existir
        if (!file_exists(storage_path('app/public/exports'))) {
            mkdir(storage_path('app/public/exports'), 0755, true);
        }

        // Abre o arquivo para escrita
        $file = fopen($filepath, 'w');

        // Função personalizada para escrever CSV sem escape
        $writeCsvLine = function($file, $fields) {
            $line = implode(',', array_map(function($field) {
                return str_replace(',', ' ', $field); // Substitui vírgulas por espaços
            }, $fields));
            fwrite($file, $line . "\n");
        };

        // Escreve o cabeçalho
        $writeCsvLine($file, array_keys($data[0]));

        // Escreve os dados
        foreach ($data as $row) {
            $writeCsvLine($file, $row);
        }

        fclose($file);

        // Se for uma requisição de download, retorna o arquivo
        if ($request->has('download')) {
            return response()->download($filepath)->deleteFileAfterSend();
        }

        // Retorna a URL do arquivo para download
        $downloadUrl = route('cadastro.equipamentos.export.download', ['filename' => $filename]);

        return Inertia::render('cadastro/equipamentos/export', [
            'success' => true,
            'download_url' => $downloadUrl,
            'filename' => $filename
        ]);
    }

    public function downloadExport($filename)
    {
        $filepath = storage_path('app/public/exports/' . $filename);
        
        if (!file_exists($filepath)) {
            return back()->with('error', 'Arquivo não encontrado');
        }

        return response()->download($filepath)->deleteFileAfterSend();
    }

    public function analyzeCsv(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt'
        ]);

        $file = $request->file('file');
        $path = $file->getPathname();

        // Validação adicional do conteúdo do arquivo
        try {
            // Verifica se o arquivo está vazio
            if (filesize($path) === 0) {
                return response()->json([
                    'error' => 'O arquivo está vazio.'
                ], 422);
            }

            // Tenta abrir o arquivo
            if (($handle = fopen($path, "r")) === FALSE) {
                return response()->json([
                    'error' => 'Não foi possível abrir o arquivo.'
                ], 422);
            }

            // Lê as primeiras linhas para validação
            $firstLine = fgetcsv($handle);
            if ($firstLine === FALSE || count($firstLine) < 1) {
                fclose($handle);
                return response()->json([
                    'error' => 'O arquivo não contém dados válidos em formato CSV.'
                ], 422);
            }

            // Verifica se há pelo menos uma coluna
            if (count($firstLine) < 1) {
                fclose($handle);
                return response()->json([
                    'error' => 'O arquivo CSV deve conter pelo menos uma coluna.'
                ], 422);
            }

            // Verifica se há dados na segunda linha
            $secondLine = fgetcsv($handle);
            if ($secondLine === FALSE) {
                fclose($handle);
                return response()->json([
                    'error' => 'O arquivo CSV deve conter pelo menos uma linha de dados além do cabeçalho.'
                ], 422);
            }

            // Verifica se o número de colunas é consistente
            if (count($secondLine) !== count($firstLine)) {
                fclose($handle);
                return response()->json([
                    'error' => 'O número de colunas é inconsistente nas linhas do arquivo.'
                ], 422);
            }

            // Volta para o início do arquivo
            rewind($handle);
            
            $data = [];
            $headers = [];
            $totalLines = 0;
            $currentLine = 0;
            
            // Lê o cabeçalho
            $headers = fgetcsv($handle);
            
            // Conta o total de linhas para cálculo de progresso
            $totalLines = count(file($path)) - 1; // -1 para excluir o cabeçalho
            
            // Lê as linhas de dados
            while (($row = fgetcsv($handle)) !== FALSE) {
                $currentLine++;
                
                // Verifica consistência do número de colunas
                if (count($row) !== count($headers)) {
                    continue;
                }

                $rowData = array_combine($headers, $row);
                
                // Adiciona apenas as 10 primeiras linhas para exibição
                if ($currentLine <= 10) {
                    $data[] = $rowData;
                }
            }
            
            fclose($handle);

            if ($request->wantsJson()) {
                return response()->json([
                    'headers' => $headers,
                    'data' => $data,
                    'progress' => 100,
                    'totalLines' => $totalLines,
                    'processedLines' => $currentLine
                ]);
            }

            return Inertia::render('cadastro/equipamentos/import', [
                'csvData' => [
                    'headers' => $headers,
                    'data' => $data,
                    'progress' => 100,
                    'totalLines' => $totalLines,
                    'processedLines' => $currentLine
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Erro ao processar o arquivo: ' . $e->getMessage()
            ], 422);
        }
    }

    public function importData(Request $request)
    {
        // Verifica se a conexão ainda está ativa
        if (!$request->isMethod('post')) {
            \Log::warning('Tentativa de importação com método inválido', [
                'method' => $request->method(),
                'session_id' => session()->getId()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Método de requisição inválido'
            ], 405);
        }

        // Verifica se a sessão está ativa
        if (!$request->session()->isStarted()) {
            \Log::warning('Tentativa de importação com sessão não iniciada', [
                'session_id' => session()->getId()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Sessão não iniciada'
            ], 419);
        }

        \Log::info('Iniciando importação', [
            'request_data' => $request->all(),
            'action' => $request->input('action'),
            'has_cancel' => $request->has('cancel'),
            'session_id' => session()->getId()
        ]);

        // Define um timeout para a operação
        set_time_limit(300); // 5 minutos
        ini_set('max_execution_time', 300);

        $request->validate([
            'data' => 'required|array',
            'mapping' => 'required|array',
            'action' => 'nullable|in:skip,overwrite',
            'cancel' => 'nullable|boolean'
        ]);

        // Se a requisição indicar cancelamento, retorna imediatamente
        if ($request->boolean('cancel')) {
            \Log::info('Importação cancelada pelo usuário', [
                'session_id' => session()->getId()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Importação cancelada pelo usuário'
            ]);
        }

        // Registra o início da importação na sessão
        session()->put('import_in_progress', true);
        session()->put('import_started_at', now());

        $data = $request->input('data');
        $mapping = $request->input('mapping');
        $action = $request->input('action');

        \Log::info('Dados recebidos', [
            'data_count' => count($data),
            'mapping' => $mapping,
            'action' => $action
        ]);

        $imported = 0;
        $skipped = 0;
        $errors = [];
        $validationErrors = [];
        $duplicates = [];

        // Primeiro, mapeia todos os dados
        $mappedData = [];
        foreach ($data as $index => $row) {
            \Log::info("Processando linha {$index}", ['row' => $row]);
            
            $mappedRow = [];
            foreach ($mapping as $csvField => $dbField) {
                if (!empty($dbField)) {
                    $mappedRow[$dbField] = $row[$csvField];
                }
            }
            $mappedData[] = $mappedRow;
            
            \Log::info("Linha {$index} mapeada", ['mapped_row' => $mappedRow]);
        }

        \Log::info('Dados mapeados', ['mapped_data' => $mappedData]);

        // Validação inicial dos dados
        foreach ($mappedData as $index => $row) {
            // Validação da Planta
            if (empty($row['plant_id'])) {
                $validationErrors[] = "Linha {$index}: TAG '{$row['tag']}' não possui Planta associada. Todos os equipamentos devem ter uma Planta.";
            }
            
            // Validação de Área quando há Setor
            if (!empty($row['sector_id']) && empty($row['area_id'])) {
                $validationErrors[] = "Linha {$index}: TAG '{$row['tag']}' possui Setor mas não possui Área. Equipamentos com Setor devem ter uma Área.";
            }
        }

        // Se houver erros de validação, retorna sem importar
        if (!empty($validationErrors)) {
            \Log::info('Erros de validação encontrados', ['validation_errors' => $validationErrors]);
            return response()->json([
                'success' => false,
                'validationErrors' => $validationErrors
            ], 422);
        }

        // Verifica duplicatas de TAG
        $duplicates = [];
        foreach ($mappedData as $index => $row) {
            // Busca os IDs reais das estruturas
            $plant = \App\Models\Plant::where('name', $row['plant_id'])->first();
            if (!$plant) {
                continue;
            }

            $area = !empty($row['area_id']) ? \App\Models\Area::where('name', $row['area_id'])->first() : null;
            if (!empty($row['area_id']) && !$area) {
                continue;
            }

            $sector = !empty($row['sector_id']) ? \App\Models\Sector::where('name', $row['sector_id'])->first() : null;
            if (!empty($row['sector_id']) && !$sector) {
                continue;
            }

            // Verifica se já existe um equipamento com a mesma TAG na mesma localização no banco de dados
            $existingEquipment = Equipment::where('tag', $row['tag'])
                ->where('plant_id', $plant->id)
                ->when($area, function ($query) use ($area) {
                    return $query->where('area_id', $area->id);
                })
                ->when($sector, function ($query) use ($sector) {
                    return $query->where('sector_id', $sector->id);
                })
                ->first();

            if ($existingEquipment) {
                $duplicates[] = [
                    'tag' => $row['tag'],
                    'plant' => $row['plant_id'],
                    'area' => $row['area_id'] ?? null,
                    'sector' => $row['sector_id'] ?? null,
                    'line' => $index + 1
                ];
            }
        }

        // Se houver duplicatas e não houver ação definida, retorna para o usuário decidir
        if (!empty($duplicates) && !$action) {
            \Log::info('Duplicatas encontradas', ['duplicates' => $duplicates]);
            return response()->json([
                'success' => false,
                'hasDuplicates' => true,
                'duplicates' => $duplicates
            ], 422);
        }

        // Se não houver duplicatas ou houver uma ação definida, procede com a importação
        try {
            \DB::beginTransaction();

            // Cria plantas, áreas e setores necessários
            foreach ($mappedData as $index => $row) {
                \Log::info("Processando estruturas para linha {$index}", ['row' => $row]);
                
                // Cria planta se não existir
                if (!empty($row['plant_id'])) {
                    $plant = \App\Models\Plant::firstOrCreate(
                        ['name' => $row['plant_id']]
                    );
                    \Log::info("Planta processada", ['plant' => $plant]);
                }

                // Cria área se não existir
                if (!empty($row['area_id'])) {
                    $area = \App\Models\Area::firstOrCreate(
                        [
                            'name' => $row['area_id'],
                            'plant_id' => $plant->id
                        ]
                    );
                    \Log::info("Área processada", ['area' => $area]);
                }

                // Cria setor se não existir
                if (!empty($row['sector_id'])) {
                    $sector = \App\Models\Sector::firstOrCreate(
                        [
                            'name' => $row['sector_id'],
                            'area_id' => $area->id
                        ]
                    );
                    \Log::info("Setor processado", ['sector' => $sector]);
                }
            }

            // Cria os equipamentos
            foreach ($mappedData as $index => $row) {
                try {
                    \Log::info("Processando equipamento na linha {$index}", ['row' => $row]);
                    
                    // Busca os IDs reais das estruturas
                    $plant = \App\Models\Plant::where('name', $row['plant_id'])->first();
                    $area = !empty($row['area_id']) ? \App\Models\Area::where('name', $row['area_id'])->first() : null;
                    $sector = !empty($row['sector_id']) ? \App\Models\Sector::where('name', $row['sector_id'])->first() : null;

                    // Busca o ID do tipo de equipamento
                    $equipmentType = \App\Models\EquipmentType::where('name', $row['equipment_type_id'])->first();
                    if (!$equipmentType) {
                        throw new \Exception("Tipo de equipamento '{$row['equipment_type_id']}' não encontrado");
                    }

                    \Log::info("Estruturas encontradas", [
                        'plant' => $plant,
                        'area' => $area,
                        'sector' => $sector,
                        'equipment_type' => $equipmentType
                    ]);

                    // Verifica se já existe um equipamento com a mesma TAG na mesma localização
                    $existingEquipment = Equipment::where('tag', $row['tag'])
                        ->where('plant_id', $plant->id)
                        ->where('area_id', $area?->id)
                        ->where('sector_id', $sector?->id)
                        ->first();

                    if ($existingEquipment) {
                        \Log::info("Equipamento existente encontrado", ['equipment' => $existingEquipment]);
                        
                        if ($action === 'skip') {
                            $skipped++;
                            \Log::info("Pulando equipamento duplicado");
                            continue;
                        } else {
                            \Log::info("Atualizando equipamento existente");
                            // Atualiza o equipamento existente
                            $existingEquipment->update([
                                'serial_number' => $row['serial_number'] ?? $existingEquipment->serial_number,
                                'equipment_type_id' => $equipmentType->id,
                                'description' => $row['description'] ?? $existingEquipment->description,
                                'manufacturer' => $row['manufacturer'] ?? $existingEquipment->manufacturer,
                                'manufacturing_year' => $row['manufacturing_year'] ?? $existingEquipment->manufacturing_year,
                            ]);
                        }
                    } else {
                        \Log::info("Criando novo equipamento");
                        // Cria novo equipamento
                        Equipment::create([
                            'tag' => $row['tag'],
                            'serial_number' => $row['serial_number'] ?? null,
                            'equipment_type_id' => $equipmentType->id,
                            'description' => $row['description'] ?? null,
                            'manufacturer' => $row['manufacturer'] ?? null,
                            'manufacturing_year' => $row['manufacturing_year'] ?? null,
                            'plant_id' => $plant->id,
                            'area_id' => $area?->id,
                            'sector_id' => $sector?->id,
                        ]);
                    }
                    $imported++;
                    \Log::info("Equipamento processado com sucesso", ['imported' => $imported]);
                } catch (\Exception $e) {
                    \Log::error("Erro ao processar equipamento na linha {$index}", [
                        'error' => $e->getMessage(),
                        'row' => $row
                    ]);
                    $errors[] = "Erro ao criar equipamento na linha {$index}: " . $e->getMessage();
                }
            }

            \DB::commit();
            \Log::info('Importação concluída com sucesso', [
                'imported' => $imported,
                'skipped' => $skipped,
                'errors' => $errors
            ]);

            return response()->json([
                'success' => true,
                'imported' => $imported,
                'skipped' => $skipped,
                'errors' => $errors
            ]);

        } catch (\Exception $e) {
            \DB::rollBack();
            \Log::error('Erro durante a importação', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'error' => 'Erro durante a importação: ' . $e->getMessage()
            ], 500);
        }
    }
} 