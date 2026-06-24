import React, { useState, useRef, useEffect } from 'react';
import { Tabs } from '../../ui/Tabs';
import { QueryInput } from './QueryInput';
import { MessageBubble } from './MessageBubble';
import { AgentStepTimeline } from './AgentStepTimeline';
import { WelcomeScreen } from './WelcomeScreen';
import { useStreamQuery } from '../../hooks/useStreamQuery';
import { useToast } from '../../ui/Toast';
import { Trash2, FileText, MessageSquare } from 'lucide-react';
import { api } from '../../api/client';

export function ChatArea({ activeTab, setActiveTab, memory }) {
  const [query, setQuery] = useState('');
  const scrollRef = useRef(null);
  const { messages: streamMessages, status, ask, clearMessages } = useStreamQuery();
  const [researchMessages, setResearchMessages] = useState([]);
  const [researching, setResearching] = useState(false);
  const [historyMessages, setHistoryMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const { addToast } = useToast();

  const { sessions = [], activeSessionId, setActiveSessionId } = memory || {};

  // Find the active session and its linked document
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const activeFilename = activeSession?.document_filename || null;

  // Load history when session changes
  useEffect(() => {
    if (!activeSessionId) {
      setHistoryMessages([]);
      return;
    }
    const loadHistory = async () => {
      setLoadingHistory(true);
      try {
        const res = await fetch(`/api/sessions/${activeSessionId}/messages`);
        if (res.ok) {
          const data = await res.json();
          setHistoryMessages(data || []);
        }
      } catch (e) {
        console.error('Failed to load history', e);
      } finally {
        setLoadingHistory(false);
      }
    };
    loadHistory();
  }, [activeSessionId]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [streamMessages, researchMessages, historyMessages, status, researching, loadingHistory]);

  const handleSend = async (overrideQuery) => {
    const q = (overrideQuery || query).trim();
    if (!q) return;
    setQuery('');

    if (activeTab === 'Ask Documents') {
      await ask(q, { filename: activeFilename, sessionId: activeSessionId });
    } else {
      setResearchMessages(prev => [...prev, { role: 'user', content: q }]);
      setResearching(true);
      addToast({ message: 'Deep Research started...', type: 'info' });
      try {
        const res = await api.runDeepResearch(q);
        const data = res?.data || res;
        setResearchMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: data?.report || '[No report generated]',
            steps: data?.agent_steps?.map(s => ({ type: 'step', text: s, timestamp: '' })) || [],
            citations: data?.sources?.map(s => ({
              filename: s.filename || s.url || '',
              page: s.page || 0,
            })) || [],
          },
        ]);
      } catch (err) {
        setResearchMessages(prev => [
          ...prev,
          { role: 'assistant', content: `[Research failed: ${err.message || 'Unknown error'}]`, isError: true },
        ]);
      } finally {
        setResearching(false);
      }
    }
  };

  const handleClear = () => {
    if (activeTab === 'Ask Documents') {
      clearMessages();
      setHistoryMessages([]);
    } else {
      setResearchMessages([]);
    }
  };

  const currentMessages = activeTab === 'Ask Documents' ? streamMessages : researchMessages;
  const isBusy = status === 'loading' || status === 'streaming' || researching;

  // Combine history (muted) + live messages
  const displayMessages = activeTab === 'Ask Documents'
    ? [
        ...historyMessages.map(m => ({ ...m, isHistory: true })),
        ...streamMessages,
      ]
    : researchMessages;

  return (
    <div className="flex flex-col h-full w-full">

      {/* Header Tabs */}
      <div className="flex items-center justify-center py-3 border-b border-border bg-base z-10 shrink-0 relative">
        <Tabs
          tabs={[
            { id: 'Ask Documents', label: 'Ask Documents' },
            { id: 'Deep Research', label: '⚡ Deep Research' },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
          className="w-72"
        />
        {currentMessages.length > 0 && (
          <button
            onClick={handleClear}
            title="Clear conversation"
            className="absolute right-4 flex items-center gap-1.5 text-xs text-text-muted hover:text-red-400 transition-colors p-1.5 rounded hover:bg-red-400/10"
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>

      {/* Active document/session indicator */}
      {activeFilename && (
        <div className="flex items-center gap-2 px-4 py-2 bg-violet/5 border-b border-violet/15 text-xs text-violet/80 shrink-0">
          <FileText size={12} />
          <span className="font-mono truncate flex-1">{activeFilename}</span>
          {activeSession && (
            <>
              <span className="text-text-muted">·</span>
              <MessageSquare size={11} className="text-text-muted" />
              <span className="text-text-muted truncate max-w-[120px]">{activeSession.name}</span>
            </>
          )}
          <button
            onClick={() => setActiveSessionId(null)}
            className="ml-auto text-text-muted hover:text-text-primary transition-colors"
            title="Deselect document"
          >
            ✕
          </button>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 no-scrollbar" ref={scrollRef}>
        {loadingHistory ? (
          <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
            {[1,2,3].map(i => (
              <div key={i} className="h-12 bg-surface rounded-xl w-3/4" style={{ marginLeft: i % 2 === 0 ? 'auto' : 0 }} />
            ))}
          </div>
        ) : displayMessages.length === 0 ? (
          <WelcomeScreen onSuggestionClick={(text) => handleSend(text)} />
        ) : (
          <div className="max-w-3xl mx-auto w-full pb-4">
            {/* History separator */}
            {historyMessages.length > 0 && streamMessages.length > 0 && activeTab === 'Ask Documents' && (
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-[10px] text-text-muted tracking-wider uppercase">Previous history</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>
            )}
            {displayMessages.map((msg, idx) => (
              <React.Fragment key={idx}>
                {msg.steps && <AgentStepTimeline steps={msg.steps} />}
                <div className={msg.isHistory ? 'opacity-60' : 'opacity-100'}>
                  <MessageBubble message={msg} />
                </div>
              </React.Fragment>
            ))}
            {/* Separator between history and current */}
            {historyMessages.length > 0 && streamMessages.length > 0 && activeTab === 'Ask Documents' && (
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-violet/30" />
                <span className="text-[10px] text-violet/70 tracking-wider uppercase">Current session</span>
                <div className="flex-1 h-px bg-violet/30" />
              </div>
            )}
            {researching && activeTab === 'Deep Research' && (
              <AgentStepTimeline steps={[{ type: 'search_docs', text: 'Initiating deep research...', timestamp: '0.0s' }]} />
            )}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-base shrink-0 border-t border-border/50">
        <div className="max-w-3xl mx-auto">
          {!activeFilename && activeTab === 'Ask Documents' && (
            <p className="text-center text-xs text-text-muted mb-2">
              💡 Select a document in the sidebar to query it specifically, or ask across all documents
            </p>
          )}
          <QueryInput
            query={query}
            setQuery={setQuery}
            onSend={() => handleSend()}
            disabled={isBusy}
            placeholder={
              activeFilename
                ? `Ask about ${activeFilename}...`
                : 'Ask anything about your documents...'
            }
          />
          <div className="text-center mt-2">
            <span className="text-[10px] text-text-muted">
              Powered by Llama 3.3 70B · ChromaDB · LlamaIndex
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
