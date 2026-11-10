/**
 * src/lib/sync/syncEngine.js
 *
 * STUDORA UNIVERSAL REAL-TIME SYNCHRONIZATION ENGINE
 * "Study smarter. Go further."
 *
 * Features:
 * - Single authenticated user-scoped Supabase Realtime channel (`user-sync:<userId>`)
 * - Multi-device presence tracking (shows active sessions without leaking private data)
 * - Postgres change listeners on user-owned tables
 * - Peer-to-peer fast broadcast bus for instant cross-device UI state reflection
 * - Centralized debounced cache invalidation with duplicate event suppression
 * - Offline queue & reconnection replay
 * - Clean subscription teardown on logout or account switch
 */

import { supabase } from '../supabase/client';

const SYNC_EVENTS = {
  PROFILE_UPDATED: 'profile_updated',
  ACADEMIC_UPDATED: 'academic_updated',
  STUDY_PLAN_UPDATED: 'study_plan_updated',
  NOTIFICATION_UPDATED: 'notification_updated',
  TUTOR_DATA_UPDATED: 'tutor_data_updated',
  BILLING_UPDATED: 'billing_updated'
};

class UniversalSyncEngine {
  constructor() {
    this.userId = null;
    this.channel = null;
    this.listeners = new Map(); // event -> Set of callbacks
    this.deviceId = this._getOrCreateDeviceId();
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.activeDevices = new Map();
    this.pendingQueue = [];
    this.debounceTimers = new Map();
    this.lastProcessedEventIds = new Set();
    this._setupWindowListeners();
  }

