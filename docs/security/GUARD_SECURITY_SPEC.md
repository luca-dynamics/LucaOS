# Luca Guard Security Spec

## Purpose
Luca Guard is the policy enforcement layer that governs risky embodied actions, permissions, and trust across local and linked devices.

## Responsibilities
- Permission scope validation per action/tool/skill.
- Risk classification (`safe`, `sensitive`, `dangerous`).
- User/creator approval gates for sensitive and dangerous actions.
- Signature/trust checks for plugins, skills, and external adapters.
- Sandbox policy enforcement for untrusted or high-risk execution.
- Command denylist / dangerous-operation blocking.
- Audit log generation for policy decisions and security events.

## Trust Tiers
- **Trusted**: creator/internal assets with elevated policy allowances.
- **Verified**: signed and policy-compliant external assets.
- **Untrusted**: sandbox-only execution with constrained permissions.

## Permission Model
- Least privilege by default.
- Scope-granted execution (filesystem/network/browser/device/memory writes).
- Time-bounded and context-bounded grants.
- Revocable permissions with audit trail.

## Security Gates
- **Pre-execution**: policy check + risk scoring.
- **In-execution**: sandbox boundaries + anomaly detection.
- **Post-execution**: audit persistence + optional memory classification.

## Cross-Device Guarding (LucaLink)
Remote command execution requires:
- signed requester identity,
- trusted device profile,
- policy-compatible target capability,
- replay protection and event logging.

## Evolution Boundary
Guarded self-evolution is allowed only inside Origin workflows with sandbox verification and rollback. Public autonomous mutation is prohibited.
