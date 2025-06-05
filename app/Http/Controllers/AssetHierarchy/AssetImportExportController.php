<?php

namespace App\Http\Controllers\AssetHierarchy;

use App\Http\Controllers\Controller;
use App\Models\AssetHierarchy\Asset;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Sector;
use App\Models\AssetHierarchy\AssetType;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;

class AssetImportExportController extends Controller
{
    public function import()
    {
        return Inertia::render('asset-hierarchy/assets/import');
    }

    public function export()
    {
        return Inertia::render('asset-hierarchy/assets/export');
    }

    public function exportData(Request $request)
    {
        // Busca todos os ativos com seus relacionamentos
        $asset = Asset::with([
            'assetType:id,name',
            'plant:id,name',
            'area:id,name,plant_id',
            'sector:id,name,area_id'
        ])->get();

        // Prepara os dados para exportação
        $data = $asset->map(function ($item) {
            return [
                'Tag' => $item->tag,
                'Número de Série' => $item->serial_number,
                'Part Number' => $item->part_number,
                'Tipo de Ativo' => $item->assetType?->name,
                'Descrição' => $item->description,
                'Fabricante' => $item->manufacturer,
                'Ano de Fabricação' => $item->manufacturing_year,
                'Planta' => $item->plant?->name,
                'Área' => $item->area?->name,
                'Setor' => $item->sector?->name,
            ];
        })->toArray();

        // Cria o arquivo CSV
        $filename = 'ativos_' . date('Y-m-d_His') . '.csv';
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
        $downloadUrl = route('asset-hierarchy.assets.export.download', ['filename' => $filename]);

        return Inertia::render('asset-hierarchy/assets/export', [
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

    public function checkImportProgress()
    {
        $progress = session()->get('import_progress', 0);
        $importInProgress = session()->get('import_in_progress', false);
        
        \Log::info('Verificando progresso da importação', [
            'progress' => $progress,
            'import_in_progress' => $importInProgress,
            'session_id' => session()->getId()
        ]);

        return response()->json([
            'progress' => $progress,
            'import_in_progress' => $importInProgress
        ]);
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
            
            $previewData = []; // Dados para visualização (10 primeiras linhas)
            $allData = []; // Todos os dados do arquivo
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
                
                // Adiciona à lista completa de dados
                $allData[] = $rowData;
                
                // Adiciona apenas as 10 primeiras linhas para exibição
                if ($currentLine <= 10) {
                    $previewData[] = $rowData;
                }
            }
            
            fclose($handle);

            // Armazena todos os dados na sessão para uso posterior
            session()->put('csv_data', $allData);

            if ($request->wantsJson()) {
                return response()->json([
                    'headers' => $headers,
                    'data' => $previewData,
                    'progress' => 100,
                    'totalLines' => $totalLines,
                    'processedLines' => $currentLine
                ]);
            }

            return Inertia::render('asset-hierarchy/assets/import', [
                'csvData' => [
                    'headers' => $headers,
                    'data' => $previewData,
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
            return response()->json([
                'success' => false,
                'message' => 'Método de requisição inválido'
            ], 405);
        }

        // Verifica se a sessão está ativa
        if (!$request->session()->isStarted()) {
            return response()->json([
                'success' => false,
                'message' => 'Sessão não iniciada'
            ], 419);
        }

        // Define um timeout para a operação
        set_time_limit(180); // 3 minutos
        ini_set('max_execution_time', 180);

        // Registra o início da importação
        $startTime = microtime(true);
        $maxExecutionTime = 180; // 3 minutos em segundos

        $request->validate([
            'mapping' => 'required|array',
            'cancel' => 'nullable|boolean'
        ]);

        // Se a requisição indicar cancelamento, retorna imediatamente
        if ($request->boolean('cancel')) {
            return response()->json([
                'success' => false,
                'message' => 'Importação cancelada pelo usuário'
            ]);
        }

        // Registra o início da importação na sessão
        session()->put('import_in_progress', true);
        session()->put('import_started_at', now());
        session()->put('import_progress', 0);
        session()->save();

        \Log::info('Iniciando importação', [
            'session_id' => session()->getId(),
            'import_in_progress' => session()->get('import_in_progress'),
            'import_progress' => session()->get('import_progress')
        ]);

        // Recupera todos os dados do CSV da sessão
        $data = session()->get('csv_data');
        if (!$data) {
            return response()->json([
                'success' => false,
                'message' => 'Dados do CSV não encontrados. Por favor, faça o upload do arquivo novamente.'
            ], 422);
        }

        $mapping = $request->input('mapping');
        $totalRecords = count($data);
        $imported = 0;
        $skipped = 0;
        $errors = [];
        $validationErrors = [];
        $lastProgressUpdate = 0;

        // Primeiro, mapeia todos os dados
        $mappedData = [];
        foreach ($data as $index => $row) {
            // Verifica o tempo de execução
            if (microtime(true) - $startTime > $maxExecutionTime) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tempo máximo de execução excedido. A importação foi cancelada.',
                    'partial_import' => true,
                    'imported' => $imported,
                    'skipped' => $skipped,
                    'errors' => $errors
                ], 408);
            }

            $mappedRow = [];
            foreach ($mapping as $csvField => $dbField) {
                if (!empty($dbField)) {
                    $mappedRow[$dbField] = $row[$csvField];
                }
            }
            $mappedData[] = $mappedRow;

            // Atualiza o progresso a cada 10 registros mapeados
            if ($index - $lastProgressUpdate >= 10) {
                $progress = round(($index + 1) / $totalRecords * 50); // Primeira metade do progresso
                session()->put('import_progress', $progress);
                session()->save();
                
                \Log::info('Progresso atualizado durante mapeamento', [
                    'progress' => $progress,
                    'index' => $index,
                    'total_records' => $totalRecords,
                    'session_id' => session()->getId()
                ]);
                
                $lastProgressUpdate = $index;
            }
        }

        // Validação inicial dos dados
        foreach ($mappedData as $index => $row) {
            // Validação de Área quando há Setor
            if (!empty($row['sector_id']) && empty($row['area_id'])) {
                $validationErrors[] = "Linha {$index}: TAG '{$row['tag']}' possui Setor mas não possui Área. Ativos com Setor devem ter uma Área.";
            }
        }

        // Se houver erros de validação, retorna sem importar
        if (!empty($validationErrors)) {
            return response()->json([
                'success' => false,
                'validationErrors' => $validationErrors
            ], 422);
        }

        // Se não houver erros de validação, procede com a importação
        try {
            \DB::beginTransaction();

            // Cria plantas, áreas e setores necessários
            foreach ($mappedData as $index => $row) {
                // Verifica o tempo de execução
                if (microtime(true) - $startTime > $maxExecutionTime) {
                    \DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'Tempo máximo de execução excedido. A importação foi cancelada.',
                        'partial_import' => true,
                        'imported' => $imported,
                        'skipped' => $skipped,
                        'errors' => $errors
                    ], 408);
                }

                try {
                    $plant = null;
                    $area = null;
                    $sector = null;

                    // Cria planta se não existir
                    if (!empty($row['plant_id'])) {
                        $plant = Plant::firstOrCreate(
                            ['name' => $row['plant_id']]
                        );
                    }

                    // Cria área se não existir (requer planta)
                    if (!empty($row['area_id'])) {
                        if (!$plant) {
                            throw new \Exception("Área '{$row['area_id']}' requer uma planta associada");
                        }
                        
                        // Busca a área pelo nome E pela planta
                        $area = Area::where('name', $row['area_id'])
                            ->where('plant_id', $plant->id)
                            ->first();

                        if (!$area) {
                            $area = Area::create([
                                'name' => $row['area_id'],
                                'plant_id' => $plant->id
                            ]);
                        }
                    }

                    // Cria setor se não existir (requer área)
                    if (!empty($row['sector_id'])) {
                        if (!$area) {
                            throw new \Exception("Setor '{$row['sector_id']}' requer uma área associada");
                        }
                        
                        // Busca o setor pelo nome E pela área
                        $sector = Sector::where('name', $row['sector_id'])
                            ->where('area_id', $area->id)
                            ->first();

                        if (!$sector) {
                            $sector = Sector::create([
                                'name' => $row['sector_id'],
                                'area_id' => $area->id
                            ]);
                        }
                    }
                } catch (\Exception $e) {
                    throw $e;
                }
            }

            // Cria os ativos
            foreach ($mappedData as $index => $row) {
                // Verifica o tempo de execução
                if (microtime(true) - $startTime > $maxExecutionTime) {
                    \DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'Tempo máximo de execução excedido. A importação foi cancelada.',
                        'partial_import' => true,
                        'imported' => $imported,
                        'skipped' => $skipped,
                        'errors' => $errors
                    ], 408);
                }