  _getOrCreateDeviceId() {
    const KEY = 'studora_device_id';
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        let id = window.sessionStorage.getItem(KEY);
        if (!id) {
          id = 'dev_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
          window.sessionStorage.setItem(KEY, id);
        }
        return id;
      }
    } catch (e) {
      // restricted sandbox
    }
    return 'dev_' + Math.random().toString(36).substring(2, 9);
  }

  _setupWindowListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifySubscribers('connection_status', { isOnline: true });
      this._flushPendingQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifySubscribers('connection_status', { isOnline: false });
    });
  }

  /**
   * Initialize synchronization for an authenticated user.
   * If already subscribed to the same user, this is a no-op.
   */
  async initialize(userId, userMetadata = {}) {
    if (!userId) {
      this.teardown();
      return;
    }

    if (this.userId === userId && this.channel) {
      return; // Already initialized for this user
    }

    // Teardown any previous user session
    if (this.channel) {
      await this.teardown();
    }

    this.userId = userId;

    const channelName = `user-sync:${userId}`;

    this.channel = supabase.channel(channelName, {
      config: {
        broadcast: { ack: false, self: false }, // self: false ensures current device doesn't refetch on its own broadcast
        presence: { key: this.deviceId }
      }
    });

    // 1. Device Presence Tracking
    this.channel.on('presence', { event: 'sync' }, () => {
      const state = this.channel.presenceState();
      this.activeDevices.clear();
      for (const [key, presences] of Object.entries(state)) {
        if (presences && presences.length > 0) {
          this.activeDevices.set(key, presences[0]);
        }
      }
      this.notifySubscribers('presence_sync', {
        deviceCount: this.activeDevices.size,
        devices: Array.from(this.activeDevices.values())
      });
    });

    // 2. Peer Device Broadcast Events
    this.channel.on('broadcast', { event: 'cross_device_sync' }, (payload) => {
      this._handleIncomingSyncEvent(payload);
    });

    // 3. PostgreSQL Database Change Listeners (Filtered to Current User)
    const tablesToWatch = [
      { table: 'profiles', filter: `id=eq.${userId}`, event: SYNC_EVENTS.PROFILE_UPDATED },
      { table: 'user_settings', filter: `user_id=eq.${userId}`, event: SYNC_EVENTS.ACADEMIC_UPDATED },
      { table: 'semesters', filter: `user_id=eq.${userId}`, event: SYNC_EVENTS.ACADEMIC_UPDATED },
      { table: 'student_courses', filter: `user_id=eq.${userId}`, event: SYNC_EVENTS.ACADEMIC_UPDATED },
      { table: 'study_plans', filter: `user_id=eq.${userId}`, event: SYNC_EVENTS.STUDY_PLAN_UPDATED },
      { table: 'study_topics', filter: `user_id=eq.${userId}`, event: SYNC_EVENTS.STUDY_PLAN_UPDATED },
      { table: 'study_logs', filter: `user_id=eq.${userId}`, event: SYNC_EVENTS.STUDY_PLAN_UPDATED },
      { table: 'user_subscriptions', filter: `user_id=eq.${userId}`, event: SYNC_EVENTS.BILLING_UPDATED }
    ];

    tablesToWatch.forEach(({ table, filter, event }) => {
      this.channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter },
        (change) => {
          this._debouncedNotify(event, { source: 'postgres_changes', table, change });
        }
      );
    });

    // Subscribe to Realtime channel
    this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Track presence for this device
        try {
          await this.channel.track({
            deviceId: this.deviceId,
            userId,
            platform: typeof navigator !== 'undefined' ? navigator.platform || 'web' : 'web',
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'web',
            onlineAt: new Date().toISOString()
          });
        } catch (presErr) {
          console.warn('[SyncEngine] Presence track notice:', presErr);
        }
        this.notifySubscribers('connected', { userId, deviceId: this.deviceId });
      }
    });
  }

  _handleIncomingSyncEvent(message) {
    if (!message || !message.payload) return;
    const { eventId, eventType, sourceDeviceId, data, timestamp } = message.payload;

    // Suppress events generated by this device
    if (sourceDeviceId === this.deviceId) return;

    // Suppress duplicate events
    if (eventId && this.lastProcessedEventIds.has(eventId)) return;
    if (eventId) {
      this.lastProcessedEventIds.add(eventId);
      if (this.lastProcessedEventIds.size > 200) {
        const first = this.lastProcessedEventIds.values().next().value;
        this.lastProcessedEventIds.delete(first);
      }
    }

    this._debouncedNotify(eventType, {
      source: 'cross_device_broadcast',
      sourceDeviceId,
      data,
      timestamp
    });
  }

  _debouncedNotify(eventType, payload, delayMs = 300) {
    if (this.debounceTimers.has(eventType)) {
      clearTimeout(this.debounceTimers.get(eventType));
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(eventType);
      this.notifySubscribers(eventType, payload);
      this.notifySubscribers('*', { eventType, ...payload });
    }, delayMs);

    this.debounceTimers.set(eventType, timer);
  }

  /**
   * Broadcast a local mutation to all other authenticated devices belonging to this user.
   */
  async broadcastUpdate(eventType, data = {}) {
    if (!this.channel || !this.userId) return;

    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.lastProcessedEventIds.add(eventId);

    const payload = {
      eventId,
      eventType,
      sourceDeviceId: this.deviceId,
      userId: this.userId,
      data,
      timestamp: Date.now()
    };

    if (!this.isOnline) {
      this.pendingQueue.push({ eventType, payload });
      return;
    }

    try {
      await this.channel.send({
        type: 'broadcast',
        event: 'cross_device_sync',
        payload
      });
    } catch (err) {
      console.warn('[SyncEngine] Failed to broadcast change to peer devices:', err);
      this.pendingQueue.push({ eventType, payload });
    }
  }

  async _flushPendingQueue() {
    if (!this.channel || this.pendingQueue.length === 0) return;
    const items = [...this.pendingQueue];
    this.pendingQueue = [];

    for (const item of items) {
      try {
        await this.channel.send({
          type: 'broadcast',
          event: 'cross_device_sync',
          payload: item.payload
        });
      } catch (e) {
        this.pendingQueue.push(item);
        break;
      }
    }
  }

  /**
   * Subscribe a callback to sync events.
   * Returns an unsubscribe function.
   */
  subscribe(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);

    return () => {
      const set = this.listeners.get(eventType);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  notifySubscribers(eventType, payload) {
    const set = this.listeners.get(eventType);
    if (set) {
      set.forEach(cb => {
        try {
          cb(payload);
        } catch (err) {
          console.error('[SyncEngine] Error in sync listener callback:', err);
        }
      });
    }
  }

  /**
   * Safely teardown channel and presence tracking upon logout.
   */
  async teardown() {
    if (this.channel) {
      try {
        await this.channel.untrack();
        await supabase.removeChannel(this.channel);
      } catch (err) {
        console.warn('[SyncEngine] Teardown warning:', err);
      }
      this.channel = null;
    }
    this.userId = null;
    this.activeDevices.clear();
    this.debounceTimers.forEach(t => clearTimeout(t));
    this.debounceTimers.clear();
    this.pendingQueue = [];
  }
}

export const syncEngine = new UniversalSyncEngine();
export { SYNC_EVENTS };
