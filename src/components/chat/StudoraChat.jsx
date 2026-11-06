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
  ShieldCheck,
  WifiOff,
  Phone,
  Video,
  Plus,
  X,
  Users,
  Loader2,
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

  return (
    <div className="px-3.5 py-3 sm:px-4 sm:py-3.5 border-b border-border/80 dark:border-navy-800/80 flex items-center justify-between bg-surface dark:bg-navy-900/95 shrink-0 z-10">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
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
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="relative shrink-0">
            <Avatar
              name={other?.name || channel?.data?.name || 'User'}
              src={other?.image || null}
              size="md"
            />
            {isOnline && (
              <span
                className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-surface dark:border-navy-900"
                title="Online"
              />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-ink dark:text-white truncate font-sans">
                {other?.name || channel?.data?.name || 'Studora Chat'}
              </h3>
              <Badge variant="academic" size="sm">
                {isBookingChannel ? 'Tutoring' : 'Direct'}
              </Badge>
            </div>
            <p className="text-[11px] text-muted dark:text-navy-400 truncate mt-0.5">
              {subject
                ? `Subject: ${subject}`
                : isOnline
                  ? 'Active now'
                  : 'Private 1-on-1 Conversation'}
            </p>
          </div>
        </div>
      </div>

      {/* Call Controls */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onVoiceCall}
          disabled={startingCall}
          className="p-2 text-muted dark:text-navy-300 hover:text-academic hover:bg-academic-50 dark:hover:bg-academic-950/60 rounded-xl transition-colors disabled:opacity-50"
          title="Start voice call (Stream Video)"
          aria-label="Start voice call"
        >
          <Phone className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onVideoCall}
          disabled={startingCall}
          className="p-2 text-muted dark:text-navy-300 hover:text-academic hover:bg-academic-50 dark:hover:bg-academic-950/60 rounded-xl transition-colors disabled:opacity-50"
          title={
            isBookingChannel
              ? 'Join Live Video Tutoring Room'
              : 'Start video call (Stream Video)'
          }
          aria-label="Start video call"
        >
          <Video className="w-4 h-4" />
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

  // Sidebar tabs: 'conversations' | 'users'
  const [sidebarTab, setSidebarTab] = useState('conversations');

  // Directory (Find People) search
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

  // Debounced directory search
  useEffect(() => {
    if (sidebarTab !== 'users') return;

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
  }, [directorySearchQuery, sidebarTab, searchUsersInDatabase]);

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
        setSidebarTab('conversations');
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
      setSidebarTab('conversations');
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
      <div className="relative bg-surface dark:bg-navy-900 border-0 md:border md:border-border dark:md:border-navy-800 rounded-none md:rounded-card shadow-none md:shadow-tactile-surface overflow-hidden flex flex-col md:flex-row flex-1 min-h-0 h-full transition-colors duration-150">

        {/* ── LEFT: Studora Sidebar (Conversations + Find People) ─────────── */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-border dark:border-navy-800 flex flex-col h-full min-h-0 bg-[#FAFBF8] dark:bg-navy-950/90 shrink-0 transition-colors ${
            isMobileThreadOpen ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Sidebar Header */}
          <div className="p-3.5 sm:p-4 border-b border-border/80 dark:border-navy-800/80 bg-surface dark:bg-navy-900/95 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-academic-100 dark:bg-academic-900/50 flex items-center justify-center text-academic">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-ink dark:text-navy-100 tracking-tight font-sans">
                    Messages
                  </h2>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-academic-50 dark:bg-academic-950 text-academic border border-academic-200 dark:border-academic-800">
                  {channels.length}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-academic hover:bg-academic-700 active:bg-academic-800 rounded-btn shadow-tactile-btn transition-all"
                  title="Start a new message"
                  aria-label="Start a new chat"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">New Chat</span>
                </button>

                <button
                  onClick={initChat}
                  className="p-1.5 text-muted dark:text-navy-300 hover:text-ink dark:hover:text-white hover:bg-canvas dark:hover:bg-navy-800 rounded-lg transition-colors"
                  title="Refresh conversations"
                  aria-label="Refresh conversations"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Segmented Tab: Chats / Find People */}
            <div className="flex rounded-lg bg-canvas dark:bg-navy-950 p-1 border border-border dark:border-navy-800 text-xs font-semibold">
              <button
                onClick={() => setSidebarTab('conversations')}
                className={`flex-1 py-1.5 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 select-none ${
                  sidebarTab === 'conversations'
                    ? 'bg-surface dark:bg-navy-800 text-ink dark:text-white shadow-tactile-btn font-bold'
                    : 'text-muted dark:text-navy-400 hover:text-ink dark:hover:text-navy-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chats</span>
              </button>
              <button
                onClick={() => setSidebarTab('users')}
                className={`flex-1 py-1.5 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 select-none ${
                  sidebarTab === 'users'
                    ? 'bg-surface dark:bg-navy-800 text-ink dark:text-white shadow-tactile-btn font-bold'
                    : 'text-muted dark:text-navy-400 hover:text-ink dark:hover:text-navy-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Find People</span>
              </button>
            </div>

            {/* Search Field */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted dark:text-navy-400 pointer-events-none" />
              <input
                type="text"
                placeholder={
                  sidebarTab === 'conversations'
                    ? 'Search conversations…'
                    : 'Search students & tutors by name…'
                }
                value={sidebarTab === 'conversations' ? searchQuery : directorySearchQuery}
                onChange={(e) => {
                  if (sidebarTab === 'conversations') {
                    setSearchQuery(e.target.value);
                  } else {
                    setDirectorySearchQuery(e.target.value);
                  }
                }}
                className="w-full pl-9 pr-8 py-2 text-xs bg-canvas/70 dark:bg-navy-950/80 border border-border dark:border-navy-800 rounded-xl text-ink dark:text-white placeholder:text-muted dark:placeholder:text-navy-500 focus:outline-none focus:border-academic focus:ring-1 focus:ring-academic/20 transition-all"
              />
              {((sidebarTab === 'conversations' && searchQuery) ||
                (sidebarTab === 'users' && directorySearchQuery)) && (
                <button
                  type="button"
                  onClick={() => {
                    if (sidebarTab === 'conversations') setSearchQuery('');
                    else setDirectorySearchQuery('');
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted dark:text-navy-400 hover:text-ink dark:hover:text-white rounded"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Sidebar Body */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/40 dark:divide-navy-800/60 overscroll-contain">
            {sidebarTab === 'conversations' ? (
              /* TAB A: Conversation list */
              filteredChannels.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-canvas dark:bg-navy-900 border border-border dark:border-navy-800 flex items-center justify-center mx-auto text-muted dark:text-navy-400">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink dark:text-navy-200">
                      {searchQuery ? 'No matching conversations' : 'No active conversations yet'}
                    </p>
                    <p className="text-[11px] text-muted dark:text-navy-400 mt-1 max-w-xs mx-auto leading-relaxed">
                      {searchQuery
                        ? 'Try adjusting your search terms or search for people in the directory.'
                        : 'Connect with verified Studora tutors or peer students to get started.'}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Users}
                    onClick={() => setSidebarTab('users')}
                    className="mt-2 text-xs"
                  >
                    Find People to Message
                  </Button>
                </div>
              ) : (
                filteredChannels.map((ch) => {
                  const other = getOtherParticipant(ch);
                  const isActive = activeChannel?.id === ch.id;
                  const unreadCount = ch.countUnread();
                  const lastMsg = ch.state?.messages?.[ch.state.messages.length - 1];

                  return (
                    <button
                      key={ch.id}
                      onClick={() => {
                        setActiveChannel(ch);
                        setIsMobileThreadOpen(true);
                      }}
                      className={`w-full text-left p-3 sm:p-3.5 flex items-start gap-3 transition-all relative border-l-[3px] ${
                        isActive
                          ? 'bg-surface dark:bg-navy-900 border-l-academic shadow-tactile-surface'
                          : 'border-l-transparent hover:bg-surface/80 dark:hover:bg-navy-900/60'
                      }`}
                    >
                      <div className="relative shrink-0 mt-0.5">
                        <Avatar
                          name={other?.name || ch.data?.name || 'Studora User'}
                          src={other?.image || null}
                          size="md"
                        />
                        {ch.state?.watcher_count > 1 && (
                          <span
                            className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-surface dark:border-navy-900"
                            title="Online"
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <p
                            className={`text-xs truncate font-sans ${
                              unreadCount > 0
                                ? 'font-extrabold text-ink dark:text-white'
                                : 'font-semibold text-ink dark:text-navy-100'
                            }`}
                          >
                            {other?.name || ch.data?.name || 'Direct Conversation'}
                          </p>
                          {lastMsg?.created_at && (
                            <span
                              className={`text-[10px] font-mono shrink-0 ${
                                unreadCount > 0
                                  ? 'text-academic font-bold'
                                  : 'text-muted dark:text-navy-400'
                              }`}
                            >
                              {new Date(lastMsg.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>

                        <p
                          className={`text-[11px] truncate mt-1 leading-snug ${
                            unreadCount > 0
                              ? 'font-semibold text-ink dark:text-white'
                              : 'text-muted dark:text-navy-400'
                          }`}
                        >
                          {lastMsg ? lastMsg.text || '📎 Attachment' : 'No messages yet'}
                        </p>

                        {ch.data?.subject && (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-academic-50 dark:bg-academic-950 text-academic border border-academic-200/60 dark:border-academic-800 font-medium">
                              {ch.data.subject}
                            </span>
                            {ch.data?.booking_id && (
                              <span className="text-[9px] font-mono text-muted dark:text-navy-400">
                                Session
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {unreadCount > 0 && (
                        <span className="mt-1 px-1.5 py-0.5 rounded-full bg-academic text-white text-[10px] font-mono font-bold shrink-0 shadow-sm">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })
              )
            ) : (
              /* TAB B: Find People — Supabase directory search */
              (directorySearchQuery || '').trim().length < 2 ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-academic-50 dark:bg-academic-950 border border-academic-200 dark:border-academic-800 flex items-center justify-center mx-auto text-academic">
                    <Search className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink dark:text-navy-100">
                      Search Studora Directory
                    </p>
                    <p className="text-[11px] text-muted dark:text-navy-400 mt-1 max-w-xs mx-auto leading-relaxed">
                      Type at least 2 characters to discover verified students and tutors by name or subject.
                    </p>
                  </div>
                </div>
              ) : loadingDirectory ? (
                <div className="p-8 text-center space-y-2">
                  <Loader2 className="w-6 h-6 text-academic animate-spin mx-auto" />
                  <p className="text-xs text-muted dark:text-navy-400">Searching Studora directory…</p>
                </div>
              ) : directoryError ? (
                <div className="p-8 text-center space-y-2">
                  <AlertCircle className="w-6 h-6 text-rose-500 mx-auto" />
                  <p className="text-xs font-semibold text-ink dark:text-navy-100">Search failed</p>
                  <p className="text-[11px] text-muted dark:text-navy-400 max-w-xs mx-auto">
                    {directoryError}
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      searchUsersInDatabase(directorySearchQuery).then(setDirectoryResults)
                    }
                    className="mt-1 text-xs"
                  >
                    Retry Search
                  </Button>
                </div>
              ) : directoryResults.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <User className="w-8 h-8 text-muted dark:text-navy-400 mx-auto" />
                  <p className="text-xs font-semibold text-ink dark:text-navy-100">No users found</p>
                  <p className="text-[11px] text-muted dark:text-navy-400 max-w-xs mx-auto">
                    Try searching for another name or keyword.
                  </p>
                </div>
              ) : (
                directoryResults.map((u) => {
                  const isConnecting = connectingUserId === u.id;
                  return (
                    <button
                      key={u.id}
                      disabled={isConnecting}
                      onClick={() => handleOpenOrCreateConversation(u)}
                      className="w-full text-left p-3.5 flex items-center justify-between hover:bg-surface dark:hover:bg-navy-900 transition-colors disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={u.full_name} src={u.avatar_url || null} size="md" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-ink dark:text-navy-100 truncate">
                              {u.full_name}
                            </p>
                            {u.matchMeta?.priority === 1 && (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                                Exact
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted dark:text-navy-400 truncate">
                            {u.institution || 'Studora Academy'}
                            {u.department ? ` • ${u.department}` : ''}
                          </p>
                          {u.matchMeta?.matchReason && u.matchMeta.priority > 3 && (
                            <span className="text-[10px] text-academic font-medium">
                              {u.matchMeta.matchReason}
                            </span>
                          )}
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
              )
            )}
          </div>
        </div>

        {/* ── RIGHT: Stream-native conversation panel ──────────────────────── */}
        <div
          className={`flex-1 flex flex-col h-full min-h-0 bg-surface dark:bg-navy-900 transition-colors ${
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

                {/* Official Stream MessageComposer (replaces custom form) */}
                <MessageComposer />
              </Window>

              {/* Official Thread panel: slides open on reply */}
              <Thread />
            </Channel>
          ) : (
            /* Empty state: no conversation selected */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-academic-50 dark:bg-academic-950/60 border border-academic-200 dark:border-academic-800 flex items-center justify-center text-academic">
                <MessageSquare className="w-7 h-7" />
              </div>
              <div className="max-w-sm">
                <h3 className="text-base font-bold text-ink dark:text-navy-100 font-sans">
                  Select a Conversation
                </h3>
                <p className="text-xs text-muted dark:text-navy-400 mt-1 leading-relaxed">
                  Choose an existing chat from the left panel, or search for tutors and peers using
                  Find People.
                </p>
              </div>
              <Button
                variant="academic"
                size="sm"
                icon={Plus}
                onClick={() => setShowNewChatModal(true)}
                className="mt-1"
              >
                Start New Chat
              </Button>
            </div>
          )}
        </div>

        {/* ── MODAL: New Message / User Discovery ─────────────────────────── */}
        {showNewChatModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 dark:bg-navy-950/70 backdrop-blur-xs">
            <div className="bg-surface dark:bg-navy-900 rounded-card border border-border dark:border-navy-800 shadow-tactile-surface w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="p-4 border-b border-border dark:border-navy-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-academic-50 dark:bg-academic-950 text-academic flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink dark:text-white font-sans">
                      New Message
                    </h3>
                    <p className="text-[11px] text-muted dark:text-navy-400">
                      Message any eligible student or tutor on Studora
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowNewChatModal(false)}
                  className="p-1.5 text-muted dark:text-navy-400 hover:text-ink dark:hover:text-white hover:bg-canvas dark:hover:bg-navy-800 rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Search */}
              <div className="p-4 border-b border-border dark:border-navy-800 bg-canvas/40 dark:bg-navy-950/50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted dark:text-navy-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by full or partial name…"
                    value={modalSearchQuery}
                    onChange={(e) => setModalSearchQuery(e.target.value)}
                    autoFocus
                    className="w-full pl-9 pr-8 py-2 text-xs bg-surface dark:bg-navy-900 border border-border dark:border-navy-800 rounded-xl text-ink dark:text-white placeholder:text-muted dark:placeholder:text-navy-500 focus:outline-none focus:border-academic"
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
              <div className="max-h-72 overflow-y-auto divide-y divide-border/60 dark:divide-navy-800/60 p-2">
                {(modalSearchQuery || '').trim().length < 2 ? (
                  <div className="p-8 text-center space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-canvas dark:bg-navy-950 border border-border dark:border-navy-800 flex items-center justify-center mx-auto text-muted dark:text-navy-400">
                      <Search className="w-5 h-5 text-academic" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-ink dark:text-navy-100">
                        Search for people
                      </p>
                      <p className="text-[11px] text-muted dark:text-navy-400 mt-1 max-w-xs mx-auto">
                        Type at least 2 characters to find students and tutors to start messaging.
                      </p>
                    </div>
                  </div>
                ) : loadingModalUsers ? (
                  <div className="p-8 text-center space-y-2">
                    <Loader2 className="w-6 h-6 text-academic animate-spin mx-auto" />
                    <p className="text-xs text-muted dark:text-navy-400">
                      Searching Studora directory…
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
                        className="w-full text-left p-2.5 rounded-xl flex items-center justify-between hover:bg-canvas dark:hover:bg-navy-950 transition-colors disabled:opacity-50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar name={u.full_name} src={u.avatar_url || null} size="md" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-ink dark:text-navy-100 truncate">
                                {u.full_name}
                              </p>
                              {u.matchMeta?.priority === 1 && (
                                <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
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
                          <Badge
                            variant={u.role === 'tutor' ? 'accent' : 'secondary'}
                            size="sm"
                          >
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
              <div className="p-3 border-t border-border dark:border-navy-800 bg-canvas/30 dark:bg-navy-950/40 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewChatModal(false)}
                >
                  Cancel
                </Button>
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
