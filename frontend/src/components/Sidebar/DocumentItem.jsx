import React, { useState } from 'react';
import { FileText, Trash2, Clock, ChevronDown, ChevronRight, MessageSquare, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../ui/Toast';

function timeAgo(dateString) {
  if (!dateString) return '';
  const diff = (Date.now() - new Date(dateString).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function DocumentItem({ doc, index, memory, remove }) {
  const { addToast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const { sessions = [], activeSessionId, setActiveSessionId, createSession } = memory || {};

  // Sessions belonging to this document
  const docSessions = sessions.filter(s => s.document_filename === doc.filename);

  const handleDelete = async (e) => {
    e.stopPropagation();
    setDeleting(true);
    const res = await remove(doc.filename);
    if (res.success) {
      addToast({ message: `${doc.filename} deleted`, type: 'info' });
    } else {
      setDeleting(false);
    }
  };

  const handleNewSession = async (e) => {
    e.stopPropagation();
    const sessionName = `Chat ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const id = await createSession(sessionName, doc.filename);
    if (id) {
      setExpanded(true);
      addToast({ message: 'New chat session created', type: 'success' });
    }
  };

  const handleSelectSession = (e, sessionId) => {
    e.stopPropagation();
    setActiveSessionId(sessionId);
  };

  const isActiveDoc = docSessions.some(s => s.id === activeSessionId);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: deleting ? 0 : 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      className="select-none"
    >
      {/* Document Row */}
      <div
        onClick={() => setExpanded(v => !v)}
        className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all ${
          isActiveDoc
            ? 'bg-violet/10 border border-violet/30'
            : 'hover:bg-base border border-transparent hover:border-border'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden min-w-0">
          {/* Expand chevron */}
          <span className="shrink-0 text-text-muted">
            {expanded
              ? <ChevronDown size={12} />
              : <ChevronRight size={12} />
            }
          </span>
          <div className="shrink-0 w-7 h-7 rounded bg-violet/10 border border-violet/20 flex items-center justify-center">
            <FileText size={13} className="text-violet" />
          </div>
          <div className="overflow-hidden min-w-0">
            <p className="font-mono text-xs text-text-primary truncate">{doc.filename}</p>
            <span className="text-[10px] text-text-muted">{doc.chunk_count ?? doc.chunks_stored ?? 0} chunks · {docSessions.length} chats</span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          <button
            onClick={handleNewSession}
            className="p-1 rounded text-text-muted opacity-0 group-hover:opacity-100 hover:text-teal hover:bg-teal/10 transition-all"
            title="New chat session"
          >
            <Plus size={12} />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1 rounded text-text-muted opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-50"
            title="Delete document"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Sessions nested under doc */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-6 mt-0.5 mb-1 space-y-0.5 border-l border-border/50 pl-3">
              {docSessions.length === 0 ? (
                <button
                  onClick={handleNewSession}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-text-muted hover:text-text-primary hover:bg-base transition-colors"
                >
                  <Plus size={11} />
                  Start a new chat
                </button>
              ) : (
                docSessions.map(session => (
                  <button
                    key={session.id}
                    onClick={(e) => handleSelectSession(e, session.id)}
                    className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded text-left transition-all ${
                      session.id === activeSessionId
                        ? 'bg-violet/15 text-violet border border-violet/25'
                        : 'text-text-muted hover:text-text-primary hover:bg-base'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
                      <MessageSquare size={10} className="shrink-0" />
                      <span className="text-[11px] truncate">{session.name}</span>
                    </div>
                    <span className="text-[10px] shrink-0 opacity-60 flex items-center gap-0.5">
                      <Clock size={8} />
                      {timeAgo(session.last_active_at)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
