<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class WorkOrderTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $types = [
            [
                'name' => 'Preventive - Routine',
                'code' => 'pm_routine',
                'category' => 'preventive',
                'description' => 'Scheduled preventive maintenance from routines',
                'color' => '#10B981',
                'icon' => 'calendar-check',
                'default_priority' => 'normal',
                'requires_approval' => false,
                'auto_approve_from_routine' => true,
                'sla_hours' => 48,
                'is_active' => true,
            ],
            [
                'name' => 'Preventive - Scheduled',
                'code' => 'pm_scheduled',
                'category' => 'preventive',
                'description' => 'Manually scheduled preventive maintenance',
                'color' => '#34D399',
                'icon' => 'calendar',
                'default_priority' => 'normal',
                'requires_approval' => true,
                'auto_approve_from_routine' => false,
                'sla_hours' => 72,
                'is_active' => true,
            ],
            [
                'name' => 'Corrective - Mechanical',
                'code' => 'cm_mechanical',
                'category' => 'corrective',
                'description' => 'Mechanical failures and repairs',
                'color' => '#EF4444',
                'icon' => 'wrench',
                'default_priority' => 'high',
                'requires_approval' => true,
                'auto_approve_from_routine' => false,
                'sla_hours' => 24,
                'is_active' => true,
            ],
            [
                'name' => 'Corrective - Electrical',
                'code' => 'cm_electrical',
                'category' => 'corrective',
                'description' => 'Electrical failures and repairs',
                'color' => '#F59E0B',
                'icon' => 'bolt',
                'default_priority' => 'high',
                'requires_approval' => true,
                'auto_approve_from_routine' => false,
                'sla_hours' => 24,
                'is_active' => true,
            ],
            [
                'name' => 'Inspection - Safety',
                'code' => 'insp_safety',
                'category' => 'inspection',
                'description' => 'Safety inspections and audits',
                'color' => '#8B5CF6',
                'icon' => 'shield-check',
                'default_priority' => 'normal',
                'requires_approval' => false,
                'auto_approve_from_routine' => false,
                'sla_hours' => 96,
                'is_active' => true,
            ],
            [
                'name' => 'Inspection - Quality',
                'code' => 'insp_quality',
                'category' => 'inspection',
                'description' => 'Quality control inspections',
                'color' => '#6366F1',
                'icon' => 'clipboard-check',
                'default_priority' => 'normal',
                'requires_approval' => false,
                'auto_approve_from_routine' => false,
                'sla_hours' => 96,
                'is_active' => true,
            ],
            [
                'name' => 'Project - Improvement',
                'code' => 'proj_improvement',
                'category' => 'project',
                'description' => 'Improvement projects and upgrades',
                'color' => '#3B82F6',
                'icon' => 'chart-line',
                'default_priority' => 'low',
                'requires_approval' => true,
                'auto_approve_from_routine' => false,
                'sla_hours' => null,
                'is_active' => true,
            ],
        ];

        foreach ($types as $type) {
            DB::table('work_order_types')->updateOrInsert(
                ['code' => $type['code']],
                array_merge($type, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }
    }
}