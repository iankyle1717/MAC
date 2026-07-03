import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";
import { getCurrentUser, isAdmin } from "../utils/auth";
import Swal from "sweetalert2";

// ── Color Theme ──────────────────────────────────────────────────────────────
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

// ── Image compression ────────────────────────────────────────────────────────
const STORAGE_BUCKET = "leader-images";
const MAX_FILE_SIZE_MB = 2;
const MAX_IMAGE_PX = 1200;

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
                    (blob) => blob ? resolve(new File([blob], "content.jpg", { type: "image/jpeg" })) : reject(new Error("Compression failed")),
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
const isMedia = (user) => {
    if (!user) return false;
    if (isAdmin()) return true;
    const m = user.ministries || (user.ministry ? [user.ministry] : []);
    return m.includes("MEDIA");
};

const TYPE_META = {
    EVENT: { label: "Event", color: THEME.gold, bg: "rgba(201, 164, 92, 0.12)", icon: "E" },
    UPDATE: { label: "Update", color: "#60a5fa", bg: "rgba(96, 165, 250, 0.12)", icon: "U" },
    ANNOUNCEMENT: { label: "Announcement", color: "#f87171", bg: "rgba(248, 113, 113, 0.12)", icon: "A" },
};

// ── Content Form Modal ────────────────────────────────────────────────────
function ContentModal({ show, onClose, onSave, editItem }) {
    const [type, setType] = useState("EVENT");
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [eventTime, setEventTime] = useState("");
    const [eventLocation, setEventLocation] = useState("");
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState("");
    const [saving, setSaving] = useState(false);
    const fileRef = useRef();

    useEffect(() => {
        if (!show) return;
        if (editItem) {
            setType(editItem.type || "EVENT");
            setTitle(editItem.title || "");
            setBody(editItem.body || "");
            setEventDate(editItem.event_date || "");
            setEventTime(editItem.event_time || "");
            setEventLocation(editItem.event_location || "");
            setImagePreview(editItem.image_url || "");
        } else {
            setType("EVENT"); setTitle(""); setBody("");
            setEventDate(""); setEventTime(""); setEventLocation("");
            setImageFile(null); setImagePreview("");
        }
    }, [show, editItem]);

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
        if (!title.trim()) {
            Swal.fire({ icon: "warning", title: "Title required", confirmButtonColor: THEME.gold, background: THEME.blackCard, color: THEME.textPrimary });
            return;
        }
        setSaving(true);

        let imageUrl = editItem?.image_url || null;

        if (imageFile) {
            const sizeMB = imageFile.size / (1024 * 1024);
            if (sizeMB > MAX_FILE_SIZE_MB) {
                Swal.fire({ icon: "error", title: "Image too large", text: `Max ${MAX_FILE_SIZE_MB}MB. Please choose a smaller image.`, confirmButtonColor: THEME.gold, background: THEME.blackCard, color: THEME.textPrimary });
                setSaving(false); return;
            }
            const fileName = `content/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
            if (editItem?.image_url) await deleteOldImage(editItem.image_url);
            const { error: uploadErr } = await supabase.storage.from(STORAGE_BUCKET).upload(fileName, imageFile);
            if (uploadErr) {
                Swal.fire({ icon: "error", title: "Upload failed", text: uploadErr.message, confirmButtonColor: THEME.gold, background: THEME.blackCard, color: THEME.textPrimary });
                setSaving(false); return;
            }
            const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
            imageUrl = data.publicUrl;
        }

        await onSave({
            type, title: title.trim(), body: body.trim() || null,
            image_url: type === "ANNOUNCEMENT" ? null : imageUrl,
            event_date: type === "EVENT" ? eventDate || null : null,
            event_time: type === "EVENT" ? eventTime || null : null,
            event_location: type === "EVENT" ? eventLocation || null : null,
        });

        setSaving(false);
        onClose();
    };

    if (!show) return null;

    const inp = {
        width: "100%", padding: "12px 14px", fontSize: "14px",
        borderRadius: "10px", border: `1.5px solid ${THEME.border}`,
        outline: "none", boxSizing: "border-box", background: THEME.blackLight,
        color: THEME.textPrimary, transition: "border-color 0.2s, box-shadow 0.2s",
    };

    const labelStyle = {
        fontSize: "11px", fontWeight: 700, color: THEME.textSecondary,
        textTransform: "uppercase", letterSpacing: "0.8px", display: "block", marginBottom: "8px"
    };

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px", backdropFilter: "blur(8px)" }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
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
                        {editItem ? "Edit Post" : "New Post"}
                    </h2>
                    <button onClick={onClose} style={{
                        background: "none", border: "none", fontSize: "20px", cursor: "pointer",
                        color: THEME.textMuted, width: "32px", height: "32px", borderRadius: "8px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "background 0.2s"
                    }} onMouseEnter={e => e.currentTarget.style.background = THEME.goldMuted}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>x</button>
                </div>

                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                    {/* TYPE SELECTOR */}
                    <div>
                        <label style={labelStyle}>Post Type</label>
                        <div style={{ display: "flex", gap: "8px" }}>
                            {Object.entries(TYPE_META).map(([t, meta]) => (
                                <button key={t} onClick={() => setType(t)} style={{
                                    flex: 1, padding: "10px 6px", borderRadius: "10px", border: "1.5px solid",
                                    borderColor: type === t ? meta.color : THEME.border,
                                    background: type === t ? meta.bg : "transparent",
                                    color: type === t ? meta.color : THEME.textMuted,
                                    fontSize: "12px", fontWeight: 700, cursor: "pointer",
                                    transition: "all 0.2s"
                                }}>
                                    <span style={{
                                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                                        width: "18px", height: "18px", borderRadius: "4px",
                                        background: type === t ? meta.color : "transparent",
                                        color: type === t ? THEME.black : THEME.textMuted,
                                        fontSize: "10px", fontWeight: 800, marginRight: "6px"
                                    }}>{meta.icon}</span>
                                    {meta.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* TITLE */}
                    <div>
                        <label style={labelStyle}>Title *</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Post title..."
                            style={inp} onFocus={e => { e.target.style.borderColor = THEME.gold; e.target.style.boxShadow = `0 0 0 3px ${THEME.goldMuted}`; }}
                            onBlur={e => { e.target.style.borderColor = THEME.border; e.target.style.boxShadow = "none"; }} />
                    </div>

                    {/* EVENT FIELDS */}
                    {type === "EVENT" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <div style={{ display: "flex", gap: "12px" }}>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>Date</label>
                                    <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)}
                                        style={inp} onFocus={e => { e.target.style.borderColor = THEME.gold; e.target.style.boxShadow = `0 0 0 3px ${THEME.goldMuted}`; }}
                                        onBlur={e => { e.target.style.borderColor = THEME.border; e.target.style.boxShadow = "none"; }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>Time</label>
                                    <input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)}
                                        style={inp} onFocus={e => { e.target.style.borderColor = THEME.gold; e.target.style.boxShadow = `0 0 0 3px ${THEME.goldMuted}`; }}
                                        onBlur={e => { e.target.style.borderColor = THEME.border; e.target.style.boxShadow = "none"; }} />
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Location</label>
                                <input type="text" value={eventLocation} onChange={e => setEventLocation(e.target.value)} placeholder="Where is this event?"
                                    style={inp} onFocus={e => { e.target.style.borderColor = THEME.gold; e.target.style.boxShadow = `0 0 0 3px ${THEME.goldMuted}`; }}
                                    onBlur={e => { e.target.style.borderColor = THEME.border; e.target.style.boxShadow = "none"; }} />
                            </div>
                        </div>
                    )}

                    {/* BODY */}
                    <div>
                        <label style={labelStyle}>
                            {type === "ANNOUNCEMENT" ? "Announcement Text *" : "Description"}
                        </label>
                        <textarea value={body} onChange={e => setBody(e.target.value)}
                            placeholder={type === "ANNOUNCEMENT" ? "Write your announcement..." : "Add more details..."}
                            rows={4} style={{ ...inp, resize: "vertical", fontFamily: "inherit" }}
                            onFocus={e => { e.target.style.borderColor = THEME.gold; e.target.style.boxShadow = `0 0 0 3px ${THEME.goldMuted}`; }}
                            onBlur={e => { e.target.style.borderColor = THEME.border; e.target.style.boxShadow = "none"; }} />
                    </div>

                    {/* IMAGE */}
                    {type !== "ANNOUNCEMENT" && (
                        <div>
                            <label style={labelStyle}>
                                {type === "EVENT" ? "Event Image" : "Image (optional)"}
                            </label>
                            {imagePreview && (
                                <div style={{ marginBottom: "10px", position: "relative", width: "fit-content" }}>
                                    <img src={imagePreview} alt="Preview" style={{ maxWidth: "100%", maxHeight: "180px", borderRadius: "10px", objectFit: "cover", border: `1px solid ${THEME.border}` }} />
                                    <button onClick={() => { setImageFile(null); setImagePreview(""); if (fileRef.current) fileRef.current.value = ""; }}
                                        style={{
                                            position: "absolute", top: "8px", right: "8px", width: "28px", height: "28px",
                                            borderRadius: "50%", border: `1px solid ${THEME.border}`,
                                            background: "rgba(10, 10, 10, 0.85)", color: THEME.textPrimary,
                                            fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                                            backdropFilter: "blur(4px)"
                                        }}>x</button>
                                </div>
                            )}
                            <input ref={fileRef} type="file" accept="image/*" onChange={handleImage}
                                style={{ fontSize: "13px", color: THEME.textMuted }} />
                            <p style={{ fontSize: "11px", color: THEME.textMuted, margin: "6px 0 0 0" }}>
                                Auto-compressed before upload. Max {MAX_FILE_SIZE_MB}MB after compression.
                            </p>
                        </div>
                    )}

                    <button onClick={handleSave} disabled={saving} style={{
                        padding: "14px", borderRadius: "12px", border: "none",
                        background: THEME.gradientGold,
                        color: THEME.black, fontWeight: 800, fontSize: "14px",
                        cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
                        marginTop: "6px", transition: "all 0.2s", letterSpacing: "0.3px",
                        boxShadow: saving ? "none" : THEME.shadowGold
                    }}>
                        {saving ? "Publishing..." : editItem ? "Save Changes" : "Publish Post"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Content Card ──────────────────────────────────────────────────────────
function ContentCard({ post, canEdit, onEdit, onDelete, isDragging, isDragOver, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop }) {
    const meta = TYPE_META[post.type] || TYPE_META.ANNOUNCEMENT;
    const formatDate = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : null;
    const formatTime = (t) => {
        if (!t) return null;
        const [h, m] = t.split(":");
        const hour = parseInt(h);
        const ampm = hour >= 12 ? "PM" : "AM";
        const disp = hour % 12 === 0 ? 12 : hour % 12;
        return `${disp}:${m} ${ampm}`;
    };
    const timeAgo = (ts) => {
        const diff = Date.now() - new Date(ts).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    return (
        <div
            draggable={canEdit}
            onDragStart={(e) => onDragStart && onDragStart(e, post)}
            onDragEnd={onDragEnd}
            onDragOver={(e) => onDragOver && onDragOver(e, post)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop && onDrop(e, post)}
            style={{
                background: THEME.blackCard, borderRadius: "16px",
                border: isDragOver ? `2px dashed ${THEME.gold}` : `1px solid ${THEME.border}`,
                overflow: "hidden",
                boxShadow: isDragOver ? `0 0 20px ${THEME.goldMuted}` : "0 2px 12px rgba(0,0,0,0.3)",
                transition: "all 0.3s ease",
                cursor: canEdit ? "grab" : "default",
                opacity: isDragging ? 0.4 : 1,
                transform: isDragOver ? "scale(1.02)" : "scale(1)",
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

            {/* IMAGE */}
            {post.image_url && (
                <div style={{ position: "relative", overflow: "hidden", height: "200px" }}>
                    <img src={post.image_url} alt={post.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.4s ease" }}
                        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"} />
                    <span style={{
                        position: "absolute", top: "12px", left: "12px",
                        padding: "4px 10px", borderRadius: "6px", fontSize: "10px", fontWeight: 800,
                        background: "rgba(10, 10, 10, 0.85)", color: meta.color,
                        border: `1px solid ${meta.color}40`, backdropFilter: "blur(4px)",
                        textTransform: "uppercase", letterSpacing: "0.5px"
                    }}>
                        {meta.label}
                    </span>
                </div>
            )}

            <div style={{ padding: "18px 20px" }}>
                {/* Type badge (when no image) */}
                {!post.image_url && (
                    <span style={{
                        display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "10px",
                        padding: "4px 10px", borderRadius: "6px", fontSize: "10px", fontWeight: 800,
                        background: meta.bg, color: meta.color,
                        border: `1px solid ${meta.color}30`, textTransform: "uppercase", letterSpacing: "0.5px"
                    }}>
                        <span style={{
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            width: "16px", height: "16px", borderRadius: "3px",
                            background: meta.color, color: THEME.black, fontSize: "9px"
                        }}>{meta.icon}</span>
                        {meta.label}
                    </span>
                )}

                <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: 700, color: THEME.textPrimary, lineHeight: 1.35 }}>
                    {post.title}
                </h3>

                {/* Event details */}
                {post.type === "EVENT" && (
                    <div style={{
                        display: "flex", flexDirection: "column", gap: "4px", margin: "10px 0",
                        padding: "12px 14px", background: THEME.darkBlue, borderRadius: "10px",
                        border: `1px solid ${THEME.darkBlueAccent}`
                    }}>
                        {post.event_date && (
                            <span style={{ fontSize: "12px", color: THEME.goldLight, fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={THEME.goldLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                {formatDate(post.event_date)}
                            </span>
                        )}
                        {post.event_time && (
                            <span style={{ fontSize: "12px", color: THEME.goldLight, fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={THEME.goldLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                {formatTime(post.event_time)}
                            </span>
                        )}
                        {post.event_location && (
                            <span style={{ fontSize: "12px", color: THEME.goldLight, fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={THEME.goldLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                {post.event_location}
                            </span>
                        )}
                    </div>
                )}

                {/* Body text */}
                {post.body && (
                    <p style={{ margin: "8px 0 12px 0", fontSize: "13px", color: THEME.textSecondary, lineHeight: 1.65 }}>
                        {post.body}
                    </p>
                )}

                {/* Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${THEME.border}` }}>
                    <div style={{ fontSize: "11px", color: THEME.textMuted, display: "flex", alignItems: "center", gap: "4px" }}>
                        {post.published_by && <span>By <strong style={{ color: THEME.gold }}>{post.published_by}</strong></span>}
                        {post.published_by && <span style={{ color: THEME.textMuted }}>·</span>}
                        <span>{timeAgo(post.created_at)}</span>
                    </div>
                    {canEdit && (
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button onClick={() => onEdit(post)} style={{
                                padding: "5px 12px", borderRadius: "8px", border: `1px solid ${THEME.border}`,
                                background: "transparent", fontSize: "11px", fontWeight: 600,
                                color: THEME.textSecondary, cursor: "pointer", transition: "all 0.2s"
                            }} onMouseEnter={e => { e.currentTarget.style.borderColor = THEME.gold; e.currentTarget.style.color = THEME.gold; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = THEME.border; e.currentTarget.style.color = THEME.textSecondary; }}>Edit</button>
                            <button onClick={() => onDelete(post)} style={{
                                padding: "5px 12px", borderRadius: "8px", border: "1px solid rgba(248, 113, 113, 0.3)",
                                background: "transparent", fontSize: "11px", fontWeight: 600,
                                color: "#f87171", cursor: "pointer", transition: "all 0.2s"
                            }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(248, 113, 113, 0.1)"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>Delete</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Stat Card Component ─────────────────────────────────────────────────
function StatCard({ label, value, iconSvg, accent }) {
    return (
        <div style={{
            flex: "1 1 160px", padding: "20px", borderRadius: "14px",
            background: THEME.blackCard,
            border: `1px solid ${THEME.border}`,
            transition: "all 0.3s ease",
            position: "relative", overflow: "hidden"
        }}
            onMouseEnter={e => {
                e.currentTarget.style.borderColor = accent;
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = `0 8px 24px ${accent}15`;
            }}
            onMouseLeave={e => {
                e.currentTarget.style.borderColor = THEME.border;
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
            }}>
            <div style={{
                position: "absolute", top: 0, right: 0, width: "60px", height: "60px",
                background: `radial-gradient(circle at top right, ${accent}20, transparent 70%)`,
                borderRadius: "0 14px 0 50%"
            }} />
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <span style={{ color: accent, opacity: 0.8 }}>{iconSvg}</span>
                <span style={{ fontSize: "11px", fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: "0.8px" }}>{label}</span>
            </div>
            <div style={{ fontSize: "32px", fontWeight: 800, color: THEME.textPrimary, lineHeight: 1.1 }}>{value}</div>
        </div>
    );
}

// ── Filter Button ───────────────────────────────────────────────────────
function FilterButton({ val, lbl, active, onClick }) {
    return (
        <button onClick={() => onClick(val)} style={{
            padding: "7px 16px", borderRadius: "24px", border: "1.5px solid",
            borderColor: active ? THEME.gold : THEME.border,
            background: active ? THEME.goldMuted : "transparent",
            color: active ? THEME.gold : THEME.textMuted,
            fontSize: "12px", fontWeight: 600, cursor: "pointer",
            transition: "all 0.2s ease", whiteSpace: "nowrap"
        }}
            onMouseEnter={e => {
                if (!active) {
                    e.currentTarget.style.borderColor = THEME.gold;
                    e.currentTarget.style.color = THEME.gold;
                }
            }}
            onMouseLeave={e => {
                if (!active) {
                    e.currentTarget.style.borderColor = THEME.border;
                    e.currentTarget.style.color = THEME.textMuted;
                }
            }}>
            {lbl}
        </button>
    );
}

// ── Main Dashboard ────────────────────────────────────────────────────────
function Dashboard() {
    const navigate = useNavigate();
    const user = getCurrentUser();
    const canManageContent = isMedia(user);

    const [stats, setStats] = useState({ leaders: 0, newcomers: 0, tribes: 0, tithes: 0 });
    const [content, setContent] = useState([]);
    const [filterType, setFilterType] = useState("ALL");
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [contentLoading, setContentLoading] = useState(true);

    const [draggedId, setDraggedId] = useState(null);
    const [dragOverId, setDragOverId] = useState(null);


    useEffect(() => {
        fetchStats();
        fetchContent();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchStats = async () => {
        const [{ count: leaders }, { count: newcomers }] = await Promise.all([
            supabase.from("tblMonitoring").select("*", { count: "exact", head: true }),
            supabase.from("tblNewMembers").select("*", { count: "exact", head: true }),
        ]);
        setStats(prev => ({ ...prev, leaders: leaders || 0, newcomers: newcomers || 0 }));
    };

    const fetchContent = async () => {
        setContentLoading(true);
        const { data, error } = await supabase
            .from("tblContent")
            .select("*")
            .order("created_at", { ascending: false });
        if (!error) setContent(data || []);
        setContentLoading(false);
    };

    const handleSave = async (payload) => {
        const name = `${user.firstname} ${user.lastname}`;
        if (editItem) {
            const { data, error } = await supabase
                .from("tblContent")
                .update({ ...payload, updated_at: new Date().toISOString() })
                .eq("id", editItem.id)
                .select();
            if (!error && data) {
                setContent(prev => prev.map(p => p.id === editItem.id ? data[0] : p));
                Swal.fire({
                    icon: "success", title: "Post updated", timer: 1400, showConfirmButton: false,
                    background: THEME.blackCard, color: THEME.textPrimary
                });
            }
        } else {
            const { data, error } = await supabase
                .from("tblContent")
                .insert([{ ...payload, published_by: name, published_by_id: user.id }])
                .select();
            if (!error && data) {
                setContent(prev => [data[0], ...prev]);
                Swal.fire({
                    icon: "success", title: "Published!", timer: 1400, showConfirmButton: false,
                    background: THEME.blackCard, color: THEME.textPrimary
                });
            }
        }
        setEditItem(null);
    };

    const handleEdit = (post) => {
        setEditItem(post);
        setShowModal(true);
    };

    const handleDelete = async (post) => {
        const confirm = await Swal.fire({
            icon: "warning", title: "Delete this post?",
            text: `"${post.title}" will be permanently removed.`,
            showCancelButton: true, confirmButtonText: "Delete",
            confirmButtonColor: "#dc2626",
            background: THEME.blackCard, color: THEME.textPrimary
        });
        if (!confirm.isConfirmed) return;
        if (post.image_url) await deleteOldImage(post.image_url);
        const { error } = await supabase.from("tblContent").delete().eq("id", post.id);
        if (!error) {
            setContent(prev => prev.filter(p => p.id !== post.id));
            Swal.fire({
                icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false,
                background: THEME.blackCard, color: THEME.textPrimary
            });
        }
    };


    // ── Drag & Drop Reordering ─────────────────────────────────────────────
    const handleDragStart = (e, post) => {
        setDraggedId(post.id);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", post.id);
        // Add a slight delay so the drag image is captured before hiding
        setTimeout(() => {
            e.target.style.opacity = "0.4";
        }, 0);
    };

    const handleDragEnd = (e) => {
        e.target.style.opacity = "1";
        setDraggedId(null);
        setDragOverId(null);
    };

    const handleDragOver = (e, post) => {
        e.preventDefault();
        if (draggedId && draggedId !== post.id) {
            setDragOverId(post.id);
        }
    };

    const handleDragLeave = () => {
        setDragOverId(null);
    };

    const handleDrop = async (e, targetPost) => {
        e.preventDefault();
        const sourceId = parseInt(e.dataTransfer.getData("text/plain"));
        const targetId = targetPost.id;

        if (sourceId === targetId) return;

        // Reorder locally
        const newOrder = [...filtered];
        const sourceIndex = newOrder.findIndex(p => p.id === sourceId);
        const targetIndex = newOrder.findIndex(p => p.id === targetId);

        if (sourceIndex === -1 || targetIndex === -1) return;

        const [movedItem] = newOrder.splice(sourceIndex, 1);
        newOrder.splice(targetIndex, 0, movedItem);

        // Update local state with new order
        if (filterType === "ALL") {
            setContent(newOrder);
        } else {
            // For filtered views, we need to update the full content array
            const otherItems = content.filter(p => p.type !== filterType);
            setContent([...newOrder, ...otherItems]);
        }

        setDragOverId(null);

        // Optionally save order to database (you can add a 'sort_order' column)
        // For now, we just reorder in memory
    };

    const filtered = filterType === "ALL"
        ? content
        : content.filter(p => p.type === filterType);

    // SVG icons
    const UsersIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    const SeedlingIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 22h20"/><path d="M12 2v20"/><path d="M12 2a9 9 0 0 1 9 9h-9V2z"/><path d="M12 2a9 9 0 0 0-9 9h9V2z"/></svg>;
    const PenIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>;
    const InboxIcon = <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>;

    return (
        <div className="layout" style={{ background: THEME.black, minHeight: "100vh" }}>
            <Sidebar />
            <div className="content" style={{ padding: "28px", maxWidth: "1400px" }}>

                {/* ── HEADER ───────────────────────────────────────────── */}
                <div style={{ marginBottom: "28px" }}>
                    <h1 style={{
                        margin: "0 0 6px 0", fontSize: "26px", fontWeight: 800,
                        color: THEME.textPrimary, letterSpacing: "-0.5px"
                    }}>
                        Dashboard
                    </h1>
                    <p style={{ margin: 0, fontSize: "13px", color: THEME.textMuted }}>
                        Welcome back, <span style={{ color: THEME.gold, fontWeight: 600 }}>{user?.firstname || "Leader"}</span>. Here&apos;s what&apos;s happening at MAC.
                    </p>
                </div>

                {/* ── STATS ROW ────────────────────────────────────────── */}
                <div style={{ display: "flex", gap: "14px", marginBottom: "28px", flexWrap: "wrap" }}>
                    <StatCard label="Leaders" value={stats.leaders} iconSvg={UsersIcon} accent={THEME.gold} />
                    <StatCard label="Newcomers" value={stats.newcomers} iconSvg={SeedlingIcon} accent="#60a5fa" />

                    {/* New Post Button */}
                    {canManageContent && (
                        <button
                            onClick={() => { setEditItem(null); setShowModal(true); }}
                            style={{
                                padding: "20px 24px", borderRadius: "14px", border: `1.5px solid ${THEME.gold}`,
                                background: THEME.goldMuted,
                                color: THEME.gold, fontWeight: 700, fontSize: "14px", cursor: "pointer",
                                display: "flex", alignItems: "center", gap: "10px",
                                transition: "all 0.3s ease", flex: "1 1 160px",
                                justifyContent: "center"
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = THEME.gold;
                                e.currentTarget.style.color = THEME.black;
                                e.currentTarget.style.boxShadow = THEME.shadowGold;
                                e.currentTarget.style.transform = "translateY(-2px)";
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = THEME.goldMuted;
                                e.currentTarget.style.color = THEME.gold;
                                e.currentTarget.style.boxShadow = "none";
                                e.currentTarget.style.transform = "translateY(0)";
                            }}
                        >
                            {PenIcon}
                            New Post
                        </button>
                    )}
                </div>

                {/* ── CONTENT FEED ─────────────────────────────────────── */}
                <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    marginBottom: "18px", flexWrap: "wrap", gap: "14px"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                            width: "4px", height: "24px", borderRadius: "2px",
                            background: THEME.gradientGold
                        }} />
                        <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: THEME.textPrimary }}>
                            MAC Updates
                        </h2>
                        {canManageContent && (
                            <span style={{ fontSize: "11px", color: THEME.textMuted, marginLeft: "8px" }}>
                                (Drag cards to reorder)
                            </span>
                        )}
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        { [ ["ALL", "All"], ["EVENT", "Events"], ["UPDATE", "Updates"], ["ANNOUNCEMENT", "Announcements"] ].map(([val, lbl]) => (
                            <FilterButton key={val} val={val} lbl={lbl} active={filterType === val} onClick={setFilterType} />
                        ))}
                    </div>
                </div>

                {/* ── POSTS GRID ───────────────────────────────────────── */}
                {contentLoading ? (
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
                            Loading posts...
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
                            {filterType === "ALL" ? "No posts yet." : `No ${filterType.toLowerCase()}s yet.`}
                        </p>
                        {canManageContent && (
                            <button onClick={() => { setEditItem(null); setShowModal(true); }} style={{
                                marginTop: "16px", padding: "12px 28px", borderRadius: "12px", border: "none",
                                background: THEME.gradientGold, color: THEME.black,
                                fontWeight: 700, fontSize: "13px", cursor: "pointer",
                                boxShadow: THEME.shadowGold, transition: "all 0.2s"
                            }}
                                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
                                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
                                Publish the first post
                            </button>
                        )}
                    </div>
                ) : (
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                        gap: "18px"
                    }}>
                        {filtered.map(post => (
                            <ContentCard
                                key={post.id}
                                post={post}
                                canEdit={canManageContent}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                isDragging={draggedId === post.id}
                                isDragOver={dragOverId === post.id}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            />
                        ))}
                    </div>
                )}
            </div>

            <ContentModal
                show={showModal}
                onClose={() => { setShowModal(false); setEditItem(null); }}
                onSave={handleSave}
                editItem={editItem}
            />

            {/* Spin animation */}
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

export default Dashboard;