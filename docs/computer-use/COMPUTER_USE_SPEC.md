# Computer Use Spec

## Scope
Computer use covers host-level action channels (filesystem, process/app control, automation primitives, and visual/screen interactions).

## Operating Model
- mission planner requests host actions
- guard evaluates risk + scope
- tool adapter executes bounded action
- runtime records result + artifacts
- failures trigger recovery playbook/checkpoint rollback

## Safety Rules
- principle of least privilege per mission
- explicit escalation path for dangerous/system operations
- auditable mapping from mission step to host action

## Existing Runtime Surfaces
- `cortex/python/universal_automation.py`
- `cortex/python/intelligent_automation.py`
- `cortex/python/real_tool_delegator.py`
- `cortex/server/services/systemControlService.js`
- `cortex/server/services/screenCaptureService.js`
