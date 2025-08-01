<?php

namespace App\Http\Controllers\Parts;

use App\Http\Controllers\Controller;
use App\Models\Part;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use League\Csv\Reader;
use League\Csv\Writer;

class PartsImportExportController extends Controller
{
    public function import()
    {
        $this->authorize('import', Part::class);
        // Method temporarily disabled - page not implemented yet
        return response()->json(['message' => 'This feature is not yet implemented'], 501);
    }
    
    public function export()
    {
        $this->authorize('export', Part::class);
        // Method temporarily disabled - page not implemented yet
        return response()->json(['message' => 'This feature is not yet implemented'], 501);
    }
    
    public function exportData(Request $request)
    {
        $this->authorize('export', Part::class);
        
        $parts = Part::query()
            ->with('manufacturer')
            ->when($request->active_only, fn($q) => $q->active())
            ->when($request->low_stock_only, fn($q) => $q->whereRaw('available_quantity < minimum_quantity'))
            ->get();
        
        $data = $parts->map(function ($part) {
            return [
                'Part Number' => $part->part_number,
                'Nome' => $part->name,
                'Descrição' => $part->description,
                'Custo Unitário' => $part->unit_cost,
                'Qtd. Disponível' => $part->available_quantity,
                'Qtd. Mínima' => $part->minimum_quantity,
                'Qtd. Máxima' => $part->maximum_quantity,
                'Localização' => $part->location,
                'Fabricante' => $part->manufacturer?->name,
                'Ativo' => $part->active ? 'Sim' : 'Não',
            ];
        })->toArray();
        
        // Create CSV file
        $filename = 'pecas_'.date('Y-m-d_His').'.csv';
        $filepath = storage_path('app/public/exports/'.$filename);
        
        // Ensure directory exists
        if (!file_exists(dirname($filepath))) {
            mkdir(dirname($filepath), 0755, true);
        }
        
        $csv = Writer::createFromPath($filepath, 'w+');
        $csv->insertOne(array_keys($data[0] ?? []));
        $csv->insertAll($data);
        
        return response()->download($filepath)->deleteFileAfterSend();
    }
    
    public function analyzeCsv(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:5120', // 5MB max
        ]);
        
        $file = $request->file('file');
        $reader = Reader::createFromPath($file->getPathname(), 'r');
        $reader->setHeaderOffset(0);
        
        $headers = $reader->getHeader();
        $records = iterator_to_array($reader->getRecords());
        
        // Get preview data (first 10 rows)
        $previewData = array_slice($records, 0, 10);
        $totalLines = count($records);
        
        return response()->json([
            'headers' => $headers,
            'data' => array_values($previewData),
            'totalLines' => $totalLines,
        ]);
    }
    
    public function importData(Request $request)
    {
        $this->authorize('import', Part::class);
        
        $request->validate([
            'mapping' => 'required|array',
            'update_existing' => 'boolean',
            'file_path' => 'required|string',
        ]);
        
        $filePath = storage_path('app/' . $request->file_path);
        if (!file_exists($filePath)) {
            return response()->json(['error' => 'File not found'], 404);
        }
        
        $reader = Reader::createFromPath($filePath, 'r');
        $reader->setHeaderOffset(0);
        
        $imported = 0;
        $updated = 0;
        $skipped = 0;
        $errors = [];
        
        DB::transaction(function() use ($reader, $request, &$imported, &$updated, &$skipped, &$errors) {
            $mapping = $request->mapping;
            $updateExisting = $request->update_existing ?? false;
            
            foreach ($reader->getRecords() as $index => $row) {
                try {
                    $mappedData = [];
                    
                    // Map CSV columns to database fields
                    foreach ($mapping as $dbField => $csvColumn) {
                        if (!empty($csvColumn) && isset($row[$csvColumn])) {
                            $value = $row[$csvColumn];
                            
                            // Handle boolean fields
                            if ($dbField === 'active') {
                                $value = in_array(strtolower($value), ['sim', 'yes', '1', 'true', 'ativo']);
                            }
                            
                            // Handle numeric fields
                            if (in_array($dbField, ['unit_cost', 'available_quantity', 'minimum_quantity', 'maximum_quantity'])) {
                                $value = floatval(str_replace(',', '.', $value));
                            }
                            
                            $mappedData[$dbField] = $value;
                        }
                    }
                    
                    // Ensure required fields
                    if (empty($mappedData['part_number'])) {
                        throw new \Exception('Part Number é obrigatório');
                    }
                    
                    // Set defaults
                    $mappedData['active'] = $mappedData['active'] ?? true;
                    
                    $partNumber = $mappedData['part_number'];
                    
                    if ($updateExisting) {
                        $part = Part::updateOrCreate(
                            ['part_number' => $partNumber],
                            $mappedData
                        );
                        if ($part->wasRecentlyCreated) {
                            $imported++;
                        } else {
                            $updated++;
                        }
                    } else {
                        if (Part::where('part_number', $partNumber)->exists()) {
                            $skipped++;
                            continue;
                        }
                        Part::create($mappedData);
                        $imported++;
                    }
                } catch (\Exception $e) {
                    $errors[] = [
                        'line' => $index + 2, // +2 because index is 0-based and we have a header
                        'part_number' => $mappedData['part_number'] ?? 'N/A',
                        'error' => $e->getMessage()
                    ];
                }
            }
        });
        
        // Clean up uploaded file
        if (file_exists($filePath)) {
            unlink($filePath);
        }
        
        return response()->json([
            'success' => true,
            'imported' => $imported,
            'updated' => $updated,
            'skipped' => $skipped,
            'errors' => $errors,
        ]);
    }
}