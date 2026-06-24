import React, { useState } from 'react';
import { X, Key, Cpu, Sliders } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SETTINGS_KEY = 'docmind_settings';

export function loadSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? JSON.parse(stored) : {
      groqApiKey: '',
      model: 'llama-3.3-70b-versatile',
      topK: 5,
      streamDelay: 0,
    };
  } catch {
    return { groqApiKey: '', model: 'llama-3.3-70b-versatile', topK: 5, streamDelay: 0 };
  }
}

export function SettingsPanel({ onClose }) {
  const [settings, setSettings] = useState(loadSettings);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 800);
    } catch {}
  };

  const models = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'mixtral-8x7b-32768',
    'gemma2-9b-it',
  ];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        {/* Panel */}
        <motion.div
          className="relative z-10 w-full max-w-md bg-surface border border-border rounded-xl shadow-xl p-6"
          initial={{ scale: 0.95, y: 10, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 10, opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sliders size={18} className="text-violet" />
              <h2 className="text-base font-semibold text-text-primary">Settings</h2>
            </div>
            <button onClick={onClose} className="text-text-muted hover:text-text-primary">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-5">
            {/* Groq API Key */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                <Key size={12} /> Groq API Key
              </label>
              <input
                type="password"
                value={settings.groqApiKey}
                onChange={e => setSettings(s => ({ ...s, groqApiKey: e.target.value }))}
                placeholder="gsk_..."
                className="w-full bg-base border border-border rounded px-3 py-2 text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-violet/50"
              />
              <p className="text-[10px] text-text-muted mt-1">Stored locally in your browser. Never sent to any server except Groq.</p>
            </div>

            {/* Model */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                <Cpu size={12} /> Model
              </label>
              <select
                value={settings.model}
                onChange={e => setSettings(s => ({ ...s, model: e.target.value }))}
                className="w-full bg-base border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-violet/50 cursor-pointer"
              >
                {models.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Top K */}
            <div>
              <label className="flex items-center justify-between text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                <span>Context Chunks (Top K)</span>
                <span className="text-violet font-mono">{settings.topK}</span>
              </label>
              <input
                type="range"
                min={1} max={20} step={1}
                value={settings.topK}
                onChange={e => setSettings(s => ({ ...s, topK: Number(e.target.value) }))}
                className="w-full accent-violet"
              />
              <div className="flex justify-between text-[10px] text-text-muted mt-1">
                <span>1 (precise)</span><span>20 (broad)</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded border border-border text-sm text-text-muted hover:text-text-primary hover:bg-base transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-2 rounded bg-violet hover:bg-violet/90 text-white text-sm font-medium transition-colors"
            >
              {saved ? '✓ Saved' : 'Save Settings'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