                try {
                    // Busca os IDs reais das estruturas
                    $plant = null;
                    if (!empty($row['plant_id'])) {
                        $plant = Plant::where('name', $row['plant_id'])->first();
                        if (!$plant) {
                            throw new \Exception("Planta '{$row['plant_id']}' não encontrada");
                        }
                    }

                    $area = null;
                    if (!empty($row['area_id'])) {
                        if (!$plant) {
                            throw new \Exception("Área '{$row['area_id']}' requer uma planta associada");
                        }
                        $area = Area::where('name', $row['area_id'])
                            ->where('plant_id', $plant->id)
                            ->first();
                        if (!$area) {
                            throw new \Exception("Área '{$row['area_id']}' não encontrada na planta '{$row['plant_id']}'");
                        }
                    }

                    $sector = null;
                    if (!empty($row['sector_id'])) {
                        if (!$area) {
                            throw new \Exception("Setor '{$row['sector_id']}' requer uma área associada");
                        }
                        $sector = Sector::where('name', $row['sector_id'])
                            ->where('area_id', $area->id)
                            ->first();
                        if (!$sector) {
                            throw new \Exception("Setor '{$row['sector_id']}' não encontrado na área '{$row['area_id']}'");
                        }
                    }

                    // Busca o ID do tipo de ativo (opcional)
                    $assetTypeId = null;
                    if (!empty($row['asset_type_id'])) {
                        $assetType = AssetType::firstOrCreate(
                            ['name' => $row['asset_type_id']]
                        );
                        $assetTypeId = $assetType->id;
                    }

                    // Verifica se já existe um ativo com a mesma TAG na mesma localização
                    $existingAssetQuery = Asset::where('tag', $row['tag']);
                    
                    if ($plant) {
                        $existingAssetQuery->where('plant_id', $plant->id);
                    } else {
                        $existingAssetQuery->whereNull('plant_id');
                    }
                    
                    if ($area) {
                        $existingAssetQuery->where('area_id', $area->id);
                    } else {
                        $existingAssetQuery->whereNull('area_id');
                    }
                    
                    if ($sector) {
                        $existingAssetQuery->where('sector_id', $sector->id);
                    } else {
                        $existingAssetQuery->whereNull('sector_id');
                    }
                    
                    $existingAsset = $existingAssetQuery->first();

                    if ($existingAsset) {
                        $skipped++;
                    } else {
                        // Cria novo ativo
                        Asset::create([
                            'tag' => $row['tag'],
                            'serial_number' => $row['serial_number'] ?? null,
                            'part_number' => $row['part_number'] ?? null,
                            'asset_type_id' => $assetTypeId,
                            'description' => $row['description'] ?? null,
                            'manufacturer' => $row['manufacturer'] ?? null,
                            'manufacturing_year' => $row['manufacturing_year'] ?? null,
                            'plant_id' => $plant?->id,
                            'area_id' => $area?->id,
                            'sector_id' => $sector?->id,
                        ]);
                        $imported++;
                    }

                    // Atualiza o progresso a cada 10 registros
                    if ($index - $lastProgressUpdate >= 10) {
                        $progress = 50 + round(($index + 1) / $totalRecords * 50); // Segunda metade do progresso
                        session()->put('import_progress', $progress);
                        session()->save();
                        
                        \Log::info('Progresso atualizado durante importação', [
                            'progress' => $progress,
                            'index' => $index,
                            'total_records' => $totalRecords,
                            'session_id' => session()->getId()
                        ]);
                        
                        $lastProgressUpdate = $index;
                    }
                } catch (\Exception $e) {
                    $errors[] = [
                        'line' => $index + 1,
                        'tag' => $row['tag'] ?? 'N/A',
                        'error' => $e->getMessage()
                    ];
                    continue; // Continua para a próxima linha
                }
            }

            \DB::commit();

            // Limpa os dados da sessão após importação bem-sucedida
            session()->forget('csv_data');
            session()->forget('import_in_progress');
            session()->forget('import_started_at');
            session()->forget('import_progress');

            return response()->json([
                'success' => true,
                'imported' => $imported,
                'skipped' => $skipped,
                'errors' => $errors,
                'total_processed' => count($mappedData),
                'total_errors' => count($errors)
            ]);

        } catch (\Exception $e) {
            \DB::rollBack();
            
            // Limpa os dados da sessão em caso de erro
            session()->forget('csv_data');
            session()->forget('import_in_progress');
            session()->forget('import_started_at');
            session()->forget('import_progress');
            
            return response()->json([
                'success' => false,
                'error' => 'Erro durante a importação: ' . $e->getMessage()
            ], 500);
        }
    }
} 