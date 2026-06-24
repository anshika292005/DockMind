import React, { useState } from 'react';
import { TopBar } from './components/TopBar';
import { DocumentManager } from './components/Sidebar/DocumentManager';
import { ChatArea } from './components/Chat/ChatArea';
import { SourcesPanel } from './components/Sources/SourcesPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { ToastProvider } from './ui/Toast';
import { useMemory } from './hooks/useMemory';

// Inner app that has access to ToastProvider context
function AppInner() {
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('Ask Documents');

  const memory = useMemory();

  return (
    <div className="flex flex-col h-screen w-screen bg-base text-text-primary overflow-hidden">
      <TopBar
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        onToggleSources={() => setShowSources(!showSources)}
        onOpenSettings={() => setShowSettings(true)}
      />

      <div className="flex flex-1 overflow-hidden relative">

        {/* Sidebar - Left Panel */}
        <div className={`
          absolute md:relative z-20 h-full w-[260px] bg-surface border-r border-border transition-transform duration-300
          ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <DocumentManager memory={memory} />
        </div>

        {/* Chat - Center Panel */}
        <div className="flex-1 flex flex-col min-w-0 bg-base relative z-10">
          <ChatArea activeTab={activeTab} setActiveTab={setActiveTab} memory={memory} />
        </div>

        {/* Sources - Right Panel */}
        <div className={`
          absolute lg:relative right-0 z-20 h-full w-full sm:w-[320px] bg-surface border-l border-border transition-transform duration-300
          ${showSources ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}>
          <SourcesPanel onClose={() => setShowSources(false)} />
        </div>

        {/* Backdrop for mobile */}
        {(showSidebar || showSources) && (
          <div
            className="absolute inset-0 bg-black/50 z-10 lg:hidden"
            onClick={() => { setShowSidebar(false); setShowSources(false); }}
          />
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
