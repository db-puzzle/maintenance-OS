# Work Order Planning Integration Test Plan

## Overview
This document outlines the integration test plan for the refactored Work Order Planning functionality, covering both frontend and backend components.

## Test Environment Setup

### Prerequisites
1. Laravel test database configured
2. Jest/React Testing Library for frontend tests
3. Cypress for E2E tests
4. Test data seeders for:
   - Users with planning permissions
   - Work orders in various states
   - Parts inventory
   - Teams and technicians

## Backend Integration Tests

### 1. Planning Authorization Tests

```php
namespace Tests\Feature\WorkOrders;

use Tests\TestCase;
use App\Models\User;
use App\Models\WorkOrders\WorkOrder;
use App\Models\Part;
use App\Models\Team;

class WorkOrderPlanningTest extends TestCase
{
    /** @test */
    public function user_without_planning_permission_cannot_access_planning()
    {
        $user = User::factory()->create();
        $workOrder = WorkOrder::factory()->approved()->create();
        
        $response = $this->actingAs($user)
            ->postJson(route('maintenance.work-orders.planning.store', $workOrder), [
                'estimated_hours' => 4.5,
            ]);
            
        $response->assertForbidden();
    }
    
    /** @test */
    public function user_can_only_plan_approved_or_planned_work_orders()
    {
        $planner = User::factory()->withPermission('plan_work_orders')->create();
        $requestedWorkOrder = WorkOrder::factory()->requested()->create();
        
        $response = $this->actingAs($planner)
            ->postJson(route('maintenance.work-orders.planning.store', $requestedWorkOrder), [
                'estimated_hours' => 4.5,
            ]);
            
        $response->assertForbidden();
    }
}
```

### 2. Planning Data Validation Tests

```php
/** @test */
public function planning_validates_required_fields_for_completion()
{
    $planner = User::factory()->withPermission('plan_work_orders')->create();
    $workOrder = WorkOrder::factory()->approved()->create();
    
    $response = $this->actingAs($planner)
        ->postJson(route('maintenance.work-orders.planning.complete', $workOrder));
        
    $response->assertSessionHasErrors([
        'estimated_hours',
        'scheduled_start_date',
        'scheduled_end_date',
    ]);
}

/** @test */
public function planning_validates_date_constraints()
{
    $planner = User::factory()->withPermission('plan_work_orders')->create();
    $workOrder = WorkOrder::factory()->approved()->create();
    
    $response = $this->actingAs($planner)
        ->postJson(route('maintenance.work-orders.planning.store', $workOrder), [
            'scheduled_start_date' => now()->subDay(),
            'scheduled_end_date' => now()->subDays(2),
        ]);
        
    $response->assertSessionHasErrors([
        'scheduled_start_date' => 'must be future',
        'scheduled_end_date' => 'must be after start',
    ]);
}
```

### 3. Parts Planning Tests

```php
/** @test */
public function can_add_parts_to_planning()
{
    $planner = User::factory()->withPermission('plan_work_orders')->create();
    $workOrder = WorkOrder::factory()->approved()->create();
    $parts = Part::factory()->count(3)->create();
    
    $response = $this->actingAs($planner)
        ->postJson(route('maintenance.work-orders.planning.store', $workOrder), [
            'estimated_hours' => 4.5,
            'parts' => [
                [
                    'part_id' => $parts[0]->id,
                    'part_number' => $parts[0]->part_number,
                    'part_name' => $parts[0]->name,
                    'estimated_quantity' => 2,
                    'unit_cost' => $parts[0]->unit_cost,
                ],
                [
                    'part_id' => $parts[1]->id,
                    'part_number' => $parts[1]->part_number,
                    'part_name' => $parts[1]->name,
                    'estimated_quantity' => 1,
                    'unit_cost' => $parts[1]->unit_cost,
                ],
            ],
        ]);
        
    $response->assertSuccessful();
    $this->assertCount(2, $workOrder->fresh()->parts);
}

/** @test */
public function planning_calculates_costs_correctly()
{
    $planner = User::factory()->withPermission('plan_work_orders')->create();
    $workOrder = WorkOrder::factory()->approved()->create();
    
    $response = $this->actingAs($planner)
        ->postJson(route('maintenance.work-orders.planning.store', $workOrder), [
            'estimated_hours' => 4,
            'labor_cost_per_hour' => 150,
            'parts' => [
                [
                    'part_name' => 'Test Part',
                    'estimated_quantity' => 2,
                    'unit_cost' => 50,
                ],
            ],
        ]);
        
    $response->assertSuccessful();
    
    $workOrder->refresh();
    $this->assertEquals(600, $workOrder->estimated_labor_cost); // 4 * 150
    $this->assertEquals(100, $workOrder->estimated_parts_cost); // 2 * 50
    $this->assertEquals(700, $workOrder->estimated_total_cost);
}
```

