import React, { useState, useEffect, useCallback } from "react";
import { ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  Panel
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { lucaWorkforce } from "../../services/agent/LucaWorkforce";
import { GoalNode,
  AgentNode,
  TaskNode } from "./CustomNodes";
import { Icon } from "../ui/Icon";

const nodeTypes = {
  goalNode: GoalNode,
  agentNode: AgentNode,
  taskNode: TaskNode,
};

const getLayoutedElements = (nodes: any[], edges: any[], direction = "TB") => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 220, height: 120 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? "left" : "top",
      sourcePosition: isHorizontal ? "right" : "bottom",
      position: {
        x: nodeWithPosition.x - 110,
        y: nodeWithPosition.y - 60,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

interface ProWorkforceCanvasProps {
  theme?: any;
}

const ProWorkforceCanvasInternal: React.FC<ProWorkforceCanvasProps> = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const refreshGraph = useCallback(() => {
    const all = lucaWorkforce.getActiveWorkflows();
    const active = all.length > 0 ? all[all.length - 1] : null;
    
    if (active) {
      if (active.workflowId !== activeWorkflowId) {
        setActiveWorkflowId(active.workflowId);
      }
      
      const { nodes: rawNodes, edges: rawEdges } = lucaWorkforce.getGraphData(active.workflowId);
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rawNodes, rawEdges);
      
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      setIsReady(true);
    } else {
      setActiveWorkflowId(null);
      setNodes([]);
      setEdges([]);
      setIsReady(false);
    }
  }, [activeWorkflowId, setNodes, setEdges]);

  useEffect(() => {
    refreshGraph();
    const interval = setInterval(refreshGraph, 2000); // Polling for updates
    return () => clearInterval(interval);
  }, [refreshGraph]);

  if (!activeWorkflowId && !isReady) {
    // No standby room (workforce-target): the entry pill only exists while
    // agents run, so this state is only reachable when work ends while the
    // user is watching. Say so plainly; ChatPanel returns to chat on its own.
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[13px] text-[var(--luca-text-tertiary,var(--app-text-muted))]">
          Nothing running — Luca is standing by.
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full rounded-xl border overflow-hidden"
      style={{
        borderColor: "var(--luca-border-subtle, rgba(255,255,255,0.06))",
        background: "transparent",
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={1.5}
        contentEditable={false}
      >
        <Background color="rgba(255,255,255,0.05)" gap={24} />
        <Controls showInteractive={false} className="!bg-black/50 !border-white/10" />
        
        <Panel position="top-right">
          <div
            className="flex items-center gap-2 rounded-full border px-3 py-1.5"
            style={{
              borderColor: "var(--luca-border-subtle, rgba(255,255,255,0.07))",
              background: "var(--luca-background-base, #111417)",
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full animate-pulse"
              style={{ background: "var(--luca-success, #4fbf7a)" }}
              aria-hidden="true"
            />
            <span className="text-[11.5px] font-medium text-[var(--luca-text-primary,var(--app-text-main))]">
              Luca · orchestrating
            </span>
          </div>
        </Panel>

        <Panel position="bottom-right">
          <div className="flex gap-2">
             <button
               onClick={() => refreshGraph()}
               className="p-2 rounded-lg border hover:bg-white/5 text-[var(--luca-text-tertiary,var(--app-text-muted))]"
               style={{
                 borderColor: "var(--luca-border-subtle, rgba(255,255,255,0.07))",
                 background: "var(--luca-background-base, #111417)",
               }}
             >
               <Icon name="Expand" size={14} variant="BoldDuotone" />
             </button>
          </div>
        </Panel>
      </ReactFlow>

      {/* The trust whisper, where the work is. */}
      <div className="pointer-events-none absolute bottom-3 left-0 right-0 z-[50] flex justify-center">
        <span className="text-[11px] text-[var(--luca-text-tertiary,var(--app-text-muted))] opacity-85">
          Every agent asks before anything leaves this machine.
        </span>
      </div>
    </div>
  );
};

export const ProWorkforceCanvas: React.FC<ProWorkforceCanvasProps> = (props) => (
  <ReactFlowProvider>
    <ProWorkforceCanvasInternal {...props} />
  </ReactFlowProvider>
);
