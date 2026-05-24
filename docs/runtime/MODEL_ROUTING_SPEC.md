# Model Routing Spec

## Goal
Model-neutral task routing across Luca Prime, local models, and BYOK providers.

## Routing Inputs
- Task type (coding, reasoning, memory, vision, voice)
- Privacy requirements
- Latency and cost constraints
- Host capability and availability
- User preference and overrides
- Historical success rates

## Routing Policy
- Prefer privacy-preserving local paths when requirements permit.
- Escalate to stronger frontier models when task complexity demands.
- Maintain fallback chains per modality.
- Record route decisions into mission tape for evaluation.

## Provisioning Notes
Runtime should support compatibility checks and local model provisioning workflows where available.
