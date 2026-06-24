import { useState, useCallback, useEffect } from 'react';

const SESSION_KEY_DOCS = 'docmind_messages_docs';
const SESSION_KEY_RESEARCH = 'docmind_messages_research';

function loadFromSession(key, fallback = []) {
  try {
    const stored = sessionStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function saveToSession(key, data) {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

export function useStreamQuery() {
  const [messages, setMessages] = useState(() => loadFromSession(SESSION_KEY_DOCS));
  const [status, setStatus] = useState('idle'); // idle, loading, streaming, done, error

  // Persist messages on every change
  useEffect(() => {
    saveToSession(SESSION_KEY_DOCS, messages);
  }, [messages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    sessionStorage.removeItem(SESSION_KEY_DOCS);
  }, []);

  const ask = useCallback(async (query, { filename = null, sessionId = null } = {}) => {
    setStatus('loading');
    setMessages(prev => [...prev, { role: 'user', content: query }]);

    try {
      let groqApiKey = '';
      let groqModel = '';
      let topK = 5;
      try {
        const stored = localStorage.getItem('docmind_settings');
        if (stored) {
          const settingsObj = JSON.parse(stored);
          groqApiKey = settingsObj.groqApiKey || '';
          groqModel = settingsObj.model || '';
          topK = settingsObj.topK || 5;
        }
      } catch (err) {
        console.error('Failed to parse settings:', err);
      }

      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      };
      if (groqApiKey) {
        headers['X-Groq-Api-Key'] = groqApiKey;
      }
      if (groqModel) {
        headers['X-Groq-Model'] = groqModel;
      }

      const body = { 
        question: query,
        top_k: topK,
      };
      if (filename) body.filename = filename;
      if (sessionId) body.session_id = sessionId;

      const response = await fetch('/api/query/stream', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}${errorText ? ': ' + errorText.slice(0, 200) : ''}`);
      }

      setStatus('streaming');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      // Add a placeholder message for the assistant
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '', citations: null, isStreaming: true }
      ]);

      // SSE buffer (frames are separated by a blank line)
      let buffer = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;

        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split('\n\n');
          buffer = frames.pop() ?? '';

          for (const frame of frames) {
            const dataLine = frame
              .split('\n')
              .find(line => line.startsWith('data:'));
            if (!dataLine) continue;

            const jsonStr = dataLine.replace(/^data:\s?/, '');
            try {
              const data = JSON.parse(jsonStr);

              setMessages(prev => {
                const newMessages = [...prev];
                const lastMsgIndex = newMessages.length - 1;
                const lastMsg = { ...newMessages[lastMsgIndex] };

                if (data.type === 'token') {
                  lastMsg.content += data.content;
                } else if (data.type === 'citations') {
                  lastMsg.citations = data.data;
                } else if (data.type === 'done') {
                  lastMsg.isStreaming = false;
                } else if (data.type === 'error') {
                  lastMsg.isStreaming = false;
                  lastMsg.isError = true;
                  lastMsg.content = data.message || 'An error occurred.';
                }

                newMessages[lastMsgIndex] = lastMsg;
                return newMessages;
              });

              if (data.type === 'done') setStatus('done');
            } catch (e) {
              console.warn('Failed to parse stream chunk:', jsonStr, e);
            }
          }
        }
      }

      // Cleanup streaming state
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMsgIndex = newMessages.length - 1;
        if (newMessages[lastMsgIndex]?.isStreaming) {
          newMessages[lastMsgIndex] = { ...newMessages[lastMsgIndex], isStreaming: false };
        }
        return newMessages;
      });
      setStatus('done');

    } catch (error) {
      console.error('Streaming error:', error);
      setStatus('error');
      // Show a proper error message in the chat bubble
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg?.role === 'assistant') {
          newMessages[newMessages.length - 1] = {
            ...lastMsg,
            isStreaming: false,
            isError: true,
            content: error.message?.includes('500')
              ? '⚠️ Backend error — the server encountered an issue. Make sure all dependencies are installed and the backend is running correctly.'
              : error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION')
              ? '⚠️ Cannot reach the backend. Make sure the FastAPI server is running.'
              : `⚠️ ${error.message || 'Something went wrong. Please try again.'}`,
          };
        } else {
          // No assistant placeholder was added yet
          newMessages.push({
            role: 'assistant',
            isStreaming: false,
            isError: true,
            content: `⚠️ ${error.message || 'Something went wrong.'}`,
          });
        }
        return newMessages;
      });
    }
  }, []);

  return { messages, status, ask, clearMessages };
}
