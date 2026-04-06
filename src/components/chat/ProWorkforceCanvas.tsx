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
import { motion } from "framer-motion";

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

const ProWorkforceCanvasInternal: React.FC<ProWorkforceCanvasProps> = ({ theme }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const themeColor = theme?.hex || "#3b82f6";
  const isLight = theme?.themeName?.toLowerCase() === "lucagent";

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
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 relative overflow-hidden rounded-xl"
           style={{ background: isLight ? "rgba(243, 244, 246, 0.5)" : "rgba(10, 10, 10, 0.8)" }}>
        
        <div className="relative">
             <img 
               src={isLight ? "/icon_dark.png" : "/icon.png"} 
               alt="Luca Logo" 
               className="w-16 h-16 object-contain opacity-20"
             />
             <motion.div 
               animate={{ rotate: 360 }}
               transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
               className="absolute -inset-4 border border-dashed rounded-full"
               style={{ borderColor: `${themeColor}22` }}
             />
        </div>
        <div className="text-center z-10">
          <p className="text-[11px] tracking-[0.5em] font-black mb-2 uppercase" style={{ color: `${themeColor}cc` }}>Luca Standby</p>
          <p className={`text-[9px] tracking-[0.2em] font-mono opacity-50 ${isLight ? "text-gray-600" : "text-white"}`}>Awaiting mission parameters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-[#020202] rounded-xl border border-white/5 overflow-hidden shadow-2xl">
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
        <Background color="#333" gap={20} />
        <Controls showInteractive={false} className="!bg-black/50 !border-white/10" />
        
        <Panel position="top-right">
          <div className="px-3 py-2 rounded-lg bg-black/60 glass-blur border border-white/10 flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-bold text-white tracking-widest uppercase">LUCA WORKFORCE</span>
            </div>
            <div className="text-[7px] text-slate-500 font-mono text-right">
              WF_ID: {activeWorkflowId?.split('_')[1] || "PENDING"}
            </div>
          </div>
        </Panel>

        <Panel position="bottom-right">
          <div className="flex gap-2">
             <button 
               onClick={() => refreshGraph()}
               className="p-2 rounded bg-black/60 border border-white/10 hover:bg-white/5 text-slate-400"
             >
               <Icon name="Expand" size={14} variant="BoldDuotone" />
             </button>
          </div>
        </Panel>
      </ReactFlow>

      {/* --- OVERLAY INTERFACE --- */}
       <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-[50]">
         <div className="px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center gap-2 glass-blur">
            <Icon name="Activity" size={12} className="text-blue-400" variant="BoldDuotone" />
            <span className="text-[9px] text-blue-400 font-bold tracking-widest">SYSTEM ACTIVITY</span>
         </div>
       </div>
    </div>
  );
};

export const ProWorkforceCanvas: React.FC<ProWorkforceCanvasProps> = (props) => (
  <ReactFlowProvider>
    <ProWorkforceCanvasInternal {...props} />
  </ReactFlowProvider>
);
