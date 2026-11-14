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
  BarChart2,
  FileText,
} from 'lucide-react';
import { Button, Badge } from '../../components/ui';
import { api } from '../../services/api/client';
import { syncEngine, SYNC_EVENTS } from '../../lib/sync/syncEngine';
import { FeatureGate } from '../../components/billing/FeatureGate';
import { AcademicAnalysisSection } from '../../components/study/AcademicAnalysisSection';
import { DocumentLearningSection } from '../../components/study/DocumentLearningSection';

const STARTER_PROMPTS = [
  { label: "My Strengths", prompt: "What are my strongest subjects and topics based on my verified records?" },
  { label: "Areas to Improve", prompt: "Which topics should I focus on next to improve my academic performance?" },
  { label: "Today's Study Plan", prompt: "What should I study today based on my active adaptive plan?" },
  { label: "Study Progress", prompt: "Am I making consistent study progress, and how many verified hours have I logged?" },
  { label: "L'Hôpital's Rule", prompt: "Explain L'Hôpital's Rule step-by-step with a limits example." },
  { label: 'QuickSort Complexity', prompt: 'Analyze the best, average, and worst-case time complexity of QuickSort.' },
  { label: 'Microservices vs Monolith', prompt: 'Compare Monolithic vs Microservices architecture for scalable web apps.' },
  { label: 'Organic Reactions', prompt: 'Summarize key nucleophilic substitution (SN1 vs SN2) mechanisms.' },
];

