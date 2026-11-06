/**
 * src/components/chat/StudoraChat.jsx
 *
 * Studora × GetStream Chat — Native React UI Integration
 *
 * ARCHITECTURE MANDATES:
 * - GetStream Chat is the source of truth for messaging, channel state, real-time events,
 *   typing indicators, unread counts, attachments, reactions, threads, and presence.
 * - Official stream-chat-react components (Chat, Channel, Window, MessageList,
 *   MessageComposer, TypingIndicator, Thread) are composed as the messaging foundation.
 * - Supabase is the authority for authentication, user profiles, directory search,
 *   and application permissions. No auth or profile logic is duplicated here.
 * - GetStream Video is kept strictly separate via StudoraCallModal.
 * - Stream API secrets are never exposed to the client.
 * - Server-side token generation is preserved exactly as-is.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  MessageSquare,
  RefreshCw,
  Search,
  ArrowLeft,
  User,
  AlertCircle,
  WifiOff,
  Phone,
  Video,
  Plus,
  X,
  Users,
  Loader2,
  Edit3,
} from 'lucide-react';

// Official GetStream Chat React SDK — v14 components
import {
  Chat,
  Channel,
  Window,
  MessageList,
  MessageComposer,
  TypingIndicator,
  Thread,
  useChannelStateContext,
} from 'stream-chat-react';
import 'stream-chat-react/dist/css/index.css';

// Studora × Stream theme override — applied on top of Stream's base CSS
import '../../styles/stream-studora.css';

// Internal Studora services
import {
  connectStreamUser,
  disconnectStreamUser,
  getStreamClient,
  getStreamVideoClient,
} from '../../lib/stream/client';
import { isStreamConfigured } from '../../config/clientConfig';
import { supabase } from '../../lib/supabase/client';
import { api } from '../../services/api/client';
import { Avatar, Badge, Button } from '../ui';
import { rankUserSearchResults } from '../../lib/search/userSearchEngine';
import { StudoraCallModal } from './StudoraCallModal';
import { StreamVideo } from '@stream-io/video-react-sdk';

// ─── Relative Time Formatter ──────────────────────────────────────────────────
function formatRelativeTime(date) {
  if (!date) return '';
  const now = Date.now();
  const ts = typeof date === 'string' ? new Date(date).getTime() : date.getTime?.() ?? date;
  const diffMs = now - ts;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ─── Studora Conversation Header ─────────────────────────────────────────────
/**
 * Custom header rendered above Stream's Window.
 * Provides: avatar, participant name, presence, session badge, call controls,
 * and mobile back navigation. All channel state consumed from Stream's context.
 */
