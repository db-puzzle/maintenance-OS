import { addDays, addHours, startOfDay, subDays } from 'date-fns';
import type {
    ManufacturingOrder,
    ManufacturingRoute,
    ManufacturingStep,
    WorkCell,
    Item
} from '@/types/production';
import type {
    ScheduleAlert,
    ScheduleVersion
} from '@/types/scheduler';
import type { User } from '@/types';

// Helper function to generate dates
const today = startOfDay(new Date());
const yesterday = subDays(today, 1);
const twoDaysAgo = subDays(today, 2);
const threeDaysAgo = subDays(today, 3);
const tomorrow = addDays(today, 1);
const nextWeek = addDays(today, 7);
const threeDaysFromNow = addDays(today, 3);
const fiveDaysFromNow = addDays(today, 5);

// Helper function to create manufacturing step for schedule
function createScheduleStep(step: ManufacturingStep, route: ManufacturingRoute, order: ManufacturingOrder, item: Item) {
    return {
        id: step.id,
        name: step.name,
        description: step.description,
        setup_time_minutes: step.setup_time_minutes,
        cycle_time_minutes: step.cycle_time_minutes,
        status: step.status,
        depends_on_step_id: step.depends_on_step_id,
        manufacturing_route: {
            id: route.id,
            manufacturing_order_id: route.manufacturing_order_id!,
            manufacturing_order: {
                id: order.id,
                order_number: order.order_number,
                quantity: order.quantity,
                status: order.status,
                priority: order.priority,
                requested_date: order.requested_date,
                item: {
                    id: item.id,
                    name: item.name,
                    item_number: item.item_number,
                },
            },
        },
        dependency: step.depends_on_step_id ? {
            id: step.depends_on_step_id,
            name: `Step ${step.depends_on_step_id}`,
        } : undefined,
    };
}

