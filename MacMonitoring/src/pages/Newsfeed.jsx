import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";
import { getCurrentUser, getNewcomer, isAdmin } from "../utils/auth";
import Swal from "sweetalert2";

// ── Color Theme (matches Dashboard) ──────────────────────────────────────────
const THEME = {
    black: "#0a0a0a",
    blackLight: "#111111",
    blackCard: "#141414",
    blackElevated: "#1a1a1a",
    gold: "#c9a45c",
    goldLight: "#d4b76a",
    goldDark: "#a88b4a",
    goldMuted: "rgba(201, 164, 92, 0.15)",
    darkBlue: "#0f172a",
    darkBlueLight: "#1e293b",
    darkBlueAccent: "#1e3a5f",
    textPrimary: "#f5f5f5",
    textSecondary: "#a3a3a3",
    textMuted: "#737373",
    border: "rgba(255, 255, 255, 0.08)",
    borderGold: "rgba(201, 164, 92, 0.3)",
    gradientGold: "linear-gradient(135deg, #c9a45c 0%, #a88b4a 100%)",
    gradientDark: "linear-gradient(180deg, #0f172a 0%, #0a0a0a 100%)",
    shadowGold: "0 4px 24px rgba(201, 164, 92, 0.15)",
    shadowDark: "0 4px 24px rgba(0, 0, 0, 0.4)",
};

// ── Constants ──────────────────────────────────────────────────────────────
const STORAGE_BUCKET = "leader-images";
const MAX_FILE_SIZE_MB = 5;
const MAX_IMAGE_PX = 1400;
const MOMENT_DURATION_HOURS = 72; // 3 days

// ── Reaction Types ─────────────────────────────────────────────────────────
const REACTION_TYPES = [
    { emoji: "❤️", label: "love", color: "#f87171" },
    { emoji: "😂", label: "laugh", color: "#fbbf24" },
    { emoji: "🔥", label: "fire", color: "#f97316" },
    { emoji: "🙏", label: "pray", color: "#60a5fa" },
    { emoji: "👏", label: "clap", color: "#a78bfa" },
];

// ── Image compression ──────────────────────────────────────────────────────
const compressImage = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let { width, height } = img;
                if (width > MAX_IMAGE_PX || height > MAX_IMAGE_PX) {
                    if (width > height) {
                        height = Math.round((height * MAX_IMAGE_PX) / width);
                        width = MAX_IMAGE_PX;
                    } else {
                        width = Math.round((width * MAX_IMAGE_PX) / height);
                        height = MAX_IMAGE_PX;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(
                    (blob) => blob ? resolve(new File([blob], "moment.jpg", { type: "image/jpeg" })) : reject(new Error("Compression failed")),
                    "image/jpeg",
                    0.82
                );
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

const getStoragePathFromUrl = (url) => {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split(`/object/public/${STORAGE_BUCKET}/`);
        if (pathParts.length === 2) return pathParts[1];
        const segments = urlObj.pathname.split("/");
        const bucketIndex = segments.indexOf(STORAGE_BUCKET);
        if (bucketIndex !== -1 && segments[bucketIndex + 1])
            return segments.slice(bucketIndex + 1).join("/");
    } catch { return null; }
    return null;
};

const deleteOldImage = async (url) => {
    const path = getStoragePathFromUrl(url);
    if (path) await supabase.storage.from(STORAGE_BUCKET).remove([path]);
};

// ── Helpers ───────────────────────────────────────────────────────────────
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
        ["#f472b6", "#ec4899"],
        ["#fb923c", "#f97316"],
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const idx = Math.abs(hash) % colors.length;
    return `linear-gradient(135deg, ${colors[idx][0]} 0%, ${colors[idx][1]} 100%)`;
};

const timeAgo = (ts) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
};

const formatExpiry = (expiresAt) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hrs > 0) return `${hrs}h ${mins}m left`;
    return `${mins}m left`;
};

