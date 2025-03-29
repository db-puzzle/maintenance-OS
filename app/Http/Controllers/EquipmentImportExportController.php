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
                'ID' => $item->id,
                'Tag' => $item->tag,
                'Número de Série' => $item->serial_number,
                'Tipo de Equipamento' => $item->equipmentType?->name,
                'Descrição' => $item->description,
                'Fabricante' => $item->manufacturer,
                'Ano de Fabricação' => $item->manufacturing_year,
                'Planta' => $item->plant?->name,
                'Área' => $item->area?->name,
                'Setor' => $item->sector?->name,
                'Data de Criação' => $item->created_at->format('d/m/Y H:i:s'),
                'Última Atualização' => $item->updated_at->format('d/m/Y H:i:s'),
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

        // Escreve o cabeçalho
        fputcsv($file, array_keys($data[0]));

        // Escreve os dados
        foreach ($data as $row) {
            fputcsv($file, $row);
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
        
        $data = [];
        $headers = [];
        
        if (($handle = fopen($path, "r")) !== FALSE) {
            // Lê o cabeçalho
            $headers = fgetcsv($handle);
            \Log::info('Cabeçalhos encontrados:', $headers);
            
            // Lê as linhas de dados
            while (($row = fgetcsv($handle)) !== FALSE) {
                $data[] = array_combine($headers, $row);
            }
            
            fclose($handle);
        }

        \Log::info('Dados processados:', ['count' => count($data), 'sample' => $data[0] ?? null]);

        if ($request->wantsJson()) {
            return response()->json([
                'headers' => $headers,
                'data' => $data
            ]);
        }

        return Inertia::render('cadastro/equipamentos/import', [
            'csvData' => [
                'headers' => $headers,
                'data' => $data
            ]
        ]);
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

        foreach ($data as $row) {
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
                $errors[] = "Erro na linha {$imported}: " . $e->getMessage();
            }
        }

        return response()->json([
            'success' => true,
            'imported' => $imported,
            'errors' => $errors
        ]);
    }
} 