# External Steps & Logistics - State Management Summary

**Version**: 1.0  
**Date**: November 12, 2024  
**Related Specs**: 
- `25-external-manufacturing-steps-specification.md`
- `26-logistics-module-complete-specification.md`

---

## Quick Reference: Three State Systems

### System 1: Step Status (Universal)
**ALL Steps - Internal & External**

```
status: pending → queued → in_progress → completed
```

- **Purpose**: Is the work done?
- **Owned By**: `ManufacturingStep.status`
- **Completion**: `status = 'completed'`
- **Universal**: Same for internal AND external steps

### System 2: External Status (External Only)
**Only External Steps**

```
external_status: awaiting_shipment → shipped → in_process
```

- **Purpose**: What's happening at manufacturer?
- **Owned By**: `ManufacturingStep.external_status`
- **Supplementary**: Adds context, doesn't indicate completion
- **Persistence**: May stay as `in_process` even after step completes

### System 3: Shipment Status (Logistics)
**All Shipments**

```
shipment.status: planned → packed → shipped → in_transit → delivered → received
```

- **Purpose**: Where are physical items?
- **Owned By**: `Shipment.status`
- **Completion**: `status = 'received'`
- **Trigger**: When shipment received, step marked completed

---

## State Comparison Table

| Step Type | Completion Status | Additional Status | Notes |
|-----------|------------------|-------------------|-------|
| **Internal** | `status = 'completed'` | None | Simple, direct |
| **External** | `status = 'completed'` | `external_status = 'in_process'` | Same completion, extra context |

**Key Insight**: External steps complete the SAME WAY as internal steps - with `status = 'completed'`.

---

## Integration Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Step Becomes Ready                                       │
│    step.status = 'queued'                                   │
│    step.external_status = 'awaiting_shipment'               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Create Shipment (Logistics Module)                       │
│    shipment.status = 'planned'                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Ship Items (Logistics Module)                            │
│    shipment.status = 'shipped'                              │
│    step.status = 'in_progress'                              │
│    step.external_status = 'shipped'                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Manufacturer Starts (Manual Update)                      │
│    step.external_status = 'in_process'                      │
│    (shipment.status may be 'in_transit' or 'delivered')     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Items Received (Logistics Module)                        │
│    shipment.status = 'received'  ←─────────┐                │
│    │                                       │                │
│    └─► Calls: step.recordQuantityReceived()│                │
│                │                            │                │
│                └─► step.status = 'completed' (CRITICAL!)    │
│                    step.checkNextStepActivation()           │
│                                                              │
│    Result: Next step in route can start!                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Code Integration Example

### In Logistics Module: ShipmentService::markAsReceived()

```php
public function markAsReceived(
    Shipment $shipment,
    array $itemReceipts,
    ?string $notes = null,
    array $photos = []
): Shipment {
    DB::transaction(function () use ($shipment, $itemReceipts, $notes, $photos) {
        // 1. Update SHIPMENT (Logistics owns this)
        $shipment->update([
            'status' => 'received',  // ← Logistics completion
            'actual_delivery_date' => now(),
        ]);

        // 2. Update each STEP (Production owns this)
        foreach ($itemReceipts as $receipt) {
            $item = ShipmentItem::find($receipt['item_id']);
            
            if ($item->manufacturing_step_id) {
                $step = $item->manufacturingStep;
                
                // This is the critical integration point:
                $step->recordQuantityReceived(
                    $receipt['quantity_received'],
                    $notes
                );
                // ↑ This method marks step as 'completed' when all quantities received
            }
        }
    });
    
    return $shipment->fresh(['items']);
}
```

### In Step Model: ManufacturingStep::recordQuantityReceived()

```php
public function recordQuantityReceived(float $quantity, ?string $notes = null): void
{
    $this->increment('quantity_received', $quantity);
    $this->update(['received_date' => now()]);

    // Check if all shipped quantity is received
    if ($this->quantity_received >= $this->quantity_shipped) {
        // Mark STEP as completed
        $this->update([
            'status' => 'completed',  // ← Step completion (UNIVERSAL)
            'actual_end_time' => now(),
        ]);

        // Activate next step in route
        $this->checkNextStepActivation();
    }
}
```

---

## Why This Design?

### ✅ Benefits

1. **Consistency**: All steps complete the same way
   - Internal: `status = 'completed'`
   - External: `status = 'completed'` (identical!)

2. **Clear Ownership**:
   - Steps own: "Is work done?"
   - Logistics owns: "Where are items?"

3. **Flexible**:
   - Multiple shipments per step (partial shipments)
   - Historical tracking of where work was done

4. **Simple Queries**:
   ```php
   // Find ALL completed steps (internal OR external)
   ManufacturingStep::where('status', 'completed')->get();
   ```

5. **Proper Sequencing**:
   - Next steps activate when step completes
   - Not when shipment ships (too early!)
   - Only when items received (correct!)