export function AiTutorPage({ onNavigate, showToast }) {
  const [activeTab, setActiveTab] = useState('tutor'); // 'tutor' | 'analysis' | 'documents'
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingMsgs, setFetchingMsgs] = useState(false);
  const [error, setError] = useState(null);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [usageInfo, setUsageInfo] = useState(null);

  const messagesContainerRef = useRef(null);
  const isAutoScrollEnabledRef = useRef(true);

  // Scroll only the messages container, never the window or outer page
  const scrollToBottom = (behavior = 'smooth') => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  };

  // Detect if user has scrolled up to read older messages
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    // If within 80px of bottom, consider user pinned to bottom
    const isNearBottom = scrollHeight - scrollTop - clientHeight <= 80;
    isAutoScrollEnabledRef.current = isNearBottom;
  };

  useEffect(() => {
    if (messages.length > 0 && isAutoScrollEnabledRef.current) {
      scrollToBottom('smooth');
    }
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

    const unsub = syncEngine.subscribe(SYNC_EVENTS.ACADEMIC_UPDATED, () => {
      fetchConversations();
    });

    return () => unsub();
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

      // Setup placeholder streaming assistant message
      const streamAssistantId = 'stream_' + Date.now();
      let streamedContent = '';

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        { id: 'user_' + Date.now(), sender: 'user', content: text, created_at: new Date().toISOString() },
        { id: streamAssistantId, sender: 'assistant', content: '', created_at: new Date().toISOString() }
      ]);

      const token = api.getToken() || localStorage.getItem('academic_platform_token') || localStorage.getItem('token') || '';
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          prompt: text,
          conversationId: activeConvId || null,
          history: historyPayload,
          stream: true
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // keep remainder

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const event = JSON.parse(trimmed.slice(6));
              if (event.type === 'start') {
                if (!activeConvId && event.conversationId) {
                  setActiveConvId(event.conversationId);
                  fetchConversations();
                }
                if (event.usage) setUsageInfo(event.usage);
              } else if (event.type === 'token') {
                streamedContent += event.token;
                setMessages((prev) =>
                  prev.map((m) => (m.id === streamAssistantId ? { ...m, content: streamedContent } : m))
                );
              } else if (event.type === 'done') {
                setMessages((prev) =>
                  prev.map((m) => (m.id === streamAssistantId ? { ...m, content: event.fullContent } : m))
                );
              }
            } catch (parseErr) {
              // Ignore non-json lines
            }
          }
        }
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

  const handleAskCoachFromAnalysis = (question) => {
    setInputPrompt(question);
    setActiveTab('tutor');
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
              <Badge variant="academic">NEXA by Studora</Badge>
              {usageInfo && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-canvas border border-border text-muted">
                  Usage: {usageInfo.usageCount} / {usageInfo.limit === -1 ? '∞' : usageInfo.limit} queries
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
              Ask NEXA
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              Your Personal Academic Intelligence. Learn smarter. Understand deeper. Achieve further.
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {activeTab === 'tutor' && (
            <Button variant="academic" size="sm" onClick={handleNewChat} icon={Plus} className="shadow-tactile-btn">
              New Chat
            </Button>
          )}
        </div>
      </div>

      {/* ── Tab Switcher ── */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('tutor')}
          className={`flex items-center gap-2 px-4 py-2 rounded-btn text-xs font-semibold transition-all ${
            activeTab === 'tutor'
              ? 'bg-academic text-white shadow-tactile-btn'
              : 'bg-canvas text-muted hover:text-ink hover:bg-black/5'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Ask NEXA
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('analysis')}
          className={`flex items-center gap-2 px-4 py-2 rounded-btn text-xs font-semibold transition-all ${
            activeTab === 'analysis'
              ? 'bg-academic text-white shadow-tactile-btn'
              : 'bg-canvas text-muted hover:text-ink hover:bg-black/5'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          Academic Intelligence & Performance
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-2 px-4 py-2 rounded-btn text-xs font-semibold transition-all ${
            activeTab === 'documents'
              ? 'bg-academic text-white shadow-tactile-btn'
              : 'bg-canvas text-muted hover:text-ink hover:bg-black/5'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Course Materials & Documents
        </button>
      </div>

      {/* ── Tab Contents ── */}
      {activeTab === 'analysis' ? (
        <AcademicAnalysisSection onAskCoach={handleAskCoachFromAnalysis} showToast={showToast} />
      ) : activeTab === 'documents' ? (
        <DocumentLearningSection
          onAskAiAboutDocument={(promptText) => {
            setInputPrompt(promptText);
            setActiveTab('tutor');
          }}
          showToast={showToast}
        />
      ) : (
        /* ── Chat Container Grid ── */
        <div className="flex flex-col md:flex-row gap-6 min-h-[500px]">
        {/* Left Sidebar: Conversations List */}
        <div className="md:w-64 lg:w-72 shrink-0 bg-white dark:bg-navy-900 border border-border dark:border-navy-800 rounded-card p-4 shadow-tactile-surface flex flex-col gap-4 min-h-0">
          <div className="flex flex-col min-h-0 flex-1">
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

            <div className="space-y-1.5 max-h-[360px] md:max-h-[480px] overflow-y-auto scrollbar-thin pr-1 flex-1">
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
        <div className="flex-1 bg-white dark:bg-navy-900 border border-border dark:border-navy-800 rounded-card flex flex-col justify-between shadow-tactile-raised overflow-hidden min-h-[480px]">
          {/* Messages Area */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 p-5 overflow-y-auto space-y-4 overscroll-contain"
          >
            {messages.length === 0 && !loading ? (
              <div className="py-12 text-center space-y-6 max-w-lg mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-academic-50 border border-academic-200 flex items-center justify-center text-academic mx-auto shadow-tactile-surface">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">What would you like to learn today?</h3>
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
                  <span>NEXA is thinking…</span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-btn bg-danger-50 border border-danger-200 text-xs text-danger flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Input Box Area */}
          <div className="p-4 border-t border-border dark:border-navy-800 bg-white dark:bg-navy-900 shrink-0">
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
                className="flex-1 text-xs p-3 bg-canvas dark:bg-navy-950 border border-border dark:border-navy-800 rounded-card text-ink dark:text-white placeholder:text-muted focus:outline-none focus:border-academic focus:ring-1 focus:ring-academic/30 shadow-tactile-surface"
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
      )}
    </div>
  );
}
