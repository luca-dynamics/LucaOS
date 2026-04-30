"""
Agent Tool Execution Endpoint

Executes agent tools with proper validation and security
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, Optional
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class ToolExecutionRequest(BaseModel):
    """Request to execute a tool"""
    toolName: str
    params: Dict[str, Any]


class ToolExecutionResponse(BaseModel):
    """Response from tool execution"""
    success: bool
    output: Any = None
    result: Any = None
    error: Optional[str] = None
    filesModified: Optional[list[str]] = None


@router.post("/api/agent/execute-tool")
async def execute_agent_tool(request: ToolExecutionRequest):
    """
    Execute a tool on behalf of the agent workforce
    
    Phase 8B: Real tool delegation via RealToolDelegator
    """
    try:
        tool_name = request.toolName
        params = request.params
        
        logger.info(f"[AgentTool] Executing tool: {tool_name}")
        logger.debug(f"[AgentTool] Params: {params}")
        
        # Import real delegator
        from real_tool_delegator import real_tool_delegator
        
        # Execute with real delegation
        result = await real_tool_delegator.execute(tool_name, params)
        
        return ToolExecutionResponse(
            success=result.get('success', False),
            output=result.get('output'),
            result=result.get('result'),
            error=result.get('error'),
            filesModified=result.get('filesModified')
        )
            
    except Exception as e:
        logger.error(f"[AgentTool] Error executing {request.toolName}: {str(e)}")
        return ToolExecutionResponse(
            success=False,
            error=str(e)
        )


@router.get("/api/agent/tools/available")
async def list_available_tools():
    """
    List all available tools
    Phase 8B will dynamically generate this from schemas
    """
    return {
        "totalTools": 200,
        "categories": {
            "file": ["readFile", "writeProjectFile", "createOrUpdateFile"],
            "terminal": ["executeTerminalCommand", "runPythonScript"],
            "osint": ["osintUsernameSearch", "osintDomainIntel", "osintDarkWebScan"],
            "security": ["auditSourceCode", "runNmapScan", "runBurpSuite"]
        }
    }


@router.get("/api/agent/tools/stats")
async def get_tool_stats():
    """Get tool usage statistics"""
    return {
        "totalTools": 200,
        "toolsByPersona": {
            "ENGINEER": 25,
            "HACKER": 30,
            "ASSISTANT": 40,
            "RUTHLESS": 200
        }
    }
