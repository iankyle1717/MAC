import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";
import { getCurrentUser, isAdmin } from "../utils/auth";
import Swal from "sweetalert2";
import {
    getConversations,
    getMessages,
    sendMessage,
    markAsRead,
    getAvailableUsers,
    getOrCreateDirectConversation,
    sendBroadcast,
    runMessageCleanup,
    createGroupConversation,
    getConversationMembers,
    removeGroupMember,
    addGroupMembers,
    leaveGroup,
    deleteConversation
} from "../utils/messages";

// ── Theme (matches your system) ───────────────────────────────────────────
const THEME = {
    black: "#0a0a0a",
    blackLight: "#111111",
    blackCard: "#141414",
    blackElevated: "#1a1a1a",
    gold: "#c9a45c",
    goldLight: "#d4b76a",
    goldDark: "#a88b4a",
    goldMuted: "rgba(201, 164, 92, 0.15)",
    textPrimary: "#f5f5f5",
    textSecondary: "#a3a3a3",
    textMuted: "#737373",
    border: "rgba(255, 255, 255, 0.08)",
    borderGold: "rgba(201, 164, 92, 0.3)",
    gradientGold: "linear-gradient(135deg, #c9a45c 0%, #a88b4a 100%)",
    shadowGold: "0 4px 24px rgba(201, 164, 92, 0.15)",
    shadowDark: "0 4px 24px rgba(0, 0, 0, 0.4)",
    danger: "#ef4444",
    dangerMuted: "rgba(239, 68, 68, 0.15)",
};

// ── Helpers ─────────────────────────────────────────────────────────────────
const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const getAvatarGradient = (name) => {
    const colors = [
        ["#c9a45c", "#a88b4a"],
        ["#60a5fa", "#3b82f6"],
        ["#f87171", "#ef4444"],
        ["#34d399", "#10b981"],
        ["#a78bfa", "#8b5cf6"],
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const idx = Math.abs(hash) % colors.length;
    return `linear-gradient(135deg, ${colors[idx][0]} 0%, ${colors[idx][1]} 100%)`;
};

const formatTime = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
        return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
        return "Yesterday " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// De-dupe any array of records by `id`, keeping the first occurrence.
// This is the actual fix for "doubled" conversations/messages: if a query
// joins against a one-to-many table (e.g. conversation members) without a
// DISTINCT, a single group chat with 3 members can come back as 3 rows with
// the same id. Duplicate ids in a React list also break `key`, which is why
// this was showing up as flaky clicking / "can't open convo" too.
const dedupeById = (arr) => Array.from(new Map(arr.map(item => [item.id, item])).values());

// ── Avatar Component ────────────────────────────────────────────────────────
function Avatar({ name, size = 36, imageUrl }) {
    return (
        <div style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: imageUrl ? `url(${imageUrl}) center/cover` : getAvatarGradient(name),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: size > 30 ? "13px" : "10px",
            fontWeight: 800,
            color: "#fff",
            flexShrink: 0,
            border: `2px solid ${THEME.border}`,
        }}>
            {!imageUrl && getInitials(name)}
        </div>
    );
}

// ── Conversation List Item ──────────────────────────────────────────────────
function ConversationItem({ conv, isActive, currentUserId, isAdminUser, onClick, onDelete }) {
    const isDirect = conv.type === "direct";
    const isBroadcast = conv.type === "broadcast";
    const isGroup = conv.type === "group";

    let displayName = conv.name;
    let subtitle = "";

    if (isDirect && conv.otherMember) {
        displayName = `${conv.otherMember.firstname} ${conv.otherMember.lastname}`;
        subtitle = conv.otherMember.tribe || "";
    } else if (conv.type === "tribe") {
        subtitle = "Tribe Group";
    } else if (conv.type === "ministry") {
        subtitle = "Ministry Team";
    } else if (isBroadcast) {
        subtitle = "Admin Announcements";
        displayName = "MAC Announcements";
    } else if (isGroup) {
        subtitle = `${conv.memberCount || 0} members`;
        displayName = conv.name || "Group Chat";
    }

    return (
        <div
            onClick={onClick}
            style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                cursor: "pointer",
                borderRadius: "10px",
                background: isActive ? THEME.goldMuted : "transparent",
                borderLeft: isActive ? `3px solid ${THEME.gold}` : "3px solid transparent",
                transition: "all 0.2s ease",
                position: "relative",
            }}
            onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.03)";
            }}
            onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.background = "transparent";
            }}
        >
            <Avatar 
                name={displayName} 
                size={40} 
                imageUrl={isDirect ? conv.otherMember?.image_url : null} 
            />

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                    <span style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: isBroadcast ? THEME.gold : THEME.textPrimary,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}>
                        {isBroadcast && "[BROADCAST] "}{displayName}
                    </span>
                    {conv.unreadCount > 0 && (
                        <span style={{
                            padding: "2px 7px",
                            borderRadius: "10px",
                            background: THEME.gold,
                            color: THEME.black,
                            fontSize: "10px",
                            fontWeight: 800,
                            flexShrink: 0,
                        }}>
                            {conv.unreadCount}
                        </span>
                    )}
                </div>

                <p style={{
                    margin: 0,
                    fontSize: "12px",
                    color: conv.unreadCount > 0 ? THEME.textSecondary : THEME.textMuted,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    fontWeight: conv.unreadCount > 0 ? 500 : 400,
                }}>
                    {conv.lastMessage ? (
                        <>
                            <span style={{ color: conv.lastMessage.sender_id === currentUserId ? THEME.textMuted : THEME.textSecondary }}>
                                {conv.lastMessage.sender_id === currentUserId ? "You: " : `${conv.lastMessage.sender_name?.split(" ")[0]}: `}
                            </span>
                            {conv.lastMessage.text}
                        </>
                    ) : (
                        subtitle
                    )}
                </p>
            </div>

            {conv.lastMessage && !isAdminUser && (
                <span style={{
                    fontSize: "10px",
                    color: THEME.textMuted,
                    flexShrink: 0,
                }}>
                    {formatTime(conv.lastMessage.created_at)}
                </span>
            )}

            {isAdminUser && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(conv); }}
                    title="Delete conversation"
                    style={{
                        background: "none",
                        border: "none",
                        color: THEME.textMuted,
                        fontSize: "14px",
                        cursor: "pointer",
                        flexShrink: 0,
                        padding: "4px 6px",
                        borderRadius: "6px",
                        transition: "all 0.15s",
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = THEME.dangerMuted;
                        e.currentTarget.style.color = THEME.danger;
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = "none";
                        e.currentTarget.style.color = THEME.textMuted;
                    }}
                >
                    🗑
                </button>
            )}
        </div>
    );
}

