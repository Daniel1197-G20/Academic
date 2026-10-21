/**
 * src/lib/stream/client.js
 *
 * Reusable client-side integration layer for GetStream in Studora.
 *
 * ARCHITECTURAL MANDATES:
 * - NEVER use or expose the Stream API secret in frontend code.
 * - Authenticate exclusively via the backend endpoint /api/stream/token using the user's Supabase session.
 * - Avoid duplicate client initializations across React re-renders.
 * - Safely disconnect and teardown clients on user logout or session transitions to avoid stale sessions.
 * - Clean singleton management with graceful degradation if Stream is unconfigured.
 */

import { StreamChat } from 'stream-chat';
import { api } from '../../services/api/client.js';
import { clientConfig } from '../../config/clientConfig.js';

let streamClientInstance = null;
let currentConnectedUserId = null;
let connectionPromise = null;

/**
 * Get or initialize the StreamChat client singleton.
 * Uses public API key only.
 */
export function getStreamClient(apiKeyOverride = null) {
  const apiKey = apiKeyOverride || clientConfig.stream?.apiKey;
  if (!apiKey) {
    return null;
  }

  // stream-chat SDK v9+ stores the key on `client.key`, not `client.apiKey`.
  // Using `apiKey` always returns `undefined`, causing a spurious disconnect + re-init on every call.
  const instanceKey = streamClientInstance?.key || streamClientInstance?.apiKey;
  if (!streamClientInstance || instanceKey !== apiKey) {
    if (streamClientInstance) {
      try {
        streamClientInstance.disconnectUser().catch(() => {});
      } catch (e) {}
    }
    streamClientInstance = StreamChat.getInstance(apiKey);
  }

  return streamClientInstance;
}

/**
 * Connect the current authenticated user to Stream using a server-issued token.
 * Prevents multiple simultaneous connection attempts or duplicate connections.
 *
 * @param {Object} [userOverride] - Optional user metadata { id, name, image }
 * @returns {Promise<{ client: StreamChat, userId: string }>}
 */
export async function connectStreamUser(userOverride = null) {
  // 1. Fetch token and public apiKey securely from backend
  const res = await api.getStreamToken();
  if (!res || !res.token) {
    throw new Error('Failed to retrieve GetStream token from server.');
  }

  const { token, apiKey, userId } = res;
  const client = getStreamClient(apiKey);
  if (!client) {
    throw new Error('Stream client could not be initialized with the provided API key.');
  }

  // If already connected for this exact user, reuse existing connection
  if (client.userID === userId && currentConnectedUserId === userId && client.user) {
    return { client, userId };
  }

  // If a connection is currently in flight for the same user, await it
  if (connectionPromise && currentConnectedUserId === userId) {
    return connectionPromise;
  }

  // If another user was previously connected, disconnect cleanly first
  if (currentConnectedUserId && currentConnectedUserId !== userId) {
    try {
      await client.disconnectUser();
    } catch (discErr) {
      console.warn('[stream-client] Disconnect warning during user switch:', discErr);
    }
    currentConnectedUserId = null;
  }

  connectionPromise = (async () => {
    try {
      const userPayload = {
        id: userId,
        ...(userOverride?.name ? { name: userOverride.name } : {}),
        ...(userOverride?.image ? { image: userOverride.image } : {})
      };

      await client.connectUser(userPayload, token);
      currentConnectedUserId = userId;
      return { client, userId };
    } catch (err) {
      currentConnectedUserId = null;
      throw err;
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
}

/**
 * Disconnect the current Stream user session and reset client state.
 * Should be called whenever the user logs out or session is terminated.
 */
export async function disconnectStreamUser() {
  // Only call disconnectUser() if there is actually a connected user on this instance.
  // Calling it on an unconnected instance produces the spurious
  // "Connection was closed because disconnectUser() was called" error.
  if (streamClientInstance && streamClientInstance.userID) {
    try {
      await streamClientInstance.disconnectUser();
    } catch (err) {
      console.warn('[stream-client] Error during user disconnect:', err);
    }
  }
  currentConnectedUserId = null;
  connectionPromise = null;
}

/**
 * Get current connected user ID or null
 */
export function getConnectedStreamUserId() {
  return currentConnectedUserId;
}