### 4. State Transition Tests

```php
/** @test */
public function completing_planning_transitions_to_ready_to_schedule()
{
    $planner = User::factory()->withPermission('plan_work_orders')->create();
    $technician = User::factory()->technician()->create();
    $workOrder = WorkOrder::factory()->approved()->create();
    
    // First save planning data
    $this->actingAs($planner)
        ->postJson(route('maintenance.work-orders.planning.store', $workOrder), [
            'estimated_hours' => 4,
            'scheduled_start_date' => now()->addDay(),
            'scheduled_end_date' => now()->addDay()->addHours(4),
            'assigned_technician_id' => $technician->id,
        ]);
        
    // Then complete planning
    $response = $this->actingAs($planner)
        ->postJson(route('maintenance.work-orders.planning.complete', $workOrder));
        
    $response->assertRedirect();
    $this->assertEquals('ready_to_schedule', $workOrder->fresh()->status);
}
```

## Frontend Integration Tests

### 1. Component Rendering Tests

```typescript
// resources/js/__tests__/components/WorkOrderPlanningTab.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkOrderPlanningTab } from '@/components/work-orders/tabs';

describe('WorkOrderPlanningTab', () => {
    const mockWorkOrder = {
        id: 1,
        status: 'approved',
        estimated_hours: null,
        parts: [],
    };
    
    const mockParts = [
        { id: 1, part_number: 'PT-001', name: 'Test Part', unit_cost: 50, available_quantity: 10 },
        { id: 2, part_number: 'PT-002', name: 'Another Part', unit_cost: 75, available_quantity: 5 },
    ];
    
    it('renders planning form when work order is approved', () => {
        render(
            <WorkOrderPlanningTab
                workOrder={mockWorkOrder}
                parts={mockParts}
                canPlan={true}
                discipline="maintenance"
            />
        );
        
        expect(screen.getByText('Estimativa de Tempo e Custo')).toBeInTheDocument();
        expect(screen.getByText('Peças Necessárias')).toBeInTheDocument();
        expect(screen.getByText('Agendamento')).toBeInTheDocument();
    });
    
    it('shows empty state when work order is not approved', () => {
        render(
            <WorkOrderPlanningTab
                workOrder={{ ...mockWorkOrder, status: 'requested' }}
                parts={mockParts}
                canPlan={true}
                discipline="maintenance"
            />
        );
        
        expect(screen.getByText('Ordem de serviço ainda não foi aprovada')).toBeInTheDocument();
    });
});
```

### 2. Part Search Dialog Tests

```typescript
describe('PartSearchDialog', () => {
    it('filters parts based on search query', async () => {
        const mockParts = [
            { id: 1, part_number: 'PT-001', name: 'Bearing', unit_cost: 50 },
            { id: 2, part_number: 'PT-002', name: 'Belt', unit_cost: 30 },
            { id: 3, part_number: 'PT-003', name: 'Motor', unit_cost: 500 },
        ];
        
        render(
            <PartSearchDialog
                open={true}
                onOpenChange={() => {}}
                parts={mockParts}
                onSelectPart={() => {}}
            />
        );
        
        const searchInput = screen.getByPlaceholderText('Buscar por número, nome ou fabricante...');
        await userEvent.type(searchInput, 'belt');
        
        expect(screen.getByText('PT-002')).toBeInTheDocument();
        expect(screen.queryByText('PT-001')).not.toBeInTheDocument();
        expect(screen.queryByText('PT-003')).not.toBeInTheDocument();
    });
    
    it('disables already selected parts', () => {
        const mockParts = [
            { id: 1, part_number: 'PT-001', name: 'Bearing', unit_cost: 50 },
            { id: 2, part_number: 'PT-002', name: 'Belt', unit_cost: 30 },
        ];
        
        render(
            <PartSearchDialog
                open={true}
                onOpenChange={() => {}}
                parts={mockParts}
                selectedParts={[1]}
                onSelectPart={() => {}}
            />
        );
        
        const bearingButton = screen.getByRole('button', { name: /PT-001/i });
        expect(bearingButton).toBeDisabled();
        expect(screen.getByText('Já adicionada')).toBeInTheDocument();
    });
});
```

### 3. Date/Time Selection Tests

```typescript
it('handles date and time selection correctly', async () => {
    const user = userEvent.setup();
    
    render(
        <WorkOrderPlanningTab
            workOrder={mockWorkOrder}
            parts={[]}
            canPlan={true}
            discipline="maintenance"
        />
    );
    
    // Open start date picker
    const startDateButton = screen.getByRole('button', { name: /selecione a data/i });
    await user.click(startDateButton);
    
    // Select tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDay = tomorrow.getDate().toString();
    
    await user.click(screen.getByRole('button', { name: tomorrowDay }));
    
    // Check time input
    const timeInputs = screen.getAllByDisplayValue('08:00:00');
    expect(timeInputs[0]).toBeInTheDocument();
});
```

