# Evolution Core Spec

## Purpose
Codify LucaOS closed-loop operational improvement from mission outcomes.

## Loop
Mission Tape → Reflection → Candidate Improvement → Sandbox Verification → Approval Gate → Controlled Activation

## Improvement Targets
- prompt templates
- tool invocation sequencing
- skill instructions
- error recovery playbooks
- model routing decisions

## Safety for Evolution
- all candidate patches are versioned
- high-impact changes require explicit approval threshold
- failed verifications auto-reject and archive rationale
- rollback pointer must remain available

## Existing Anchor
- `cortex/server/services/evolutionService.js`
