<?php

namespace Database\Seeders;

use App\Models\WorkOrders\WorkOrderDisciplineConfig;
use Illuminate\Database\Seeder;

class WorkOrderDisciplineConfigSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $configs = [
            [
                'discipline' => 'maintenance',
                'allowed_categories' => ['preventive', 'corrective', 'inspection', 'project'],
                'allowed_sources' => ['manual', 'routine', 'sensor', 'inspection'],
                'requires_compliance_fields' => false,
                'requires_calibration_tracking' => false,
                'custom_fields' => null,
            ],
            [
                'discipline' => 'quality',
                'allowed_categories' => ['calibration', 'quality_control', 'quality_audit', 'non_conformance'],
                'allowed_sources' => ['manual', 'calibration_schedule', 'quality_alert', 'audit', 'complaint'],
                'requires_compliance_fields' => true,
                'requires_calibration_tracking' => true,
                'custom_fields' => [
                    'certificate_fields' => ['certificate_number', 'issuing_body', 'issue_date', 'expiry_date'],
                    'compliance_fields' => ['compliance_standard', 'audit_checklist', 'non_conformance_type'],
                ],
            ],
        ];

        foreach ($configs as $config) {
            WorkOrderDisciplineConfig::create($config);
        }
    }
} 