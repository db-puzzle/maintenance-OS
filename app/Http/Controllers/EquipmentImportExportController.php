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
            $validationErrors = [];
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
                    $validationErrors[] = "Linha {$currentLine}: Número de colunas inconsistente com o cabeçalho.";
                    continue;
                }

                $rowData = array_combine($headers, $row);
                
                // Validação da Planta
                if (empty($rowData['Planta'])) {
                    $validationErrors[] = "TAG '{$rowData['Tag']}' não possui Planta associada. Todos os equipamentos devem ter uma Planta.";
                }
                
                // Validação de Área quando há Setor
                if (!empty($rowData['Setor']) && empty($rowData['Área'])) {
                    $validationErrors[] = "TAG '{$rowData['Tag']}' possui Setor mas não possui Área. Equipamentos com Setor devem ter uma Área.";
                }
                
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
                    'validationErrors' => $validationErrors,
                    'progress' => 100,
                    'totalLines' => $totalLines,
                    'processedLines' => $currentLine
                ]);
            }

            return Inertia::render('cadastro/equipamentos/import', [
                'csvData' => [
                    'headers' => $headers,
                    'data' => $data,
                    'validationErrors' => $validationErrors,
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
        $request->validate([
            'data' => 'required|array',
            'mapping' => 'required|array'
        ]);

        $data = $request->input('data');
        $mapping = $request->input('mapping');

        $imported = 0;
        $errors = [];

        foreach ($data as $index => $row) {
            try {
                $equipmentData = [];
                foreach ($mapping as $csvField => $dbField) {
                    if (!empty($dbField)) {
                        $equipmentData[$dbField] = $row[$csvField];
                    }
                }

                // Validação básica dos dados
                if (empty($equipmentData['tag'])) {
                    throw new \Exception('Tag é obrigatória');
                }

                // Cria o equipamento
                Equipment::create($equipmentData);
                $imported++;
            } catch (\Exception $e) {
                $errors[] = "Erro na linha {$index}: " . $e->getMessage();
            }
        }

        return response()->json([
            'success' => true,
            'imported' => $imported,
            'errors' => $errors
        ]);
    }
} 