## E2E Tests (Cypress)

### 1. Complete Planning Flow

```javascript
// cypress/e2e/work-order-planning.cy.js
describe('Work Order Planning', () => {
    beforeEach(() => {
        cy.login('planner@example.com');
    });
    
    it('completes full planning workflow', () => {
        // Navigate to approved work order
        cy.visit('/maintenance/work-orders/1');
        cy.get('[data-testid="planning-tab"]').click();
        
        // Fill time estimation
        cy.get('input[name="estimated_hours"]').clear().type('4.5');
        cy.get('input[name="labor_cost_per_hour"]').should('have.value', '150.00');
        
        // Add parts
        cy.get('button').contains('Adicionar Peça').click();
        cy.get('input[placeholder*="Buscar"]').type('bearing');
        cy.get('button').contains('PT-001').dblclick();
        
        // Verify part was added
        cy.get('[data-testid="parts-list"]').within(() => {
            cy.contains('PT-001 - Bearing').should('exist');
            cy.get('input[type="number"]').clear().type('2');
        });
        
        // Schedule dates
        cy.get('button').contains('Selecione a data').first().click();
        cy.get('.calendar').within(() => {
            cy.get('button').contains('15').click();
        });
        
        // Select team and technician
        cy.get('[data-testid="team-select"]').click();
        cy.get('[role="option"]').contains('Equipe A').click();
        
        cy.get('[data-testid="technician-select"]').click();
        cy.get('[role="option"]').contains('João Silva').click();
        
        // Save draft
        cy.get('button').contains('Salvar Rascunho').click();
        cy.get('.toast').contains('Planejamento salvo com sucesso').should('exist');
        
        // Complete planning
        cy.get('button').contains('Concluir Planejamento').click();
        cy.get('.toast').contains('Planejamento concluído').should('exist');
        
        // Verify status change
        cy.get('[data-testid="status-badge"]').should('contain', 'Pronto para Agendar');
    });
});
```

### 2. Validation Tests

```javascript
it('validates required fields before completing planning', () => {
    cy.visit('/maintenance/work-orders/1');
    cy.get('[data-testid="planning-tab"]').click();
    
    // Try to complete without required fields
    cy.get('button').contains('Concluir Planejamento').should('be.disabled');
    
    // Fill only hours
    cy.get('input[name="estimated_hours"]').type('4');
    cy.get('button').contains('Concluir Planejamento').should('be.disabled');
    
    // Add dates
    cy.fillScheduleDates();
    cy.get('button').contains('Concluir Planejamento').should('be.enabled');
});
```

## Performance Tests

### 1. Part Search Performance

```javascript
it('handles large part lists efficiently', () => {
    // Mock 1000+ parts
    cy.intercept('GET', '/api/parts', { fixture: 'large-parts-list.json' });
    
    cy.visit('/maintenance/work-orders/1');
    cy.get('[data-testid="planning-tab"]').click();
    cy.get('button').contains('Adicionar Peça').click();
    
    // Measure search performance
    cy.get('input[placeholder*="Buscar"]').type('motor');
    
    // Results should appear within 300ms
    cy.get('[data-testid="search-results"]', { timeout: 300 })
        .should('be.visible')
        .find('[role="button"]')
        .should('have.length.greaterThan', 0);
});
```

## Error Handling Tests

### 1. Network Error Handling

```javascript
it('handles network errors gracefully', () => {
    cy.intercept('POST', '**/planning/store', { 
        statusCode: 500,
        body: { message: 'Server error' }
    });
    
    cy.visit('/maintenance/work-orders/1');
    cy.get('[data-testid="planning-tab"]').click();
    
    // Fill form
    cy.fillPlanningForm();
    
    // Submit
    cy.get('button').contains('Salvar Rascunho').click();
    
    // Should show error message
    cy.get('.toast-error').contains('Erro ao salvar planejamento').should('exist');
    
    // Form data should be preserved
    cy.get('input[name="estimated_hours"]').should('have.value', '4.5');
});
```

## Accessibility Tests

