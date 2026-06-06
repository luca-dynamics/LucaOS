# Execution Doctrine

Luca's foundational execution doctrine is:

1. **Sense** relevant user, environment, and task signals.
2. **Understand** intent, context, constraints, and privacy boundaries.
3. **Plan** an inspectable sequence of proposed actions.
4. **Approve** according to the applicable authorization policy.
5. **Act** only within the approved plan and declared permissions.
6. **Verify** the outcome and expose discrepancies.
7. **Learn** from bounded feedback without silently expanding authority.

Typed stage status and trace event contracts allow later systems to record progress and evidence. The doctrine is not wired into existing runtime orchestration, LucaLink continuation, approval queues, or VisualCore behavior in this foundation PR.
