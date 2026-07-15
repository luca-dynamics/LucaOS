// HumanInputModal - Modal for agent to request user input (credentials, etc.)
import React, { useState, useEffect } from 'react';
import { Icon } from "./ui/Icon";
import {
  lucaMaterialControlStyle,
  lucaMaterialDialogStyle,
  lucaMaterialSolidCardStyle,
} from "../styles/lucaMaterialSystem";
import { LucaDialog, LucaDialogOverlay, LucaInput } from "./ui/luca";

interface Props {
  isOpen: boolean;
  prompt: string;
  sessionId: string;
  onClose: () => void;
  onSubmit: (input: string) => void;
  isPassword?: boolean;
  isSavePrompt?: boolean;
}

const HumanInputModal: React.FC<Props> = ({ 
  isOpen, 
  prompt, 
  sessionId, 
  onClose, 
  onSubmit,
  isPassword = false,
  isSavePrompt = false
}) => {
  const [input, setInput] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInput('');
      setUsername('');
      setPassword('');
    }
  }, [isOpen, prompt]);

  const handleSubmit = () => {
    if (isSavePrompt) {
      // For save prompts, just submit yes/no
      onSubmit(input.toLowerCase().includes('yes') || input.toLowerCase().includes('y') ? 'yes' : 'no');
    } else if (username && password) {
      // For credential prompts, format as "username:password"
      onSubmit(`${username}:${password}`);
    } else if (input.trim()) {
      // For other prompts, submit as-is
      onSubmit(input.trim());
    }
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  // Check if prompt is asking for credentials
  const isCredentialPrompt = prompt.toLowerCase().includes('email') || 
                             prompt.toLowerCase().includes('username') || 
                             prompt.toLowerCase().includes('password') ||
                             prompt.toLowerCase().includes('login');

  return (
    <LucaDialogOverlay className="bg-black/70 animate-in fade-in duration-200" onRequestClose={onClose}>
      <LucaDialog
        modal
        onRequestClose={onClose}
        className="relative mx-4 w-full max-w-md overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--luca-info,#4f8cff)_32%,transparent)]"
        aria-label="Agent input request"
        style={lucaMaterialDialogStyle}
      >
        {/* Header */}
        <div className="h-14 border-b border-[color-mix(in_srgb,var(--luca-info,#4f8cff)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-info,#4f8cff)_12%,transparent)] flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {isPassword || isCredentialPrompt ? (
              <Icon name="Lock" size={18} className="text-[var(--luca-info,#4f8cff)]" />
            ) : (
              <Icon name="AlertCircle" size={18} className="text-[var(--luca-info,#4f8cff)]" />
            )}
            <span className="text-[var(--luca-info,#4f8cff)] text-sm font-bold tracking-wider">AGENT REQUEST</span>
          </div>
          <button
            onClick={onClose}
            className="luca-material-pressable rounded-lg border p-1.5 hover:text-[var(--luca-danger,#f87171)] transition-colors"
            style={lucaMaterialControlStyle}
            title="Close"
          >
            <Icon name="X" size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Prompt */}
          <div className="font-mono text-sm leading-relaxed text-[var(--luca-text-secondary)]">
            {prompt}
          </div>

          {/* Input Fields */}
          {isCredentialPrompt && !isSavePrompt ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--luca-info,#4f8cff)] mb-1.5 font-mono">
                  Email / Username
                </label>
                <LucaInput
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full rounded border px-3 py-2 font-mono text-sm outline-none focus:border-[color-mix(in_srgb,var(--luca-info,#4f8cff)_32%,transparent)] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--luca-info,#4f8cff)_40%,transparent)]"
                  style={lucaMaterialControlStyle}
                  placeholder="user@example.com"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--luca-info,#4f8cff)] mb-1.5 font-mono">
                  Password
                </label>
                <div className="relative">
                  <LucaInput
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full rounded border py-2 pl-3 pr-10 font-mono text-sm outline-none focus:border-[color-mix(in_srgb,var(--luca-info,#4f8cff)_32%,transparent)] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--luca-info,#4f8cff)_40%,transparent)]"
                    style={lucaMaterialControlStyle}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[var(--luca-info,#4f8cff)] text-xs font-mono"
                  >
                    {showPassword ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full resize-none rounded border px-3 py-2 font-mono text-sm outline-none focus:border-[color-mix(in_srgb,var(--luca-info,#4f8cff)_32%,transparent)] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--luca-info,#4f8cff)_40%,transparent)]"
                style={lucaMaterialControlStyle}
                rows={4}
                placeholder="Type your response..."
                autoFocus
              />
            </div>
          )}

          {/* Session Info */}
          <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-[color-mix(in_srgb,var(--luca-info,#4f8cff)_32%,transparent)]">
            Session: {sessionId.substring(0, 12)}...
          </div>
        </div>

        {/* Footer */}
        <div className="flex h-12 items-center justify-end gap-2 border-t border-[color-mix(in_srgb,var(--luca-info,#4f8cff)_32%,transparent)] px-4" style={lucaMaterialSolidCardStyle}>
          <button
            onClick={onClose}
            className="luca-material-pressable rounded border px-4 py-1.5 font-mono text-xs transition-colors hover:text-[var(--luca-text-primary)]"
            style={lucaMaterialControlStyle}
          >
            CANCEL
          </button>
          <button
            onClick={handleSubmit}
            disabled={isCredentialPrompt && !isSavePrompt ? (!username || !password) : !input.trim()}
            className="px-4 py-1.5 text-xs bg-[color-mix(in_srgb,var(--luca-info,#4f8cff)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--luca-info,#4f8cff)_12%,transparent)] text-[var(--luca-info,#4f8cff)] border border-[color-mix(in_srgb,var(--luca-info,#4f8cff)_32%,transparent)] rounded transition-colors font-mono disabled:opacity-30 disabled:cursor-not-allowed"
          >
            SUBMIT
          </button>
        </div>
      </LucaDialog>
    </LucaDialogOverlay>
  );
};

export default HumanInputModal;

