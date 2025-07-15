<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Part;

class PartSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $parts = [
            // Mechanical Seals
            [
                'part_number' => 'MS-2340',
                'name' => 'Selo Mecânico 2340',
                'description' => 'Selo mecânico para bombas centrífugas',
                'unit_cost' => 450.00,
                'available_quantity' => 15,
                'minimum_quantity' => 5,
                'maximum_quantity' => 50,
                'location' => 'A1-P2-01',
                'supplier' => 'John Crane',
                'manufacturer' => 'John Crane',
            ],
            [
                'part_number' => 'MS-2350',
                'name' => 'Selo Mecânico 2350',
                'description' => 'Selo mecânico para bombas de alta pressão',
                'unit_cost' => 680.00,
                'available_quantity' => 8,
                'minimum_quantity' => 3,
                'maximum_quantity' => 30,
                'location' => 'A1-P2-02',
                'supplier' => 'John Crane',
                'manufacturer' => 'John Crane',
            ],
            
            // O-Rings
            [
                'part_number' => 'OR-125',
                'name' => 'O-Ring 125mm',
                'description' => 'O-Ring de borracha nitrílica 125mm',
                'unit_cost' => 25.00,
                'available_quantity' => 100,
                'minimum_quantity' => 20,
                'maximum_quantity' => 200,
                'location' => 'A2-P1-05',
                'supplier' => 'Vedações Brasil',
                'manufacturer' => 'Parker',
            ],
            [
                'part_number' => 'OR-150',
                'name' => 'O-Ring 150mm',
                'description' => 'O-Ring de borracha nitrílica 150mm',
                'unit_cost' => 35.00,
                'available_quantity' => 75,
                'minimum_quantity' => 15,
                'maximum_quantity' => 150,
                'location' => 'A2-P1-06',
                'supplier' => 'Vedações Brasil',
                'manufacturer' => 'Parker',
            ],
            
            // Bearings
            [
                'part_number' => '6205-2RS',
                'name' => 'Rolamento 6205-2RS',
                'description' => 'Rolamento de esferas com vedação dupla',
                'unit_cost' => 180.00,
                'available_quantity' => 25,
                'minimum_quantity' => 10,
                'maximum_quantity' => 100,
                'location' => 'A3-P1-01',
                'supplier' => 'SKF Brasil',
                'manufacturer' => 'SKF',
            ],
            [
                'part_number' => '6206-2RS',
                'name' => 'Rolamento 6206-2RS',
                'description' => 'Rolamento de esferas com vedação dupla',
                'unit_cost' => 220.00,
                'available_quantity' => 20,
                'minimum_quantity' => 8,
                'maximum_quantity' => 80,
                'location' => 'A3-P1-02',
                'supplier' => 'SKF Brasil',
                'manufacturer' => 'SKF',
            ],
            
            // Lubricants
            [
                'part_number' => 'OIL-ISO-VG46',
                'name' => 'Óleo ISO VG 46',
                'description' => 'Óleo lubrificante industrial ISO VG 46',
                'unit_cost' => 45.00,
                'available_quantity' => 200,
                'minimum_quantity' => 50,
                'maximum_quantity' => 500,
                'location' => 'B1-L1-01',
                'supplier' => 'Shell Brasil',
                'manufacturer' => 'Shell',
            ],
            [
                'part_number' => 'OIL-ISO-VG68',
                'name' => 'Óleo ISO VG 68',
                'description' => 'Óleo lubrificante industrial ISO VG 68',
                'unit_cost' => 48.00,
                'available_quantity' => 150,
                'minimum_quantity' => 40,
                'maximum_quantity' => 400,
                'location' => 'B1-L1-02',
                'supplier' => 'Shell Brasil',
                'manufacturer' => 'Shell',
            ],
            
            // Filters
            [
                'part_number' => 'FLT-OIL-001',
                'name' => 'Filtro de Óleo P001',
                'description' => 'Filtro de óleo para bombas',
                'unit_cost' => 85.00,
                'available_quantity' => 40,
                'minimum_quantity' => 10,
                'maximum_quantity' => 100,
                'location' => 'B2-F1-01',
                'supplier' => 'Filtros Industriais',
                'manufacturer' => 'Mann Filter',
            ],
            [
                'part_number' => 'FLT-AIR-001',
                'name' => 'Filtro de Ar A001',
                'description' => 'Filtro de ar para compressores',
                'unit_cost' => 120.00,
                'available_quantity' => 30,
                'minimum_quantity' => 8,
                'maximum_quantity' => 80,
                'location' => 'B2-F2-01',
                'supplier' => 'Filtros Industriais',
                'manufacturer' => 'Mann Filter',
            ],
            
            // Belts
            [
                'part_number' => 'BELT-V-A85',
                'name' => 'Correia V A85',
                'description' => 'Correia em V perfil A 85"',
                'unit_cost' => 65.00,
                'available_quantity' => 50,
                'minimum_quantity' => 15,
                'maximum_quantity' => 150,
                'location' => 'C1-B1-01',
                'supplier' => 'Gates Brasil',
                'manufacturer' => 'Gates',
            ],
            [
                'part_number' => 'BELT-V-B120',
                'name' => 'Correia V B120',
                'description' => 'Correia em V perfil B 120"',
                'unit_cost' => 95.00,
                'available_quantity' => 35,
                'minimum_quantity' => 10,
                'maximum_quantity' => 100,
                'location' => 'C1-B1-02',
                'supplier' => 'Gates Brasil',
                'manufacturer' => 'Gates',
            ],
            
            // Gaskets
            [
                'part_number' => 'GSK-FLG-150',
                'name' => 'Junta para Flange 150#',
                'description' => 'Junta de papelão hidráulico para flange 150#',
                'unit_cost' => 15.00,
                'available_quantity' => 200,
                'minimum_quantity' => 50,
                'maximum_quantity' => 500,
                'location' => 'C2-G1-01',
                'supplier' => 'Teadit',
                'manufacturer' => 'Teadit',
            ],
            
            // Electrical
            [
                'part_number' => 'CONT-3P-25A',
                'name' => 'Contator 3P 25A',
                'description' => 'Contator tripolar 25A 220V',
                'unit_cost' => 280.00,
                'available_quantity' => 15,
                'minimum_quantity' => 5,
                'maximum_quantity' => 50,
                'location' => 'D1-E1-01',
                'supplier' => 'WEG',
                'manufacturer' => 'WEG',
            ],
            [
                'part_number' => 'REL-TERM-10A',
                'name' => 'Relé Térmico 10A',
                'description' => 'Relé térmico de sobrecarga 7-10A',
                'unit_cost' => 195.00,
                'available_quantity' => 20,
                'minimum_quantity' => 5,
                'maximum_quantity' => 50,
                'location' => 'D1-E2-01',
                'supplier' => 'WEG',
                'manufacturer' => 'WEG',
            ],
        ];

        foreach ($parts as $part) {
            Part::create($part);
        }
    }
}