// ── Message Bubble ────────────────────────────────────────────────────────
function MessageBubble({ msg, isMine, showSender }) {
    return (
        <div style={{
            display: "flex",
            justifyContent: isMine ? "flex-end" : "flex-start",
            marginBottom: "8px",
            padding: "0 4px",
        }}>
            <div style={{
                maxWidth: "70%",
                minWidth: "60px",
            }}>
                {showSender && !isMine && (
                    <p style={{
                        margin: "0 0 3px 4px",
                        fontSize: "11px",
                        color: THEME.gold,
                        fontWeight: 600,
                    }}>
                        {msg.sender_name}
                    </p>
                )}
                <div style={{
                    padding: "10px 14px",
                    borderRadius: isMine ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: isMine ? THEME.goldMuted : THEME.blackLight,
                    border: `1px solid ${isMine ? THEME.borderGold : THEME.border}`,
                    color: isMine ? THEME.goldLight : THEME.textPrimary,
                    fontSize: "13px",
                    lineHeight: 1.5,
                    wordBreak: "break-word",
                }}>
                    {msg.text}
                </div>
                <p style={{
                    margin: "3px 4px 0 4px",
                    fontSize: "10px",
                    color: THEME.textMuted,
                    textAlign: isMine ? "right" : "left",
                }}>
                    {formatTime(msg.created_at)}
                </p>
            </div>
        </div>
    );
}

