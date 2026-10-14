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

export default function ChatDrawer({ lead, onClose, showToast }) {
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
      const assistantMessage = {
        role: 'assistant',
        content: res.message.content,
        created_at: res.message.created_at,
      };
      setMessages((prev) => [...prev, assistantMessage]);
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
    <div className="drawer-overlay" onClick={onClose}>
      <div 
        className="drawer-content" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(7, 9, 14, 0.5)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--brand-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 14px var(--brand-glow)',
            }}>
              <Bot size={18} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', color: '#fff', fontWeight: 700 }}>
                Sales Copilot
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Grounding context: {lead.customer_name}
              </p>
            </div>
          </div>

          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        {/* Lead Context Bar */}
        <div style={{
          padding: '10px 18px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.76rem',
        }}>
          <div style={{ display: 'flex', gap: 12, color: 'var(--text-secondary)' }}>
            <span><strong>Budget:</strong> {lead.budget || 'N/A'}</span>
            <span><strong>Timeline:</strong> {lead.buying_timeline || 'N/A'}</span>
          </div>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 700,
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
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}>
          {initialLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <RefreshCw size={24} color="var(--brand-primary)" className="animate-spin" />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
                Loading conversation...
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px' }}>
              <Sparkles size={28} color="var(--brand-primary)" style={{ marginBottom: 10 }} />
              <h4 style={{ fontSize: '0.95rem', color: '#fff', marginBottom: 6 }}>
                Ground Truth Sales Copilot
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
                Ask anything about {lead.customer_name}. The agent queries live SQLite records via ADK tools to answer questions, handle objections, and create follow-up tasks.
              </p>

              {/* Quick Prompts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'left' }}>
                  Recommended Questions:
                </span>
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    className="btn btn-secondary btn-sm"
                    style={{
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      fontSize: '0.78rem',
                      padding: '8px 12px',
                      whiteSpace: 'normal',
                      lineHeight: 1.3,
                    }}
                    onClick={() => handleSend(prompt)}
                  >
                    <Sparkles size={12} color="var(--brand-primary)" style={{ flexShrink: 0 }} />
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
                    gap: 6,
                    marginBottom: 4,
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                  }}>
                    {isUser ? <User size={12} /> : <Bot size={12} color="var(--brand-primary)" />}
                    <span>{isUser ? 'You' : 'Sales Copilot'}</span>
                  </div>

                  <div style={{
                    maxWidth: '88%',
                    padding: '10px 14px',
                    borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    background: isUser ? 'var(--brand-gradient)' : 'rgba(255, 255, 255, 0.05)',
                    border: isUser ? 'none' : '1px solid var(--border-subtle)',
                    color: '#fff',
                    fontSize: '0.84rem',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    position: 'relative',
                    group: 'message',
                  }}>
                    {msg.content}

                    {!isUser && !msg.isError && (
                      <button
                        onClick={() => handleCopyMessage(msg.content, idx)}
                        style={{
                          position: 'absolute',
                          top: 6,
                          right: 6,
                          background: 'rgba(0,0,0,0.4)',
                          border: 'none',
                          borderRadius: 4,
                          padding: 4,
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                        }}
                        title="Copy answer"
                      >
                        {copiedIndex === idx ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Typing Indicator */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              <RefreshCw size={14} className="animate-spin" color="var(--brand-primary)" />
              <span>Copilot is querying lead database & formulating response...</span>
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
            padding: '14px 18px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'rgba(7, 9, 14, 0.6)',
            display: 'flex',
            gap: 8,
          }}
        >
          <input
            type="text"
            className="input"
            placeholder={`Ask about ${lead.customer_name}...`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={loading}
            style={{ fontSize: '0.84rem' }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!inputValue.trim() || loading}
            style={{ padding: '8px 14px' }}
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
