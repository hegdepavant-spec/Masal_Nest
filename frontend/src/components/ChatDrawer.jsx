import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Send, Sparkles, MessageSquare, Bot, User, RefreshCw, 
  Copy, Check, Flame, Zap, Snowflake, HelpCircle 
} from 'lucide-react';
import { api } from '../api';

const QUICK_PROMPTS = [
  'What qualification questions should I ask on our first call?',
  'Draft a friendly WhatsApp invitation for a property site visit.',
  'What are this customer\'s main concerns and how should I handle them?',
  'Summarize the key buying signals and timeline urgency.',
];

export default function ChatDrawer({ lead, onClose, showToast, onTaskMutated }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);

  // Fetch persisted history on lead open
  useEffect(() => {
    if (!lead) return;

    let isMounted = true;
    const fetchHistory = async () => {
      setInitialLoading(true);
      try {
        const data = await api.getChatHistory(lead.id);
        if (isMounted) {
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      } finally {
        if (isMounted) setInitialLoading(false);
      }
    };

    fetchHistory();
    return () => { isMounted = false; };
  }, [lead?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const text = textToSend || inputValue.trim();
    if (!text || loading) return;

    const userMessage = {
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      const res = await api.sendChatMessage(lead.id, text);
      const assistantMsgData = res.assistant_message || res.message;
      const assistantMessage = {
        role: 'assistant',
        content: assistantMsgData?.content || (typeof res === 'string' ? res : ''),
        created_at: assistantMsgData?.created_at || new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      if (onTaskMutated) {
        onTaskMutated();
      }
    } catch (err) {
      if (showToast) showToast(err.message, 'error');
      // Append error message in chat stream
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Error: ${err.message || 'Failed to get AI response. Please ensure GROQ_API_KEY is configured in backend/.env'}`,
          isError: true,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMessage = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!lead) return null;

  const category = (lead.priority_category || 'unscored').toLowerCase();

  return (
    <div className="drawer-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div 
        className="drawer-panel" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 440,
          backgroundColor: 'var(--color-surface)',
          borderLeft: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--color-surface)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-accent-subtle)',
              border: '1px solid var(--color-accent-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent)',
            }}>
              <Bot size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', color: 'var(--color-text-primary)', fontWeight: 600 }}>
                LeadPilot
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                AI Sales Assistant · Grounded in lead context
              </p>
            </div>
          </div>

          <button className="btn btn-ghost btn-xs" onClick={onClose} style={{ padding: 6, color: 'var(--color-text-muted)' }} aria-label="Close drawer">
            <X size={17} />
          </button>
        </div>

        {/* Lead Context Bar */}
        <div style={{
          padding: '9px 18px',
          backgroundColor: 'var(--color-surface-subtle)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.74rem',
        }}>
          <div style={{ display: 'flex', gap: 12, color: 'var(--color-text-secondary)' }}>
            <span><strong>Budget:</strong> {lead.budget || 'N/A'}</span>
            <span><strong>Timeline:</strong> {lead.buying_timeline || 'N/A'}</span>
          </div>
          <span className="tabular-nums" style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            color: category === 'hot' ? 'var(--color-hot)' : category === 'warm' ? 'var(--color-warm)' : 'var(--color-cold)',
          }}>
            {lead.priority_score !== null ? `${lead.priority_score} pts · ${lead.priority_category}` : 'Unscored'}
          </span>
        </div>

        {/* Message Stream */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          {initialLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <RefreshCw size={20} color="var(--color-accent)" className="spinner" />
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 8 }}>
                Loading conversation...
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 10px' }}>
              <Sparkles size={24} color="var(--color-accent)" style={{ marginBottom: 8 }} />
              <h4 style={{ fontSize: '0.98rem', color: 'var(--color-text-primary)', marginBottom: 2, fontWeight: 700 }}>
                LeadPilot
              </h4>
              <p style={{ fontSize: '0.74rem', color: 'var(--color-accent)', fontWeight: 600, marginBottom: 8 }}>
                Every lead. The right next move.
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
                Hey! I'm LeadPilot. I can help you qualify leads, prepare for calls, draft customer messages, and plan your next follow-up.
              </p>

              {/* Quick Prompts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', textAlign: 'left', fontWeight: 600 }}>
                  Recommended Questions:
                </span>
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    className="btn btn-secondary btn-xs"
                    style={{
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      padding: '7px 10px',
                      whiteSpace: 'normal',
                      lineHeight: 1.3,
                      color: 'var(--color-text-primary)',
                      backgroundColor: 'var(--color-surface)',
                    }}
                    onClick={() => handleSend(prompt)}
                  >
                    <Sparkles size={11} color="var(--color-accent)" style={{ flexShrink: 0 }} />
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    marginBottom: 3,
                    fontSize: '0.68rem',
                    color: 'var(--color-text-muted)',
                  }}>
                    {isUser ? <User size={11} /> : <Bot size={11} color="var(--color-accent)" />}
                    <span>{isUser ? 'You' : 'LeadPilot'}</span>
                  </div>

                  <div style={{
                    maxWidth: '92%',
                    padding: '9px 12px',
                    borderRadius: isUser ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                    backgroundColor: isUser ? 'var(--color-accent)' : 'var(--color-surface-subtle)',
                    border: isUser ? 'none' : '1px solid var(--color-border)',
                    color: isUser ? '#ffffff' : 'var(--color-text-primary)',
                    fontSize: '0.8rem',
                    lineHeight: 1.45,
                    whiteSpace: 'pre-wrap',
                    position: 'relative',
                  }}>
                    {msg.content}

                    {!isUser && !msg.isError && (
                      <button
                        onClick={() => handleCopyMessage(msg.content, idx)}
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          backgroundColor: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-xs)',
                          padding: 3,
                          cursor: 'pointer',
                          color: 'var(--color-text-muted)',
                        }}
                        title="Copy answer"
                      >
                        {copiedIndex === idx ? <Check size={11} color="var(--color-success)" /> : <Copy size={11} />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Typing Indicator */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)', fontSize: '0.74rem' }}>
              <RefreshCw size={12} className="spinner" />
              <span>LeadPilot is reviewing lead context & formulating response...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            display: 'flex',
            gap: 8,
          }}
        >
          <input
            type="text"
            className="form-input"
            placeholder={`Ask LeadPilot about ${lead.customer_name}...`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={loading}
            style={{ fontSize: '0.82rem' }}
          />
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={!inputValue.trim() || loading}
            style={{ padding: '8px 12px' }}
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
