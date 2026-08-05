import { supabase } from "../lib/supabase";
import { getCurrentUser, isAdmin } from "./auth";

// ============================================
// CONVERSATIONS
// ============================================

export const getConversations = async (userId) => {
    const { data, error } = await supabase
        .from("tblConversationMembers")
        .select(`
            conversation_id,
            last_read_at,
            tblConversations!inner(
                id, type, name, tribe, ministry, created_by, created_at, updated_at
            )
        `)
        .eq("user_id", userId)
        .order("tblConversations(updated_at)", { ascending: false });

    if (error) {
        console.error("Error fetching conversations:", error);
        return [];
    }

    const conversations = await Promise.all(
        (data || []).map(async (membership) => {
            const conv = membership.tblConversations;

            const { count } = await supabase
                .from("tblMessages")
                .select("*", { count: "exact", head: true })
                .eq("conversation_id", conv.id)
                .gt("created_at", membership.last_read_at || "1970-01-01");

            const { data: lastMsg } = await supabase
                .from("tblMessages")
                .select("text, created_at, sender_name")
                .eq("conversation_id", conv.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            let memberCount = null;
            if (conv.type !== 'direct') {
                const { count: mc } = await supabase
                    .from("tblConversationMembers")
                    .select("*", { count: "exact", head: true })
                    .eq("conversation_id", conv.id);
                memberCount = mc || 0;
            }

            return {
                ...conv,
                unreadCount: count || 0,
                lastMessage: lastMsg || null,
                memberCount
            };
        })
    );

    return conversations;
};

export const getOrCreateDirectConversation = async (userId1, userId2) => {
    const { data: user1DirectConvs } = await supabase
        .from("tblConversationMembers")
        .select("conversation_id, tblConversations!inner(type)")
        .eq("user_id", userId1)
        .eq("tblConversations.type", "direct");

    if (user1DirectConvs && user1DirectConvs.length > 0) {
        const convIds = user1DirectConvs.map(e => e.conversation_id);

        const { data: match } = await supabase
            .from("tblConversationMembers")
            .select("conversation_id")
            .eq("user_id", userId2)
            .in("conversation_id", convIds);

        if (match && match.length > 0) {
            const { data: conv } = await supabase
                .from("tblConversations")
                .select("*")
                .eq("id", match[0].conversation_id)
                .single();

            if (conv) return conv;
        }
    }

    const { data: newConv, error } = await supabase
        .from("tblConversations")
        .insert([{ type: "direct" }])
        .select()
        .single();

    if (error) {
        console.error("Error creating conversation:", error);
        return null;
    }

    const { error: memberError } = await supabase.from("tblConversationMembers").insert([
        { conversation_id: newConv.id, user_id: userId1 },
        { conversation_id: newConv.id, user_id: userId2 }
    ]);

    if (memberError) {
        console.error("Error adding direct conversation members, rolling back:", memberError);
        await supabase.from("tblConversations").delete().eq("id", newConv.id);
        return null;
    }

    return newConv;
};

// ============================================
// GROUP CHAT
// ============================================

// UPDATED: now returns a { success, conversation, error, stage } object
// instead of just the conversation or null. This means the UI can show the
// REAL Postgres error message (e.g. "violates foreign key constraint...",
// "violates check constraint...", "new row violates row-level security
// policy...") directly to you, instead of a generic "something went wrong"
// with the real reason only visible in the browser console.
//
// "stage" tells you which insert failed:
//   - "conversation": the tblConversations insert itself failed (e.g. a
//     restrictive CHECK constraint on `type`, a NOT NULL column not being
//     filled in, etc). Members are never touched in this case.
//   - "members": the conversation was created fine, but adding the member
//     rows failed (e.g. RLS blocking inserting rows for other users' IDs,
//     or a foreign key on user_id pointing at the wrong table). The
//     orphaned conversation row is rolled back automatically.
export const createGroupConversation = async (name, creatorId, memberIds) => {
    const { data: newConv, error } = await supabase
        .from("tblConversations")
        .insert([{ type: "group", name: name.trim(), created_by: creatorId }])
        .select()
        .single();

    if (error) {
        console.error("Error creating group (conversation insert failed):", error);
        return { success: false, error: error.message, stage: "conversation" };
    }

    const members = [creatorId, ...memberIds.filter(id => id !== creatorId)];
    const memberRows = members.map(userId => ({
        conversation_id: newConv.id,
        user_id: userId
    }));

    const { error: memberError } = await supabase
        .from("tblConversationMembers")
        .insert(memberRows);

    if (memberError) {
        console.error("Error adding group members, rolling back orphaned conversation:", memberError);
        await supabase.from("tblConversations").delete().eq("id", newConv.id);
        return { success: false, error: memberError.message, stage: "members" };
    }

    return { success: true, conversation: newConv };
};

export const getConversationMembers = async (conversationId) => {
    const { data, error } = await supabase
        .from("tblConversationMembers")
        .select(`
            user_id,
            joined_at,
            tblMonitoring(id, firstname, lastname, tribe, image_url, type)
        `)
        .eq("conversation_id", conversationId);

    if (error) {
        console.error("Error fetching members:", error);
        return [];
    }

    return (data || []).map(m => ({
        id: m.user_id,
        joinedAt: m.joined_at,
        ...m.tblMonitoring
    }));
};

export const removeGroupMember = async (conversationId, userIdToRemove, removerId) => {
    const { data: conv } = await supabase
        .from("tblConversations")
        .select("created_by, type")
        .eq("id", conversationId)
        .single();

    if (!conv || conv.type !== "group") return false;

    const isCreator = conv.created_by === removerId;
    const isAdminUser = isAdmin();

    if (!isCreator && !isAdminUser) {
        console.error("Only group creator or admin can remove members");
        return false;
    }

    const { error } = await supabase
        .from("tblConversationMembers")
        .delete()
        .eq("conversation_id", conversationId)
        .eq("user_id", userIdToRemove);

    return !error;
};

export const addGroupMembers = async (conversationId, memberIds) => {
    const { data: existing } = await supabase
        .from("tblConversationMembers")
        .select("user_id")
        .eq("conversation_id", conversationId);

    const existingIds = new Set((existing || []).map(m => m.user_id));
    const newMembers = memberIds
        .filter(id => !existingIds.has(id))
        .map(userId => ({
            conversation_id: conversationId,
            user_id: userId
        }));

    if (newMembers.length === 0) return true;

    const { error } = await supabase
        .from("tblConversationMembers")
        .insert(newMembers);

    return !error;
};

export const leaveGroup = async (conversationId, userId) => {
    const { error } = await supabase
        .from("tblConversationMembers")
        .delete()
        .eq("conversation_id", conversationId)
        .eq("user_id", userId);

    return !error;
};

// Admin-only full conversation delete. Removes messages and memberships
// first (FK-safe order), then the conversation row itself.
export const deleteConversation = async (conversationId) => {
    if (!isAdmin()) {
        console.error("Only admins can delete conversations");
        return false;
    }

    const { error: msgError } = await supabase
        .from("tblMessages")
        .delete()
        .eq("conversation_id", conversationId);

    if (msgError) {
        console.error("Error deleting conversation messages:", msgError);
        return false;
    }

    const { error: memberError } = await supabase
        .from("tblConversationMembers")
        .delete()
        .eq("conversation_id", conversationId);

    if (memberError) {
        console.error("Error deleting conversation members:", memberError);
        return false;
    }

    const { error } = await supabase
        .from("tblConversations")
        .delete()
        .eq("id", conversationId);

    if (error) {
        console.error("Error deleting conversation:", error);
        return false;
    }

    return true;
};

// ============================================
// MESSAGES
// ============================================

export const getMessages = async (conversationId, limit = 50) => {
    const { data, error } = await supabase
        .from("tblMessages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) {
        console.error("Error fetching messages:", error);
        return [];
    }

    return (data || []).reverse();
};

export const sendMessage = async (conversationId, senderId, senderName, text) => {
    const { data, error } = await supabase
        .from("tblMessages")
        .insert([{
            conversation_id: conversationId,
            sender_id: senderId,
            sender_name: senderName,
            text: text.trim()
        }])
        .select()
        .single();

    if (error) {
        console.error("Error sending message:", error);
        return null;
    }

    await supabase
        .from("tblConversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);

    return data;
};

export const markAsRead = async (conversationId, userId) => {
    await supabase
        .from("tblConversationMembers")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_id", userId);
};

// ============================================
// BROADCAST (Admin only)
// ============================================

export const sendBroadcast = async (adminId, adminName, text) => {
    if (!isAdmin()) {
        console.error("Only admins can send broadcasts");
        return null;
    }

    let { data: broadcast } = await supabase
        .from("tblConversations")
        .select("id")
        .eq("type", "broadcast")
        .single();

    if (!broadcast) {
        const { data: newBroadcast } = await supabase
            .from("tblConversations")
            .insert([{ type: "broadcast", name: "MAC Announcements" }])
            .select()
            .single();
        broadcast = newBroadcast;
    }

    return sendMessage(broadcast.id, adminId, adminName, text);
};

// ============================================
// USERS FOR DIRECT MESSAGES
// ============================================

export const getAvailableUsers = async (excludeUserId) => {
    const { data, error } = await supabase
        .from("tblMonitoring")
        .select("id, firstname, lastname, type, tribe, image_url")
        .neq("id", excludeUserId)
        .order("firstname", { ascending: true });

    if (error) {
        console.error("Error fetching users:", error);
        return [];
    }

    return data || [];
};

// ============================================
// CLEANUP FUNCTIONS (frontend-side)
// ============================================

export const runMessageCleanup = async () => {
    try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const { data: broadcastConv } = await supabase
            .from("tblConversations")
            .select("id")
            .eq("type", "broadcast")
            .single();

        const broadcastId = broadcastConv?.id;

        let query = supabase
            .from("tblMessages")
            .delete()
            .lt("created_at", sevenDaysAgo);

        if (broadcastId) {
            query = query.neq("conversation_id", broadcastId);
        }

        await query;

        const { data: overLimit, error: rpcError } = await supabase
            .rpc("get_over_limit_conversations");

        if (rpcError) {
            console.warn("RPC not available for trim, skipping:", rpcError.message);
        } else if (overLimit) {
            for (const conv of overLimit) {
                const { data: oldMsgs } = await supabase
                    .from("tblMessages")
                    .select("id")
                    .eq("conversation_id", conv.conversation_id)
                    .order("created_at", { ascending: true })
                    .limit(200);

                if (oldMsgs?.length) {
                    await supabase
                        .from("tblMessages")
                        .delete()
                        .in("id", oldMsgs.map(m => m.id));
                }
            }
        }

        console.log("[Cleanup] Completed successfully");
    } catch (e) {
        console.log("[Cleanup] Skipped:", e.message);
    }
};

// ============================================
// REALTIME SUBSCRIPTION
// ============================================

export const subscribeToMessages = (conversationId, callback) => {
    const channel = supabase
        .channel(`messages-${conversationId}`)
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "tblMessages",
                filter: `conversation_id=eq.${conversationId}`
            },
            (payload) => {
                callback(payload.new);
            }
        )
        .subscribe();

    return () => supabase.removeChannel(channel);
};

export const subscribeToConversations = (userId, callback) => {
    const channel = supabase
        .channel(`conversations-${userId}`)
        .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "tblConversations" },
            () => callback()
        )
        .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "tblMessages" },
            () => callback()
        )
        .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "tblConversationMembers" },
            () => callback()
        )
        .subscribe();

    return () => supabase.removeChannel(channel);
};