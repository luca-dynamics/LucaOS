# Browser Runtime Router Spec

## Purpose
Select execution lane for web tasks:
- direct host browser lane
- sandbox browser lane
- delegated remote browser lane

## Routing Inputs
Risk level, auth context, privacy constraints, required capabilities, and user policy.

## Routing Rule
Default to least-risk lane that can satisfy task constraints; escalate privileges only with explicit guard approval.
