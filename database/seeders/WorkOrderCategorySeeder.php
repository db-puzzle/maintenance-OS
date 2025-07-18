<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class WorkOrderCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            // Maintenance Categories
            [
                'discipline' => 'maintenance',
                'name' => 'Manutenção Preventiva',
                'code' => 'preventive',
                'description' => 'Manutenção programada para prevenir falhas',
                'color' => '#10B981',
                'icon' => 'shield-check',
                'display_order' => 1,
                'is_active' => true,
            ],
            [
                'discipline' => 'maintenance',
                'name' => 'Manutenção Corretiva',
                'code' => 'corrective',
                'description' => 'Reparo de falhas e quebras',
                'color' => '#EF4444',
                'icon' => 'wrench',
                'display_order' => 2,
                'is_active' => true,
            ],
            [
                'discipline' => 'maintenance',
                'name' => 'Inspeção',
                'code' => 'inspection',
                'description' => 'Inspeções e verificações de condição',
                'color' => '#3B82F6',
                'icon' => 'search',
                'display_order' => 3,
                'is_active' => true,
            ],
            [
                'discipline' => 'maintenance',
                'name' => 'Projeto',
                'code' => 'project',
                'description' => 'Projetos de melhoria e modificação',
                'color' => '#8B5CF6',
                'icon' => 'briefcase',
                'display_order' => 4,
                'is_active' => true,
            ],
            
            // Quality Categories
            [
                'discipline' => 'quality',
                'name' => 'Calibração',
                'code' => 'calibration',
                'description' => 'Calibração de instrumentos de medição',
                'color' => '#F59E0B',
                'icon' => 'gauge',
                'display_order' => 1,
                'is_active' => true,
            ],
            [
                'discipline' => 'quality',
                'name' => 'Controle de Qualidade',
                'code' => 'quality_control',
                'description' => 'Atividades de controle de qualidade',
                'color' => '#10B981',
                'icon' => 'check-circle',
                'display_order' => 2,
                'is_active' => true,
            ],
            [
                'discipline' => 'quality',
                'name' => 'Auditoria de Qualidade',
                'code' => 'quality_audit',
                'description' => 'Auditorias do sistema de qualidade',
                'color' => '#6366F1',
                'icon' => 'clipboard-check',
                'display_order' => 3,
                'is_active' => true,
            ],
            [
                'discipline' => 'quality',
                'name' => 'Não Conformidade',
                'code' => 'non_conformance',
                'description' => 'Gestão de não conformidades e desvios',
                'color' => '#DC2626',
                'icon' => 'alert-triangle',
                'display_order' => 4,
                'is_active' => true,
            ],
        ];

        foreach ($categories as $category) {
            DB::table('work_order_categories')->insert([
                ...$category,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
