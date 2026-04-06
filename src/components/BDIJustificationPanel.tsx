import React from 'react';
import { mentalStateService } from '../services/mentalStateService';
import { Icon } from './ui/Icon';

const BDIJustificationPanel: React.FC = () => {
    const intentions = Array.from(mentalStateService.intentions.values())
        .filter(i => i.status === "COMMIT" || i.status === "IN_PROGRESS");
    const desires = Array.from(mentalStateService.desires.values());
    const beliefs = Array.from(mentalStateService.beliefs.values());

    // Evolution Opportunities (Phase 6)
    const evolutionDesires = desires.filter(d => d.description.startsWith("EVOLVE_REMEDIATE:"));

    return (
        <div className="w-full h-full flex flex-col gap-6 p-6 overflow-y-auto animate-in slide-in-from-right duration-500 bg-black/40 backdrop-blur-md">
            <header className="border-b border-cyan-500/20 pb-4 flex justify-between items-end">
                <div>
                    <h3 className="text-xl font-bold text-cyan-400 tracking-widest flex items-center gap-2">
                        <Icon name="SearchCode" size={20} />
                        SOVEREIGN AUDITOR
                    </h3>
                    <p className="text-[10px] text-cyan-700 mt-1 uppercase font-mono">Cognition verified: {new Date().toLocaleTimeString()} | BDI-L6 Active</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className="text-[8px] text-cyan-500 font-bold uppercase tracking-tighter">Steering Reduction</span>
                    <div className="w-24 h-1 bg-cyan-900 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-cyan-400 shadow-[0_0_8px_cyan]" 
                            style={{ width: `${Math.min(100, (beliefs.filter(b => b.priority >= 10).length / (beliefs.length || 1)) * 100)}%` }}
                        />
                    </div>
                </div>
            </header>

            {/* EVOLUTION QUEUE (Phase 6) */}
            {evolutionDesires.length > 0 && (
                <section className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-sm animate-pulse-subtle">
                    <div className="flex items-center gap-2 mb-3">
                        <Icon name="Zap" size={14} className="text-amber-500" />
                        <h4 className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">Evolution Queue (Autonomous Remediation)</h4>
                    </div>
                    <div className="space-y-3">
                        {evolutionDesires.map(ed => (
                            <div key={ed.id} className="flex flex-col gap-1 border-l-2 border-amber-500/40 pl-3 py-1">
                                <div className="text-xs text-amber-100 font-medium">{ed.description.replace("EVOLVE_REMEDIATE: ", "")}</div>
                                <div className="text-[9px] text-amber-700 italic">Justification: System pattern detected. Use &apos;evolveCodeSafe&apos; to proceed.</div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {intentions.length === 0 ? (
                <div className="flex-1 flex flex-col justify-center items-center opacity-30 italic text-gray-500 gap-4">
                    <Icon name="Cpu" size={40} className="animate-pulse" />
                    No active mission commitments. Standing by.
                </div>
            ) : (
                <div className="space-y-8">
                    {intentions.map(intention => {
                        const desire = desires.find(d => d.id === intention.fulfills);
                        
                        return (
                            <div key={intention.id} className="relative pl-8 border-l border-cyan-500/30 py-2">
                                {/* Junction point */}
                                <div className="absolute -left-[5px] top-4 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_cyan]" />

                                <div className="space-y-4">
                                    {/* INTENTION */}
                                    <div className="bg-cyan-500/5 p-4 border border-cyan-500/10 rounded-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="text-[10px] text-cyan-500 uppercase font-bold tracking-tighter">Current Commitment (Intention)</div>
                                            <span className={`px-2 py-0.5 text-[8px] font-bold rounded ${intention.complexity >= 8 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'}`}>
                                                COMPLEXITY: {intention.complexity}/10
                                            </span>
                                        </div>
                                        <div className="text-cyan-100 text-sm leading-relaxed font-semibold mb-2">{intention.plan}</div>
                                        <div className="text-[10px] text-cyan-700 italic border-t border-cyan-500/10 pt-2 font-mono">
                                             Trace: {intention.justification}
                                        </div>
                                    </div>

                                    {/* DESIRE */}
                                    {desire && (
                                        <div className="flex items-start gap-4">
                                            <Icon name="ArrowDown" size={14} className="text-cyan-800 mt-4 ml-4" />
                                            <div className="bg-gray-900/50 p-3 border border-gray-800 rounded-sm flex-1">
                                                <div className="flex justify-between items-center mb-2">
                                                    <div className="text-[10px] text-gray-500 uppercase">Driving Goal (Desire)</div>
                                                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${desire.source === 'DIRECTIVE' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                                                        {desire.source}
                                                    </span>
                                                </div>
                                                <div className="text-cyan-400/80 text-xs font-medium mb-3">{desire.description}</div>
                                                
                                                <div className="text-[9px] text-cyan-900 uppercase font-bold mb-1">Motivating Beliefs</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {desire.motivatedBy.map(beliefId => {
                                                        const belief = beliefs.find(b => b.id === beliefId);
                                                        if (!belief) return null;
                                                        const isCritical = belief.priority >= 10;
                                                        
                                                        return (
                                                            <div key={beliefId} className={`px-2 py-1 flex items-center gap-2 rounded-sm text-[9px] ${isCritical ? 'bg-red-500/10 border border-red-500/40 text-red-100' : 'bg-cyan-950/30 border border-cyan-900/50 text-cyan-600'}`}>
                                                                {isCritical && <div className="w-1 h-1 bg-red-400 rounded-full animate-pulse" />}
                                                                {belief.fact}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Belief Bank Snapshot */}
            <footer className="mt-auto pt-8">
                <div className="text-[10px] text-cyan-950 font-bold mb-3 uppercase tracking-widest border-t border-cyan-900 pt-4 flex justify-between">
                    <span>Sovereign Context Bank (Recent Facts)</span>
                    <span>{beliefs.length} ACTIVE</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {beliefs.slice(-4).map(b => {
                        const isCritical = b.priority >= 10;
                        const isFoundational = b.priority >= 8 && !isCritical;

                        return (
                            <div key={b.id} className={`p-3 border rounded-sm flex flex-col gap-2 ${isCritical ? 'border-red-500/30 bg-red-500/5 shadow-[inset_0_0_10px_rgba(239,68,68,0.1)]' : 'border-cyan-900/30 bg-black/40'}`}>
                                <div className="flex justify-between items-center">
                                    <span className={`text-[8px] font-bold px-1 rounded-full ${isCritical ? 'text-red-400 bg-red-400/10' : isFoundational ? 'text-purple-400 bg-purple-400/10' : 'text-cyan-700 bg-cyan-700/10'}`}>
                                        {isCritical ? '🚨 CORRECTION' : isFoundational ? '🏛️ DIRECTIVE' : '🧠 INFERENCE'}
                                    </span>
                                    <span className="text-[7px] text-gray-600 font-mono">Usage: {b.usageCount}</span>
                                </div>
                                <span className={`${isCritical ? 'text-red-100' : 'text-gray-400'} text-[9px] leading-tight`}>{b.fact}</span>
                            </div>
                        );
                    })}
                </div>
            </footer>
        </div>
    );
};

export default BDIJustificationPanel;
