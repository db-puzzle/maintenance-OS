<?php

namespace Database\Seeders;

use App\Models\MachineType;
use Illuminate\Database\Seeder;

class MachineTypeSeeder extends Seeder
{
    public function run(): void
    {
        MachineType::create([
            'name' => 'Bomba',
            'description' => 'Equipamentos para movimentação de fluidos'
        ]);

        MachineType::create([
            'name' => 'Motor Elétrico',
            'description' => 'Motores para acionamento de equipamentos'
        ]);

        MachineType::create([
            'name' => 'Válvula',
            'description' => 'Equipamentos para controle de fluxo'
        ]);

        MachineType::create([
            'name' => 'Compressor',
            'description' => 'Equipamentos para compressão de gases'
        ]);

        MachineType::create([
            'name' => 'Trocador de Calor',
            'description' => 'Equipamentos para troca térmica'
        ]);
    }
} 