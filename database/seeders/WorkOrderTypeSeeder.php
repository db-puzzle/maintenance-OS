<?php

namespace Database\Seeders;

use App\Models\WorkOrders\WorkOrderType;
use App\Models\WorkOrders\WorkOrderCategory;
use Illuminate\Database\Seeder;

class WorkOrderTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get categories by code for easy reference
        $categories = WorkOrderCategory::all()->keyBy('code');
        
        $types = [
            // Most Common - Daily/Weekly Operations
            [
                'name' => 'Manutenção Preventiva por Tempo',
                'code' => 'PM_TIME',
                'work_order_category_id' => $categories['preventive']->id,
                'description' => 'Manutenção realizada em intervalos de tempo regulares',
                'color' => '#10B981',
                'icon' => 'clock',
                'requires_approval' => false,
                'auto_approve_from_routine' => true,
                'default_priority_score' => 50,
                'sla_hours' => 48,
                'is_active' => true,
            ],
            [
                'name' => 'Lubrificação',
                'code' => 'PM_LUBRICATION',
                'work_order_category_id' => $categories['preventive']->id,
                'description' => 'Atividades de lubrificação programada',
                'color' => '#10B981',
                'icon' => 'droplet',
                'requires_approval' => false,
                'auto_approve_from_routine' => true,
                'default_priority_score' => 30,
                'sla_hours' => 24,
                'is_active' => true,
            ],
            [
                'name' => 'Inspeção Visual',
                'code' => 'INSP_VISUAL',
                'work_order_category_id' => $categories['inspection']->id,
                'description' => 'Inspeção visual de rotina',
                'color' => '#3B82F6',
                'icon' => 'eye',
                'requires_approval' => false,
                'default_priority_score' => 30,
                'sla_hours' => 168,
                'is_active' => true,
            ],
            
            // Common - Emergency and Scheduled Repairs
            [
                'name' => 'Reparo Emergencial',
                'code' => 'CM_EMERGENCY',
                'work_order_category_id' => $categories['corrective']->id,
                'description' => 'Reparo imediato de falhas críticas',
                'color' => '#EF4444',
                'icon' => 'alert-triangle',
                'requires_approval' => false,
                'default_priority_score' => 80,
                'sla_hours' => 4,
                'is_active' => true,
            ],
            [
                'name' => 'Reparo Programado',
                'code' => 'CM_SCHEDULED',
                'work_order_category_id' => $categories['corrective']->id,
                'description' => 'Reparo de falhas não críticas',
                'color' => '#F59E0B',
                'icon' => 'tool',
                'requires_approval' => true,
                'default_priority_score' => 70,
                'sla_hours' => 24,
                'is_active' => true,
            ],
            
            // Moderate - Condition-based and Component Work
            [
                'name' => 'Manutenção Preventiva por Condição',
                'code' => 'PM_CONDITION',
                'work_order_category_id' => $categories['preventive']->id,
                'description' => 'Manutenção baseada na condição do equipamento',
                'color' => '#10B981',
                'icon' => 'activity',
                'requires_approval' => false,
                'auto_approve_from_routine' => true,
                'default_priority_score' => 50,
                'sla_hours' => 72,
                'is_active' => true,
            ],
            [
                'name' => 'Substituição de Componente',
                'code' => 'CM_REPLACEMENT',
                'work_order_category_id' => $categories['corrective']->id,
                'description' => 'Troca de peças ou componentes defeituosos',
                'color' => '#F59E0B',
                'icon' => 'refresh-cw',
                'requires_approval' => true,
                'default_priority_score' => 70,
                'sla_hours' => 48,
                'is_active' => true,
            ],
            
            // Less Common - Specialized Inspections
            [
                'name' => 'Inspeção Termográfica',
                'code' => 'INSP_THERMAL',
                'work_order_category_id' => $categories['inspection']->id,
                'description' => 'Inspeção com câmera termográfica',
                'color' => '#3B82F6',
                'icon' => 'thermometer',
                'requires_approval' => false,
                'default_priority_score' => 50,
                'sla_hours' => 72,
                'is_active' => true,
            ],
            [
                'name' => 'Análise de Vibração',
                'code' => 'INSP_VIBRATION',
                'work_order_category_id' => $categories['inspection']->id,
                'description' => 'Medição e análise de vibração',
                'color' => '#3B82F6',
                'icon' => 'activity',
                'requires_approval' => false,
                'default_priority_score' => 50,
                'sla_hours' => 72,
                'is_active' => true,
            ],
            [
                'name' => 'Análise de Óleo',
                'code' => 'INSP_OIL',
                'work_order_category_id' => $categories['inspection']->id,
                'description' => 'Coleta e análise de amostras de óleo',
                'color' => '#3B82F6',
                'icon' => 'droplet',
                'requires_approval' => false,
                'default_priority_score' => 30,
                'sla_hours' => 168,
                'is_active' => true,
            ],
            
            // Least Common - Project Work
            [
                'name' => 'Instalação de Equipamento',
                'code' => 'PROJ_INSTALL',
                'work_order_category_id' => $categories['project']->id,
                'description' => 'Instalação de novo equipamento',
                'color' => '#8B5CF6',
                'icon' => 'package',
                'requires_approval' => true,
                'default_priority_score' => 50,
                'sla_hours' => null,
                'is_active' => true,
            ],
            [
                'name' => 'Modernização',
                'code' => 'PROJ_UPGRADE',
                'work_order_category_id' => $categories['project']->id,
                'description' => 'Atualização ou modernização de equipamento',
                'color' => '#8B5CF6',
                'icon' => 'trending-up',
                'requires_approval' => true,
                'default_priority_score' => 50,
                'sla_hours' => null,
                'is_active' => true,
            ],
            [
                'name' => 'Melhoria',
                'code' => 'PROJ_IMPROVEMENT',
                'work_order_category_id' => $categories['project']->id,
                'description' => 'Projeto de melhoria contínua',
                'color' => '#8B5CF6',
                'icon' => 'zap',
                'requires_approval' => true,
                'default_priority_score' => 30,
                'sla_hours' => null,
                'is_active' => true,
            ],
        ];

        foreach ($types as $type) {
            WorkOrderType::create($type);
        }
    }
}