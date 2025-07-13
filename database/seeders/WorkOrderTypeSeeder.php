<?php

namespace Database\Seeders;

use App\Models\WorkOrders\WorkOrderType;
use Illuminate\Database\Seeder;

class WorkOrderTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $types = [
            // Preventive
            [
                'name' => 'Manutenção Preventiva por Tempo',
                'code' => 'PM_TIME',
                'category' => 'preventive',
                'description' => 'Manutenção realizada em intervalos de tempo regulares',
                'color' => '#10B981',
                'icon' => 'clock',
                'requires_approval' => false,
                'default_priority' => 'normal',
                'sla_hours' => 48,
                'is_active' => true,
            ],
            [
                'name' => 'Manutenção Preventiva por Condição',
                'code' => 'PM_CONDITION',
                'category' => 'preventive',
                'description' => 'Manutenção baseada na condição do equipamento',
                'color' => '#10B981',
                'icon' => 'activity',
                'requires_approval' => false,
                'default_priority' => 'normal',
                'sla_hours' => 72,
                'is_active' => true,
            ],
            [
                'name' => 'Lubrificação',
                'code' => 'PM_LUBRICATION',
                'category' => 'preventive',
                'description' => 'Atividades de lubrificação programada',
                'color' => '#10B981',
                'icon' => 'droplet',
                'requires_approval' => false,
                'default_priority' => 'low',
                'sla_hours' => 24,
                'is_active' => true,
            ],
            
            // Corrective
            [
                'name' => 'Reparo Emergencial',
                'code' => 'CM_EMERGENCY',
                'category' => 'corrective',
                'description' => 'Reparo imediato de falhas críticas',
                'color' => '#EF4444',
                'icon' => 'alert-triangle',
                'requires_approval' => false,
                'default_priority' => 'urgent',
                'sla_hours' => 4,
                'is_active' => true,
            ],
            [
                'name' => 'Reparo Programado',
                'code' => 'CM_SCHEDULED',
                'category' => 'corrective',
                'description' => 'Reparo de falhas não críticas',
                'color' => '#F59E0B',
                'icon' => 'tool',
                'requires_approval' => true,
                'default_priority' => 'high',
                'sla_hours' => 24,
                'is_active' => true,
            ],
            [
                'name' => 'Substituição de Componente',
                'code' => 'CM_REPLACEMENT',
                'category' => 'corrective',
                'description' => 'Troca de peças ou componentes defeituosos',
                'color' => '#F59E0B',
                'icon' => 'refresh-cw',
                'requires_approval' => true,
                'default_priority' => 'high',
                'sla_hours' => 48,
                'is_active' => true,
            ],
            
            // Inspection
            [
                'name' => 'Inspeção Visual',
                'code' => 'INSP_VISUAL',
                'category' => 'inspection',
                'description' => 'Inspeção visual de rotina',
                'color' => '#3B82F6',
                'icon' => 'eye',
                'requires_approval' => false,
                'default_priority' => 'low',
                'sla_hours' => 168,
                'is_active' => true,
            ],
            [
                'name' => 'Inspeção Termográfica',
                'code' => 'INSP_THERMAL',
                'category' => 'inspection',
                'description' => 'Inspeção com câmera termográfica',
                'color' => '#3B82F6',
                'icon' => 'thermometer',
                'requires_approval' => false,
                'default_priority' => 'normal',
                'sla_hours' => 72,
                'is_active' => true,
            ],
            [
                'name' => 'Análise de Vibração',
                'code' => 'INSP_VIBRATION',
                'category' => 'inspection',
                'description' => 'Medição e análise de vibração',
                'color' => '#3B82F6',
                'icon' => 'activity',
                'requires_approval' => false,
                'default_priority' => 'normal',
                'sla_hours' => 72,
                'is_active' => true,
            ],
            [
                'name' => 'Análise de Óleo',
                'code' => 'INSP_OIL',
                'category' => 'inspection',
                'description' => 'Coleta e análise de amostras de óleo',
                'color' => '#3B82F6',
                'icon' => 'droplet',
                'requires_approval' => false,
                'default_priority' => 'low',
                'sla_hours' => 168,
                'is_active' => true,
            ],
            
            // Project
            [
                'name' => 'Instalação de Equipamento',
                'code' => 'PROJ_INSTALL',
                'category' => 'project',
                'description' => 'Instalação de novo equipamento',
                'color' => '#8B5CF6',
                'icon' => 'package',
                'requires_approval' => true,
                'default_priority' => 'normal',
                'sla_hours' => null,
                'is_active' => true,
            ],
            [
                'name' => 'Modernização',
                'code' => 'PROJ_UPGRADE',
                'category' => 'project',
                'description' => 'Atualização ou modernização de equipamento',
                'color' => '#8B5CF6',
                'icon' => 'trending-up',
                'requires_approval' => true,
                'default_priority' => 'normal',
                'sla_hours' => null,
                'is_active' => true,
            ],
            [
                'name' => 'Melhoria',
                'code' => 'PROJ_IMPROVEMENT',
                'category' => 'project',
                'description' => 'Projeto de melhoria contínua',
                'color' => '#8B5CF6',
                'icon' => 'zap',
                'requires_approval' => true,
                'default_priority' => 'low',
                'sla_hours' => null,
                'is_active' => true,
            ],
        ];

        foreach ($types as $type) {
            WorkOrderType::create($type);
        }
    }
}