// ── Create Moment Modal ────────────────────────────────────────────────────
function CreateMomentModal({ show, onClose, onSave }) {
    const [caption, setCaption] = useState("");
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState("");
    const [saving, setSaving] = useState(false);
    const fileRef = useRef();

    useEffect(() => {
        if (!show) {
            setCaption("");
            setImageFile(null);
            setImagePreview("");
        }
    }, [show]);

    const handleImage = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImagePreview(URL.createObjectURL(file));
        try {
            const compressed = await compressImage(file);
            setImageFile(compressed);
        } catch {
            setImageFile(file);
        }
    };

    const handleSave = async () => {
        if (!caption.trim() && !imageFile) {
            Swal.fire({
                icon: "warning", title: "Empty moment",
                text: "Add a caption or an image to post.",
                confirmButtonColor: THEME.gold,
                background: THEME.blackCard, color: THEME.textPrimary
            });
            return;
        }
        setSaving(true);

        let imageUrl = null;
        if (imageFile) {
            const sizeMB = imageFile.size / (1024 * 1024);
            if (sizeMB > MAX_FILE_SIZE_MB) {
                Swal.fire({
                    icon: "error", title: "Image too large",
                    text: `Max ${MAX_FILE_SIZE_MB}MB. Please choose a smaller image.`,
                    confirmButtonColor: THEME.gold,
                    background: THEME.blackCard, color: THEME.textPrimary
                });
                setSaving(false); return;
            }
            const fileName = `moments/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
            const { error: uploadErr } = await supabase.storage.from(STORAGE_BUCKET).upload(fileName, imageFile);
            if (uploadErr) {
                Swal.fire({
                    icon: "error", title: "Upload failed",
                    text: uploadErr.message,
                    confirmButtonColor: THEME.gold,
                    background: THEME.blackCard, color: THEME.textPrimary
                });
                setSaving(false); return;
            }
            const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
            imageUrl = data.publicUrl;
        }

        const expiresAt = new Date(Date.now() + MOMENT_DURATION_HOURS * 3600000).toISOString();
        await onSave({ caption: caption.trim() || null, image_url: imageUrl, expires_at: expiresAt });
        setSaving(false);
        onClose();
    };

    if (!show) return null;

    const inp = {
        width: "100%", padding: "12px 14px", fontSize: "14px",
        borderRadius: "10px", border: `1.5px solid ${THEME.border}`,
        outline: "none", boxSizing: "border-box", background: THEME.blackLight,
        color: THEME.textPrimary, transition: "border-color 0.2s, box-shadow 0.2s",
        fontFamily: "inherit", resize: "vertical"
    };

    return (
        <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: "20px", backdropFilter: "blur(8px)"
        }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{
                background: THEME.blackElevated, borderRadius: "16px", width: "100%",
                maxWidth: "520px", maxHeight: "92vh", overflow: "auto",
                boxShadow: THEME.shadowDark, border: `1px solid ${THEME.border}`
            }}>
                {/* Header */}
                <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "20px 24px", borderBottom: `1px solid ${THEME.border}`,
                    position: "sticky", top: 0, background: THEME.blackElevated, zIndex: 10,
                    borderRadius: "16px 16px 0 0"
                }}>
                    <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: THEME.textPrimary }}>
                        Share a Moment
                    </h2>
                    <button onClick={onClose} style={{
                        background: "none", border: "none", fontSize: "20px", cursor: "pointer",
                        color: THEME.textMuted, width: "32px", height: "32px", borderRadius: "8px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "background 0.2s"
                    }} onMouseEnter={e => e.currentTarget.style.background = THEME.goldMuted}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>×</button>
                </div>

                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                    {/* Caption */}
                    <div>
                        <label style={{
                            fontSize: "11px", fontWeight: 700, color: THEME.textSecondary,
                            textTransform: "uppercase", letterSpacing: "0.8px", display: "block", marginBottom: "8px"
                        }}>What&apos;s on your mind?</label>
                        <textarea
                            value={caption}
                            onChange={e => setCaption(e.target.value)}
                            placeholder="Share something with the MAC family..."
                            rows={4}
                            style={inp}
                            onFocus={e => { e.target.style.borderColor = THEME.gold; e.target.style.boxShadow = `0 0 0 3px ${THEME.goldMuted}`; }}
                            onBlur={e => { e.target.style.borderColor = THEME.border; e.target.style.boxShadow = "none"; }}
                        />
                    </div>

                    {/* Image */}
                    <div>
                        <label style={{
                            fontSize: "11px", fontWeight: 700, color: THEME.textSecondary,
                            textTransform: "uppercase", letterSpacing: "0.8px", display: "block", marginBottom: "8px"
                        }}>Photo (optional)</label>
                        {imagePreview && (
                            <div style={{ marginBottom: "10px", position: "relative", width: "fit-content" }}>
                                <img src={imagePreview} alt="Preview" style={{
                                    maxWidth: "100%", maxHeight: "200px", borderRadius: "10px",
                                    objectFit: "cover", border: `1px solid ${THEME.border}`
                                }} />
                                <button onClick={() => { setImageFile(null); setImagePreview(""); if (fileRef.current) fileRef.current.value = ""; }}
                                    style={{
                                        position: "absolute", top: "8px", right: "8px", width: "28px", height: "28px",
                                        borderRadius: "50%", border: `1px solid ${THEME.border}`,
                                        background: "rgba(10, 10, 10, 0.85)", color: THEME.textPrimary,
                                        fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                                        backdropFilter: "blur(4px)"
                                    }}>×</button>
                            </div>
                        )}
                        <input ref={fileRef} type="file" accept="image/*" onChange={handleImage}
                            style={{ fontSize: "13px", color: THEME.textMuted }} />
                        <p style={{ fontSize: "11px", color: THEME.textMuted, margin: "6px 0 0 0" }}>
                            Auto-compressed before upload. Max {MAX_FILE_SIZE_MB}MB. Post expires in 3 days.
                        </p>
                    </div>

                    <button onClick={handleSave} disabled={saving} style={{
                        padding: "14px", borderRadius: "12px", border: "none",
                        background: THEME.gradientGold,
                        color: THEME.black, fontWeight: 800, fontSize: "14px",
                        cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
                        marginTop: "6px", transition: "all 0.2s", letterSpacing: "0.3px",
                        boxShadow: saving ? "none" : THEME.shadowGold
                    }}>
                        {saving ? "Posting..." : "Post Moment"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Reaction Bar ────────────────────────────────────────────────────────────
function ReactionBar({ momentId, reactions, userId, onReact, canInteract }) {
    const [showPicker, setShowPicker] = useState(false);
    const pickerRef = useRef();

    useEffect(() => {
        const handleClick = (e) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target)) {
                setShowPicker(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    // Count reactions
    const reactionCounts = {};
    let userReaction = null;
    reactions.forEach(r => {
        reactionCounts[r.reaction] = (reactionCounts[r.reaction] || 0) + 1;
        if (r.user_id === userId) userReaction = r.reaction;
    });

    const totalReactions = reactions.length;

    return (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {/* Existing reactions */}
            {Object.entries(reactionCounts).map(([emoji, count]) => {
                const meta = REACTION_TYPES.find(r => r.emoji === emoji) || { color: THEME.textMuted };
                const isMine = userReaction === emoji;
                return (
                    <button
                        key={emoji}
                        onClick={() => canInteract && onReact(momentId, emoji)}
                        style={{
                            display: "flex", alignItems: "center", gap: "4px",
                            padding: "4px 10px", borderRadius: "16px", border: `1.5px solid`,
                            borderColor: isMine ? meta.color : THEME.border,
                            background: isMine ? `${meta.color}20` : "transparent",
                            color: isMine ? meta.color : THEME.textSecondary,
                            fontSize: "13px", cursor: canInteract ? "pointer" : "default", transition: "all 0.2s",
                            fontWeight: isMine ? 700 : 500,
                            opacity: canInteract ? 1 : 0.7
                        }}
                        onMouseEnter={e => { if (canInteract && !isMine) { e.currentTarget.style.borderColor = meta.color; e.currentTarget.style.color = meta.color; } }}
                        onMouseLeave={e => { if (canInteract && !isMine) { e.currentTarget.style.borderColor = THEME.border; e.currentTarget.style.color = THEME.textSecondary; } }}
                    >
                        <span>{emoji}</span>
                        <span>{count}</span>
                    </button>
                );
            })}

            {/* Add reaction button */}
            {canInteract && (
                <div ref={pickerRef} style={{ position: "relative" }}>
                    <button
                        onClick={() => setShowPicker(!showPicker)}
                        style={{
                            padding: "4px 10px", borderRadius: "16px", border: `1.5px solid ${THEME.border}`,
                            background: "transparent", color: THEME.textMuted, fontSize: "13px",
                            cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: "4px"
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = THEME.gold; e.currentTarget.style.color = THEME.gold; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = THEME.border; e.currentTarget.style.color = THEME.textMuted; }}
                    >
                        {userReaction ? "✎" : "+"} React
                    </button>

                    {showPicker && (
                        <div style={{
                            position: "absolute", bottom: "calc(100% + 8px)", left: 0,
                            display: "flex", gap: "6px", padding: "8px",
                            background: THEME.blackElevated, borderRadius: "12px",
                            border: `1px solid ${THEME.border}`, boxShadow: THEME.shadowDark,
                            zIndex: 50
                        }}>
                            {REACTION_TYPES.map(r => (
                                <button
                                    key={r.label}
                                    onClick={() => { onReact(momentId, r.emoji); setShowPicker(false); }}
                                    style={{
                                        width: "36px", height: "36px", borderRadius: "50%",
                                        border: "none", background: userReaction === r.emoji ? `${r.color}30` : "transparent",
                                        fontSize: "18px", cursor: "pointer", transition: "all 0.2s",
                                        display: "flex", alignItems: "center", justifyContent: "center"
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = `${r.color}30`; e.currentTarget.style.transform = "scale(1.15)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = userReaction === r.emoji ? `${r.color}30` : "transparent"; e.currentTarget.style.transform = "scale(1)"; }}
                                    title={r.label}
                                >
                                    {r.emoji}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {!canInteract && totalReactions > 0 && (
                <span style={{ fontSize: "12px", color: THEME.textMuted, marginLeft: "4px" }}>
                    {totalReactions} reaction{totalReactions > 1 ? "s" : ""}
                </span>
            )}
        </div>
    );
}

// ── Comment Section ────────────────────────────────────────────────────────
function CommentSection({ momentId, comments, user, onAddComment, onDeleteComment, canInteract }) {
    const [newComment, setNewComment] = useState("");
    const [posting, setPosting] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const inputRef = useRef();

    const visibleComments = expanded ? comments : comments.slice(0, 2);
    const hasMore = comments.length > 2;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        setPosting(true);
        await onAddComment(momentId, newComment.trim());
        setNewComment("");
        setPosting(false);
    };

    return (
        <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${THEME.border}` }}>
            {/* Comments list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "12px" }}>
                {visibleComments.map(comment => (
                    <div key={comment.id} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                        <div style={{
                            width: "28px", height: "28px", borderRadius: "50%",
                            background: getAvatarGradient(comment.user_name || "User"),
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "10px", fontWeight: 800, color: "#fff", flexShrink: 0
                        }}>
                            {getInitials(comment.user_name)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                background: THEME.blackLight, borderRadius: "10px",
                                padding: "8px 12px", border: `1px solid ${THEME.border}`
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                                    <span style={{ fontSize: "12px", fontWeight: 700, color: THEME.goldLight }}>
                                        {comment.user_name || "Anonymous"}
                                    </span>
                                    <span style={{ fontSize: "10px", color: THEME.textMuted }}>
                                        {timeAgo(comment.created_at)}
                                    </span>
                                </div>
                                <p style={{ margin: 0, fontSize: "13px", color: THEME.textSecondary, lineHeight: 1.5, wordBreak: "break-word" }}>
                                    {comment.text}
                                </p>
                            </div>
                            {(user?.id === comment.user_id || isAdmin()) && (
                                <button
                                    onClick={() => onDeleteComment(comment.id, momentId)}
                                    style={{
                                        fontSize: "10px", color: "#f87171", background: "none",
                                        border: "none", cursor: "pointer", padding: "2px 0",
                                        marginTop: "2px", opacity: 0.7, transition: "opacity 0.2s"
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                                    onMouseLeave={e => e.currentTarget.style.opacity = "0.7"}
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                {hasMore && !expanded && (
                    <button
                        onClick={() => setExpanded(true)}
                        style={{
                            background: "none", border: "none", color: THEME.gold,
                            fontSize: "12px", fontWeight: 600, cursor: "pointer",
                            padding: "4px 0", textAlign: "left"
                        }}
                    >
                        View {comments.length - 2} more comment{comments.length - 2 > 1 ? "s" : ""}
                    </button>
                )}
            </div>

            {/* Add comment */}
            {canInteract && (
                <form onSubmit={handleSubmit} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <div style={{
                        width: "32px", height: "32px", borderRadius: "50%",
                        background: getAvatarGradient(`${user?.firstname} ${user?.lastname}`),
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "11px", fontWeight: 800, color: "#fff", flexShrink: 0
                    }}>
                        {getInitials(`${user?.firstname} ${user?.lastname}`)}
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="Write a comment..."
                        disabled={posting}
                        style={{
                            flex: 1, padding: "10px 14px", borderRadius: "20px",
                            border: `1.5px solid ${THEME.border}`, background: THEME.blackLight,
                            color: THEME.textPrimary, fontSize: "13px", outline: "none",
                            transition: "border-color 0.2s, box-shadow 0.2s", fontFamily: "inherit"
                        }}
                        onFocus={e => { e.target.style.borderColor = THEME.gold; e.target.style.boxShadow = `0 0 0 3px ${THEME.goldMuted}`; }}
                        onBlur={e => { e.target.style.borderColor = THEME.border; e.target.style.boxShadow = "none"; }}
                    />
                    <button
                        type="submit"
                        disabled={posting || !newComment.trim()}
                        style={{
                            padding: "8px 16px", borderRadius: "20px", border: "none",
                            background: newComment.trim() ? THEME.gradientGold : THEME.border,
                            color: newComment.trim() ? THEME.black : THEME.textMuted,
                            fontWeight: 700, fontSize: "12px", cursor: newComment.trim() ? "pointer" : "not-allowed",
                            transition: "all 0.2s", whiteSpace: "nowrap"
                        }}
                    >
                        {posting ? "..." : "Post"}
                    </button>
                </form>
            )}
        </div>
    );
}