// ── New Message / New Group Modal ─────────────────────────────────────────
function NewMessageModal({ show, onClose, currentUser, onStartConversation, onCreateGroup }) {
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState("direct");
    const [groupName, setGroupName] = useState("");
    const [selectedMembers, setSelectedMembers] = useState(new Set());
    const [creating, setCreating] = useState(false);
    const [starting, setStarting] = useState(false);

    useEffect(() => {
        if (!show) return;
        const fetchUsers = async () => {
            setLoading(true);
            const data = await getAvailableUsers(currentUser.id);
            setUsers(data || []);
            setLoading(false);
        };
        fetchUsers();
    }, [show, currentUser.id]);

    useEffect(() => {
        if (!show) {
            setMode("direct");
            setGroupName("");
            setSelectedMembers(new Set());
            setSearch("");
            setCreating(false);
            setStarting(false);
        }
    }, [show]);

    const filtered = users.filter(u => {
        const fullName = `${u.firstname} ${u.lastname}`.toLowerCase();
        return fullName.includes(search.toLowerCase()) ||
               u.tribe?.toLowerCase().includes(search.toLowerCase());
    });

    const toggleMember = (userId) => {
        setSelectedMembers(prev => {
            const next = new Set(prev);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    };

    // Guarded so a fast double-click can't fire onStartConversation twice.
    const handleStartClick = async (targetUser) => {
        if (starting) return;
        setStarting(true);
        await onStartConversation(targetUser);
        setStarting(false);
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim() || selectedMembers.size === 0 || creating) return;
        setCreating(true);
        const success = await onCreateGroup(groupName.trim(), Array.from(selectedMembers));
        setCreating(false);
        if (success) onClose();
        // on failure, modal stays open so the user doesn't lose their input
    };

    if (!show) return null;

    return (
        <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
            backdropFilter: "blur(8px)",
        }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{
                background: THEME.blackElevated,
                borderRadius: "16px",
                width: "100%",
                maxWidth: "420px",
                maxHeight: "85vh",
                display: "flex",
                flexDirection: "column",
                boxShadow: THEME.shadowDark,
                border: `1px solid ${THEME.border}`,
                overflow: "hidden",
            }}>
                <div style={{
                    padding: "18px 20px",
                    borderBottom: `1px solid ${THEME.border}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: THEME.textPrimary }}>
                        {mode === "direct" ? "New Message" : "New Group"}
                    </h3>
                    <button onClick={onClose} style={{
                        background: "none",
                        border: "none",
                        color: THEME.textMuted,
                        fontSize: "20px",
                        cursor: "pointer",
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}>x</button>
                </div>

                {/* Mode Toggle */}
                <div style={{
                    display: "flex",
                    padding: "12px 16px",
                    gap: "8px",
                    borderBottom: `1px solid ${THEME.border}`,
                }}>
                    <button
                        onClick={() => setMode("direct")}
                        style={{
                            flex: 1,
                            padding: "8px",
                            borderRadius: "8px",
                            background: mode === "direct" ? THEME.goldMuted : "transparent",
                            color: mode === "direct" ? THEME.gold : THEME.textMuted,
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                            border: `1px solid ${mode === "direct" ? THEME.borderGold : THEME.border}`,
                        }}
                    >
                        Direct Message
                    </button>
                    <button
                        onClick={() => setMode("group")}
                        style={{
                            flex: 1,
                            padding: "8px",
                            borderRadius: "8px",
                            background: mode === "group" ? THEME.goldMuted : "transparent",
                            color: mode === "group" ? THEME.gold : THEME.textMuted,
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                            border: `1px solid ${mode === "group" ? THEME.borderGold : THEME.border}`,
                        }}
                    >
                        Group Chat
                    </button>
                </div>

                {mode === "group" && (
                    <div style={{ padding: "12px 16px", borderBottom: `1px solid ${THEME.border}` }}>
                        <input
                            type="text"
                            placeholder="Group name..."
                            value={groupName}
                            onChange={e => setGroupName(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "10px 14px",
                                borderRadius: "10px",
                                border: `1.5px solid ${THEME.border}`,
                                background: THEME.blackLight,
                                color: THEME.textPrimary,
                                fontSize: "14px",
                                outline: "none",
                                boxSizing: "border-box",
                            }}
                            onFocus={e => { e.target.style.borderColor = THEME.gold; }}
                            onBlur={e => { e.target.style.borderColor = THEME.border; }}
                        />
                    </div>
                )}

                <div style={{ padding: "12px 16px", borderBottom: `1px solid ${THEME.border}` }}>
                    <input
                        type="text"
                        placeholder="Search by name or tribe..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "10px 14px",
                            borderRadius: "10px",
                            border: `1.5px solid ${THEME.border}`,
                            background: THEME.blackLight,
                            color: THEME.textPrimary,
                            fontSize: "14px",
                            outline: "none",
                            boxSizing: "border-box",
                        }}
                        onFocus={e => { e.target.style.borderColor = THEME.gold; }}
                        onBlur={e => { e.target.style.borderColor = THEME.border; }}
                    />
                </div>

                {mode === "group" && selectedMembers.size > 0 && (
                    <div style={{
                        padding: "8px 16px",
                        borderBottom: `1px solid ${THEME.border}`,
                        display: "flex",
                        gap: "6px",
                        flexWrap: "wrap",
                    }}>
                        {Array.from(selectedMembers).map(id => {
                            const u = users.find(user => user.id === id);
                            if (!u) return null;
                            return (
                                <span key={id} style={{
                                    padding: "4px 10px",
                                    borderRadius: "12px",
                                    background: THEME.goldMuted,
                                    color: THEME.gold,
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                }}>
                                    {u.firstname}
                                    <span
                                        onClick={() => toggleMember(id)}
                                        style={{ cursor: "pointer", fontWeight: 800 }}
                                    >x</span>
                                </span>
                            );
                        })}
                    </div>
                )}

                <div style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "8px",
                }}>
                    {loading ? (
                        <div style={{ textAlign: "center", padding: "30px" }}>
                            <div style={{
                                width: "24px",
                                height: "24px",
                                border: `2px solid ${THEME.border}`,
                                borderTopColor: THEME.gold,
                                borderRadius: "50%",
                                margin: "0 auto 10px",
                                animation: "spin 0.8s linear infinite",
                            }} />
                            <p style={{ color: THEME.textMuted, fontSize: "12px" }}>Loading...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <p style={{ textAlign: "center", color: THEME.textMuted, fontSize: "13px", padding: "20px" }}>
                            No users found
                        </p>
                    ) : (
                        filtered.map(user => (
                            <div
                                key={user.id}
                                onClick={() => mode === "direct" ? handleStartClick(user) : toggleMember(user.id)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                    padding: "10px 12px",
                                    borderRadius: "10px",
                                    cursor: mode === "direct" && starting ? "wait" : "pointer",
                                    transition: "all 0.2s",
                                    background: mode === "group" && selectedMembers.has(user.id) 
                                        ? THEME.goldMuted 
                                        : "transparent",
                                    opacity: mode === "direct" && starting ? 0.6 : 1,
                                }}
                                onMouseEnter={e => {
                                    if (!(mode === "group" && selectedMembers.has(user.id))) {
                                        e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!(mode === "group" && selectedMembers.has(user.id))) {
                                        e.currentTarget.style.background = "transparent";
                                    }
                                }}
                            >
                                <Avatar name={`${user.firstname} ${user.lastname}`} size={38} imageUrl={user.image_url} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: THEME.textPrimary }}>
                                        {user.firstname} {user.lastname}
                                    </p>
                                    <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: THEME.textMuted }}>
                                        {user.type} {user.tribe ? `· ${user.tribe}` : ""}
                                    </p>
                                </div>
                                {mode === "group" && (
                                    <div style={{
                                        width: "20px",
                                        height: "20px",
                                        borderRadius: "50%",
                                        border: `2px solid ${selectedMembers.has(user.id) ? THEME.gold : THEME.border}`,
                                        background: selectedMembers.has(user.id) ? THEME.gold : "transparent",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}>
                                        {selectedMembers.has(user.id) && (
                                            <span style={{ color: THEME.black, fontSize: "12px", fontWeight: 800 }}>x</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {mode === "group" && (
                    <div style={{ padding: "12px 16px", borderTop: `1px solid ${THEME.border}` }}>
                        <button
                            onClick={handleCreateGroup}
                            disabled={!groupName.trim() || selectedMembers.size === 0 || creating}
                            style={{
                                width: "100%",
                                padding: "12px",
                                borderRadius: "10px",
                                border: "none",
                                background: groupName.trim() && selectedMembers.size > 0 ? THEME.gradientGold : THEME.border,
                                color: groupName.trim() && selectedMembers.size > 0 ? THEME.black : THEME.textMuted,
                                fontWeight: 700,
                                fontSize: "14px",
                                cursor: groupName.trim() && selectedMembers.size > 0 && !creating ? "pointer" : "not-allowed",
                                opacity: creating ? 0.7 : 1,
                            }}
                        >
                            {creating ? "Creating..." : `Create Group (${selectedMembers.size})`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Group Members Modal ───────────────────────────────────────────────────
function GroupMembersModal({ show, onClose, conversationId, currentUser, isCreator }) {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!show || !conversationId) return;
        const fetchMembers = async () => {
            setLoading(true);
            const data = await getConversationMembers(conversationId);
            setMembers(dedupeById(data || []));
            setLoading(false);
        };
        fetchMembers();
    }, [show, conversationId]);

    const handleRemove = async (memberId) => {
        const success = await removeGroupMember(conversationId, memberId, currentUser.id);
        if (success) {
            setMembers(prev => prev.filter(m => m.id !== memberId));
        }
    };

    const handleLeave = async () => {
        const success = await leaveGroup(conversationId, currentUser.id);
        if (success) {
            onClose();
            window.location.reload();
        }
    };

    if (!show) return null;

    return (
        <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
            backdropFilter: "blur(8px)",
        }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{
                background: THEME.blackElevated,
                borderRadius: "16px",
                width: "100%",
                maxWidth: "360px",
                maxHeight: "70vh",
                display: "flex",
                flexDirection: "column",
                boxShadow: THEME.shadowDark,
                border: `1px solid ${THEME.border}`,
                overflow: "hidden",
            }}>
                <div style={{
                    padding: "18px 20px",
                    borderBottom: `1px solid ${THEME.border}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: THEME.textPrimary }}>
                        Members ({members.length})
                    </h3>
                    <button onClick={onClose} style={{
                        background: "none",
                        border: "none",
                        color: THEME.textMuted,
                        fontSize: "20px",
                        cursor: "pointer",
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}>x</button>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                    {loading ? (
                        <div style={{ textAlign: "center", padding: "30px" }}>
                            <div style={{
                                width: "24px",
                                height: "24px",
                                border: `2px solid ${THEME.border}`,
                                borderTopColor: THEME.gold,
                                borderRadius: "50%",
                                margin: "0 auto 10px",
                                animation: "spin 0.8s linear infinite",
                            }} />
                        </div>
                    ) : (
                        members.map(member => (
                            <div key={member.id} style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                padding: "10px 12px",
                                borderRadius: "10px",
                            }}>
                                <Avatar name={`${member.firstname} ${member.lastname}`} size={34} imageUrl={member.image_url} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: THEME.textPrimary }}>
                                        {member.firstname} {member.lastname}
                                        {member.id === currentUser.id && (
                                            <span style={{ color: THEME.textMuted, fontWeight: 400, fontSize: "11px" }}> (You)</span>
                                        )}
                                    </p>
                                    <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: THEME.textMuted }}>
                                        {member.type} {member.tribe ? `· ${member.tribe}` : ""}
                                    </p>
                                </div>
                                {(isCreator || isAdmin()) && member.id !== currentUser.id && (
                                    <button
                                        onClick={() => handleRemove(member.id)}
                                        style={{
                                            padding: "4px 10px",
                                            borderRadius: "6px",
                                            border: `1px solid ${THEME.danger}`,
                                            background: THEME.dangerMuted,
                                            color: THEME.danger,
                                            fontSize: "11px",
                                            fontWeight: 600,
                                            cursor: "pointer",
                                        }}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {!isCreator && (
                    <div style={{ padding: "12px 16px", borderTop: `1px solid ${THEME.border}` }}>
                        <button
                            onClick={handleLeave}
                            style={{
                                width: "100%",
                                padding: "10px",
                                borderRadius: "8px",
                                border: `1px solid ${THEME.danger}`,
                                background: THEME.dangerMuted,
                                color: THEME.danger,
                                fontSize: "13px",
                                fontWeight: 600,
                                cursor: "pointer",
                            }}
                        >
                            Leave Group
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Broadcast Modal (Admin only) ──────────────────────────────────────────
function BroadcastModal({ show, onClose, currentUser, onSend }) {
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);

    if (!show) return null;

    const handleSend = async () => {
        if (!text.trim() || sending) return;
        setSending(true);
        await onSend(text.trim());
        setSending(false);
        setText("");
        onClose();
    };

    return (
        <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
            backdropFilter: "blur(8px)",
        }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{
                background: THEME.blackElevated,
                borderRadius: "16px",
                width: "100%",
                maxWidth: "480px",
                boxShadow: THEME.shadowDark,
                border: `1px solid ${THEME.borderGold}`,
                overflow: "hidden",
            }}>
                <div style={{
                    padding: "18px 20px",
                    borderBottom: `1px solid ${THEME.border}`,
                    background: "rgba(201,164,92,0.08)",
                }}>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: THEME.gold }}>
                        Broadcast Announcement
                    </h3>
                    <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: THEME.textMuted }}>
                        This will be sent to all MAC members
                    </p>
                </div>

                <div style={{ padding: "20px" }}>
                    <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder="Type your announcement..."
                        rows={5}
                        style={{
                            width: "100%",
                            padding: "12px 14px",
                            borderRadius: "10px",
                            border: `1.5px solid ${THEME.border}`,
                            background: THEME.blackLight,
                            color: THEME.textPrimary,
                            fontSize: "14px",
                            outline: "none",
                            resize: "vertical",
                            fontFamily: "inherit",
                            boxSizing: "border-box",
                        }}
                        onFocus={e => { e.target.style.borderColor = THEME.gold; }}
                        onBlur={e => { e.target.style.borderColor = THEME.border; }}
                    />

                    <button
                        onClick={handleSend}
                        disabled={sending || !text.trim()}
                        style={{
                            width: "100%",
                            padding: "12px",
                            marginTop: "12px",
                            borderRadius: "10px",
                            border: "none",
                            background: THEME.gradientGold,
                            color: THEME.black,
                            fontWeight: 700,
                            fontSize: "14px",
                            cursor: sending ? "not-allowed" : "pointer",
                            opacity: sending ? 0.6 : 1,
                        }}
                    >
                        {sending ? "Sending..." : "Send Broadcast"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Messages Component ───────────────────────────────────────────────
function Messages() {
    const navigate = useNavigate();
    const user = getCurrentUser();
    const admin = isAdmin();

    const [conversations, setConversations] = useState([]);
    const [activeConvId, setActiveConvId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [showNewMsg, setShowNewMsg] = useState(false);
    const [showBroadcast, setShowBroadcast] = useState(false);
    const [showMembers, setShowMembers] = useState(false);
    const [otherMember, setOtherMember] = useState(null);

    // MOBILE: track viewport so we can show either the conversation list OR
    // the active chat (never both squeezed side by side, which is what was
    // causing the broken/misaligned mobile layout).
    const [isMobile, setIsMobile] = useState(
        typeof window !== "undefined" ? window.innerWidth < 768 : false
    );
    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const activeConvIdRef = useRef(null);

    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const inputRef = useRef(null);

    // Keep ref in sync
    useEffect(() => {
        activeConvIdRef.current = activeConvId;
    }, [activeConvId]);

    // Redirect if not logged in
    useEffect(() => {
        if (!user) {
            navigate("/login");
        }
    }, [user, navigate]);

    // ── AUTO-CLEANUP: Run once on mount ──────────────────────────────────
    useEffect(() => {
        runMessageCleanup();
    }, []);

    // Fetch conversations. De-duped by id — this is what stops group chats
    // (or anything joined against a members table) from showing up more than
    // once in the sidebar.
    const fetchConversations = useCallback(async () => {
        if (!user) return;
        const convs = await getConversations(user.id);
        const uniqueConvs = dedupeById(convs || []);

        const enrichedConvs = await Promise.all(uniqueConvs.map(async (conv) => {
            if (conv.type === "direct") {
                const { data } = await supabase
                    .from("tblConversationMembers")
                    .select("user_id")
                    .eq("conversation_id", conv.id)
                    .neq("user_id", user.id)
                    .single();

                if (data) {
                    const { data: member } = await supabase
                        .from("tblMonitoring")
                        .select("id, firstname, lastname, tribe, image_url")
                        .eq("id", data.user_id)
                        .single();

                    if (member) {
                        return { ...conv, otherMember: member };
                    }
                }
            }
            return conv;
        }));

        setConversations(enrichedConvs);
        setLoading(false);
    }, [user]);

    // Initial load
    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    // SINGLE sync mechanism: poll the conversation list every 3 seconds.
    // (We intentionally do NOT also run a realtime subscription here —
    // running both was the two-systems-writing-the-same-state problem that
    // caused flicker/duplication. Polling alone is simpler and reliable
    // regardless of whether Supabase Realtime is configured correctly.)
    useEffect(() => {
        if (!user) return;
        const interval = setInterval(() => {
            fetchConversations();
        }, 3000);
        return () => clearInterval(interval);
    }, [user, fetchConversations]);

    // Fetch + poll messages for the active conversation.
    useEffect(() => {
        if (!activeConvId) return;

        let isActive = true;
        const currentConvId = activeConvId;

        const loadMessages = async () => {
            const msgs = await getMessages(currentConvId, 100);
            if (!isActive || activeConvIdRef.current !== currentConvId) return;

            setMessages(dedupeById(msgs || []));
            await markAsRead(currentConvId, user.id);

            const activeConv = conversations.find(c => c.id === currentConvId);
            setOtherMember(activeConv?.type === "direct" ? (activeConv.otherMember || null) : null);
        };

        loadMessages();

        // Poll for new messages every 3 seconds. New messages are merged in
        // by id, so this never causes duplicates or disrupts what's already
        // on screen.
        const pollInterval = setInterval(async () => {
            if (!isActive || activeConvIdRef.current !== currentConvId) return;
            const latest = await getMessages(currentConvId, 100);
            if (!isActive || activeConvIdRef.current !== currentConvId) return;
            setMessages(prev => {
                const existingIds = new Set(prev.map(m => m.id));
                const hasNew = (latest || []).some(m => !existingIds.has(m.id));
                return hasNew ? dedupeById(latest) : prev;
            });
        }, 3000);

        return () => {
            isActive = false;
            clearInterval(pollInterval);
        };
    }, [activeConvId, user?.id]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        if (!inputText.trim() || !activeConvId || sending) return;

        setSending(true);
        const text = inputText.trim();
        setInputText("");

        const msg = await sendMessage(activeConvId, user.id, `${user.firstname} ${user.lastname}`, text);
        if (msg) {
            setMessages(prev => (prev.find(m => m.id === msg.id) ? prev : [...prev, msg]));
        }
        setSending(false);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Switch conversation — a plain state update. No debounce lock: clicking
    // the same conversation twice is a no-op already, and clicking two
    // different conversations quickly is fine since setActiveConvId just
    // takes the latest value.
    const handleSwitchConversation = useCallback((convId) => {
        setActiveConvId(prev => (prev === convId ? prev : convId));
    }, []);

    const handleBackToList = useCallback(() => {
        setActiveConvId(null);
    }, []);

    const handleStartConversation = async (targetUser) => {
        const conv = await getOrCreateDirectConversation(user.id, targetUser.id);
        if (conv) {
            setShowNewMsg(false);
            await fetchConversations();
            setActiveConvId(conv.id);
        } else {
            Swal.fire({
                icon: "error",
                title: "Couldn't Start Conversation",
                text: "Something went wrong. Please try again.",
                confirmButtonColor: "#c9a45c"
            });
        }
    };

    // createGroupConversation returns { success, conversation, error, stage }.
    // We surface the REAL database error message here so you see exactly why
    // it failed (RLS, a foreign key pointing at the wrong table, a check
    // constraint on `type`, etc) instead of a generic "something went wrong."
    const handleCreateGroup = async (name, memberIds) => {
        const result = await createGroupConversation(name, user.id, memberIds);
        if (result.success) {
            await fetchConversations();
            setActiveConvId(result.conversation.id);
            return true;
        }

        const stageLabel = result.stage === "conversation"
            ? "Creating the group record failed"
            : "Adding members failed";

        Swal.fire({
            icon: "error",
            title: "Group Not Created",
            html: `<div style="text-align:left"><strong>${stageLabel}:</strong><br/><code style="font-size:12px;word-break:break-word;">${result.error || "Unknown error"}</code></div>`,
            confirmButtonColor: "#c9a45c"
        });
        return false;
    };

    const handleBroadcast = async (text) => {
        await sendBroadcast(user.id, `${user.firstname} ${user.lastname}`, text);
        await fetchConversations();
    };

    // Admin-only delete conversation, with confirmation
    const handleDeleteConversation = async (conv) => {
        const label = conv.type === "direct"
            ? (conv.otherMember ? `${conv.otherMember.firstname} ${conv.otherMember.lastname}` : "this conversation")
            : (conv.name || "this conversation");

        const result = await Swal.fire({
            icon: "warning",
            title: "Delete conversation?",
            text: `This permanently deletes all messages in "${label}". This cannot be undone.`,
            showCancelButton: true,
            confirmButtonColor: "#dc2626",
            cancelButtonColor: "#6b7280",
            confirmButtonText: "Delete",
        });

        if (!result.isConfirmed) return;

        const success = await deleteConversation(conv.id);
        if (success) {
            if (activeConvId === conv.id) setActiveConvId(null);
            await fetchConversations();
        } else {
            Swal.fire({
                icon: "error",
                title: "Delete Failed",
                text: "Something went wrong deleting this conversation.",
                confirmButtonColor: "#c9a45c"
            });
        }
    };

    const activeConv = conversations.find(c => c.id === activeConvId);
    const isGroupChat = activeConv?.type === "group";
    const isGroupCreator = isGroupChat && activeConv?.created_by === user?.id;

    const chatTitle = activeConv?.type === "direct" && otherMember
        ? `${otherMember.firstname} ${otherMember.lastname}`
        : activeConv?.name || "Select a conversation";

    const chatSubtitle = activeConv?.type === "direct" && otherMember
        ? otherMember.tribe || ""
        : activeConv?.type === "tribe" ? "Tribe Group" 
        : activeConv?.type === "ministry" ? "Ministry Team"
        : activeConv?.type === "broadcast" ? "All Members"
        : isGroupChat ? `${activeConv?.memberCount || 0} members`
        : "";

    // On mobile: show the list only when no chat is open, and the chat only
    // when one is open. On desktop: always show both side by side.
    const showListPane = !isMobile || !activeConvId;
    const showChatPane = !isMobile || !!activeConvId;

    return (
        <div className="layout" style={{ background: THEME.black, minHeight: "100vh" }}>
            <Sidebar />

            <div className="content" style={{
                padding: 0,
                display: "flex",
                height: "100vh",
                overflow: "hidden",
            }}>
                {/* ── LEFT SIDEBAR: Conversation List ────────────────────── */}
                {showListPane && (
                    <div style={{
                        width: isMobile ? "100%" : "320px",
                        minWidth: isMobile ? "100%" : "320px",
                        background: THEME.blackCard,
                        borderRight: `1px solid ${THEME.border}`,
                        display: "flex",
                        flexDirection: "column",
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: "18px 16px",
                            borderBottom: `1px solid ${THEME.border}`,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}>
                            <h2 style={{
                                margin: 0,
                                fontSize: "18px",
                                fontWeight: 800,
                                color: THEME.textPrimary,
                                letterSpacing: "-0.3px",
                            }}>
                                MAC-MESSAGE
                            </h2>
                            <div style={{ display: "flex", gap: "8px" }}>
                                {admin && (
                                    <button
                                        onClick={() => setShowBroadcast(true)}
                                        title="Broadcast"
                                        style={{
                                            width: "32px",
                                            height: "32px",
                                            borderRadius: "8px",
                                            border: `1px solid ${THEME.borderGold}`,
                                            background: "rgba(201,164,92,0.1)",
                                            color: THEME.gold,
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "14px",
                                            fontWeight: 700,
                                        }}
                                    >
                                        !
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowNewMsg(true)}
                                    style={{
                                        width: "32px",
                                        height: "32px",
                                        borderRadius: "8px",
                                        border: "none",
                                        background: THEME.gradientGold,
                                        color: THEME.black,
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "18px",
                                        fontWeight: 700,
                                    }}
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Conversation List */}
                        <div style={{
                            flex: 1,
                            overflowY: "auto",
                            padding: "8px",
                        }}>
                            {loading ? (
                                <div style={{ textAlign: "center", padding: "40px" }}>
                                    <div style={{
                                        width: "24px",
                                        height: "24px",
                                        border: `2px solid ${THEME.border}`,
                                        borderTopColor: THEME.gold,
                                        borderRadius: "50%",
                                        margin: "0 auto 10px",
                                        animation: "spin 0.8s linear infinite",
                                    }} />
                                    <p style={{ color: THEME.textMuted, fontSize: "12px" }}>Loading...</p>
                                </div>
                            ) : conversations.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "40px 20px" }}>
                                    <p style={{ color: THEME.textMuted, fontSize: "13px", margin: "0 0 12px 0" }}>
                                        No conversations yet
                                    </p>
                                    <button
                                        onClick={() => setShowNewMsg(true)}
                                        style={{
                                            padding: "10px 20px",
                                            borderRadius: "10px",
                                            border: `1px solid ${THEME.gold}`,
                                            background: "transparent",
                                            color: THEME.gold,
                                            fontSize: "12px",
                                            fontWeight: 600,
                                            cursor: "pointer",
                                        }}
                                    >
                                        Start a conversation
                                    </button>
                                </div>
                            ) : (
                                conversations.map(conv => (
                                    <ConversationItem
                                        key={conv.id}
                                        conv={conv}
                                        isActive={conv.id === activeConvId}
                                        currentUserId={user?.id}
                                        isAdminUser={admin}
                                        onClick={() => handleSwitchConversation(conv.id)}
                                        onDelete={handleDeleteConversation}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* ── RIGHT: Chat Area ─────────────────────────────────── */}
                {showChatPane && (
                    <div style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        background: THEME.black,
                        width: isMobile ? "100%" : undefined,
                        minWidth: 0,
                    }}>
                        {activeConvId ? (
                            <>
                                {/* Chat Header */}
                                <div style={{
                                    padding: "14px 20px",
                                    borderBottom: `1px solid ${THEME.border}`,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                    background: THEME.blackCard,
                                }}>
                                    {isMobile && (
                                        <button
                                            onClick={handleBackToList}
                                            aria-label="Back to conversations"
                                            style={{
                                                width: "32px",
                                                height: "32px",
                                                borderRadius: "8px",
                                                border: `1px solid ${THEME.border}`,
                                                background: "transparent",
                                                color: THEME.textSecondary,
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: "16px",
                                                flexShrink: 0,
                                            }}
                                        >
                                            ←
                                        </button>
                                    )}
                                    <Avatar 
                                        name={chatTitle} 
                                        size={38} 
                                        imageUrl={otherMember?.image_url} 
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h3 style={{
                                            margin: 0,
                                            fontSize: "15px",
                                            fontWeight: 700,
                                            color: THEME.textPrimary,
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                        }}>
                                            {chatTitle}
                                        </h3>
                                        {chatSubtitle && (
                                            <p style={{
                                                margin: "2px 0 0 0",
                                                fontSize: "11px",
                                                color: THEME.textMuted,
                                            }}>
                                                {chatSubtitle}
                                            </p>
                                        )}
                                    </div>
                                    {isGroupChat && (
                                        <button
                                            onClick={() => setShowMembers(true)}
                                            style={{
                                                padding: "6px 12px",
                                                borderRadius: "8px",
                                                border: `1px solid ${THEME.border}`,
                                                background: "transparent",
                                                color: THEME.textSecondary,
                                                fontSize: "12px",
                                                fontWeight: 600,
                                                cursor: "pointer",
                                                flexShrink: 0,
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            Members
                                        </button>
                                    )}
                                </div>

                                {/* Messages */}
                                <div
                                    ref={messagesContainerRef}
                                    style={{
                                        flex: 1,
                                        overflowY: "auto",
                                        padding: "16px 20px",
                                        display: "flex",
                                        flexDirection: "column",
                                        scrollbarWidth: "thin",
                                        scrollbarColor: `${THEME.border} transparent`,
                                    }}
                                >
                                    {messages.length === 0 ? (
                                        <div style={{
                                            flex: 1,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}>
                                            <p style={{ color: THEME.textMuted, fontSize: "13px" }}>
                                                No messages yet. Start the conversation!
                                            </p>
                                        </div>
                                    ) : (
                                        messages.map((msg, idx) => {
                                            const isMine = msg.sender_id === user?.id;
                                            const showSender = activeConv?.type !== "direct" && !isMine;
                                            const prevMsg = idx > 0 ? messages[idx - 1] : null;
                                            const showName = showSender && (!prevMsg || prevMsg.sender_id !== msg.sender_id);

                                            return (
                                                <MessageBubble
                                                    key={msg.id}
                                                    msg={msg}
                                                    isMine={isMine}
                                                    showSender={showName}
                                                />
                                            );
                                        })
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input */}
                                <div style={{
                                    padding: "12px 20px",
                                    borderTop: `1px solid ${THEME.border}`,
                                    background: THEME.blackCard,
                                }}>
                                    <div style={{
                                        display: "flex",
                                        gap: "10px",
                                        alignItems: "flex-end",
                                    }}>
                                        <textarea
                                            ref={inputRef}
                                            value={inputText}
                                            onChange={e => setInputText(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Type a message..."
                                            rows={1}
                                            style={{
                                                flex: 1,
                                                padding: "10px 14px",
                                                borderRadius: "20px",
                                                border: `1.5px solid ${THEME.border}`,
                                                background: THEME.blackLight,
                                                color: THEME.textPrimary,
                                                fontSize: "14px",
                                                outline: "none",
                                                resize: "none",
                                                maxHeight: "120px",
                                                fontFamily: "inherit",
                                                lineHeight: 1.4,
                                                minWidth: 0,
                                            }}
                                            onFocus={e => { e.target.style.borderColor = THEME.gold; }}
                                            onBlur={e => { e.target.style.borderColor = THEME.border; }}
                                        />
                                        <button
                                            onClick={handleSend}
                                            disabled={sending || !inputText.trim()}
                                            style={{
                                                width: "40px",
                                                height: "40px",
                                                borderRadius: "50%",
                                                border: "none",
                                                background: inputText.trim() ? THEME.gradientGold : THEME.border,
                                                color: inputText.trim() ? THEME.black : THEME.textMuted,
                                                cursor: inputText.trim() ? "pointer" : "not-allowed",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: "16px",
                                                fontWeight: 700,
                                                flexShrink: 0,
                                                transition: "all 0.2s",
                                            }}
                                        >
                                            &gt;
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* Empty State */
                            <div style={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                color: THEME.textMuted,
                                padding: "20px",
                                textAlign: "center",
                            }}>
                                <div style={{
                                    width: "60px",
                                    height: "60px",
                                    borderRadius: "50%",
                                    background: THEME.blackLight,
                                    border: `2px solid ${THEME.border}`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    marginBottom: "16px",
                                }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={THEME.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                    </svg>
                                </div>
                                <p style={{ fontSize: "15px", fontWeight: 600, color: THEME.textSecondary, margin: "0 0 6px 0" }}>
                                    Select a conversation
                                </p>
                                <p style={{ fontSize: "12px", color: THEME.textMuted, margin: 0 }}>
                                    or start a new message from the sidebar
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modals */}
            <NewMessageModal
                show={showNewMsg}
                onClose={() => setShowNewMsg(false)}
                currentUser={user}
                onStartConversation={handleStartConversation}
                onCreateGroup={handleCreateGroup}
            />

            {admin && (
                <BroadcastModal
                    show={showBroadcast}
                    onClose={() => setShowBroadcast(false)}
                    currentUser={user}
                    onSend={handleBroadcast}
                />
            )}

            {isGroupChat && (
                <GroupMembersModal
                    show={showMembers}
                    onClose={() => setShowMembers(false)}
                    conversationId={activeConvId}
                    currentUser={user}
                    isCreator={isGroupCreator}
                />
            )}

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

export default Messages;