function StudoraConversationHeader({
  currentUserId,
  onBack,
  onVoiceCall,
  onVideoCall,
  startingCall,
}) {
  const { channel } = useChannelStateContext('StudoraConversationHeader');

  const getOtherParticipant = () => {
    if (!channel?.state?.members) return null;
    const members = Object.values(channel.state.members);
    const other = members.find((m) => m.user?.id !== currentUserId);
    return other?.user || null;
  };

  const other = getOtherParticipant();
  const isOnline = channel?.state?.watcher_count > 1;
  const isBookingChannel = !!channel?.data?.booking_id;
  const subject = channel?.data?.subject;
  const displayName = other?.name || channel?.data?.name || 'Studora Chat';

  return (
    <div className="px-4 py-3 border-b border-border/60 dark:border-navy-800/80 flex items-center justify-between bg-white dark:bg-navy-900 shrink-0 z-10 shadow-[0_1px_0_0_rgba(17,24,39,0.05)]">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Back Button */}
        <button
          type="button"
          onClick={onBack}
          className="md:hidden p-1.5 -ml-1 text-muted dark:text-navy-300 hover:text-ink dark:hover:text-white hover:bg-canvas dark:hover:bg-navy-800 rounded-lg transition-colors"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Participant info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <Avatar
              name={displayName}
              src={other?.image || null}
              size="lg"
            />
            {isOnline && (
              <span
                className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-navy-900 shadow-sm"
                title="Online"
              />
            )}
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-bold text-ink dark:text-white truncate leading-tight">
              {displayName}
            </h3>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium truncate">
              {subject
                ? `Subject: ${subject}`
                : isOnline
                  ? 'Online'
                  : 'Private conversation'}
            </p>
          </div>
        </div>
      </div>

      {/* Call Controls */}
      <div className="flex items-center gap-1 shrink-0">
        {isBookingChannel && (
          <Badge variant="academic" size="sm" className="mr-2 hidden sm:flex">
            Tutoring
          </Badge>
        )}
        <button
          type="button"
          onClick={onVoiceCall}
          disabled={startingCall}
          className="w-9 h-9 flex items-center justify-center rounded-full text-muted dark:text-navy-300 hover:text-academic hover:bg-academic-50 dark:hover:bg-academic-950/60 border border-border/60 dark:border-navy-700/60 hover:border-academic/30 transition-all disabled:opacity-50"
          title="Start voice call (Stream Video)"
          aria-label="Start voice call"
        >
          <Phone className="w-[17px] h-[17px]" />
        </button>

        <button
          type="button"
          onClick={onVideoCall}
          disabled={startingCall}
          className="w-9 h-9 flex items-center justify-center rounded-full text-muted dark:text-navy-300 hover:text-academic hover:bg-academic-50 dark:hover:bg-academic-950/60 border border-border/60 dark:border-navy-700/60 hover:border-academic/30 transition-all disabled:opacity-50"
          title={
            isBookingChannel
              ? 'Join Live Video Tutoring Room'
              : 'Start video call (Stream Video)'
          }
          aria-label="Start video call"
        >
          <Video className="w-[17px] h-[17px]" />
        </button>
      </div>
    </div>
  );
}

// ─── Main StudoraChat Component ───────────────────────────────────────────────

