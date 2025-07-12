<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class FailureAnalysisSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Seed Failure Modes
        $failureModes = [
            // Mechanical
            ['name' => 'Bearing Failure', 'code' => 'bearing_fail', 'category' => 'mechanical', 'description' => 'Bearing worn out or damaged'],
            ['name' => 'Shaft Misalignment', 'code' => 'shaft_misalign', 'category' => 'mechanical', 'description' => 'Shaft not properly aligned'],
            ['name' => 'Seal Leakage', 'code' => 'seal_leak', 'category' => 'mechanical', 'description' => 'Seal failure causing leakage'],
            ['name' => 'Vibration Excessive', 'code' => 'vibration', 'category' => 'mechanical', 'description' => 'Excessive vibration detected'],
            ['name' => 'Corrosion', 'code' => 'corrosion', 'category' => 'mechanical', 'description' => 'Corrosion damage'],
            
            // Electrical
            ['name' => 'Motor Burnout', 'code' => 'motor_burnout', 'category' => 'electrical', 'description' => 'Motor windings burned out'],
            ['name' => 'Short Circuit', 'code' => 'short_circuit', 'category' => 'electrical', 'description' => 'Electrical short circuit'],
            ['name' => 'Insulation Failure', 'code' => 'insulation_fail', 'category' => 'electrical', 'description' => 'Insulation breakdown'],
            ['name' => 'Control Failure', 'code' => 'control_fail', 'category' => 'electrical', 'description' => 'Control system malfunction'],
            ['name' => 'Power Loss', 'code' => 'power_loss', 'category' => 'electrical', 'description' => 'Loss of power supply'],
            
            // Process
            ['name' => 'Overheating', 'code' => 'overheat', 'category' => 'process', 'description' => 'Equipment overheating'],
            ['name' => 'Contamination', 'code' => 'contamination', 'category' => 'process', 'description' => 'Product or system contamination'],
            ['name' => 'Flow Restriction', 'code' => 'flow_restrict', 'category' => 'process', 'description' => 'Restricted flow in system'],
            ['name' => 'Pressure Loss', 'code' => 'pressure_loss', 'category' => 'process', 'description' => 'Loss of system pressure'],
        ];

        foreach ($failureModes as $mode) {
            DB::table('failure_modes')->updateOrInsert(
                ['code' => $mode['code']],
                array_merge($mode, [
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }

        // Seed Root Causes
        $rootCauses = [
            // Maintenance
            ['name' => 'Lack of Lubrication', 'code' => 'no_lubrication', 'category' => 'maintenance', 'description' => 'Insufficient or missing lubrication'],
            ['name' => 'Poor Maintenance', 'code' => 'poor_maint', 'category' => 'maintenance', 'description' => 'Inadequate maintenance practices'],
            ['name' => 'Wrong Part Installed', 'code' => 'wrong_part', 'category' => 'maintenance', 'description' => 'Incorrect replacement part used'],
            ['name' => 'Maintenance Not Performed', 'code' => 'no_maint', 'category' => 'maintenance', 'description' => 'Scheduled maintenance skipped'],
            
            // Design
            ['name' => 'Design Deficiency', 'code' => 'design_flaw', 'category' => 'design', 'description' => 'Equipment design inadequate'],
            ['name' => 'Undersized Equipment', 'code' => 'undersized', 'category' => 'design', 'description' => 'Equipment capacity insufficient'],
            ['name' => 'Material Defect', 'code' => 'material_defect', 'category' => 'design', 'description' => 'Defective materials used'],
            
            // Operation
            ['name' => 'Operator Error', 'code' => 'operator_error', 'category' => 'operation', 'description' => 'Incorrect operation by user'],
            ['name' => 'Overload Condition', 'code' => 'overload', 'category' => 'operation', 'description' => 'Equipment operated beyond capacity'],
            ['name' => 'Abnormal Operating Conditions', 'code' => 'abnormal_ops', 'category' => 'operation', 'description' => 'Operation outside normal parameters'],
            
            // External
            ['name' => 'Power Surge', 'code' => 'power_surge', 'category' => 'external', 'description' => 'External power surge'],
            ['name' => 'Environmental Conditions', 'code' => 'environment', 'category' => 'external', 'description' => 'Harsh environmental factors'],
            ['name' => 'Normal Wear', 'code' => 'normal_wear', 'category' => 'external', 'description' => 'Expected end of life wear'],
        ];

        foreach ($rootCauses as $cause) {
            DB::table('root_causes')->updateOrInsert(
                ['code' => $cause['code']],
                array_merge($cause, [
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }

        // Seed Immediate Causes
        $immediateCauses = [
            ['name' => 'Vibration', 'code' => 'vibration', 'description' => 'Excessive vibration'],
            ['name' => 'Temperature', 'code' => 'temperature', 'description' => 'Abnormal temperature'],
            ['name' => 'Contamination', 'code' => 'contamination', 'description' => 'Foreign material contamination'],
            ['name' => 'Fatigue', 'code' => 'fatigue', 'description' => 'Material fatigue'],
            ['name' => 'Corrosion', 'code' => 'corrosion', 'description' => 'Corrosive damage'],
            ['name' => 'Electrical Fault', 'code' => 'electrical', 'description' => 'Electrical system fault'],
            ['name' => 'Mechanical Damage', 'code' => 'mechanical', 'description' => 'Physical/mechanical damage'],
            ['name' => 'Blockage', 'code' => 'blockage', 'description' => 'System blockage'],
            ['name' => 'Leakage', 'code' => 'leakage', 'description' => 'Fluid or gas leakage'],
            ['name' => 'Misalignment', 'code' => 'misalignment', 'description' => 'Component misalignment'],
        ];

        foreach ($immediateCauses as $cause) {
            DB::table('immediate_causes')->updateOrInsert(
                ['code' => $cause['code']],
                array_merge($cause, [
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }
    }
}