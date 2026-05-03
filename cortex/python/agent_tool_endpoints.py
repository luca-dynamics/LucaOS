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
    List the tools actually implemented by the Python agent executor.
    """
    from real_tool_delegator import real_tool_delegator

    return {
        "totalTools": len(real_tool_delegator.get_supported_tools()),
        "categories": real_tool_delegator.get_tool_categories(),
        "tools": real_tool_delegator.get_supported_tools(),
    }


@router.get("/api/agent/tools/stats")
async def get_tool_stats():
    """Get truthful backend support statistics for the Python agent executor."""
    from real_tool_delegator import real_tool_delegator

    supported_tools = real_tool_delegator.get_supported_tools()

    return {
        "totalTools": len(supported_tools),
        "categories": real_tool_delegator.get_tool_categories(),
    }
