/**
 * AiTutorPage.jsx
 *
 * Interactive AI Academic Tutor Workspace for Studora.
 * Supports xAI Grok API, multi-turn conversation history, starter prompts,
 * and monthly quota tracking based on user subscription entitlements.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  MessageSquare,
  Clock,
  Loader2,
  AlertCircle,
  Check,
  Copy,
  BookOpen,
  Zap,
  ChevronRight,
  RefreshCw,
  Award,
} from 'lucide-react';
import { Button, Badge } from '../../components/ui';
import { api } from '../../services/api/client';
import { FeatureGate } from '../../components/billing/FeatureGate';

const STARTER_PROMPTS = [
  { label: "L'Hôpital's Rule", prompt: "Explain L'Hôpital's Rule step-by-step with a limits example." },
  { label: 'QuickSort Complexity', prompt: 'Analyze the best, average, and worst-case time complexity of QuickSort.' },
  { label: 'Microservices vs Monolith', prompt: 'Compare Monolithic vs Microservices architecture for scalable web apps.' },
  { label: 'Organic Reactions', prompt: 'Summarize key nucleophilic substitution (SN1 vs SN2) mechanisms.' },
];

export function AiTutorPage({ onNavigate, showToast }) {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingMsgs, setFetchingMsgs] = useState(false);
  const [error, setError] = useState(null);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [usageInfo, setUsageInfo] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Fetch conversation list
  const fetchConversations = useCallback(async () => {
    try {
      const data = await api.request('/api/ai/conversations');
      if (data && data.conversations) {
        setConversations(data.conversations);
      }
    } catch (err) {
      console.warn('Failed to load conversations:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Fetch messages for active conversation
  const loadMessages = useCallback(async (convId) => {
    if (!convId) {
      setMessages([]);
      return;
    }
    setFetchingMsgs(true);
    try {
      const data = await api.request(`/api/ai/conversations/${convId}/messages`);
      if (data && data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      showToast?.({ type: 'error', title: 'Error', message: 'Failed to load message history.' });
    } finally {
      setFetchingMsgs(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
    } else {
      setMessages([]);
    }
  }, [activeConvId, loadMessages]);

  // Handle message submit
  const handleSendMessage = async (promptOverride) => {
    const text = (promptOverride || inputPrompt).trim();
    if (!text || loading) return;

    setInputPrompt('');
    setError(null);

    // Optimistically add user message
    const tempUserMsg = {
      id: 'temp_' + Date.now(),
      sender: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      // Format multi-turn history for AI context
      const historyPayload = messages
        .filter((m) => !m.id.startsWith('temp_'))
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.content,
        }));
      historyPayload.push({ role: 'user', content: text });

      const data = await api.request('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          prompt: text,
          conversationId: activeConvId || null,
          history: historyPayload,
        }),
      });

      if (!data || !data.message) {
        throw new Error('No response from AI Tutor');
      }

      // Update active conversation ID if new conversation was created
      if (!activeConvId && data.conversationId) {
        setActiveConvId(data.conversationId);
        fetchConversations();
      }

      // Replace optimistic state with official response
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        { id: 'user_' + Date.now(), sender: 'user', content: text, created_at: new Date().toISOString() },
        data.message,
      ]);

      if (data.usage) {
        setUsageInfo(data.usage);
      }
    } catch (err) {
      setError(err.message || 'AI request failed');
      showToast?.({ type: 'error', title: 'AI Limit or Error', message: err.message });
      // Remove optimistic user msg on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setError(null);
  };

  const handleDeleteConversation = async (convId, e) => {
    e.stopPropagation();
    try {
      await api.request(`/api/ai/conversations/${convId}`, { method: 'DELETE' });
      if (activeConvId === convId) {
        handleNewChat();
      }
      fetchConversations();
      showToast?.({ type: 'info', title: 'Deleted', message: 'Chat conversation removed.' });
    } catch (err) {
      showToast?.({ type: 'error', title: 'Error', message: 'Failed to delete chat.' });
    }
  };

  const handleCopyCode = (text, msgId) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  return (
    <div className="max-w-6xl space-y-6 pb-20 md:pb-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-academic-100 border border-academic-200 flex items-center justify-center text-academic shrink-0 shadow-tactile-surface">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Badge variant="academic">AI Academic Tutor</Badge>
              {usageInfo && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-canvas border border-border text-muted">
                  Usage: {usageInfo.usageCount} / {usageInfo.limit === -1 ? '∞' : usageInfo.limit} queries
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
              Ask AI Academic Tutor
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              Powered by xAI Grok — ask coursework questions, solve math derivations, and debug code.
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <Button variant="academic" size="sm" onClick={handleNewChat} icon={Plus} className="shadow-tactile-btn">
            New Chat
          </Button>
        </div>
      </div>

      {/* ── Chat Container Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-h-[550px]">
        {/* Left Sidebar: Conversations List */}
        <div className="md:col-span-1 bg-white border border-border rounded-card p-4 shadow-tactile-surface flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-academic" />
                History
              </span>
              <button
                type="button"
                onClick={fetchConversations}
                className="text-muted hover:text-ink text-[11px]"
                title="Refresh"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-[420px] overflow-y-auto scrollbar-thin pr-1">
              {conversations.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted">
                  No saved chats yet. Start a new conversation!
                </div>
              ) : (
                conversations.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setActiveConvId(c.id)}
                    className={`group p-2.5 rounded-btn border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                      activeConvId === c.id
                        ? 'bg-academic-50 border-academic-300 text-academic font-bold shadow-tactile-surface'
                        : 'bg-canvas border-border text-ink hover:border-gray-300'
                    }`}
                  >
                    <span className="truncate flex-1">{c.title}</span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteConversation(c.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger transition-opacity p-1"
                      title="Delete chat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-border text-[11px] text-muted font-mono space-y-1">
            <p>Model: Grok-2</p>
            <p>LaTeX & Code Formatted</p>
          </div>
        </div>

        {/* Right Chat Panel */}
        <div className="md:col-span-3 bg-white border border-border rounded-card flex flex-col justify-between shadow-tactile-raised overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 p-5 overflow-y-auto max-h-[480px] space-y-4">
            {messages.length === 0 && !loading ? (
              <div className="py-12 text-center space-y-6 max-w-lg mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-academic-50 border border-academic-200 flex items-center justify-center text-academic mx-auto shadow-tactile-surface">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">What academic concept can I help with today?</h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    Ask any question across Computer Science, Mathematics, Physics, Chemistry, Engineering, Medicine, or Business.
                  </p>
                </div>

                {/* Starter Prompts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                  {STARTER_PROMPTS.map((sp) => (
                    <button
                      key={sp.label}
                      type="button"
                      onClick={() => handleSendMessage(sp.prompt)}
                      className="p-3 rounded-card bg-canvas border border-border hover:border-academic-300 hover:bg-academic-50/50 text-xs text-ink font-medium transition-all group flex items-start justify-between gap-2 shadow-tactile-surface"
                    >
                      <span>{sp.prompt}</span>
                      <ChevronRight className="w-4 h-4 text-muted group-hover:text-academic shrink-0 mt-0.5" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 ${m.sender === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 shadow-tactile-surface ${
                      m.sender === 'user'
                        ? 'bg-navy text-white'
                        : 'bg-academic text-white'
                    }`}
                  >
                    {m.sender === 'user' ? 'You' : <Sparkles className="w-4 h-4" />}
                  </div>

                  <div
                    className={`max-w-[85%] rounded-card p-4 text-xs leading-relaxed shadow-tactile-surface relative ${
                      m.sender === 'user'
                        ? 'bg-navy text-white'
                        : 'bg-canvas border border-border text-ink'
                    }`}
                  >
                    {m.sender === 'assistant' && (
                      <button
                        type="button"
                        onClick={() => handleCopyCode(m.content, m.id)}
                        className="absolute top-3 right-3 text-muted hover:text-ink transition-colors p-1"
                        title="Copy text"
                      >
                        {copiedMsgId === m.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}

                    <div className="whitespace-pre-wrap font-sans space-y-2">{m.content}</div>

                    <span className={`block text-[10px] font-mono mt-2 ${m.sender === 'user' ? 'text-white/60 text-right' : 'text-muted'}`}>
                      {new Date(m.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-academic text-white flex items-center justify-center shrink-0 shadow-tactile-surface">
                  <Sparkles className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-canvas border border-border rounded-card p-3.5 text-xs text-muted flex items-center gap-2 shadow-tactile-surface">
                  <Loader2 className="w-4 h-4 animate-spin text-academic" />
                  <span>AI Academic Tutor is thinking…</span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-btn bg-danger-50 border border-danger-200 text-xs text-danger flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Box Area */}
          <div className="p-4 border-t border-border bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ask your academic question (math, CS, chemistry, physics, etc.)…"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                disabled={loading}
                className="flex-1 text-xs p-3 bg-canvas border border-border rounded-card text-ink placeholder:text-muted focus:outline-none focus:border-academic focus:ring-1 focus:ring-academic/30 shadow-tactile-surface"
              />
              <Button
                variant="academic"
                size="md"
                type="submit"
                disabled={loading || !inputPrompt.trim()}
                icon={loading ? Loader2 : Send}
                className="shadow-tactile-btn shrink-0"
              >
                Send
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