export function getCleanDummyData() {
    // Users for assignments
    const users: User[] = [
        {
            id: 1,
            name: 'System Scheduler',
            email: 'scheduler@system.com',
            email_verified_at: '2024-01-01T00:00:00Z',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        },
        {
            id: 2,
            name: 'Production Manager',
            email: 'manager@system.com',
            email_verified_at: '2024-01-01T00:00:00Z',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        },
    ];

    // Items - Products that can be manufactured
    const items: Item[] = [
        {
            id: 1,
            name: 'Engine Assembly',
            code: 'ENG-001',
            item_number: 'ENG-001',
            description: 'Complete engine assembly with electronic control',
            can_be_sold: true,
            can_be_purchased: false,
            can_be_manufactured: true,
            is_phantom: false,
            is_active: true,
            status: 'active',
            unit_of_measure: 'units',
            manufacturing_lead_time_days: 5,
            purchase_lead_time_days: 0,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        },
        {
            id: 2,
            name: 'Engine Block',
            code: 'BLK-001',
            item_number: 'BLK-001',
            description: 'Cast iron engine block',
            can_be_sold: false,
            can_be_purchased: true,
            can_be_manufactured: true,
            is_phantom: false,
            is_active: true,
            status: 'active',
            unit_of_measure: 'units',
            manufacturing_lead_time_days: 3,
            purchase_lead_time_days: 7,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        },
        {
            id: 3,
            name: 'Piston Assembly',
            code: 'PST-001',
            item_number: 'PST-001',
            description: 'Piston with rings and connecting rod',
            can_be_sold: false,
            can_be_purchased: false,
            can_be_manufactured: true,
            is_phantom: false,
            is_active: true,
            status: 'active',
            unit_of_measure: 'units',
            manufacturing_lead_time_days: 2,
            purchase_lead_time_days: 0,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        },
        {
            id: 4,
            name: 'Electronic Control Module',
            code: 'ECM-001',
            item_number: 'ECM-001',
            description: 'Engine control unit with programming',
            can_be_sold: false,
            can_be_purchased: true,
            can_be_manufactured: true,
            is_phantom: false,
            is_active: true,
            status: 'active',
            unit_of_measure: 'units',
            manufacturing_lead_time_days: 1,
            purchase_lead_time_days: 5,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        },
        {
            id: 5,
            name: 'Crankshaft',
            code: 'CRK-001',
            item_number: 'CRK-001',
            description: 'Forged steel crankshaft',
            can_be_sold: false,
            can_be_purchased: true,
            can_be_manufactured: false,
            is_phantom: false,
            is_active: true,
            status: 'active',
            unit_of_measure: 'units',
            manufacturing_lead_time_days: 0,
            purchase_lead_time_days: 10,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        },
    ];

    // Work Cells
    const workCells: WorkCell[] = [
        {
            id: 1,
            name: 'CNC Machine 1',
            description: 'High precision CNC machining center',
            cell_type: 'internal',
            has_finite_capacity: true,
            default_production_rate_per_hour: 10,
            default_unit_of_measure: 'units',
            default_setup_time_minutes: 30,
            max_parallel_executions: 1,
            is_active: true,
            area_id: 1,
            area: {
                id: 1,
                name: 'Machining Area',
                description: 'Main machining area',
                plant_id: 1,
            },
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        },
        {
            id: 2,
            name: 'Assembly Station A',
            description: 'Manual assembly workstation',
            cell_type: 'internal',
            has_finite_capacity: true,
            default_production_rate_per_hour: 20,
            default_unit_of_measure: 'units',
            default_setup_time_minutes: 15,
            max_parallel_executions: 2,
            is_active: true,
            area_id: 2,
            area: {
                id: 2,
                name: 'Assembly Area',
                description: 'Main assembly area',
                plant_id: 1,
            },
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        },
        {
            id: 3,
            name: 'Test Bench 1',
            description: 'Engine testing and calibration',
            cell_type: 'internal',
            has_finite_capacity: true,
            default_production_rate_per_hour: 5,
            default_unit_of_measure: 'units',
            default_setup_time_minutes: 45,
            max_parallel_executions: 1,
            is_active: true,
            area_id: 3,
            area: {
                id: 3,
                name: 'Quality Control',
                description: 'Testing and quality assurance',
                plant_id: 1,
            },
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        },
        {
            id: 4,
            name: 'Programming Station',
            description: 'ECM programming and configuration',
            cell_type: 'internal',
            has_finite_capacity: true,
            default_production_rate_per_hour: 30,
            default_unit_of_measure: 'units',
            default_setup_time_minutes: 10,
            max_parallel_executions: 3,
            is_active: true,
            area_id: 3,
            area: {
                id: 3,
                name: 'Quality Control',
                description: 'Testing and quality assurance',
                plant_id: 1,
            },
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        },
        {
            id: 5,
            name: 'Packaging Line 1',
            description: 'Final packaging and shipping prep',
            cell_type: 'internal',
            has_finite_capacity: true,
            default_production_rate_per_hour: 50,
            default_unit_of_measure: 'units',
            default_setup_time_minutes: 20,
            max_parallel_executions: 1,
            is_active: true,
            area_id: 5,
            area: {
                id: 5,
                name: 'Packaging Area',
                description: 'Packaging and shipping preparation',
                plant_id: 1,
            },
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        },
    ];

    // Manufacturing Orders - Hierarchical structure with dependencies
    const orders: ManufacturingOrder[] = [
        // Parent Order - Engine Assembly
        {
            id: 1,
            order_number: 'MO-2024-001',
            parent_id: undefined,
            item_id: 1, // Engine Assembly
            item: items[0],
            bill_of_material_id: undefined, // Not needed for scheduling
            quantity: 50,
            quantity_completed: 15,
            quantity_scrapped: 1,
            unit_of_measure: 'units',
            status: 'in_progress',
            priority: 4, // Urgent
            child_orders_count: 4, // Has 4 child orders
            completed_child_orders_count: 2, // 2 children completed
            auto_complete_on_children: false,
            requested_date: nextWeek.toISOString(),
            planned_start_date: twoDaysAgo.toISOString(),
            planned_end_date: fiveDaysFromNow.toISOString(),
            actual_start_date: yesterday.toISOString(),
            actual_end_date: undefined,
            source_type: 'sales_order',
            source_reference: 'SO-2024-050',
            // Progressive flow fields
            dependency_type: 'children_percentage',
            dependency_minimum_percentage: 50, // Can start when 50% of children complete
            can_release_before_children: false,
            cumulative_children_quantity_completed: 25,
            cumulative_children_quantity_required: 50,
            work_in_progress_quantity: 5,
            // Smart progress
            smart_progress_percentage: 30,
            progress_calculated_at: today.toISOString(),
            has_route: true,
            progress_percentage: 30,
            quantity_remaining: 35,
            created_by: 1,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: today.toISOString(),
        },
        // Child Order 1 - Engine Block
        {
            id: 2,
            order_number: 'MO-2024-001.1',
            parent_id: 1,
            parent: { id: 1, order_number: 'MO-2024-001' } as ManufacturingOrder,
            item_id: 2, // Engine Block
            item: items[1],
            bill_of_material_id: undefined,
            quantity: 50,
            quantity_completed: 50,
            quantity_scrapped: 0,
            unit_of_measure: 'units',
            status: 'completed',
            priority: 4, // Inherits parent priority
            child_orders_count: 0,
            completed_child_orders_count: 0,
            auto_complete_on_children: false,
            requested_date: addDays(today, 3).toISOString(),
            planned_start_date: threeDaysAgo.toISOString(),
            planned_end_date: yesterday.toISOString(),
            actual_start_date: threeDaysAgo.toISOString(),
            actual_end_date: yesterday.toISOString(),
            source_type: 'manual',
            source_reference: 'MO-2024-001',
            // No child dependencies
            dependency_type: 'none',
            can_release_before_children: true,
            work_in_progress_quantity: 0,
            smart_progress_percentage: 100,
            progress_calculated_at: yesterday.toISOString(),
            has_route: true,
            progress_percentage: 100,
            quantity_remaining: 0,
            created_by: 1,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: yesterday.toISOString(),
        },
        // Child Order 2 - Piston Assembly (4x per engine)
        {
            id: 3,
            order_number: 'MO-2024-001.2',
            parent_id: 1,
            parent: { id: 1, order_number: 'MO-2024-001' } as ManufacturingOrder,
            item_id: 3, // Piston Assembly
            item: items[2],
            bill_of_material_id: undefined,
            quantity: 200, // 4 per engine x 50 engines
            quantity_completed: 120,
            quantity_scrapped: 4,
            unit_of_measure: 'units',
            status: 'in_progress',
            priority: 4,
            child_orders_count: 0,
            completed_child_orders_count: 0,
            auto_complete_on_children: false,
            requested_date: addDays(today, 2).toISOString(),
            planned_start_date: twoDaysAgo.toISOString(),
            planned_end_date: tomorrow.toISOString(),
            actual_start_date: twoDaysAgo.toISOString(),
            actual_end_date: undefined,
            source_type: 'manual',
            source_reference: 'MO-2024-001',
            dependency_type: 'none',
            can_release_before_children: true,
            work_in_progress_quantity: 20,
            smart_progress_percentage: 60,
            progress_calculated_at: today.toISOString(),
            has_route: true,
            progress_percentage: 60,
            quantity_remaining: 80,
            created_by: 1,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: today.toISOString(),
        },
        // Child Order 3 - Electronic Control Module
        {
            id: 4,
            order_number: 'MO-2024-001.3',
            parent_id: 1,
            parent: { id: 1, order_number: 'MO-2024-001' } as ManufacturingOrder,
            item_id: 4, // ECM
            item: items[3],
            bill_of_material_id: undefined,
            quantity: 50,
            quantity_completed: 50,
            quantity_scrapped: 0,
            unit_of_measure: 'units',
            status: 'completed',
            priority: 4,
            child_orders_count: 0,
            completed_child_orders_count: 0,
            auto_complete_on_children: false,
            requested_date: today.toISOString(),
            planned_start_date: yesterday.toISOString(),
            planned_end_date: today.toISOString(),
            actual_start_date: yesterday.toISOString(),
            actual_end_date: today.toISOString(),
            source_type: 'manual',
            source_reference: 'MO-2024-001',
            dependency_type: 'none',
            can_release_before_children: true,
            work_in_progress_quantity: 0,
            smart_progress_percentage: 100,
            progress_calculated_at: today.toISOString(),
            has_route: true,
            progress_percentage: 100,
            quantity_remaining: 0,
            created_by: 1,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: today.toISOString(),
        },
        // Child Order 4 - Crankshaft (purchased, no route)
        {
            id: 5,
            order_number: 'MO-2024-001.4',
            parent_id: 1,
            parent: { id: 1, order_number: 'MO-2024-001' } as ManufacturingOrder,
            item_id: 5, // Crankshaft
            item: items[4],
            bill_of_material_id: undefined,
            quantity: 50,
            quantity_completed: 25,
            quantity_scrapped: 0,
            unit_of_measure: 'units',
            status: 'in_progress',
            priority: 4,
            child_orders_count: 0,
            completed_child_orders_count: 0,
            auto_complete_on_children: false,
            requested_date: tomorrow.toISOString(),
            planned_start_date: yesterday.toISOString(),
            planned_end_date: threeDaysFromNow.toISOString(),
            actual_start_date: yesterday.toISOString(),
            actual_end_date: undefined,
            source_type: 'manual',
            source_reference: 'MO-2024-001',
            dependency_type: 'none',
            can_release_before_children: true,
            work_in_progress_quantity: 0,
            smart_progress_percentage: 50,
            progress_calculated_at: today.toISOString(),
            has_route: false, // Purchased item - no manufacturing route
            progress_percentage: 50,
            quantity_remaining: 25,
            created_by: 1,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: today.toISOString(),
        },
        // Independent Order - Testing different dependency type
        {
            id: 6,
            order_number: 'MO-2024-002',
            parent_id: undefined,
            item_id: 2, // Engine Block (standalone order)
            item: items[1],
            bill_of_material_id: undefined,
            quantity: 100,
            quantity_completed: 0,
            quantity_scrapped: 0,
            unit_of_measure: 'units',
            status: 'planned',
            priority: 2, // Medium priority
            child_orders_count: 0,
            completed_child_orders_count: 0,
            auto_complete_on_children: false,
            requested_date: addDays(today, 10).toISOString(),
            planned_start_date: addDays(today, 3).toISOString(),
            planned_end_date: addDays(today, 6).toISOString(),
            actual_start_date: undefined,
            actual_end_date: undefined,
            source_type: 'forecast',
            source_reference: 'FCT-2024-Q1',
            dependency_type: 'none',
            can_release_before_children: true,
            work_in_progress_quantity: 0,
            smart_progress_percentage: 0,
            progress_calculated_at: today.toISOString(),
            has_route: true,
            progress_percentage: 0,
            quantity_remaining: 100,
            created_by: 2,
            created_at: '2024-01-05T00:00:00Z',
            updated_at: today.toISOString(),
        },
    ];

    // Manufacturing Routes - One per order (except purchased items)
    const routes: ManufacturingRoute[] = [
        // Route for Parent Order - Engine Assembly
        {
            id: 1,
            manufacturing_order_id: 1,
            manufacturing_order: orders[0],
            item_id: 1,
            item: items[0],
            name: 'Engine Assembly Standard Route',
            description: 'Standard assembly process for engine',
            is_active: true,
            is_template: false,
            steps_count: 4,
            created_by: 1,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        },
        // Route for Child Order - Engine Block
        {
            id: 2,
            manufacturing_order_id: 2,
            manufacturing_order: orders[1],
            item_id: 2,
            item: items[1],
            name: 'Engine Block Machining Route',
            description: 'Machining process for engine block',
            is_active: true,
            is_template: false,
            steps_count: 2,
            created_by: 1,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        },
        // Route for Child Order - Piston Assembly
        {
            id: 3,
            manufacturing_order_id: 3,
            manufacturing_order: orders[2],
            item_id: 3,
            item: items[2],
            name: 'Piston Assembly Route',
            description: 'Assembly process for pistons',
            is_active: true,
            is_template: false,
            steps_count: 3,
            created_by: 1,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        },
        // Route for Child Order - ECM
        {
            id: 4,
            manufacturing_order_id: 4,
            manufacturing_order: orders[3],
            item_id: 4,
            item: items[3],
            name: 'ECM Programming Route',
            description: 'Programming and testing for ECM',
            is_active: true,
            is_template: false,
            steps_count: 2,
            created_by: 1,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        },
        // Route for Independent Order
        {
            id: 5,
            manufacturing_order_id: 6,
            manufacturing_order: orders[5],
            item_id: 2,
            item: items[1],
            name: 'Engine Block Machining Route',
            description: 'Machining process for engine block',
            is_active: true,
            is_template: false,
            steps_count: 2,
            created_by: 2,
            created_at: '2024-01-05T00:00:00Z',
            updated_at: '2024-01-05T00:00:00Z',
        },
    ];

    // Manufacturing Steps with dependencies
    const steps: ManufacturingStep[] = [
        // Parent Order Steps - Engine Assembly (Route 1)
        {
            id: 1,
            manufacturing_route_id: 1,
            manufacturing_route: routes[0],
            // step_number: 1,
            step_type: 'standard',
            name: 'Pre-Assembly Preparation',
            description: 'Prepare workspace and verify all components',
            work_cell_id: 2,
            work_cell: workCells[1],
            status: 'completed',
            setup_time_minutes: 30,
            cycle_time_minutes: 60,
            depends_on_step_id: undefined,
            // Child order dependency - needs all children to be at least 50% complete
            child_order_dependency_type: 'children_quantity',
            child_order_minimum_quantity: 25, // Need at least 25 of each child item
        },
        {
            id: 2,
            manufacturing_route_id: 1,
            manufacturing_route: routes[0],
            // step_number: 2,
            step_type: 'standard',
            name: 'Engine Block Assembly',
            description: 'Install crankshaft and pistons into engine block',
            work_cell_id: 2,
            work_cell: workCells[1],
            status: 'in_progress',
            setup_time_minutes: 15,
            cycle_time_minutes: 120,
            depends_on_step_id: 1,
            child_order_dependency_type: 'none',
        },
        {
            id: 3,
            manufacturing_route_id: 1,
            manufacturing_route: routes[0],
            // step_number: 3,
            step_type: 'standard',
            name: 'ECM Installation',
            description: 'Install and connect electronic control module',
            work_cell_id: 4,
            work_cell: workCells[3],
            status: 'pending',
            setup_time_minutes: 10,
            cycle_time_minutes: 30,
            depends_on_step_id: 2,
            child_order_dependency_type: 'none',
        },
        {
            id: 4,
            manufacturing_route_id: 1,
            manufacturing_route: routes[0],
            // step_number: 4,
            step_type: 'quality_check',
            name: 'Final Testing',
            description: 'Complete engine testing and calibration',
            work_cell_id: 3,
            work_cell: workCells[2],
            status: 'pending',
            setup_time_minutes: 45,
            cycle_time_minutes: 60,
            depends_on_step_id: 3,
            child_order_dependency_type: 'none',
            quality_check_mode: 'every_part',
        },
        // Child Order Steps - Engine Block (Route 2)
        {
            id: 5,
            manufacturing_route_id: 2,
            manufacturing_route: routes[1],
            // step_number: 1,
            step_type: 'standard',
            name: 'CNC Machining',
            description: 'Machine engine block to specifications',
            work_cell_id: 1,
            work_cell: workCells[0],
            status: 'completed',
            setup_time_minutes: 45,
            cycle_time_minutes: 180,
            depends_on_step_id: undefined,
            child_order_dependency_type: 'none',
        },
        {
            id: 6,
            manufacturing_route_id: 2,
            manufacturing_route: routes[1],
            // step_number: 2,
            step_type: 'quality_check',
            name: 'Dimensional Inspection',
            description: 'Verify all critical dimensions',
            work_cell_id: 3,
            work_cell: workCells[2],
            status: 'completed',
            setup_time_minutes: 15,
            cycle_time_minutes: 30,
            depends_on_step_id: 5,
            child_order_dependency_type: 'none',
            quality_check_mode: 'sampling',
            sampling_size: 5,
        },
        // Child Order Steps - Piston Assembly (Route 3)
        {
            id: 7,
            manufacturing_route_id: 3,
            manufacturing_route: routes[2],
            // step_number: 1,
            step_type: 'standard',
            name: 'Piston Ring Installation',
            description: 'Install rings on pistons',
            work_cell_id: 2,
            work_cell: workCells[1],
            status: 'completed',
            setup_time_minutes: 20,
            cycle_time_minutes: 15,
            depends_on_step_id: undefined,
            child_order_dependency_type: 'none',
        },
        {
            id: 8,
            manufacturing_route_id: 3,
            manufacturing_route: routes[2],
            // step_number: 2,
            step_type: 'standard',
            name: 'Connecting Rod Assembly',
            description: 'Attach connecting rods to pistons',
            work_cell_id: 2,
            work_cell: workCells[1],
            status: 'in_progress',
            setup_time_minutes: 15,
            cycle_time_minutes: 20,
            depends_on_step_id: 7,
            child_order_dependency_type: 'none',
        },
        {
            id: 9,
            manufacturing_route_id: 3,
            manufacturing_route: routes[2],
            // step_number: 3,
            step_type: 'quality_check',
            name: 'Assembly Verification',
            description: 'Verify piston assembly quality',
            work_cell_id: 3,
            work_cell: workCells[2],
            status: 'pending',
            setup_time_minutes: 10,
            cycle_time_minutes: 10,
            depends_on_step_id: 8,
            child_order_dependency_type: 'none',
            quality_check_mode: 'sampling',
            sampling_size: 10,
        },
        // Child Order Steps - ECM (Route 4)
        {
            id: 10,
            manufacturing_route_id: 4,
            manufacturing_route: routes[3],
            // step_number: 1,
            step_type: 'standard',
            name: 'ECM Programming',
            description: 'Load firmware and calibration data',
            work_cell_id: 4,
            work_cell: workCells[3],
            status: 'completed',
            setup_time_minutes: 10,
            cycle_time_minutes: 5,
            depends_on_step_id: undefined,
            child_order_dependency_type: 'none',
        },
        {
            id: 11,
            manufacturing_route_id: 4,
            manufacturing_route: routes[3],
            // step_number: 2,
            step_type: 'quality_check',
            name: 'Functional Testing',
            description: 'Test ECM functionality',
            work_cell_id: 3,
            work_cell: workCells[2],
            status: 'completed',
            setup_time_minutes: 5,
            cycle_time_minutes: 10,
            depends_on_step_id: 10,
            child_order_dependency_type: 'none',
            quality_check_mode: 'every_part',
        },
        // Independent Order Steps (Route 5)
        {
            id: 12,
            manufacturing_route_id: 5,
            manufacturing_route: routes[4],
            // step_number: 1,
            step_type: 'standard',
            name: 'CNC Machining',
            description: 'Machine engine block to specifications',
            work_cell_id: 1,
            work_cell: workCells[0],
            status: 'pending',
            setup_time_minutes: 45,
            cycle_time_minutes: 180,
            depends_on_step_id: undefined,
            child_order_dependency_type: 'none',
        },
        {
            id: 13,
            manufacturing_route_id: 5,
            manufacturing_route: routes[4],
            // step_number: 2,
            step_type: 'quality_check',
            name: 'Dimensional Inspection',
            description: 'Verify all critical dimensions',
            work_cell_id: 3,
            work_cell: workCells[2],
            status: 'pending',
            setup_time_minutes: 15,
            cycle_time_minutes: 30,
            depends_on_step_id: 12,
            child_order_dependency_type: 'none',
            quality_check_mode: 'sampling',
            sampling_size: 5,
        },
    ];

    // Attach steps to routes
    routes[0].steps = steps.filter(s => s.manufacturing_route_id === 1);
    routes[1].steps = steps.filter(s => s.manufacturing_route_id === 2);
    routes[2].steps = steps.filter(s => s.manufacturing_route_id === 3);
    routes[3].steps = steps.filter(s => s.manufacturing_route_id === 4);
    routes[4].steps = steps.filter(s => s.manufacturing_route_id === 5);

    // Attach routes to orders
    orders[0].manufacturing_route = routes[0];
    orders[0].route = routes[0];
    orders[1].manufacturing_route = routes[1];
    orders[1].route = routes[1];
    orders[2].manufacturing_route = routes[2];
    orders[2].route = routes[2];
    orders[3].manufacturing_route = routes[3];
    orders[3].route = routes[3];
    orders[5].manufacturing_route = routes[4];
    orders[5].route = routes[4];

    // Attach children to parent order
    orders[0].children = [orders[1], orders[2], orders[3], orders[4]];

    // Production Schedules - create with temporary manufacturing_step, will fix after
    const schedulesTemp: Array<{
        id: number;
        manufacturing_step_id: number;
        scheduled_start: string;
        scheduled_end: string;
        status: string;
        work_cell_id: number;
        version_id: number;
        actual_start?: string;
        actual_end?: string;
        allocated_resources?: number;
        locked?: boolean;
        overlapping_schedules?: number[];
        predecessors?: number[];
    }> = [
            // Parent Order Schedules
            {
                id: 1,
                manufacturing_step_id: 1,
                scheduled_start: yesterday.toISOString(),
                scheduled_end: addHours(yesterday, 8).toISOString(),
                work_cell_id: 2,
                locked: false,
                version_id: 1,
                status: 'completed'
            },
            {
                id: 2,
                manufacturing_step_id: 2,
                scheduled_start: today.toISOString(),
                scheduled_end: addHours(today, 12).toISOString(),
                work_cell_id: 2,
                locked: true,
                version_id: 1,
                status: 'scheduled'
            },
            {
                id: 3,
                manufacturing_step_id: 3,
                scheduled_start: tomorrow.toISOString(),
                scheduled_end: addHours(tomorrow, 4).toISOString(),
                work_cell_id: 4,
                locked: false,
                version_id: 1,
                status: 'scheduled'
            },
            {
                id: 4,
                manufacturing_step_id: 4,
                scheduled_start: addHours(tomorrow, 4).toISOString(),
                scheduled_end: addDays(tomorrow, 1).toISOString(),
                work_cell_id: 3,
                locked: false,
                version_id: 1,
                status: 'scheduled'
            },
            // Child Order Schedules - Engine Block
            {
                id: 5,
                manufacturing_step_id: 5,
                scheduled_start: threeDaysAgo.toISOString(),
                scheduled_end: twoDaysAgo.toISOString(),
                work_cell_id: 1,
                locked: false,
                version_id: 1,
                status: 'completed'
            },
            {
                id: 6,
                manufacturing_step_id: 6,
                scheduled_start: twoDaysAgo.toISOString(),
                scheduled_end: yesterday.toISOString(),
                work_cell_id: 3,
                locked: false,
                version_id: 1,
                status: 'completed'
            },
            // Child Order Schedules - Piston Assembly
            {
                id: 7,
                manufacturing_step_id: 7,
                scheduled_start: twoDaysAgo.toISOString(),
                scheduled_end: yesterday.toISOString(),
                work_cell_id: 2,
                locked: false,
                version_id: 1,
                status: 'in_progress'
            },
            {
                id: 8,
                manufacturing_step_id: 8,
                scheduled_start: yesterday.toISOString(),
                scheduled_end: tomorrow.toISOString(),
                work_cell_id: 2,
                locked: false,
                version_id: 1,
                status: 'scheduled'
            },
            {
                id: 9,
                manufacturing_step_id: 9,
                scheduled_start: tomorrow.toISOString(),
                scheduled_end: addHours(tomorrow, 6).toISOString(),
                work_cell_id: 3,
                locked: false,
                version_id: 1,
                status: 'scheduled'
            },
            // Child Order Schedules - ECM
            {
                id: 10,
                manufacturing_step_id: 10,
                scheduled_start: yesterday.toISOString(),
                scheduled_end: addHours(yesterday, 4).toISOString(),
                work_cell_id: 4,
                locked: false,
                version_id: 1,
                status: 'completed'
            },
            {
                id: 11,
                manufacturing_step_id: 11,
                scheduled_start: addHours(yesterday, 4).toISOString(),
                scheduled_end: today.toISOString(),
                work_cell_id: 3,
                locked: false,
                version_id: 1,
                status: 'completed'
            },
            // Independent Order Schedules
            {
                id: 12,
                manufacturing_step_id: 12,
                scheduled_start: addDays(today, 3).toISOString(),
                scheduled_end: addDays(today, 4).toISOString(),
                work_cell_id: 1,
                locked: false,
                version_id: 1,
                status: 'scheduled'
            },
            {
                id: 13,
                manufacturing_step_id: 13,
                scheduled_start: addDays(today, 4).toISOString(),
                scheduled_end: addHours(addDays(today, 4), 6).toISOString(),
                work_cell_id: 3,
                locked: false,
                version_id: 1,
                status: 'scheduled'
            },
        ];

    // Fix the manufacturing_step structure for each schedule
    const schedules = schedulesTemp.map((schedule) => {
        const step = steps.find(s => s.id === schedule.manufacturing_step_id)!;
        const route = routes.find(r => r.id === step.manufacturing_route_id)!;
        const order = orders.find(o => o.id === route.manufacturing_order_id)!;
        const item = items.find(i => i.id === order.item_id)!;

        return {
            ...schedule,
            manufacturing_step: createScheduleStep(step, route, order, item),
        };
    });

    // Schedule Alerts
    const alerts: ScheduleAlert[] = [
        {
            id: 1,
            schedule_version_id: 1,
            alert_type: 'capacity_overrun',
            severity: 'warning',
            message: 'Work cell Assembly Station A is overloaded on ' + today.toLocaleDateString(),
            resolved: false,
            work_cell_id: 2,
            created_at: today.toISOString(),
            work_cell: workCells[1],
        },
        {
            id: 2,
            schedule_version_id: 1,
            alert_type: 'dependency_violation',
            severity: 'error',
            message: 'Parent order MO-2024-001 cannot start - child order dependencies not met (only 50% of Piston Assembly completed)',
            resolved: false,
            manufacturing_order_id: 1,
            manufacturing_step_id: 1,
            created_at: today.toISOString(),
            manufacturing_order: orders[0],
            manufacturing_step: steps[0],
        },
        {
            id: 3,
            schedule_version_id: 1,
            alert_type: 'late_delivery',
            severity: 'warning',
            message: 'Order MO-2024-001 is at risk of missing requested date',
            resolved: false,
            manufacturing_order_id: 1,
            created_at: today.toISOString(),
            manufacturing_order: orders[0],
        },
        {
            id: 4,
            schedule_version_id: 1,
            alert_type: 'capacity_overrun',
            severity: 'error',
            message: 'Resource conflict: Assembly Station A has overlapping schedules',
            resolved: true,
            work_cell_id: 2,
            created_at: yesterday.toISOString(),
            work_cell: workCells[1],
        },
    ];

    // Alert statistics
    const alertStats = {
        total: 4,
        unresolved: 3,
        by_type: {
            capacity_overrun: 2,
            dependency_violation: 1,
            late_delivery: 1,
        },
        by_severity: {
            error: 2,
            warning: 2,
        },
    };

    // Schedule versions
    const currentVersion: ScheduleVersion = {
        id: 1,
        version_number: 1,
        status: 'draft',
        created_by: 1,
        published_by: undefined,
        published_at: undefined,
        last_algorithm_used: 'forward',
        last_scheduled_at: today.toISOString(),
        scheduling_status: 'completed',
        created_at: today.toISOString(),
        updated_at: today.toISOString(),
    };

    const publishedVersion: ScheduleVersion = {
        id: 0,
        version_number: 0,
        status: 'published',
        created_by: 1,
        published_by: 1,
        published_at: addDays(today, -7).toISOString(),
        last_algorithm_used: 'forward',
        last_scheduled_at: addDays(today, -7).toISOString(),
        scheduling_status: 'completed',
        created_at: addDays(today, -10).toISOString(),
        updated_at: addDays(today, -7).toISOString(),
    };

    // Filters
    const filters = {
        start_date: addDays(today, -7).toISOString(),
        end_date: addDays(today, 14).toISOString(),
        search: '',
    };

    // Scheduling algorithms
    const schedulingAlgorithms = {
        forward: 'Forward Scheduling',
        backward: 'Backward Scheduling',
        capacity: 'Capacity-Based Scheduling',
        jit: 'Just-In-Time Scheduling',
    };

    return {
        currentVersion,
        publishedVersion,
        orders,
        routes,
        steps,
        schedules,
        alerts,
        alertStats,
        workCells,
        items,
        users,
        filters,
        schedulingAlgorithms,
    };
}

// Export type definitions for use in components
export type CleanDummyData = ReturnType<typeof getCleanDummyData>;
