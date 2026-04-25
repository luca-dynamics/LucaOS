import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import { Icon } from "./ui/Icon";
import ThoughtGraph, { ThoughtNode } from './ThoughtGraph';
import ExecutionPipeline from './ExecutionPipeline';
import SubAgentDrone, { DroneTask } from './SubAgentDrone';
import BDIJustificationPanel from './BDIJustificationPanel';

interface ThoughtProcessPanelProps {
  nodes: ThoughtNode[];
  drones?: DroneTask[];
  onClose: () => void;
  onNodeClick?: (nodeId: string) => void;
}

const ThoughtProcessPanel: React.FC<ThoughtProcessPanelProps> = ({
  nodes,
  drones = [],
  onClose,
  onNodeClick
}) => {
  const [viewMode, setViewMode] = useState<'graph' | 'pipeline' | 'drones' | 'agencies'>('graph');

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 glass-blur animate-in fade-in duration-300 font-mono">
      <div 
        className="relative w-[96%] h-[92%] border rounded-2xl flex flex-col overflow-hidden shadow-2xl"
        style={{ 
          backgroundColor: 'var(--app-bg-main, #050505)',
          borderColor: 'var(--app-border-main, rgba(255,255,255,0.1))'
        }}
      >

        {/* Header */}
        <div 
          className="h-16 border-b flex items-center justify-between px-8"
          style={{ 
            borderColor: 'var(--app-border-main)',
            backgroundColor: 'var(--app-bg-tint)'
          }}
        >
          <div className="flex items-center gap-5">
            <Icon name="BrainCircuit" className="animate-pulse" size={24} color="var(--app-primary)" />
            <div className="space-y-0.5">
              <h2 className="text-sm font-black tracking-[0.3em] uppercase italic" style={{ color: 'var(--app-text-main)' }}>
                COGNITIVE ENGINE
              </h2>
              <div className="text-[9px] flex gap-4 font-black uppercase tracking-widest" style={{ color: 'var(--app-text-muted)' }}>
                <span>STREAM: LIVE</span>
                <span>NODES: {nodes.length}</span>
                <span>MODE: {viewMode.toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* View mode switcher */}
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
            {[
              { id: 'graph', label: 'NEURAL GRAPH', icon: 'Network' },
              { id: 'pipeline', label: 'EXECUTION', icon: 'Activity' },
              { id: 'drones', label: 'SUB-AGENTS', icon: 'Navigation' },
              { id: 'agencies', label: 'REASONING', icon: 'ShieldCheck' }
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id as any)}
                className={`px-4 py-2 text-[10px] font-black transition-all rounded-lg flex items-center gap-2 tracking-widest uppercase
                  ${viewMode === mode.id
                    ? 'shadow-lg'
                    : 'opacity-40 hover:opacity-100'
                  }`}
                style={{ 
                  backgroundColor: viewMode === mode.id ? 'var(--app-primary)' : 'transparent',
                  color: viewMode === mode.id ? '#000' : 'var(--app-text-main)'
                }}
              >
                <Icon name={mode.icon} size={14} color={viewMode === mode.id ? '#000' : 'currentColor'} />
                {mode.label}
              </button>
            ))}
          </div>

          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:bg-white/5 active:scale-95"
            style={{ color: 'var(--app-text-muted)' }}
          >
            <Icon name="X" size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative">
          {viewMode === 'graph' && (
            <div className="w-full h-full">
              <Canvas
                gl={{ antialias: true, alpha: true }}
                dpr={[1, 2]}
                camera={{ position: [0, 0, 8], fov: 50 }}
              >
                <PerspectiveCamera makeDefault position={[0, 0, 8]} />
                {/* eslint-disable-next-line react/no-unknown-property */}
                <ambientLight intensity={0.5} />
                {/* eslint-disable-next-line react/no-unknown-property */}
                <pointLight position={[10, 10, 10]} intensity={1} />
                {/* eslint-disable-next-line react/no-unknown-property */}
                <pointLight position={[-10, -10, -10]} intensity={0.5} color="var(--app-primary)" />

                <ThoughtGraph
                  nodes={nodes}
                  onNodeClick={onNodeClick}
                />

                <OrbitControls
                  enableZoom={true}
                  enablePan={true}
                  autoRotate={false}
                />
              </Canvas>
              
              {/* Graph UI Overlay */}
              <div className="absolute top-6 left-6 p-4 rounded-2xl border border-white/5 glass-blur space-y-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                  <div className="space-y-1">
                      <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--app-text-muted)' }}>Synaptic Density</div>
                      <div className="text-xs font-bold" style={{ color: 'var(--app-text-main)' }}>{Math.round(nodes.length * 1.4)} Connections</div>
                  </div>
              </div>
            </div>
          )}

          {viewMode === 'pipeline' && (
            <div className="w-full h-full overflow-y-auto p-10 custom-scrollbar">
              <ExecutionPipeline
                steps={nodes.map(n => ({
                  ...n,
                  status: n.status === 'PROCESSING' ? 'PROCESSING' : n.status === 'ERROR' ? 'ERROR' : n.status === 'SUCCESS' ? 'SUCCESS' : n.status === 'COMPLETE' ? 'COMPLETE' : 'PENDING'
                }))}
                currentStep={nodes.find(n => n.status === 'PROCESSING' || n.status === 'processing' as any)?.id}
              />
            </div>
          )}

          {viewMode === 'drones' && drones.length > 0 && (
            <div className="w-full h-full">
              <Canvas
                gl={{ antialias: true, alpha: true }}
                dpr={[1, 2]}
                camera={{ position: [0, 0, 10], fov: 50 }}
              >
                <PerspectiveCamera makeDefault position={[0, 0, 10]} />
                {/* eslint-disable-next-line react/no-unknown-property */}
                <ambientLight intensity={0.5} />
                {/* eslint-disable-next-line react/no-unknown-property */}
                <pointLight position={[10, 10, 10]} intensity={1} />

                {drones.map((drone) => (
                  <SubAgentDrone
                    key={drone.id}
                    {...drone}
                  />
                ))}

                <OrbitControls
                  enableZoom={true}
                  enablePan={true}
                  autoRotate={false}
                />
              </Canvas>

              {/* Drone list overlay */}
              <div className="absolute bottom-6 left-6 right-6 p-6 rounded-2xl border glass-blur grid grid-cols-4 gap-6" 
                style={{ 
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  borderColor: 'var(--app-border-main)'
                }}>
                {drones.map((drone) => (
                  <div key={drone.id} className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                       <span style={{ color: 'var(--app-text-main)' }}>{drone.taskName}</span>
                       <span style={{ color: 'var(--app-primary)' }}>{Math.round(drone.progress * 100)}%</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full transition-all duration-500" 
                          style={{ width: `${drone.progress * 100}%`, backgroundColor: 'var(--app-primary)' }} 
                        />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewMode === 'drones' && drones.length === 0 && (
            <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--app-text-muted)' }}>
              <div className="text-center space-y-4">
                <Icon name="Navigation" className="mx-auto animate-bounce opacity-20" size={64} color="var(--app-primary)" />
                <div className="space-y-1">
                  <div className="text-sm font-black uppercase tracking-widest">No active drones</div>
                  <div className="text-[10px] opacity-70 font-bold uppercase tracking-widest">Drones manifest during parallel agent execution</div>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'agencies' && (
            <div className="w-full h-full overflow-hidden">
                <BDIJustificationPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThoughtProcessPanel;

