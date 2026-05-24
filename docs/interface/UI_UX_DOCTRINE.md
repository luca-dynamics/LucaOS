# UI/UX Doctrine

## UX Mission
Present LUCA as a dependable operator: clear intent capture, visible execution state, explicit safety boundaries, and transparent outcomes.

## Interaction Tenets
- show mission status, not just chat text
- expose tool/skill actions before and after execution
- make guard/security decisions understandable
- keep memory usage transparent and controllable
- support interruption, resume, and recovery UX

## Required Interface Elements
- mission timeline
- active model/route indicator
- capability permission prompts
- checkpoint/recovery notices
- post-mission reflection summary

## Code Anchors
- `src/hooks/app/useChatController.ts`
- `src/hooks/app/useToolOrchestrator.ts`
- `src/hooks/useDiagnostics.ts`
- `src/tools/ToolRegistry.ts`
