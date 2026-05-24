# Guard Security Spec

## Security Objective
Constrain capability execution through explicit policy, auditable decisions, and secret-safe handling.

## Guard Decision Layers
1. actor/session authenticity
2. requested action classification
3. scope + permission validation
4. risk-level policy check
5. execution constraints (sandbox, allowlist, confirmation)
6. logging and post-action review

## Protected Surfaces
- system control actions
- credential/vault access
- browser/computer-use privileged operations
- external network/third-party connectors

## Core Components
- `cortex/server/services/securityManager.js`
- `cortex/server/services/secureVault.js`
- `cortex/server/middleware/authMiddleware.js`

## Security Invariants
- no secret material is written to mission outputs by default
- dangerous operations require elevated guard path
- every denied operation includes machine-readable reason