export function StudoraChat({
  currentUser,
  userProfile,
  initialChannelId = null,
  initialRecipientId = null,
  showToast,
  onNavigate,
}) {
  const [chatClient, setChatClient] = useState(null);
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileThreadOpen, setIsMobileThreadOpen] = useState(false);

  // Find People (directory) — shown via modal/overlay triggered from sidebar header
  const [showFindPeople, setShowFindPeople] = useState(false);
  const [directorySearchQuery, setDirectorySearchQuery] = useState('');
  const [directoryResults, setDirectoryResults] = useState([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [directoryError, setDirectoryError] = useState(null);

  // New Chat modal
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [modalUsers, setModalUsers] = useState([]);
  const [loadingModalUsers, setLoadingModalUsers] = useState(false);
  const [connectingUserId, setConnectingUserId] = useState(null);

  // Stream Video call state
  const [activeCall, setActiveCall] = useState(null);
  const [activeCallType, setActiveCallType] = useState('video');
  const [activeCallRecipientName, setActiveCallRecipientName] = useState('Participant');
  const [showCallModal, setShowCallModal] = useState(false);
  const [startingCall, setStartingCall] = useState(false);
  const [streamVideoClient, setStreamVideoClient] = useState(null);

  // Determine dark mode from document class
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  );

  const searchDebounceRef = useRef(null);
  const currentUserId = userProfile?.id || currentUser?.id || currentUser?.uid;

  // Observe dark-mode class changes on the html element
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  // ── 1. Connect to Stream Chat ─────────────────────────────────────────────
  const initChat = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    setError(null);

    try {
      if (!isStreamConfigured()) {
        setError('GetStream Chat service is not configured on this environment.');
        setLoading(false);
        return;
      }

      const { client, userId } = await connectStreamUser({
        name: userProfile?.full_name || currentUser?.displayName || 'Student',
        image: userProfile?.avatar_url || null,
      });

      setChatClient(client);

      const filter = {
        type: 'messaging',
        members: { $in: [userId] },
      };
      const sort = [{ last_message_at: -1 }, { updated_at: -1 }];

      const userChannels = await client.queryChannels(filter, sort, {
        watch: true,
        state: true,
      });

      setChannels(userChannels);

      if (initialChannelId) {
        const found = userChannels.find((c) => c.id === initialChannelId);
        if (found) {
          setActiveChannel(found);
          setIsMobileThreadOpen(true);
        } else {
          try {
            const ch = client.channel('messaging', initialChannelId);
            await ch.watch();
            setChannels((prev) => [ch, ...prev.filter((c) => c.id !== ch.id)]);
            setActiveChannel(ch);
            setIsMobileThreadOpen(true);
          } catch (e) {
            console.warn('[chat] Could not watch initialChannelId:', e.message);
          }
        }
      } else if (initialRecipientId) {
        const existing = userChannels.find((ch) => {
          const members = Object.values(ch.state?.members || {});
          return members.some((m) => m.user?.id === initialRecipientId);
        });
        if (existing) {
          setActiveChannel(existing);
          setIsMobileThreadOpen(true);
        }
      } else if (userChannels.length > 0) {
        setActiveChannel(userChannels[0]);
      }
    } catch (err) {
      console.error('[chat] Initialization error:', err);
      setError(err.message || 'Failed to initialize chat connection.');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, userProfile, currentUser, initialChannelId, initialRecipientId]);

  useEffect(() => {
    initChat();
  }, [initChat]);

  // ── 2. Listen to new channels appearing in real-time ──────────────────────
  useEffect(() => {
    if (!chatClient) return;

    const handleChannelVisible = (event) => {
      if (!event.channel) return;
      setChannels((prev) => {
        if (prev.some((c) => c.id === event.channel.id)) return prev;
        return [event.channel, ...prev];
      });
    };

    const handleMessageNew = (event) => {
      // Re-sort channels when a new message comes in so latest rises to top
      setChannels((prev) => {
        const updated = [...prev];
        const idx = updated.findIndex((c) => c.id === event.channel_id);
        if (idx > 0) {
          const [moved] = updated.splice(idx, 1);
          updated.unshift(moved);
        }
        return updated;
      });
    };

    const sub1 = chatClient.on('channel.visible', handleChannelVisible);
    const sub2 = chatClient.on('message.new', handleMessageNew);

    return () => {
      sub1?.unsubscribe?.();
      sub2?.unsubscribe?.();
    };
  }, [chatClient]);

  // ── 3. Helper: other participant ──────────────────────────────────────────
  const getOtherParticipant = useCallback(
    (channel) => {
      if (!channel?.state?.members) return null;
      const members = Object.values(channel.state.members);
      const other = members.find((m) => m.user?.id !== currentUserId);
      return other?.user || null;
    },
    [currentUserId]
  );

  // ── 4. Filtered conversation list ─────────────────────────────────────────
  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return channels;
    const q = searchQuery.toLowerCase();
    return channels.filter((ch) => {
      const other = getOtherParticipant(ch);
      const name = other?.name || ch.data?.name || '';
      const lastMsg = ch.state?.messages?.[ch.state.messages.length - 1]?.text || '';
      return name.toLowerCase().includes(q) || lastMsg.toLowerCase().includes(q);
    });
  }, [channels, searchQuery, getOtherParticipant]);

  // ── 5. Supabase user directory search ─────────────────────────────────────
  const searchUsersInDatabase = useCallback(
    async (searchTerm = '') => {
      const normalizedQuery = (searchTerm || '').trim();
      if (normalizedQuery.length < 2) {
        setLoadingDirectory(false);
        setDirectoryError(null);
        return [];
      }

      setLoadingDirectory(true);
      setDirectoryError(null);

      try {
        const filter = `full_name.ilike.%${normalizedQuery}%,department.ilike.%${normalizedQuery}%,institution.ilike.%${normalizedQuery}%`;
        const { data, error: err } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, institution, department, academic_level, role, is_public')
          .eq('is_public', true)
          .neq('id', currentUserId)
          .or(filter)
          .limit(50);

        if (err) throw err;

        const ranked = rankUserSearchResults(data || [], normalizedQuery, 25);
        return ranked;
      } catch (err) {
        console.warn('[chat] User directory search error:', err.message);
        setDirectoryError(err.message || 'Failed to search users.');
        return [];
      } finally {
        setLoadingDirectory(false);
      }
    },
    [currentUserId]
  );

  // Debounced directory search (for Find People panel)
  useEffect(() => {
    if (!showFindPeople) return;

    const trimmed = (directorySearchQuery || '').trim();
    if (trimmed.length < 2) {
      setDirectoryResults([]);
      setLoadingDirectory(false);
      setDirectoryError(null);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      return;
    }

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(async () => {
      const results = await searchUsersInDatabase(directorySearchQuery);
      setDirectoryResults(results);
    }, 250);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [directorySearchQuery, showFindPeople, searchUsersInDatabase]);

  // Modal search
  useEffect(() => {
    if (!showNewChatModal) {
      setModalUsers([]);
      setLoadingModalUsers(false);
      return;
    }

    const trimmed = (modalSearchQuery || '').trim();
    if (trimmed.length < 2) {
      setModalUsers([]);
      setLoadingModalUsers(false);
      return;
    }

    let isCancelled = false;
    setLoadingModalUsers(true);

    const timer = setTimeout(async () => {
      const results = await searchUsersInDatabase(modalSearchQuery);
      if (!isCancelled) {
        setModalUsers(results);
        setLoadingModalUsers(false);
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [showNewChatModal, modalSearchQuery, searchUsersInDatabase]);

  // ── 6. Open or create conversation ────────────────────────────────────────
  const handleOpenOrCreateConversation = async (targetUser) => {
    if (!targetUser?.id) return;

    if (targetUser.id === currentUserId) {
      showToast?.({
        type: 'error',
        title: 'Action Not Allowed',
        message: 'You cannot start a private conversation with yourself.',
      });
      return;
    }

    setConnectingUserId(targetUser.id);

    try {
      const existingChannel = channels.find((ch) => {
        const members = Object.values(ch.state?.members || {});
        return members.some((m) => m.user?.id === targetUser.id);
      });

      if (existingChannel) {
        setActiveChannel(existingChannel);
        setIsMobileThreadOpen(true);
        setShowNewChatModal(false);
        setShowFindPeople(false);
        return;
      }

      const res = await api.getOrCreateStreamConversation({
        recipientId: targetUser.id,
        channelName: targetUser.full_name,
      });

      if (!res?.channelId) {
        throw new Error('Failed to retrieve channel identifier from server.');
      }

      if (chatClient) {
        const ch = chatClient.channel('messaging', res.channelId);
        await ch.watch();

        setChannels((prev) => {
          if (prev.some((c) => c.id === ch.id)) return prev;
          return [ch, ...prev];
        });
        setActiveChannel(ch);
        setIsMobileThreadOpen(true);
      }

      setShowNewChatModal(false);
      setShowFindPeople(false);
      showToast?.({
        type: 'success',
        title: 'Chat Ready',
        message: `Connected with ${targetUser.full_name}. You can send a message now.`,
      });
    } catch (err) {
      console.error('[chat] Failed to connect conversation:', err);
      showToast?.({
        type: 'error',
        title: 'Conversation Failed',
        message: err.message || 'Could not connect with selected user.',
      });
    } finally {
      setConnectingUserId(null);
    }
  };

  // ── 7. Call handlers ───────────────────────────────────────────────────────
  const startStreamCall = async (type = 'video') => {
    if (!activeChannel) {
      showToast?.({
        type: 'warning',
        title: 'No Conversation Selected',
        message: 'Please select a conversation before initiating a call.',
      });
      return;
    }

    if (startingCall) return;
    setStartingCall(true);

    const other = getOtherParticipant(activeChannel);
    const targetUserId = other?.id;
    const recipientDisplayName = other?.name || activeChannel.data?.name || 'Participant';

    if (!targetUserId) {
      showToast?.({
        type: 'error',
        title: 'Call Failed',
        message: 'Could not determine recipient participant for this call.',
      });
      setStartingCall(false);
      return;
    }

    try {
      const videoClient = await getStreamVideoClient({
        id: currentUserId,
        name: userProfile?.full_name || currentUser?.displayName || 'Studora User',
        image: userProfile?.avatar_url || currentUser?.photoURL || '',
      });

      if (!videoClient) {
        throw new Error('Could not establish Stream Video connection.');
      }

      setStreamVideoClient(videoClient);

      const rawCallId = activeChannel.id
        ? `call-${activeChannel.id}`
        : `call-${Date.now()}`;
      const callId = rawCallId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);

      const call = videoClient.call('default', callId);
      await call.getOrCreate({
        ring: true,
        data: {
          members: [
            { user_id: currentUserId, role: 'call_member' },
            { user_id: targetUserId, role: 'call_member' },
          ],
          custom: {
            channelId: activeChannel.id,
            callType: type,
            startedBy: currentUserId,
          },
        },
      });

      await call.join({ create: true });

      if (type === 'audio' && call.camera) {
        await call.camera.disable();
      }

      setActiveCall(call);
      setActiveCallType(type);
      setActiveCallRecipientName(recipientDisplayName);
      setShowCallModal(true);

      showToast?.({
        type: 'success',
        title: `${type === 'video' ? 'Video' : 'Voice'} Call Initiated`,
        message: `Connecting to ${recipientDisplayName}…`,
      });
    } catch (callErr) {
      console.error('[StudoraChat] Failed to initiate call:', callErr);
      showToast?.({
        type: 'error',
        title: 'Call Error',
        message: callErr.message || 'Unable to start call. Please verify device permissions.',
      });
    } finally {
      setStartingCall(false);
    }
  };

  const handleVoiceCallClick = () => startStreamCall('audio');

  const handleVideoCallClick = () => {
    if (activeChannel?.data?.booking_id) {
      onNavigate?.('dashboard');
      showToast?.({
        type: 'info',
        title: 'Join Live Tutoring Room',
        message: 'Opening Live Video Tutoring Room for this booked session.',
      });
    } else {
      startStreamCall('video');
    }
  };

  const handleCallModalClose = async () => {
    setShowCallModal(false);
    if (activeCall) {
      try {
        await activeCall.leave();
      } catch (e) {}
      setActiveCall(null);
    }
  };

  // ── 8. Loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-surface dark:bg-navy-900 border border-border dark:border-navy-800 rounded-card p-12 shadow-tactile-surface flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-academic animate-spin" />
        <div className="text-center">
          <h3 className="text-sm font-bold text-ink dark:text-navy-100 font-sans">
            Connecting to Studora Chat
          </h3>
          <p className="text-xs text-muted dark:text-navy-400 mt-1">
            Establishing authenticated real-time stream…
          </p>
        </div>
      </div>
    );
  }

  // ── 9. Error state ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-surface dark:bg-navy-900 border border-border dark:border-navy-800 rounded-card p-8 shadow-tactile-surface text-center space-y-4 max-w-xl mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-academic-50 dark:bg-academic-950/60 border border-academic-200 dark:border-academic-800 flex items-center justify-center mx-auto text-academic">
          <WifiOff className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-ink dark:text-navy-100">
            Chat Connection Unavailable
          </h3>
          <p className="text-xs text-muted dark:text-navy-400 mt-1 leading-relaxed">{error}</p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={initChat}>
            Retry Connection
          </Button>
          {onNavigate && (
            <Button variant="ghost" size="sm" onClick={() => onNavigate('dashboard')}>
              Back to Overview
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── 10. Main Render ────────────────────────────────────────────────────────
  return (
    <Chat
      client={chatClient}
      theme={isDark ? 'str-chat__theme-dark' : 'str-chat__theme-light'}
    >
      {/* Shell: two-panel layout on desktop, single-panel stack on mobile */}
      <div className="relative bg-white dark:bg-navy-900 border-0 md:border md:border-border/60 dark:md:border-navy-800 rounded-none md:rounded-2xl shadow-none md:shadow-[0_1px_3px_0_rgba(17,24,39,0.06),0_4px_12px_0_rgba(17,24,39,0.04)] overflow-hidden flex flex-col md:flex-row flex-1 min-h-0 h-full transition-colors duration-150">

        {/* ── LEFT: Conversation Sidebar ──────────────────────────────────── */}
        <div
          className={`w-full md:w-[300px] lg:w-[320px] border-r border-border/60 dark:border-navy-800 flex flex-col h-full min-h-0 bg-white dark:bg-navy-900 shrink-0 ${
            isMobileThreadOpen ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Sidebar Header */}
          <div className="px-4 py-4 border-b border-border/60 dark:border-navy-800/80 bg-white dark:bg-navy-900 shrink-0">
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-base font-bold text-ink dark:text-navy-100 tracking-tight">
                Messages
              </h2>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setShowFindPeople(false);
                    setShowNewChatModal(true);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-muted dark:text-navy-300 hover:text-academic hover:bg-academic-50 dark:hover:bg-academic-950/60 border border-border/60 dark:border-navy-700/60 hover:border-academic/30 transition-all"
                  title="New message"
                  aria-label="Start a new chat"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={initChat}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-muted dark:text-navy-300 hover:text-ink dark:hover:text-white hover:bg-canvas dark:hover:bg-navy-800 border border-border/60 dark:border-navy-700/60 transition-all"
                  title="Refresh conversations"
                  aria-label="Refresh conversations"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Search Field */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/60 dark:text-navy-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-canvas/80 dark:bg-navy-950 border border-border/50 dark:border-navy-800 rounded-full text-ink dark:text-white placeholder:text-muted/50 dark:placeholder:text-navy-500 focus:outline-none focus:border-academic/50 focus:ring-2 focus:ring-academic/10 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted dark:text-navy-400 hover:text-ink dark:hover:text-white rounded"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {filteredChannels.length === 0 ? (
              <div className="p-8 text-center space-y-3 mt-4">
                <div className="w-12 h-12 rounded-full bg-canvas dark:bg-navy-800 flex items-center justify-center mx-auto text-muted dark:text-navy-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-ink dark:text-navy-200">
                    {searchQuery ? 'No results found' : 'No conversations yet'}
                  </p>
                  <p className="text-[11px] text-muted dark:text-navy-400 mt-1 max-w-xs mx-auto leading-relaxed">
                    {searchQuery
                      ? 'Try a different search or find someone new.'
                      : 'Start a conversation with a tutor or peer student.'}
                  </p>
                </div>
                {!searchQuery && (
                  <button
                    onClick={() => setShowNewChatModal(true)}
                    className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-academic bg-academic-50 dark:bg-academic-950 hover:bg-academic-100 dark:hover:bg-academic-900 rounded-full border border-academic-200/60 dark:border-academic-800 transition-colors"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Find people
                  </button>
                )}
              </div>
            ) : (
              <div className="py-1">
                {filteredChannels.map((ch) => {
                  const other = getOtherParticipant(ch);
                  const isActive = activeChannel?.id === ch.id;
                  const unreadCount = ch.countUnread();
                  const lastMsg = ch.state?.messages?.[ch.state.messages.length - 1];
                  const isGroupChannel = ch.data?.member_count > 2 || ch.data?.type === 'group';
                  const isOnline = ch.state?.watcher_count > 1;
                  const displayName = other?.name || ch.data?.name || 'Direct Conversation';
                  const memberCount = isGroupChannel ? ch.data?.member_count : null;

                  return (
                    <button
                      key={ch.id}
                      onClick={() => {
                        setActiveChannel(ch);
                        setIsMobileThreadOpen(true);
                      }}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all relative ${
                        isActive
                          ? 'bg-academic-50/70 dark:bg-academic-950/40'
                          : 'hover:bg-canvas/80 dark:hover:bg-navy-800/50'
                      }`}
                    >
                      {/* Active indicator */}
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 bg-academic rounded-r-full" />
                      )}

                      {/* Avatar with online dot */}
                      <div className="relative shrink-0">
                        <Avatar
                          name={displayName}
                          src={other?.image || null}
                          size="md"
                        />
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-navy-900" />
                        )}
                      </div>

                      {/* Text content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p
                            className={`text-sm truncate ${
                              unreadCount > 0
                                ? 'font-bold text-ink dark:text-white'
                                : 'font-semibold text-ink dark:text-navy-100'
                            }`}
                          >
                            {displayName}
                          </p>
                          {lastMsg?.created_at && (
                            <span
                              className={`text-[10px] shrink-0 ${
                                unreadCount > 0
                                  ? 'text-academic font-semibold'
                                  : 'text-muted/70 dark:text-navy-500'
                              }`}
                            >
                              {formatRelativeTime(lastMsg.created_at)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-[11px] truncate leading-snug ${
                              unreadCount > 0
                                ? 'font-medium text-ink/80 dark:text-navy-200'
                                : 'text-muted/70 dark:text-navy-400'
                            }`}
                          >
                            {memberCount
                              ? `${memberCount} members`
                              : isOnline
                                ? 'Online'
                                : lastMsg
                                  ? (lastMsg.text || '📎 Attachment')
                                  : 'No messages yet'}
                          </p>

                          {unreadCount > 0 && (
                            <span className="shrink-0 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-academic text-white text-[10px] font-bold">
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          )}
                        </div>

                        {/* Last message preview for groups (when no unread) */}
                        {isGroupChannel && lastMsg && unreadCount === 0 && (
                          <p className="text-[10px] text-muted/60 dark:text-navy-500 truncate mt-0.5">
                            {lastMsg.text || '📎 Attachment'}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Find People footer button */}
          <div className="px-4 py-3 border-t border-border/60 dark:border-navy-800 bg-white dark:bg-navy-900 shrink-0">
            <button
              onClick={() => setShowNewChatModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-academic bg-academic-50 dark:bg-academic-950/70 hover:bg-academic-100 dark:hover:bg-academic-950 border border-academic-200/60 dark:border-academic-800/60 rounded-full transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New conversation
            </button>
          </div>
        </div>

        {/* ── RIGHT: Stream-native conversation panel ──────────────────────── */}
        <div
          className={`flex-1 flex flex-col h-full min-h-0 bg-[#FAFBF8] dark:bg-navy-900 transition-colors ${
            !isMobileThreadOpen ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeChannel ? (
            <Channel channel={activeChannel}>
              {/* Studora custom header — consumes channel context */}
              <StudoraConversationHeader
                currentUserId={currentUserId}
                onBack={() => setIsMobileThreadOpen(false)}
                onVoiceCall={handleVoiceCallClick}
                onVideoCall={handleVideoCallClick}
                startingCall={startingCall}
              />

              {/*
               * Window: Stream's layout container. Renders:
               *   - MessageList (official, paginated, virtualized optional)
               *   - MessageComposer (official, with attachment, emoji, send)
               *   - Thread (opened via reply actions)
               */}
              <Window>
                {/* Official Stream MessageList with Studora theme */}
                <MessageList />

                {/* Official Stream typing indicator */}
                <TypingIndicator />

                {/* Official Stream MessageComposer (with Voice & Attachment controls) */}
                <MessageComposer audioRecordingEnabled={true} />
              </Window>

              {/* Official Thread panel: slides open on reply */}
              <Thread />
            </Channel>
          ) : (
            /* Empty state: no conversation selected */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-academic-50 dark:bg-academic-950/60 border border-academic-200/60 dark:border-academic-800 flex items-center justify-center text-academic">
                <MessageSquare className="w-7 h-7" />
              </div>
              <div className="max-w-sm">
                <h3 className="text-base font-bold text-ink dark:text-navy-100">
                  Select a Conversation
                </h3>
                <p className="text-xs text-muted dark:text-navy-400 mt-1.5 leading-relaxed">
                  Choose an existing chat from the left panel, or start a new conversation with a tutor or peer.
                </p>
              </div>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-academic hover:bg-academic-700 rounded-full shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Start New Chat
              </button>
            </div>
          )}
        </div>

        {/* ── MODAL: New Message / User Discovery ─────────────────────────── */}
        {showNewChatModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 dark:bg-navy-950/70 backdrop-blur-sm">
            <div className="bg-white dark:bg-navy-900 rounded-2xl border border-border/60 dark:border-navy-800 shadow-[0_8px_32px_rgba(17,24,39,0.12),0_1px_4px_rgba(17,24,39,0.06)] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-border/60 dark:border-navy-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-ink dark:text-white">
                    New Message
                  </h3>
                  <p className="text-[11px] text-muted dark:text-navy-400 mt-0.5">
                    Find a student or tutor to message
                  </p>
                </div>

                <button
                  onClick={() => setShowNewChatModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-muted dark:text-navy-400 hover:text-ink dark:hover:text-white hover:bg-canvas dark:hover:bg-navy-800 border border-border/60 dark:border-navy-700 transition-all"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Search */}
              <div className="px-5 py-3 border-b border-border/60 dark:border-navy-800 bg-canvas/40 dark:bg-navy-950/50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/60 dark:text-navy-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by name…"
                    value={modalSearchQuery}
                    onChange={(e) => setModalSearchQuery(e.target.value)}
                    autoFocus
                    className="w-full pl-9 pr-8 py-2 text-xs bg-white dark:bg-navy-900 border border-border/60 dark:border-navy-800 rounded-full text-ink dark:text-white placeholder:text-muted/50 dark:placeholder:text-navy-500 focus:outline-none focus:border-academic/50 focus:ring-2 focus:ring-academic/10 transition-all"
                  />
                  {modalSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setModalSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted dark:text-navy-400 hover:text-ink dark:hover:text-white rounded"
                      aria-label="Clear query"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Results */}
              <div className="max-h-72 overflow-y-auto divide-y divide-border/40 dark:divide-navy-800/60">
                {(modalSearchQuery || '').trim().length < 2 ? (
                  <div className="p-8 text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-canvas dark:bg-navy-800 flex items-center justify-center mx-auto text-muted dark:text-navy-400">
                      <Search className="w-4 h-4 text-academic" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-ink dark:text-navy-100">
                        Search for people
                      </p>
                      <p className="text-[11px] text-muted dark:text-navy-400 mt-1 max-w-xs mx-auto">
                        Type at least 2 characters to find students and tutors.
                      </p>
                    </div>
                  </div>
                ) : loadingModalUsers ? (
                  <div className="p-8 text-center space-y-2">
                    <Loader2 className="w-6 h-6 text-academic animate-spin mx-auto" />
                    <p className="text-xs text-muted dark:text-navy-400">
                      Searching…
                    </p>
                  </div>
                ) : modalUsers.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <User className="w-8 h-8 text-muted dark:text-navy-400 mx-auto" />
                    <p className="text-xs font-semibold text-ink dark:text-navy-100">
                      No users found
                    </p>
                    <p className="text-[11px] text-muted dark:text-navy-400">
                      Try searching for another name or check spelling.
                    </p>
                  </div>
                ) : (
                  modalUsers.map((u) => {
                    const isConnecting = connectingUserId === u.id;
                    return (
                      <button
                        key={u.id}
                        disabled={isConnecting}
                        onClick={() => handleOpenOrCreateConversation(u)}
                        className="w-full text-left px-5 py-3 flex items-center justify-between hover:bg-canvas dark:hover:bg-navy-800/60 transition-colors disabled:opacity-50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar name={u.full_name} src={u.avatar_url || null} size="md" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold text-ink dark:text-navy-100 truncate">
                                {u.full_name}
                              </p>
                              {u.matchMeta?.priority === 1 && (
                                <span className="text-[9px] px-1 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                                  Exact
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted dark:text-navy-400 truncate">
                              {u.institution || 'Studora Academy'}
                              {u.department ? ` • ${u.department}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <Badge variant={u.role === 'tutor' ? 'accent' : 'secondary'} size="sm">
                            {u.role === 'tutor' ? 'Tutor' : 'Student'}
                          </Badge>
                          {isConnecting ? (
                            <Loader2 className="w-3.5 h-3.5 text-academic animate-spin" />
                          ) : (
                            <span className="text-xs text-academic font-semibold">Message →</span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-border/60 dark:border-navy-800 bg-canvas/30 dark:bg-navy-950/40 flex justify-end">
                <button
                  onClick={() => setShowNewChatModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-muted dark:text-navy-300 hover:text-ink dark:hover:text-white hover:bg-canvas dark:hover:bg-navy-800 rounded-full border border-border/60 dark:border-navy-700 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Stream Video Calling Modal (separate from Chat) ──────────────── */}
        {showCallModal && activeCall && streamVideoClient && (
          <StreamVideo client={streamVideoClient}>
            <StudoraCallModal
              isOpen={showCallModal}
              call={activeCall}
              callType={activeCallType}
              recipientName={activeCallRecipientName}
              onClose={handleCallModalClose}
            />
          </StreamVideo>
        )}
      </div>
    </Chat>
  );
}
