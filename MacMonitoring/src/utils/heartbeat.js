import { supabase } from "../lib/supabase";
import { getCurrentUser } from "./auth";

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
let heartbeatTimer = null;
let isTracking = false;

/**
 * Start sending heartbeat pings to update last_seen
 * Call this once when app loads (e.g., in App.jsx useEffect)
 */
export const startHeartbeat = () => {
    if (isTracking) return;
    isTracking = true;

    const sendPing = async () => {
        const user = getCurrentUser();
        if (!user) return;

        try {
            await supabase
                .from("tblMonitoring")
                .update({ last_seen: new Date().toISOString() })
                .eq("id", user.id);
        } catch (e) {
            // Silently fail — heartbeat is non-critical
        }
    };

    // Send immediately on start
    sendPing();

    // Then every 30 seconds
    heartbeatTimer = setInterval(sendPing, HEARTBEAT_INTERVAL);
};

/**
 * Stop heartbeat (call on logout)
 */
export const stopHeartbeat = () => {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
    isTracking = false;
};

/**
 * Get count of online users (last_seen within threshold)
 * @param {number} thresholdMinutes - minutes to consider "online" (default 2)
 */
export const getOnlineUsersCount = async (thresholdMinutes = 2) => {
    const threshold = new Date(Date.now() - thresholdMinutes * 60000).toISOString();

    const { count, error } = await supabase
        .from("tblMonitoring")
        .select("*", { count: "exact", head: true })
        .gte("last_seen", threshold);

    if (error) return 0;
    return count || 0;
};

/**
 * Get list of online users with details
 * @param {number} thresholdMinutes - minutes to consider "online" (default 2)
 */
export const getOnlineUsers = async (thresholdMinutes = 2) => {
    const threshold = new Date(Date.now() - thresholdMinutes * 60000).toISOString();

    const { data, error } = await supabase
        .from("tblMonitoring")
        .select("id, firstname, lastname, type, tribe, image_url, last_seen")
        .gte("last_seen", threshold)
        .order("last_seen", { ascending: false });

    if (error) return [];
    return data || [];
};

/**
 * Subscribe to online user count changes (realtime)
 * Returns unsubscribe function
 */
export const subscribeOnlineCount = (callback, thresholdMinutes = 2) => {
    const threshold = new Date(Date.now() - thresholdMinutes * 60000).toISOString();

    // Poll every 10 seconds since Supabase realtime doesn't filter by gte easily
    const poll = async () => {
        const count = await getOnlineUsersCount(thresholdMinutes);
        callback(count);
    };

    poll(); // Initial
    const timer = setInterval(poll, 10000); // Poll every 10s

    return () => clearInterval(timer);
};