```javascript
describe('Planning Tab Accessibility', () => {
    it('is keyboard navigable', () => {
        cy.visit('/maintenance/work-orders/1');
        cy.get('[data-testid="planning-tab"]').click();
        
        // Tab through form fields
        cy.get('body').tab();
        cy.focused().should('have.attr', 'name', 'estimated_hours');
        
        cy.focused().tab();
        cy.focused().should('have.attr', 'name', 'labor_cost_per_hour');
        
        // Open part dialog with keyboard
        cy.get('button').contains('Adicionar Peça').focus().type('{enter}');
        cy.get('[role="dialog"]').should('be.visible');
        
        // ESC to close
        cy.get('body').type('{esc}');
        cy.get('[role="dialog"]').should('not.exist');
    });
    
    it('has proper ARIA labels', () => {
        cy.visit('/maintenance/work-orders/1');
        cy.get('[data-testid="planning-tab"]').click();
        
        cy.get('input[name="estimated_hours"]')
            .should('have.attr', 'aria-label')
            .and('include', 'Horas Estimadas');
    });
});
```

## Data Integrity Tests

### 1. Concurrent Update Handling

```php
/** @test */
public function handles_concurrent_planning_updates()
{
    $workOrder = WorkOrder::factory()->approved()->create();
    $planner1 = User::factory()->withPermission('plan_work_orders')->create();
    $planner2 = User::factory()->withPermission('plan_work_orders')->create();
    
    // Planner 1 loads the planning form
    $this->actingAs($planner1)
        ->get(route('maintenance.work-orders.show', $workOrder));
    
    // Planner 2 updates the planning
    $this->actingAs($planner2)
        ->postJson(route('maintenance.work-orders.planning.store', $workOrder), [
            'estimated_hours' => 5,
        ]);
    
    // Planner 1 tries to update with outdated data
    $response = $this->actingAs($planner1)
        ->postJson(route('maintenance.work-orders.planning.store', $workOrder), [
            'estimated_hours' => 3,
        ]);
    
    // Should handle gracefully (last write wins or conflict detection)
    $response->assertSuccessful();
    $this->assertEquals(3, $workOrder->fresh()->estimated_hours);
}
```

## Test Data Factories

```php
// database/factories/WorkOrderPlanningFactory.php
namespace Database\Factories;

use App\Models\WorkOrders\WorkOrder;
use App\Models\User;
use App\Models\Team;

class WorkOrderPlanningFactory
{
    public static function createWithPlanning(array $attributes = [])
    {
        $workOrder = WorkOrder::factory()->approved()->create($attributes);
        
        $workOrder->update([
            'estimated_hours' => 4.5,
            'labor_cost_per_hour' => 150,
            'estimated_labor_cost' => 675,
            'scheduled_start_date' => now()->addDays(2),
            'scheduled_end_date' => now()->addDays(2)->addHours(5),
            'assigned_team_id' => Team::factory()->create()->id,
            'assigned_technician_id' => User::factory()->technician()->create()->id,
            'planned_by' => User::factory()->planner()->create()->id,
            'planned_at' => now(),
        ]);
        
        // Add parts
        $workOrder->parts()->createMany([
            [
                'part_id' => 1,
                'part_number' => 'PT-001',
                'part_name' => 'Test Part 1',
                'estimated_quantity' => 2,
                'unit_cost' => 50,
                'total_cost' => 100,
            ],
            [
                'part_id' => 2,
                'part_number' => 'PT-002',
                'part_name' => 'Test Part 2',
                'estimated_quantity' => 1,
                'unit_cost' => 150,
                'total_cost' => 150,
            ],
        ]);
        
        return $workOrder;
    }
}
```

## CI/CD Integration

```yaml
# .github/workflows/planning-tests.yml
name: Work Order Planning Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'
      - name: Install Dependencies
        run: composer install
      - name: Run Planning Tests
        run: php artisan test --filter=WorkOrderPlanning
        
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install Dependencies
        run: npm install
      - name: Run Component Tests
        run: npm run test:planning
        
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run E2E Tests
        run: |
          npm run build
          npm run serve &
          npm run cypress:run -- --spec "cypress/e2e/work-order-planning.cy.js"
```

## Monitoring and Metrics

### Key Metrics to Track
1. Planning completion rate
2. Average time to complete planning
3. Part search response times
4. Failed planning attempts
5. User satisfaction scores

### Error Tracking
```javascript
// resources/js/utils/planning-metrics.ts
export const trackPlanningMetrics = {
    planningStarted: (workOrderId: number) => {
        window.analytics?.track('Planning Started', {
            workOrderId,
            timestamp: new Date().toISOString(),
        });
    },
    
    planningCompleted: (workOrderId: number, data: any) => {
        window.analytics?.track('Planning Completed', {
            workOrderId,
            estimatedHours: data.estimated_hours,
            partsCount: data.parts?.length || 0,
            totalCost: data.estimated_total_cost,
        });
    },
    
    planningError: (workOrderId: number, error: any) => {
        window.Sentry?.captureException(error, {
            tags: {
                feature: 'work-order-planning',
                workOrderId,
            },
        });
    },
};
```