// ── Moment Card ────────────────────────────────────────────────────────────
function MomentCard({ moment, user, onDelete, onReact, onAddComment, onDeleteComment, canPost, canInteract }) {
    const [showComments, setShowComments] = useState(false);
    const isOwner = user?.id === moment.user_id;
    const isAdminUser = isAdmin();
    const canDelete = (isOwner || isAdminUser) && canPost;
    const isExpired = new Date(moment.expires_at) < new Date();

    const userName = moment.user_name || "Anonymous";
    const userType = moment.user_type || "";
    const userTribe = moment.user_tribe || "";

    return (
        <div style={{
            background: THEME.blackCard, borderRadius: "16px",
            border: `1px solid ${THEME.border}`, overflow: "hidden",
            boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
            transition: "all 0.3s ease",
            opacity: isExpired ? 0.6 : 1
        }}
            onMouseEnter={e => {
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.5)";
                e.currentTarget.style.borderColor = THEME.borderGold;
                e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={e => {
                e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.3)";
                e.currentTarget.style.borderColor = THEME.border;
                e.currentTarget.style.transform = "translateY(0)";
            }}>

            {/* Header */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "16px 18px", borderBottom: moment.image_url ? `1px solid ${THEME.border}` : "none"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                        width: "42px", height: "42px", borderRadius: "50%",
                        background: getAvatarGradient(userName),
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "14px", fontWeight: 800, color: "#fff", flexShrink: 0
                    }}>
                        {getInitials(userName)}
                    </div>
                    <div>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: THEME.textPrimary }}>
                            {userName}
                        </div>
                        <div style={{ fontSize: "11px", color: THEME.textMuted, display: "flex", alignItems: "center", gap: "6px" }}>
                            {userType && <span>{userType}</span>}
                            {userTribe && (
                                <>
                                    {userType && <span>·</span>}
                                    <span style={{ color: THEME.gold }}>{userTribe}</span>
                                </>
                            )}
                            <span>·</span>
                            <span>{timeAgo(moment.created_at)}</span>
                        </div>
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {/* Expiry badge */}
                    <span style={{
                        fontSize: "10px", fontWeight: 700, padding: "3px 8px",
                        borderRadius: "10px", background: isExpired ? "rgba(248,113,113,0.15)" : "rgba(201,164,92,0.12)",
                        color: isExpired ? "#f87171" : THEME.gold,
                        border: `1px solid ${isExpired ? "rgba(248,113,113,0.3)" : THEME.borderGold}`,
                        textTransform: "uppercase", letterSpacing: "0.5px"
                    }}>
                        {isExpired ? "Expired" : formatExpiry(moment.expires_at)}
                    </span>
                    {canDelete && (
                        <button
                            onClick={() => onDelete(moment)}
                            style={{
                                background: "none", border: "none", color: THEME.textMuted,
                                fontSize: "16px", cursor: "pointer", padding: "4px",
                                borderRadius: "6px", transition: "all 0.2s",
                                width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center"
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(248,113,113,0.15)"; e.currentTarget.style.color = "#f87171"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = THEME.textMuted; }}
                            title="Delete moment"
                        >
                            🗑
                        </button>
                    )}
                </div>
            </div>

            {/* Image */}
            {moment.image_url && (
                <div style={{ position: "relative", overflow: "hidden" }}>
                    <img
                        src={moment.image_url}
                        alt="Moment"
                        style={{
                            width: "100%", maxHeight: "400px", objectFit: "cover",
                            display: "block", transition: "transform 0.4s ease"
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
                        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                    />
                </div>
            )}

            {/* Content */}
            <div style={{ padding: "16px 18px" }}>
                {moment.caption && (
                    <p style={{
                        margin: "0 0 14px 0", fontSize: "14px", color: THEME.textSecondary,
                        lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word"
                    }}>
                        {moment.caption}
                    </p>
                )}

                {/* Reactions */}
                <ReactionBar
                    momentId={moment.id}
                    reactions={moment.reactions || []}
                    userId={user?.id}
                    onReact={onReact}
                    canInteract={canInteract}
                />

                {/* Comments toggle */}
                <button
                    onClick={() => setShowComments(!showComments)}
                    style={{
                        background: "none", border: "none", color: THEME.textMuted,
                        fontSize: "12px", fontWeight: 600, cursor: "pointer",
                        marginTop: "10px", padding: "4px 0", display: "flex", alignItems: "center", gap: "6px",
                        transition: "color 0.2s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = THEME.gold}
                    onMouseLeave={e => e.currentTarget.style.color = THEME.textMuted}
                >
                    <span>💬</span>
                    {(moment.comments?.length || 0) > 0
                        ? `${moment.comments.length} comment${moment.comments.length > 1 ? "s" : ""}`
                        : "Add a comment"}
                    <span style={{
                        display: "inline-block", transition: "transform 0.2s",
                        transform: showComments ? "rotate(180deg)" : "rotate(0deg)"
                    }}>▼</span>
                </button>

                {/* Comments section */}
                {showComments && (
                    <CommentSection
                        momentId={moment.id}
                        comments={moment.comments || []}
                        user={user}
                        onAddComment={onAddComment}
                        onDeleteComment={onDeleteComment}
                        canInteract={canInteract}
                    />
                )}
            </div>
        </div>
    );
}

// ── Welcome Banner for Newcomers ───────────────────────────────────────────
function WelcomeBanner({ userName, isNewcomer }) {
    if (!isNewcomer) return null;
    return (
        <div style={{
            background: `linear-gradient(135deg, ${THEME.darkBlue} 0%, ${THEME.blackElevated} 100%)`,
            borderRadius: "16px",
            border: `1px solid ${THEME.borderGold}`,
            padding: "20px 24px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            boxShadow: THEME.shadowGold
        }}>
            <div style={{
                width: "48px", height: "48px", borderRadius: "50%",
                background: THEME.gradientGold,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "24px", flexShrink: 0
            }}>
                👋
            </div>
            <div>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: 700, color: THEME.goldLight }}>
                    Welcome to the MAC Family, {userName}!
                </h3>
                <p style={{ margin: 0, fontSize: "13px", color: THEME.textSecondary, lineHeight: 1.5 }}>
                    You belong here! Feel free to react and comment on moments shared by our community. 
                    We&apos;re so glad you&apos;re part of our church family. 💛
                </p>
            </div>
        </div>
    );
}

// ── Main Newsfeed ──────────────────────────────────────────────────────────
function Newsfeed() {
    const navigate = useNavigate();
    const user = getCurrentUser();
    const newcomer = getNewcomer();

    // Support both regular users and newcomers
    const currentUser = user || newcomer;
    const userId = currentUser?.id;
    const userName = user ? `${user.firstname} ${user.lastname}` : newcomer ? `${newcomer.firstname} ${newcomer.lastname}` : "Anonymous";
    const userType = user?.type || (newcomer ? "Newcomer" : "");
    const userTribe = user?.tribe || newcomer?.tribe || "";
    const isNewcomer = !!newcomer && !user;

    // Permissions
    const canPost = !isNewcomer; // Only leaders can post
    const canInteract = !!userId; // Both leaders and newcomers can react/comment

    const [moments, setMoments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [filter, setFilter] = useState("ALL"); // ALL, MINE
    const [sortBy, setSortBy] = useState("newest"); // newest, popular

    // ── Fetch moments with comments & reactions ────────────────────────────
    const fetchMoments = useCallback(async () => {
        setLoading(true);

        // Fetch moments (including expired ones for cleanup, but we'll filter them)
        const { data: momentsData, error: momentsError } = await supabase
            .from("tblMoments")
            .select("*")
            .order("created_at", { ascending: false });

        if (momentsError) {
            console.error("Error fetching moments:", momentsError);
            setLoading(false);
            return;
        }

        if (!momentsData || momentsData.length === 0) {
            setMoments([]);
            setLoading(false);
            return;
        }

        const momentIds = momentsData.map(m => m.id);

        // Fetch reactions
        const { data: reactionsData } = await supabase
            .from("tblMomentReactions")
            .select("*")
            .in("moment_id", momentIds);

        // Fetch comments
        const { data: commentsData } = await supabase
            .from("tblMomentComments")
            .select("*")
            .in("moment_id", momentIds)
            .order("created_at", { ascending: true });

        // Merge data
        const merged = momentsData.map(moment => ({
            ...moment,
            reactions: reactionsData?.filter(r => r.moment_id === moment.id) || [],
            comments: commentsData?.filter(c => c.moment_id === moment.id) || []
        }));

        setMoments(merged);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchMoments();

        // Realtime subscriptions
        const momentsChannel = supabase
            .channel("moments_changes")
            .on("postgres_changes", { event: "*", schema: "public", table: "tblMoments" }, () => {
                fetchMoments();
            })
            .subscribe();

        const reactionsChannel = supabase
            .channel("reactions_changes")
            .on("postgres_changes", { event: "*", schema: "public", table: "tblMomentReactions" }, () => {
                fetchMoments();
            })
            .subscribe();

        const commentsChannel = supabase
            .channel("comments_changes")
            .on("postgres_changes", { event: "*", schema: "public", table: "tblMomentComments" }, () => {
                fetchMoments();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(momentsChannel);
            supabase.removeChannel(reactionsChannel);
            supabase.removeChannel(commentsChannel);
        };
    }, [fetchMoments]);

    // ── Cleanup expired moments (AUTO DELETE FROM DATABASE) ────────────────
    const cleanupExpired = useCallback(async () => {
        const now = new Date().toISOString();

        // Get expired moments with their images
        const { data: expired } = await supabase
            .from("tblMoments")
            .select("id, image_url")
            .lt("expires_at", now);

        if (expired && expired.length > 0) {
            console.log(`[Auto-Cleanup] Found ${expired.length} expired moment(s) to delete`);

            // Delete images from storage first
            for (const item of expired) {
                if (item.image_url) {
                    try {
                        await deleteOldImage(item.image_url);
                    } catch (err) {
                        console.warn("Failed to delete image:", err);
                    }
                }
            }

            // Delete reactions first (foreign key constraint)
            const expiredIds = expired.map(e => e.id);
            await supabase.from("tblMomentReactions").delete().in("moment_id", expiredIds);

            // Delete comments next (foreign key constraint)
            await supabase.from("tblMomentComments").delete().in("moment_id", expiredIds);

            // Finally delete the moments themselves
            const { error: deleteError } = await supabase.from("tblMoments").delete().in("id", expiredIds);

            if (!deleteError) {
                console.log(`[Auto-Cleanup] Successfully deleted ${expired.length} expired moment(s)`);
                // Refresh the feed
                fetchMoments();
            } else {
                console.error("[Auto-Cleanup] Error deleting expired moments:", deleteError);
            }
        }
    }, [fetchMoments]);

    useEffect(() => {
        // Run cleanup immediately on mount
        cleanupExpired();
        // Then check every 30 seconds
        const interval = setInterval(cleanupExpired, 30000);
        return () => clearInterval(interval);
    }, [cleanupExpired]);

    // ── Create moment ──────────────────────────────────────────────────────
    const handleSave = async (payload) => {
        const insertData = {
            ...payload,
            user_id: userId,
            user_name: userName,
            user_type: userType,
            user_tribe: userTribe,
        };

        const { data, error } = await supabase
            .from("tblMoments")
            .insert([insertData])
            .select();

        if (!error && data) {
            setMoments(prev => [{
                ...data[0],
                reactions: [],
                comments: []
            }, ...prev]);
            Swal.fire({
                icon: "success", title: "Moment posted!",
                text: `Your moment will be visible for 3 days.`,
                timer: 1800, showConfirmButton: false,
                background: THEME.blackCard, color: THEME.textPrimary
            });
        } else if (error) {
            Swal.fire({
                icon: "error", title: "Failed to post",
                text: error.message,
                confirmButtonColor: THEME.gold,
                background: THEME.blackCard, color: THEME.textPrimary
            });
        }
    };

    // ── Delete moment ──────────────────────────────────────────────────────
    const handleDelete = async (moment) => {
        const confirm = await Swal.fire({
            icon: "warning", title: "Delete this moment?",
            text: "This will be permanently removed.",
            showCancelButton: true, confirmButtonText: "Delete",
            confirmButtonColor: "#dc2626",
            background: THEME.blackCard, color: THEME.textPrimary
        });
        if (!confirm.isConfirmed) return;

        if (moment.image_url) await deleteOldImage(moment.image_url);

        // Delete reactions and comments first
        await supabase.from("tblMomentReactions").delete().eq("moment_id", moment.id);
        await supabase.from("tblMomentComments").delete().eq("moment_id", moment.id);

        const { error } = await supabase.from("tblMoments").delete().eq("id", moment.id);
        if (!error) {
            setMoments(prev => prev.filter(m => m.id !== moment.id));
            Swal.fire({
                icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false,
                background: THEME.blackCard, color: THEME.textPrimary
            });
        }
    };

    // ── React to moment ────────────────────────────────────────────────────
    const handleReact = async (momentId, emoji) => {
        if (!userId) {
            Swal.fire({
                icon: "warning", title: "Please log in",
                text: "You need to be logged in to react.",
                confirmButtonColor: THEME.gold,
                background: THEME.blackCard, color: THEME.textPrimary
            });
            return;
        }

        // Check if user already reacted with this emoji
        const existing = moments
            .find(m => m.id === momentId)
            ?.reactions.find(r => r.user_id === userId && r.reaction === emoji);

        if (existing) {
            // Remove reaction (toggle off)
            await supabase.from("tblMomentReactions").delete().eq("id", existing.id);
        } else {
            // Remove any existing reaction from this user on this moment
            const userReactions = moments
                .find(m => m.id === momentId)
                ?.reactions.filter(r => r.user_id === userId) || [];

            for (const r of userReactions) {
                await supabase.from("tblMomentReactions").delete().eq("id", r.id);
            }

            // Add new reaction
            await supabase.from("tblMomentReactions").insert([{
                moment_id: momentId,
                user_id: userId,
                reaction: emoji
            }]);
        }

        // Optimistic update
        fetchMoments();
    };

    // ── Add comment ──────────────────────────────────────────────────────────
    const handleAddComment = async (momentId, text) => {
        if (!userId) return;

        const { data, error } = await supabase
            .from("tblMomentComments")
            .insert([{
                moment_id: momentId,
                user_id: userId,
                user_name: userName,
                text
            }])
            .select();

        if (!error && data) {
            setMoments(prev => prev.map(m => {
                if (m.id === momentId) {
                    return { ...m, comments: [...(m.comments || []), data[0]] };
                }
                return m;
            }));
        }
    };

    // ── Delete comment ───────────────────────────────────────────────────────
    const handleDeleteComment = async (commentId, momentId) => {
        const confirm = await Swal.fire({
            icon: "warning", title: "Delete comment?",
            showCancelButton: true, confirmButtonText: "Delete",
            confirmButtonColor: "#dc2626",
            background: THEME.blackCard, color: THEME.textPrimary
        });
        if (!confirm.isConfirmed) return;

        const { error } = await supabase.from("tblMomentComments").delete().eq("id", commentId);
        if (!error) {
            setMoments(prev => prev.map(m => {
                if (m.id === momentId) {
                    return { ...m, comments: (m.comments || []).filter(c => c.id !== commentId) };
                }
                return m;
            }));
        }
    };

    // ── Filter & Sort ──────────────────────────────────────────────────────
    let filtered = [...moments];
    // Only show non-expired moments in the feed
    filtered = filtered.filter(m => new Date(m.expires_at) > new Date());

    if (filter === "MINE") {
        filtered = filtered.filter(m => m.user_id === userId);
    }
    if (sortBy === "popular") {
        filtered.sort((a, b) => (b.reactions?.length || 0) - (a.reactions?.length || 0));
    }

    // ── Icons ──────────────────────────────────────────────────────────────
    const PenIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>;
    const InboxIcon = <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>;

    return (
        <div className="layout" style={{ background: THEME.black, minHeight: "100vh" }}>
            <Sidebar />
            <div className="content" style={{ padding: "28px", maxWidth: "800px", margin: "0 auto" }}>

                {/* ── HEADER ───────────────────────────────────────────── */}
                <div style={{ marginBottom: "24px" }}>
                    <h1 style={{
                        margin: "0 0 6px 0", fontSize: "26px", fontWeight: 800,
                        color: THEME.textPrimary, letterSpacing: "-0.5px"
                    }}>
                        Newsfeed
                    </h1>
                    <p style={{ margin: 0, fontSize: "13px", color: THEME.textMuted }}>
                        {isNewcomer 
                            ? "Welcome to the MAC family! React and comment to connect with our community." 
                            : "Share moments with the MAC family. Posts disappear after 3 days."}
                    </p>
                </div>

                {/* ── WELCOME BANNER FOR NEWCOMERS ───────────────────── */}
                <WelcomeBanner userName={newcomer?.firstname} isNewcomer={isNewcomer} />

                {/* ── CREATE POST BAR ────────────────────────────────── */}
                {canPost && (
                    <div style={{
                        display: "flex", alignItems: "center", gap: "14px",
                        padding: "14px 18px", background: THEME.blackCard,
                        borderRadius: "14px", border: `1px solid ${THEME.border}`,
                        marginBottom: "24px", cursor: "pointer", transition: "all 0.3s ease"
                    }}
                        onClick={() => setShowModal(true)}
                        onMouseEnter={e => {
                            e.currentTarget.style.borderColor = THEME.borderGold;
                            e.currentTarget.style.boxShadow = "0 4px 20px rgba(201,164,92,0.1)";
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.borderColor = THEME.border;
                            e.currentTarget.style.boxShadow = "none";
                        }}>
                        <div style={{
                            width: "40px", height: "40px", borderRadius: "50%",
                            background: getAvatarGradient(userName),
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "13px", fontWeight: 800, color: "#fff", flexShrink: 0
                        }}>
                            {getInitials(userName)}
                        </div>
                        <div style={{
                            flex: 1, padding: "10px 16px", borderRadius: "20px",
                            background: THEME.blackLight, border: `1px solid ${THEME.border}`,
                            color: THEME.textMuted, fontSize: "14px"
                        }}>
                            What&apos;s on your mind, {user?.firstname || newcomer?.firstname || "friend"}?
                        </div>
                        <div style={{
                            width: "40px", height: "40px", borderRadius: "50%",
                            background: THEME.goldMuted, display: "flex",
                            alignItems: "center", justifyContent: "center",
                            color: THEME.gold, flexShrink: 0
                        }}>
                            {PenIcon}
                        </div>
                    </div>
                )}

                {/* ── FILTERS ──────────────────────────────────────────── */}
                <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    marginBottom: "20px", flexWrap: "wrap", gap: "10px"
                }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                        {[
                            ["ALL", "All Moments"],
                            ["MINE", canPost ? "My Moments" : "My Activity"]
                        ].map(([val, lbl]) => (
                            <button key={val} onClick={() => setFilter(val)} style={{
                                padding: "7px 16px", borderRadius: "24px", border: "1.5px solid",
                                borderColor: filter === val ? THEME.gold : THEME.border,
                                background: filter === val ? THEME.goldMuted : "transparent",
                                color: filter === val ? THEME.gold : THEME.textMuted,
                                fontSize: "12px", fontWeight: 600, cursor: "pointer",
                                transition: "all 0.2s ease", whiteSpace: "nowrap"
                            }}
                                onMouseEnter={e => { if (filter !== val) { e.currentTarget.style.borderColor = THEME.gold; e.currentTarget.style.color = THEME.gold; } }}
                                onMouseLeave={e => { if (filter !== val) { e.currentTarget.style.borderColor = THEME.border; e.currentTarget.style.color = THEME.textMuted; } }}>
                                {lbl}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", color: THEME.textMuted, fontWeight: 600 }}>Sort:</span>
                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value)}
                            style={{
                                padding: "6px 12px", borderRadius: "8px",
                                border: `1.5px solid ${THEME.border}`, background: THEME.blackCard,
                                color: THEME.textSecondary, fontSize: "12px", fontWeight: 600,
                                cursor: "pointer", outline: "none"
                            }}
                        >
                            <option value="newest">Newest</option>
                            <option value="popular">Most Popular</option>
                        </select>
                    </div>
                </div>

                {/* ── MOMENTS FEED ───────────────────────────────────── */}
                {loading ? (
                    <div style={{
                        padding: "60px 20px", textAlign: "center",
                        background: THEME.blackCard, borderRadius: "16px",
                        border: `1px solid ${THEME.border}`
                    }}>
                        <div style={{
                            width: "32px", height: "32px", border: `2px solid ${THEME.border}`,
                            borderTopColor: THEME.gold, borderRadius: "50%",
                            margin: "0 auto 16px", animation: "spin 0.8s linear infinite"
                        }} />
                        <p style={{ color: THEME.textMuted, fontSize: "14px", fontWeight: 500 }}>
                            Loading moments...
                        </p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{
                        padding: "80px 20px", textAlign: "center",
                        background: THEME.blackCard, borderRadius: "16px",
                        border: `1px solid ${THEME.border}`
                    }}>
                        <div style={{ color: THEME.textMuted, marginBottom: "16px" }}>{InboxIcon}</div>
                        <p style={{ color: THEME.textMuted, fontSize: "15px", fontWeight: 500, margin: "0 0 8px 0" }}>
                            {filter === "MINE" ? "You haven't posted any moments yet." : "No moments yet."}
                        </p>
                        <p style={{ color: THEME.textMuted, fontSize: "13px", margin: 0 }}>
                            {isNewcomer 
                                ? "Be the first to react when someone shares a moment! 💛" 
                                : "Be the first to share something with the MAC family!"}
                        </p>
                        {canPost && (
                            <button onClick={() => setShowModal(true)} style={{
                                marginTop: "20px", padding: "12px 28px", borderRadius: "12px", border: "none",
                                background: THEME.gradientGold, color: THEME.black,
                                fontWeight: 700, fontSize: "13px", cursor: "pointer",
                                boxShadow: THEME.shadowGold, transition: "all 0.2s"
                            }}
                                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
                                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
                                Share a Moment
                            </button>
                        )}
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                        {filtered.map(moment => (
                            <MomentCard
                                key={moment.id}
                                moment={moment}
                                user={currentUser}
                                onDelete={handleDelete}
                                onReact={handleReact}
                                onAddComment={handleAddComment}
                                onDeleteComment={handleDeleteComment}
                                canPost={canPost}
                                canInteract={canInteract}
                            />
                        ))}
                    </div>
                )}
            </div>

            {canPost && (
                <CreateMomentModal
                    show={showModal}
                    onClose={() => setShowModal(false)}
                    onSave={handleSave}
                />
            )}

            {/* Spin animation */}
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

export default Newsfeed;
