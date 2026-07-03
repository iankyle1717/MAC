import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { setCurrentUser, setNewcomer } from "../utils/auth";
import logo from "../assets/logo.png";
import backround from "../assets/mac-cover.png";

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
    shadowGold: "0 4px 24px rgba(201, 164, 92, 0.15)",
    shadowDark: "0 4px 24px rgba(0, 0, 0, 0.4)",
};

const TYPE_META = {
    EVENT: { label: "Event", color: THEME.gold, bg: "rgba(201, 164, 92, 0.12)", icon: "E" },
    UPDATE: { label: "Update", color: "#60a5fa", bg: "rgba(96, 165, 250, 0.12)", icon: "U" },
    ANNOUNCEMENT: { label: "Announcement", color: "#f87171", bg: "rgba(248, 113, 113, 0.12)", icon: "A" },
};

// ── Public Content Card ─────────────────────────────────────────────────
function PublicContentCard({ post }) {
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
        <div style={{
            background: "rgba(255,255,255,0.03)",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.06)",
            overflow: "hidden",
            transition: "all 0.3s ease",
            backdropFilter: "blur(8px)"
        }}
            onMouseEnter={e => {
                e.currentTarget.style.borderColor = "rgba(201,164,92,0.25)";
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={e => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                e.currentTarget.style.transform = "translateY(0)";
            }}>

            {post.image_url && (
                <div style={{ position: "relative", overflow: "hidden", height: "180px" }}>
                    <img src={post.image_url} alt={post.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    <span style={{
                        position: "absolute", top: "8px", left: "8px",
                        padding: "3px 10px", borderRadius: "6px", fontSize: "10px", fontWeight: 800,
                        background: "rgba(10, 10, 10, 0.85)", color: meta.color,
                        border: `1px solid ${meta.color}40`, backdropFilter: "blur(4px)",
                        textTransform: "uppercase", letterSpacing: "0.5px"
                    }}>
                        {meta.label}
                    </span>
                </div>
            )}

            <div style={{ padding: "16px 18px" }}>
                {!post.image_url && (
                    <span style={{
                        display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "8px",
                        padding: "3px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: 800,
                        background: meta.bg, color: meta.color,
                        border: `1px solid ${meta.color}30`, textTransform: "uppercase", letterSpacing: "0.5px"
                    }}>
                        <span style={{
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            width: "14px", height: "14px", borderRadius: "3px",
                            background: meta.color, color: THEME.black, fontSize: "8px"
                        }}>{meta.icon}</span>
                        {meta.label}
                    </span>
                )}

                <h3 style={{ margin: "0 0 6px 0", fontSize: "15px", fontWeight: 700, color: "#fff", lineHeight: 1.35 }}>
                    {post.title}
                </h3>

                {post.type === "EVENT" && (
                    <div style={{
                        display: "flex", flexDirection: "column", gap: "3px", margin: "8px 0",
                        padding: "10px 12px", background: "rgba(15,23,42,0.6)", borderRadius: "8px",
                        border: "1px solid rgba(30,58,95,0.5)"
                    }}>
                        {post.event_date && (
                            <span style={{ fontSize: "11px", color: THEME.goldLight, fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={THEME.goldLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                {formatDate(post.event_date)}
                            </span>
                        )}
                        {post.event_time && (
                            <span style={{ fontSize: "11px", color: THEME.goldLight, fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={THEME.goldLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                {formatTime(post.event_time)}
                            </span>
                        )}
                        {post.event_location && (
                            <span style={{ fontSize: "11px", color: THEME.goldLight, fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={THEME.goldLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                {post.event_location}
                            </span>
                        )}
                    </div>
                )}

                {post.body && (
                    <p style={{ margin: "6px 0 8px 0", fontSize: "13px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
                        {post.body}
                    </p>
                )}

                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", gap: "4px" }}>
                    {post.published_by && <span>By <strong style={{ color: THEME.gold }}>{post.published_by}</strong></span>}
                    {post.published_by && <span>·</span>}
                    <span>{timeAgo(post.created_at)}</span>
                </div>
            </div>
        </div>
    );
}

// ── Filter Button ───────────────────────────────────────────────────────
function FilterButton({ val, lbl, active, onClick }) {
    return (
        <button onClick={() => onClick(val)} style={{
            padding: "5px 12px", borderRadius: "20px", border: "1.5px solid",
            borderColor: active ? THEME.gold : "rgba(255,255,255,0.1)",
            background: active ? "rgba(201,164,92,0.15)" : "transparent",
            color: active ? THEME.gold : "rgba(255,255,255,0.4)",
            fontSize: "11px", fontWeight: 600, cursor: "pointer",
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
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.4)";
                }
            }}>
            {lbl}
        </button>
    );
}

// ── Main Login ─────────────────────────────────────────────────────────────
function Login() {
    const navigate = useNavigate();
    const [mode, setMode] = useState("leader");
    const [leaderFirstname, setLeaderFirstname] = useState("");
    const [pin, setPin] = useState("");
    const [newcomerFirstname, setNewcomerFirstname] = useState("");
    const [newcomerLastname, setNewcomerLastname] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // MAC Updates state
    const [content, setContent] = useState([]);
    const [filterType, setFilterType] = useState("ALL");
    const [contentLoading, setContentLoading] = useState(true);

    const gold = "#c9a45c";
    const goldDark = "#a8883d";
    const goldLight = "#e0c88a";

    useEffect(() => {
        fetchContent();
    }, []);

    const fetchContent = async () => {
        setContentLoading(true);
        const { data, error } = await supabase
            .from("tblContent")
            .select("*")
            .order("created_at", { ascending: false });
        if (!error) setContent(data || []);
        setContentLoading(false);
    };

    const filtered = filterType === "ALL"
        ? content
        : content.filter(p => p.type === filterType);

    const handleLeaderLogin = async (e) => {
        e.preventDefault();
        setError("");
        if (!leaderFirstname || !pin) { setError("Please enter your first name and PIN."); return; }
        setLoading(true);
        const { data, error } = await supabase.from("tblMonitoring").select("*").ilike("firstname", leaderFirstname).eq("pin", pin).single();
        setLoading(false);
        if (error || !data) { setError("Invalid credentials. Please check your first name and PIN."); return; }
        setCurrentUser(data);
        if (data.type === "ADMIN" || data.ministry === "ADMIN") { navigate("/dashboard"); }
        else { navigate(`/leader/${data.id}`); }
    };

    const handleNewcomerLogin = async (e) => {
        e.preventDefault();
        setError("");
        if (!newcomerFirstname || !newcomerLastname) { setError("Please enter your first and last name."); return; }
        setLoading(true);
        const { data, error } = await supabase.from("tblNewMembers").select("*").ilike("firstname", newcomerFirstname).ilike("lastname", newcomerLastname).single();
        setLoading(false);
        if (error || !data) { setError("No record found. Please check your name or contact your leader."); return; }
        setNewcomer(data);
        navigate(`/newcomer/${data.id}`);
    };

    const iconCross = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";
    const iconHeart = "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z";
    const iconGlobe = "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z";
    const iconUsers = "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75";
    const iconBook = "M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z";
    const iconMapPin = "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z";

    const svgIcon = (path, size = 20) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d={path} />
        </svg>
    );

    return (
        <div className="login-page" style={{
            height: "100vh",
            width: "100vw",
            display: "flex",
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            overflow: "hidden",
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        }}>
            {/* LEFT SIDE — HERO + MAC UPDATES (scrollable) */}
            <div style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                position: "relative",
                overflow: "hidden",
                height: "100vh",
                minWidth: 0
            }}>
                {/* Background Image (fixed behind everything) */}
                <div style={{
                    position: "absolute",
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundImage: `url(${backround})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    zIndex: 0
                }} />
                {/* Dark Overlay */}
                <div style={{
                    position: "absolute",
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: "linear-gradient(160deg, rgba(12,12,16,0.92) 0%, rgba(20,16,10,0.88) 50%, rgba(10,8,6,0.95) 100%)",
                    zIndex: 1
                }} />
                {/* Subtle gold glow */}
                <div style={{
                    position: "absolute",
                    top: "-10%",
                    right: "-10%",
                    width: "50%",
                    height: "50%",
                    background: "radial-gradient(circle, rgba(201,164,92,0.08) 0%, transparent 70%)",
                    zIndex: 1,
                    pointerEvents: "none"
                }} />

                {/* Scrollable Content */}
                <div style={{
                    position: "relative",
                    zIndex: 2,
                    flex: 1,
                    overflowY: "auto",
                    padding: "40px 50px",
                    scrollbarWidth: "thin",
                    scrollbarColor: "rgba(201,164,92,0.3) transparent"
                }}>
                    <div style={{ maxWidth: "900px" }}>
                        {/* TOP LABEL */}
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                            <div style={{ width: "32px", height: "2px", background: gold }} />
                            <span style={{ fontSize: "12px", fontWeight: 700, color: gold, textTransform: "uppercase", letterSpacing: "3px" }}>
                                Modern Acts Church Cabangan Zambales
                            </span>
                        </div>

                        {/* MAIN HEADLINE */}
                        <h1 style={{ fontSize: "48px", fontWeight: 900, color: "#fff", lineHeight: 1.1, margin: "0 0 10px 0", letterSpacing: "-0.5px" }}>
                            You Belong <span style={{ color: gold }}>Here</span>
                        </h1>
                        <p style={{ fontSize: "22px", fontWeight: 600, color: goldLight, margin: "0 0 8px 0" }}>
                            Gather With Us, <span style={{ color: gold }}>Be Transformed Together</span>
                        </p>
                        <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.45)", lineHeight: 1.7, margin: "0 0 20px 0", maxWidth: "400px" }}>
                            We are disciple equipping servants of God, influencing people through faith and purpose that transforms communities, campuses, families and lives for the glory of God.
                        </p>

                        {/* THREE PILLARS */}
                        <div style={{
                            display: "flex",
                            gap: "0",
                            marginBottom: "24px",
                            borderTop: "1px solid rgba(201,164,92,0.2)",
                            borderBottom: "1px solid rgba(201,164,92,0.2)",
                            padding: "14px 0"
                        }}>
                            {[
                                { icon: iconBook, label: "LOVE GOD" },
                                { icon: iconHeart, label: "LOVE PEOPLE" },
                                { icon: iconGlobe, label: "MAKE DISCIPLES" }
                            ].map((item, i) => (
                                <div key={i} style={{
                                    flex: 1,
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: "6px",
                                    borderRight: i < 2 ? "1px solid rgba(201,164,92,0.15)" : "none",
                                    padding: "0 8px"
                                }}>
                                    <div style={{ color: gold, opacity: 0.9 }}>
                                        {svgIcon(item.icon, 22)}
                                    </div>
                                    <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "1.5px" }}>
                                        {item.label}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* SCRIPTURE QUOTE */}
                        <div style={{ marginBottom: "24px", position: "relative", paddingLeft: "16px" }}>
                            <div style={{ position: "absolute", left: 0, top: "4px", bottom: "4px", width: "2px", background: `linear-gradient(to bottom, ${gold}, ${goldDark})`, borderRadius: "2px" }} />
                            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", fontStyle: "italic", lineHeight: 1.6, margin: 0, fontFamily: "Georgia, serif" }}>
                                "Therefore go and <span style={{ color: gold, fontWeight: 600 }}>make disciples</span> of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit, and teaching them to obey everything I have commanded you."
                            </p>
                            <p style={{ fontSize: "11px", color: gold, fontWeight: 700, margin: "6px 0 0 0", letterSpacing: "1px" }}>
                                MATTHEW 28:19-20
                            </p>
                        </div>

                        {/* WEEKLY GATHERINGS */}
                        <div style={{ marginBottom: "24px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                                <div style={{ width: "20px", height: "1px", background: gold }} />
                                <span style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "2px" }}>
                                    Weekly Gatherings
                                </span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                {[
                                    { title: "Prayer Works", time: "Every Thursday · 5:30 PM", tag: "PRAYER", tagColor: gold, tagBg: "rgba(201,164,92,0.12)" },
                                    { title: "Youth GIG", time: "Every Friday · 5:00 PM", tag: "YOUTH", tagColor: "#f59e0b", tagBg: "rgba(245,158,11,0.12)" },
                                    { title: "Sunday Family Celebration", time: "Every Sunday · Family Worship", tag: "FAMILY", tagColor: "#10b981", tagBg: "rgba(16,185,129,0.12)" }
                                ].map((g, i) => (
                                    <div key={i} style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                        padding: "8px 12px",
                                        background: "rgba(255,255,255,0.03)",
                                        borderRadius: "8px",
                                        border: "1px solid rgba(255,255,255,0.05)",
                                        backdropFilter: "blur(8px)"
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontSize: "14px", fontWeight: 700, color: "rgba(255,255,255,0.85)", margin: "0 0 1px 0" }}>{g.title}</p>
                                            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", margin: 0 }}>{g.time}</p>
                                        </div>
                                        <span style={{
                                            fontSize: "10px", fontWeight: 800, color: g.tagColor, background: g.tagBg,
                                            padding: "4px 12px", borderRadius: "12px", textTransform: "uppercase", letterSpacing: "1px"
                                        }}>{g.tag}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* BOTTOM PILLARS */}
                        <div style={{
                            display: "flex",
                            gap: "0",
                            borderTop: "1px solid rgba(201,164,92,0.15)",
                            paddingTop: "14px",
                            marginBottom: "24px"
                        }}>
                            {[
                                { icon: iconCross, title: "WORSHIP", sub: "In Spirit and in Truth" },
                                { icon: iconUsers, title: "GROW", sub: "Together in Faith" },
                                { icon: iconGlobe, title: "GO", sub: "To All Nations" }
                            ].map((item, i) => (
                                <div key={i} style={{
                                    flex: 1,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    borderRight: i < 2 ? "1px solid rgba(201,164,92,0.1)" : "none",
                                    padding: "0 10px"
                                }}>
                                    <div style={{
                                        width: "28px", height: "28px", borderRadius: "50%",
                                        border: `1px solid ${gold}40`,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        color: gold, flexShrink: 0
                                    }}>
                                        {svgIcon(item.icon, 13)}
                                    </div>
                                    <div>
                                        <p style={{ margin: 0, fontSize: "10px", fontWeight: 800, color: gold, letterSpacing: "1px" }}>{item.title}</p>
                                        <p style={{ margin: "1px 0 0 0", fontSize: "9px", color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>{item.sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* LOCATION */}
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                            <span style={{ color: "rgba(201,164,92,0.5)" }}>{svgIcon(iconMapPin, 11)}</span>
                            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", margin: 0, letterSpacing: "0.3px" }}>
                                National Highway, Brgy. Del Carmen, Cabangan, Zambales
                            </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "32px" }}>
                            <span style={{ color: "rgba(201,164,92,0.5)" }}>{svgIcon(iconMapPin, 11)}</span>
                            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", margin: 0, letterSpacing: "0.3px" }}>
                                Contact us: 0938 284 8841
                            </p>
                        </div>

                        {/* ── MAC UPDATES SECTION ── */}
                        <div style={{ marginBottom: "40px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                                <div style={{
                                    width: "4px", height: "24px", borderRadius: "2px",
                                    background: THEME.gradientGold
                                }} />
                                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#fff" }}>
                                    MAC Updates
                                </h2>
                                <div style={{ flex: 1, height: "1px", background: "rgba(201,164,92,0.15)", marginLeft: "10px" }} />
                            </div>

                            {/* Filter Pills */}
                            <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
                                {[ ["ALL", "All"], ["EVENT", "Events"], ["UPDATE", "Updates"], ["ANNOUNCEMENT", "Announcements"] ].map(([val, lbl]) => (
                                    <FilterButton key={val} val={val} lbl={lbl} active={filterType === val} onClick={setFilterType} />
                                ))}
                            </div>

                            {/* Posts */}
                            {contentLoading ? (
                                <div style={{ textAlign: "center", padding: "30px 20px" }}>
                                    <div style={{
                                        width: "28px", height: "28px", border: `2px solid rgba(255,255,255,0.1)`,
                                        borderTopColor: THEME.gold, borderRadius: "50%",
                                        margin: "0 auto 12px", animation: "spin 0.8s linear infinite"
                                    }} />
                                    <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>Loading updates...</p>
                                </div>
                            ) : filtered.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "30px 20px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "8px" }}>
                                        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
                                        <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
                                    </svg>
                                    <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px", fontWeight: 500 }}>
                                        {filterType === "ALL" ? "No updates yet." : `No ${filterType.toLowerCase()}s yet.`}
                                    </p>
                                </div>
                            ) : (
                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(3, 1fr)",
                                    gap: "12px"
                                }}>
                                    {filtered.map(post => (
                                        <PublicContentCard key={post.id} post={post} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE — LOGIN FORM ONLY */}
            <div style={{
                width: "420px",
                minWidth: "420px",
                background: "#ffffff",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "48px 40px",
                position: "relative",
                zIndex: 2,
                boxShadow: "-20px 0 60px rgba(0,0,0,0.15)",
                height: "100vh",
                overflowY: "auto"
            }}>
                {/* Church Logo & Name */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
                    <img src={logo} alt="MAC" style={{ borderRadius: "30%", width: "52px", height: "52px", objectFit: "contain" }} />
                    <div>
                        <p style={{ fontSize: "16px", fontWeight: 800, color: "#111827", margin: "0 0 1px 0" }}>Modern Acts Church</p>
                        <p style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "2px", margin: 0 }}>Cabangan</p>
                    </div>
                </div>

                <div style={{ marginBottom: "24px" }}>
                    <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#111827", margin: "0 0 6px 0" }}>Welcome Back</h2>
                    <p style={{ fontSize: "13px", color: "#6b7280", margin: 0, lineHeight: 1.6 }}>
                        Sign in to access your discipleship records and ministry dashboard.
                    </p>
                </div>

                {/* Mode Toggle */}
                <div style={{ display: "flex", gap: "4px", background: "#f3f4f6", borderRadius: "10px", padding: "4px", marginBottom: "22px" }}>
                    <button onClick={() => { setMode("leader"); setError(""); }}
                        style={{
                            flex: 1, padding: "10px 14px", borderRadius: "8px", border: "none",
                            fontSize: "12px", fontWeight: 700, cursor: "pointer", transition: "all 0.25s ease",
                            background: mode === "leader" ? gold : "transparent",
                            color: mode === "leader" ? "#fff" : "#6b7280"
                        }}>
                        Leader
                    </button>
                    <button onClick={() => { setMode("newcomer"); setError(""); }}
                        style={{
                            flex: 1, padding: "10px 14px", borderRadius: "8px", border: "none",
                            fontSize: "12px", fontWeight: 700, cursor: "pointer", transition: "all 0.25s ease",
                            background: mode === "newcomer" ? "#16a34a" : "transparent",
                            color: mode === "newcomer" ? "#fff" : "#6b7280"
                        }}>
                        Newcomer
                    </button>
                </div>

                {error && (
                    <div style={{
                        background: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: "8px",
                        fontSize: "12px", fontWeight: 500, marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px",
                        border: "1px solid #fecaca"
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        {error}
                    </div>
                )}

                {mode === "leader" ? (
                    <form onSubmit={handleLeaderLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#374151", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                First Name
                            </label>
                            <input type="text" placeholder="Enter your first name" value={leaderFirstname} onChange={(e) => setLeaderFirstname(e.target.value)}
                                style={{
                                    width: "100%", padding: "12px 14px", borderRadius: "8px", border: "2px solid #e5e7eb",
                                    fontSize: "14px", transition: "all 0.2s", outline: "none", boxSizing: "border-box", background: "#fafafa"
                                }}
                                onFocus={(e) => { e.target.style.borderColor = gold; e.target.style.boxShadow = `0 0 0 3px rgba(201,164,92,0.1)`; e.target.style.background = "#fff"; }}
                                onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; e.target.style.background = "#fafafa"; }}
                            />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#374151", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                Password (PIN)
                            </label>
                            <input type="password" placeholder="Enter your PIN" value={pin} onChange={(e) => setPin(e.target.value)}
                                style={{
                                    width: "100%", padding: "12px 14px", borderRadius: "8px", border: "2px solid #e5e7eb",
                                    fontSize: "14px", transition: "all 0.2s", outline: "none", boxSizing: "border-box", background: "#fafafa"
                                }}
                                onFocus={(e) => { e.target.style.borderColor = gold; e.target.style.boxShadow = `0 0 0 3px rgba(201,164,92,0.1)`; e.target.style.background = "#fff"; }}
                                onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; e.target.style.background = "#fafafa"; }}
                            />
                        </div>
                        <button type="submit" disabled={loading}
                            style={{
                                width: "100%", padding: "13px", borderRadius: "8px", border: "none", background: gold,
                                color: "#fff", fontSize: "14px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                                opacity: loading ? 0.7 : 1, transition: "all 0.2s", marginTop: "2px",
                                boxShadow: "0 4px 14px rgba(201,164,92,0.3)"
                            }}
                            onMouseEnter={(e) => { if (!loading) { e.target.style.background = goldDark; e.target.style.boxShadow = "0 6px 20px rgba(201,164,92,0.4)"; } }}
                            onMouseLeave={(e) => { e.target.style.background = gold; e.target.style.boxShadow = "0 4px 14px rgba(201,164,92,0.3)"; }}
                        >
                            {loading ? "Logging in..." : "Sign In as Leader"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleNewcomerLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#374151", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                First Name
                            </label>
                            <input type="text" placeholder="Enter your first name" value={newcomerFirstname} onChange={(e) => setNewcomerFirstname(e.target.value)}
                                style={{
                                    width: "100%", padding: "12px 14px", borderRadius: "8px", border: "2px solid #e5e7eb",
                                    fontSize: "14px", transition: "all 0.2s", outline: "none", boxSizing: "border-box", background: "#fafafa"
                                }}
                                onFocus={(e) => { e.target.style.borderColor = "#16a34a"; e.target.style.boxShadow = "0 0 0 3px rgba(22,163,74,0.1)"; e.target.style.background = "#fff"; }}
                                onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; e.target.style.background = "#fafafa"; }}
                            />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#374151", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                Last Name
                            </label>
                            <input type="text" placeholder="Enter your last name" value={newcomerLastname} onChange={(e) => setNewcomerLastname(e.target.value)}
                                style={{
                                    width: "100%", padding: "12px 14px", borderRadius: "8px", border: "2px solid #e5e7eb",
                                    fontSize: "14px", transition: "all 0.2s", outline: "none", boxSizing: "border-box", background: "#fafafa"
                                }}
                                onFocus={(e) => { e.target.style.borderColor = "#16a34a"; e.target.style.boxShadow = "0 0 0 3px rgba(22,163,74,0.1)"; e.target.style.background = "#fff"; }}
                                onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; e.target.style.background = "#fafafa"; }}
                            />
                        </div>
                        <button type="submit" disabled={loading}
                            style={{
                                width: "100%", padding: "13px", borderRadius: "8px", border: "none", background: "#16a34a",
                                color: "#fff", fontSize: "14px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                                opacity: loading ? 0.7 : 1, transition: "all 0.2s", marginTop: "2px",
                                boxShadow: "0 4px 14px rgba(22,163,74,0.3)"
                            }}
                            onMouseEnter={(e) => { if (!loading) { e.target.style.background = "#15803d"; e.target.style.boxShadow = "0 6px 20px rgba(22,163,74,0.4)"; } }}
                            onMouseLeave={(e) => { e.target.style.background = "#16a34a"; e.target.style.boxShadow = "0 4px 14px rgba(22,163,74,0.3)"; }}
                        >
                            {loading ? "Loading..." : "View My Journey"}
                        </button>
                        <p style={{ textAlign: "center", fontSize: "11px", color: "#9ca3af", margin: "4px 0 0 0", lineHeight: 1.5 }}>
                            No password needed. Just enter your name to track your progress.
                        </p>
                    </form>
                )}

                <div style={{ marginTop: "auto", paddingTop: "32px", textAlign: "center" }}>
                    <p style={{ fontSize: "11px", color: "#d1d5db", margin: 0 }}>&copy; 2026 Modern Acts Church Cabangan</p>
                </div>
            </div>

            {/* Animations */}
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @media (max-width: 900px) {
                    .login-page { flex-direction: column-reverse !important; overflow-y: auto !important; height: auto !important; position: relative !important; }
                    .login-page > div:first-child { height: auto !important; min-height: 100vh !important; }
                    .login-page > div:last-child { width: 100% !important; min-width: auto !important; box-shadow: none !important; height: auto !important; padding: 32px 24px !important; }
                }
            `}</style>
        </div>
    );
}

export default Login;