### ❌ What We Avoid

1. **Confusing States**: External steps don't end with "received"
2. **Redundancy**: Don't track "received" in both Step and Shipment
3. **Inconsistency**: External steps don't have different completion criteria
4. **Complex Queries**: Don't need special cases for external vs internal

---

## Database Fields

### ManufacturingStep

```sql
-- Universal fields (ALL steps)
status ENUM(..., 'completed', ...)  -- Same for internal & external

-- External-specific fields (only populated for external steps)
execution_location ENUM('internal', 'external')
manufacturer_id BIGINT
external_status ENUM('awaiting_shipment', 'shipped', 'in_process')  -- NO 'received'!
quantity_shipped DECIMAL
quantity_received DECIMAL
shipped_date TIMESTAMP
received_date TIMESTAMP  -- When last receipt happened
```

### Shipment

```sql
status ENUM('planned', 'packed', 'shipped', 'in_transit', 'delivered', 'received')
actual_delivery_date TIMESTAMP
```

---

## UI Display Examples

### Internal Step

```
┌─────────────────────────────┐
│ [In Progress]               │
│ Assembly                    │
│ Work Cell: Cell A           │
└─────────────────────────────┘
```

### External Step (In Transit)

```
┌─────────────────────────────────────────┐
│ [In Progress] [Shipped]                 │
│ Heat Treatment                          │
│ Manufacturer: ABC Heat Treating         │
│ Shipment: SHIP-20241112-0001            │
│ Enviado: 100 | Recebido: 0              │
└─────────────────────────────────────────┘
```

### External Step (At Manufacturer)

```
┌─────────────────────────────────────────┐
│ [In Progress] [In Process]              │
│ Heat Treatment                          │
│ Manufacturer: ABC Heat Treating         │
│ Shipment: SHIP-20241112-0001            │
│ Enviado: 100 | Recebido: 0              │
└─────────────────────────────────────────┘
```

### External Step (Completed)

```
┌─────────────────────────────────────────┐
│ [Completed] [In Process]  ← Both shown! │
│ Heat Treatment                          │
│ Manufacturer: ABC Heat Treating         │
│ Shipment: SHIP-20241112-0001            │
│ ✓ Enviado: 100 | Recebido: 100         │
└─────────────────────────────────────────┘
```

Notice: Even when completed, `[In Process]` badge remains - it's historical context showing where the work was done.

---

## Testing Checklist

### External Step Completion
- [ ] External step completes when all quantities received
- [ ] Partial receipts don't complete the step
- [ ] Next step activates when external step completes
- [ ] Step completion triggers same logic as internal steps

### Shipment Receipt
- [ ] Marking shipment as received updates step quantities
- [ ] Shipment receipt triggers step completion
- [ ] Photos attach to shipment, not step
- [ ] Rejected quantities tracked in shipment item

### State Queries
- [ ] Can find all completed steps (internal + external)
- [ ] Can find steps awaiting shipment
- [ ] Can find items in transit
- [ ] No special cases needed for external vs internal

---

## Migration Notes

### Existing Data
- All existing steps are `execution_location = 'internal'` (default)
- External fields are NULL for internal steps
- No migration needed for existing completed steps

### New External Steps
- Must set `execution_location = 'external'`
- Auto-initialized with `external_status = 'awaiting_shipment'`
- Complete with `status = 'completed'` (same as always)

---

## FAQ

**Q: Why doesn't external_status include 'received'?**  
A: Because "received" describes WHERE items are, not what's happening at the manufacturer. That's tracked by Shipment.status.

**Q: What if external_status still shows 'in_process' after step completes?**  
A: That's intentional and correct. It's historical data showing where the work was done. The completion is indicated by status='completed'.

**Q: Can I query just for external steps that are complete?**  
A: Yes, two ways:
```php
// Option 1: All completed steps (internal OR external)
ManufacturingStep::where('status', 'completed')->get();

// Option 2: Only completed external steps
ManufacturingStep::where('execution_location', 'external')
    ->where('status', 'completed')
    ->get();
```

**Q: How do I know if items are still in transit?**  
A: Check the Shipment:
```php
Shipment::whereIn('status', ['shipped', 'in_transit'])->get();
```

**Q: What triggers the next step to start?**  
A: When a step's `status` becomes `'completed'`. This works the same for internal and external steps.

---

## Summary

**One Sentence**: External steps complete with `status='completed'` just like internal steps; the Logistics Module's "received" status triggers this completion.

**Key Principle**: **Separation of Concerns**
- Steps track: "Is work done?"
- Shipments track: "Where are items?"

**Integration Point**: `ShipmentService::markAsReceived()` → calls → `ManufacturingStep::recordQuantityReceived()` → marks → `status='completed'`

**Result**: Clean, consistent, scalable architecture! 🚀

