# Manufacturing States and Transitions

This document consolidates the **Manufacturing Order** and **Manufacturing Step** state diagrams into a single file.

---

## Manufacturing Orders — States & Transitions
```mermaid
stateDiagram-v2
    direction LR
    [*] --> Draft

    state "Draft" as Draft
    state "Planned" as Planned
    state "Released" as Released
    state "In Progress" as InProgress
    state "On Hold" as OnHold
    state "Completed" as Completed
    state "Cancelled" as Cancelled

    Draft --> Planned : Finalize details / allocate resources\n(“Move to Planned”)
    Planned --> Draft : Return for modifications
    Planned --> Released : Release for production\n(req. route ≥ 1 step)
    Planned --> Cancelled : Cancel

    Released --> InProgress : First step starts (auto)\n(MO actual_start_date set)
    Released --> OnHold : Put on hold (manual)\n(cascades holds to active steps)
    Released --> Cancelled : Cancel (manual)\n(cancels all non-completed steps)

    InProgress --> OnHold : Put on hold (manual)\n(cascades holds to active steps)
    InProgress --> Completed : All steps done\n(completed/skipped/cancelled) (auto)
    InProgress --> Cancelled : Cancel (manual)

    OnHold --> InProgress : Resume (returns all held steps)\n to prior states
    OnHold --> Cancelled : Cancel

    Completed --> [*]
    Cancelled --> [*]

    note right of Released
      On entry: all first steps (no deps)\nmove to "Queued" (auto)
    end note
```
---

## Manufacturing Steps — States & Transitions
```mermaid
stateDiagram-v2
    direction LR
    [*] --> Pending

    state "Pending" as S_Pending
    state "Queued" as S_Queued
    state "In Progress" as S_InProg
    state "Awaiting Quality" as S_AQ
    state "On Hold" as S_OnHold
    state "Completed" as S_Done
    state "Skipped" as S_Skipped
    state "Cancelled" as S_Cancel

    S_Pending --> S_Queued : MO Released AND\nall dependencies complete (auto)\n(First steps auto-queued)

    S_Queued --> S_InProg : Start execution (operator)
    S_Queued --> S_Skipped : Skip (if allowed)

    S_InProg --> S_OnHold : Pause (manual) OR\nMO put On Hold (auto)
    S_InProg --> S_Done : Execution finished (standard step)
    S_InProg --> S_AQ : Execution finished (quality step)

    S_AQ --> S_OnHold : Pause (manual) OR\nMO put On Hold (auto)
    S_AQ --> S_Done : Record quality result = PASS

    S_OnHold --> S_InProg : Resume (returns to prior state)

    S_Done --> [*]
    S_Skipped --> [*]

    S_Pending --> S_Cancel : MO Cancelled (auto)
    S_Queued --> S_Cancel : MO Cancelled (auto)
    S_InProg --> S_Cancel : MO Cancelled (auto)
    S_AQ --> S_Cancel : MO Cancelled (auto)
    S_OnHold --> S_Cancel : MO Cancelled (auto)
    S_Cancel --> [*]

    note right of S_Done
      On step completion:\n- actual_end_time set\n- Next dependent steps queued\n- MO progress updated
    end note
```
