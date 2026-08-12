import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";
import { getCurrentUser, isAdmin } from "../utils/auth";
import backround from "../assets/mac-cover.png";

// Stage definitions
const consoStages = ["1st Timer", "2nd Timer", "3rd Timer"];
const soulWinningStages = [
    "Life Track (BUHAY)", "Life Start - Jesus", "Life Start - TWL",
    "Life Start - Bible and Devotion", "Life Start - Prayer",
    "Life Start - Sharing to Others", "Lifegroup and Church"
];
const soakingStages = [
    "Candidate for Life Retreat", "Pre Life Retreat", "Life Retreat",
    "Victorious Life Class", "Project Peter"
];
const schoolingStages = ["Foundation Class", "Make Disciple Class", "Life Group Class"];

const getStageCategory = (stage) => {
    if (!stage) return "UNKNOWN";
    if (consoStages.includes(stage) || soulWinningStages.includes(stage)) return "WINNING";
    if (soakingStages.includes(stage)) return "SOAKING";
    if (schoolingStages.includes(stage)) return "SCHOOLING";
    return "UNKNOWN";
};

const getCategoryColor = (category) => {
    const colors = {
        "WINNING":  { bg: "#e8f5e9", color: "#2e7d32", label: "Winning" },
        "SOAKING":  { bg: "#fff3e0", color: "#e65100", label: "Soaking" },
        "SCHOOLING":{ bg: "#e3f2fd", color: "#1565c0", label: "Schooling" },
        "UNKNOWN":  { bg: "#f5f5f5", color: "#616161", label: "Unknown" }
    };
    return colors[category] || colors["UNKNOWN"];
};

const getLeaderMinistries = (leader) => {
    if (!leader) return [];
    if (Array.isArray(leader.ministries) && leader.ministries.length > 0) return leader.ministries;
    if (leader.ministry && leader.ministry !== "NONE") return [leader.ministry];
    return [];
};

// COLOR PALETTE
const theme = {
    primary: "#8b7355",
    primaryLight: "#a68b6a",
    primaryMuted: "#c4b5a0",
    text: "#2d2d2d",
    textSecondary: "#6b6b6b",
    textMuted: "#9e9e9e",
    border: "#e8e4df",
    borderLight: "#f0ede8",
    bg: "#faf9f7",
    card: "#ffffff",
    success: "#5a8f5a",
    warning: "#b8860b",
    danger: "#a0524d",
    info: "#5a7a9a",
    purple: "#7a6b8a"
};

// ── Excel-style table tokens (matches Assimilation / Attendance pages) ─────
const ETH = (extra = {}) => ({
    padding: "5px 4px",
    fontWeight: 700,
    fontSize: "11px",
    textAlign: "center",
    color: "#000",
    background: "#f3f4f6",
    border: "1px solid #000",
    whiteSpace: "nowrap",
    ...extra,
});

const ETD = (extra = {}) => ({
    padding: "6px 8px",
    fontSize: "11px",
    textAlign: "left",
    border: "1px solid #000",
    background: "#fff",
    color: theme.text,
    fontWeight: 500,
    ...extra,
});

// SVG ICON PATHS
const iconPaths = {
    user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    tag: "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z M7 7h.01",
    users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
    star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    heart: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
    link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
    compass: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    "dollar-sign": "M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
    "map-pin": "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
    book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z",
    "user-plus": "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M20 8v6 M23 11h-6"
};

const activityIcons = {
    "map-pin": "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
    "dollar-sign": "M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
    book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z",
    users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
    "user-plus": "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M20 8v6 M23 11h-6"
};

function LeaderProfile() {
    const { id } = useParams();
    const [leader, setLeader] = useState(null);
    const [spouse, setSpouse] = useState(null);
    const [activeTab, setActiveTab] = useState("overview");
    const [tithes, setTithes] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [devotion, setDevotion] = useState([]);
    const [lifeGroups, setLifeGroups] = useState([]);
    const [invites, setInvites] = useState([]);
    const [moments, setMoments] = useState([]);
    const currentUser = getCurrentUser();

    // ── Pagination for tables ────────────────────────────────────────────
    const [tablePage, setTablePage] = useState(1);
    const ROWS_PER_PAGE = 10;
    // ───────────────────────────────────────────────────────────────────────

    const admin = isAdmin();
    const isOwnProfile = currentUser?.id === Number(id);
    const canEditProfile = isOwnProfile || admin;

    // ── CHANGED: Everyone can view any profile ────────────────────────────
    // Only Admin can view TLDA tabs (Attendance, Tithes, Devotion)
    const canViewTLDA = admin; // Only admin sees Attendance, Tithes, Devotion
    // ───────────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (!currentUser) { window.location.href = "/login"; return; }
        fetchLeader();
        fetchTithes();
        fetchAttendance();
        fetchDevotion();
        fetchLifeGroups();
        fetchMoments();
    }, [id]);

    // Reset pagination when tab changes
    useEffect(() => {
        setTablePage(1);
    }, [activeTab]);

    const fetchSpouse = async (leaderData) => {
        if (!leaderData) return;
        if (leaderData.combined_with) {
            const { data } = await supabase
                .from("tblMonitoring")
                .select("id, firstname, lastname, image_url")
                .eq("id", leaderData.combined_with)
                .single();
            if (data) setSpouse(data);
            return;
        }
        const { data } = await supabase
            .from("tblMonitoring")
            .select("id, firstname, lastname, image_url")
            .eq("combined_with", leaderData.id)
            .single();
        if (data) setSpouse(data);
    };

    const fetchLeader = async () => {
        const { data } = await supabase
            .from("tblMonitoring").select("*").eq("id", id).single();
        setLeader(data);
        if (data) {
            fetchInvites(`${data.firstname} ${data.lastname}`);
            fetchSpouse(data);
        }
    };

    const fetchInvites = async (leaderName) => {
        const { data } = await supabase
            .from("tblNewMembers").select("*")
            .eq("invited_by", leaderName)
            .order("id", { ascending: false });
        setInvites(data || []);
    };

    const fetchTithes = async () => {
        const { data } = await supabase
            .from("tblTithes").select("*").eq("leader_id", id)
            .order("date", { ascending: false });
        setTithes(data || []);
    };

    const fetchAttendance = async () => {
        const { data } = await supabase
            .from("tblAttendance").select("*").eq("leader_id", id)
            .order("service_date", { ascending: false });
        setAttendance(data || []);
    };

    const fetchDevotion = async () => {
        const { data } = await supabase
            .from("tblDevotion").select("*").eq("leader_id", id)
            .order("month", { ascending: false });
        setDevotion(data || []);
    };



    const fetchMoments = async () => {
        const { data } = await supabase
            .from("tblMoments")
            .select("*")
            .eq("user_id", id)
            .gt("expires_at", new Date().toISOString())
            .order("created_at", { ascending: false });
        setMoments(data || []);
    };

    const fetchLifeGroups = async () => {
        const { data } = await supabase
            .from("tblLifeGroup").select("*").eq("leader_id", id)
            .order("date", { ascending: false });
        setLifeGroups(data || []);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        const d = new Date(dateStr + "T00:00:00");
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    const getStats = () => {
        const totalTithes = tithes.reduce((s, t) => s + Number(t.amount || 0), 0);
        const presentCount = attendance.filter(a => a.status === "Present").length;
        const attendanceRate = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 0;
        const devotionMonths = devotion.length;
        const consistentMonths = devotion.filter(d => d.completed_days >= 25).length;
        const avgDevotion = devotionMonths > 0
            ? Math.round(devotion.reduce((s, d) => s + d.completed_days, 0) / devotionMonths)
            : 0;
        const inviteCounts = {
            total: invites.length,
            winning: invites.filter(m => getStageCategory(m.remarks) === "WINNING").length,
            soaking: invites.filter(m => getStageCategory(m.remarks) === "SOAKING").length,
            schooling: invites.filter(m => getStageCategory(m.remarks) === "SCHOOLING").length,
        };
        const lifeGroupCount = lifeGroups.length;
        return { totalTithes, attendanceRate, presentCount, totalAttendance: attendance.length, devotionMonths, consistentMonths, avgDevotion, inviteCounts, lifeGroupCount };
    };

    const stats = getStats();
    const leaderMinistries = getLeaderMinistries(leader);

    // ── Pagination helper ────────────────────────────────────────────
    const getPaginatedData = (data, page) => {
        const totalPages = Math.ceil(data.length / ROWS_PER_PAGE) || 1;
        const start = (page - 1) * ROWS_PER_PAGE;
        return {
            items: data.slice(start, start + ROWS_PER_PAGE),
            totalPages,
            startIndex: start
        };
    };

    const PaginationControls = ({ totalPages, dataLength }) => (
        dataLength > ROWS_PER_PAGE && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", padding: "10px", borderTop: "1px solid " + c.borderLight }}>
                <button
                    onClick={() => setTablePage(p => Math.max(1, p - 1))}
                    disabled={tablePage === 1}
                    style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        border: "1px solid " + c.border,
                        background: tablePage === 1 ? c.borderLight : c.card,
                        color: tablePage === 1 ? c.textMuted : c.text,
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: tablePage === 1 ? "not-allowed" : "pointer",
                        transition: "all 0.2s"
                    }}
                >
                    ← Prev
                </button>
                <span style={{ fontSize: "11px", color: c.textMuted, fontWeight: 500, minWidth: "80px", textAlign: "center" }}>
                    Page {tablePage} of {totalPages}
                </span>
                <button
                    onClick={() => setTablePage(p => Math.min(totalPages, p + 1))}
                    disabled={tablePage === totalPages}
                    style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        border: "1px solid " + c.border,
                        background: tablePage === totalPages ? c.borderLight : c.card,
                        color: tablePage === totalPages ? c.textMuted : c.text,
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: tablePage === totalPages ? "not-allowed" : "pointer",
                        transition: "all 0.2s"
                    }}
                >
                    Next →
                </button>
            </div>
        )
    );
    // ───────────────────────────────────────────────────────────────────────

    if (!leader) return (
        <div className="layout">
            <Sidebar />
            <div className="content" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
                <p style={{ color: theme.textMuted, fontSize: "13px" }}>Loading profile...</p>
            </div>
        </div>
    );

    // ── CHANGED: Removed access denied check — everyone can view profiles ──
    // Only hide TLDA tabs from non-admins

    const tabs = [
        { key: "overview", label: "Overview", always: true },
        { key: "attendance", label: "Attendance", show: canViewTLDA },      // Admin only
        { key: "tithes", label: "Tithes", show: canViewTLDA },              // Admin only
        { key: "devotion", label: "Devotion", show: canViewTLDA },          // Admin only
        { key: "lifegroup", label: "Life Group", always: true },
        { key: "moments", label: "Moments", always: true },
        { key: "invites", label: "Invites", always: true },
    ].filter(t => t.always || t.show);

    const c = theme;

    // ── Excel-style table wrapper tokens (matches Assimilation / Attendance) ──
    const tableStyles = {
        container: { overflowX: "auto", border: "1px solid #000" },
        table: { width: "100%", borderCollapse: "collapse", fontSize: "11px", minWidth: "560px" },
        thead: { position: "sticky", top: 0, zIndex: 10 },
        th: ETH,
        td: ETD,
        badge: (bg, color) => ({ display: "inline-block", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: 700, background: bg, color, letterSpacing: "0.3px", whiteSpace: "nowrap" }),
        progressBar: { width: "100%", height: "5px", background: c.borderLight, borderRadius: "3px", overflow: "hidden", marginTop: "2px" },
        progressFill: (pct, color) => ({ width: `${pct}%`, height: "100%", background: color, borderRadius: "3px", transition: "width 0.4s ease", opacity: 0.85 }),
        rightAlign: { textAlign: "right" },
        centerAlign: { textAlign: "center" },
        textMuted: { color: c.textMuted, fontWeight: 400 },
    };

    return (
        <div className="layout">
            <Sidebar />
            <div className="content" style={{ background: c.bg, minHeight: "100vh", padding: "0", overflow: "hidden" }}>

                {/* COVER PHOTO */}
                <div style={{ position: "relative" }}>
                    <div style={{
                        height: "250px",
                        width: "100%",
                        backgroundImage: `url(${backround})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        position: "relative"
                    }}>
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 100%)" }} />
                    </div>

                    <div style={{
                        position: "relative",
                        marginTop: "-36px",
                        padding: "0 20px 12px",
                        display: "flex",
                        alignItems: "flex-end",
                        gap: "14px"
                    }}>
                        <div style={{ position: "relative", flexShrink: 0 }}>
                            <img
                                src={leader.image_url || "https://placehold.co/80x80/f0ede8/9e9e9e?text=U"}
                                alt="Leader"
                                style={{
                                    width: "100px",
                                    height: "100px",
                                    borderRadius: "50%",
                                    objectFit: "cover",
                                    border: "3px solid " + c.bg,
                                    boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
                                    background: c.card
                                }}
                            />
                            {leader.civil_status === "Married" && (
                                <div style={{
                                    position: "absolute",
                                    bottom: "4px",
                                    right: "4px",
                                    width: "16px",
                                    height: "16px",
                                    borderRadius: "50%",
                                    background: c.success,
                                    border: "2px solid " + c.bg,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}>
                                    <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                    </svg>
                                </div>
                            )}
                        </div>

                        <div style={{ paddingBottom: "4px", flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "12px" }}>
                                <div style={{ minWidth: 0 }}>
                                    <h1 style={{ fontSize: "16px", fontWeight: 700, color: c.text, margin: "0 0 2px 0", lineHeight: 1.2, letterSpacing: "-0.2px" }}>
                                        {leader.firstname} {leader.lastname}
                                    </h1>
                                </div>

                                {canEditProfile && (
                                    <Link to={`/edit-leader/${leader.id}`} style={{ textDecoration: "none", flexShrink: 0 }}>
                                        <button style={{
                                            padding: "5px 12px",
                                            borderRadius: "6px",
                                            border: "1px solid " + c.border,
                                            background: c.card,
                                            color: c.textSecondary,
                                            fontSize: "11px",
                                            fontWeight: 600,
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "4px",
                                            transition: "all 0.2s",
                                            boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
                                        }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = c.primaryMuted; e.currentTarget.style.color = c.primary; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.color = c.textSecondary; }}
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                            </svg>
                                            Edit
                                        </button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* QUICK STATS ROW */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "1px",
                    background: c.border,
                    marginBottom: "0"
                }}>
                    {[
                        { label: "Devotion", value: `${stats.avgDevotion}`, sub: `${stats.consistentMonths}/${stats.devotionMonths} consistent`, color: c.warning },
                        { label: "Invites", value: `${stats.inviteCounts.total}`, sub: `${stats.inviteCounts.winning} winning`, color: c.danger },
                        { label: "Life Group", value: `${stats.lifeGroupCount}`, sub: "sessions", color: c.purple },
                    ].map((stat, i) => (
                        <div key={i} style={{ background: c.card, padding: "10px 8px", textAlign: "center", transition: "all 0.2s", cursor: "default" }}
                            onMouseEnter={e => { e.currentTarget.style.background = c.bg; }}
                            onMouseLeave={e => { e.currentTarget.style.background = c.card; }}
                        >
                            <p style={{ margin: "0", fontSize: "18px", fontWeight: 700, color: c.text, lineHeight: 1.2, letterSpacing: "-0.3px" }}>{stat.value}</p>
                            <p style={{ margin: "3px 0 0 0", fontSize: "9px", color: c.textMuted, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>{stat.label}</p>
                            <p style={{ margin: "1px 0 0 0", fontSize: "9px", color: stat.color, fontWeight: 600 }}>{stat.sub}</p>
                        </div>
                    ))}
                </div>

                {/* TAB NAVIGATION */}
                <div style={{ display: "flex", gap: "0", borderBottom: "1px solid " + c.border, background: c.card, padding: "0 20px" }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                padding: "10px 14px",
                                border: "none",
                                background: "transparent",
                                color: activeTab === tab.key ? c.primary : c.textMuted,
                                fontSize: "12px",
                                fontWeight: activeTab === tab.key ? 600 : 500,
                                borderBottom: activeTab === tab.key ? "2px solid " + c.primary : "2px solid transparent",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                                transition: "all 0.2s",
                                letterSpacing: "0.2px"
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* TAB CONTENT */}
                <div style={{ padding: "12px 20px", overflow: "hidden" }}>

                    {/* OVERVIEW TAB */}
                    {activeTab === "overview" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            <Card title="About">
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
                                    <InfoRow icon="user" label="Full Name" value={`${leader.firstname} ${leader.lastname}`} />
                                    <InfoRow icon="tag" label="Nickname" value={leader.nickname || "—"} />
                                    <InfoRow icon="users" label="Tribe" value={leader.tribe} />
                                    <InfoRow icon="star" label="Leader Type" value={leader.type} />
                                    <InfoRow icon="heart" label="Ministries" value={leaderMinistries.join(", ") || "None"} />
                                    <InfoRow icon="heart" label="Civil Status" value={leader.civil_status || "Single"} />
                                    {spouse && (
                                        <InfoRow icon="heart" label="Married With" value={
                                            <Link to={`/leader-profile/${spouse.id}`} style={{ color: c.primary, textDecoration: "none", fontWeight: 700 }}>
                                                {spouse.firstname} {spouse.lastname}
                                            </Link>
                                        } />
                                    )}
                                    {leader.civil_status === "Married" && (
                                        <InfoRow icon="link" label="Tithing" value={leader.tithing_type || "Individual"} />
                                    )}
                                    {leader.dj_type && (
                                        <InfoRow icon="compass" label="DJ Role" value={`${leader.dj_type}${leader.assigned_tribe ? ` · ${leader.assigned_tribe}` : ""}`} />
                                    )}
                                    {leader.gross_income && (
                                        <InfoRow icon="dollar-sign" label="Gross Income" value={`₱${Number(leader.gross_income).toLocaleString()}`} />
                                    )}
                                </div>
                            </Card>

                            <Card title="Recent Activity">
                                <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                                    {attendance.length > 0 && (
                                        <ActivityRow icon="map-pin" color={c.info} title="Latest Attendance" detail={`${formatDate(attendance[0].service_date)} — ${attendance[0].status}`}
                                            badge={attendance[0].status} badgeColor={attendance[0].status === "Present" ? c.success : c.danger} badgeBg={attendance[0].status === "Present" ? "#e8f5e9" : "#ffebee"} />
                                    )}
                                    {tithes.length > 0 && (
                                        <ActivityRow icon="dollar-sign" color={c.success} title="Latest Tithe" detail={`${formatDate(tithes[0].date)} — ₱${Number(tithes[0].amount).toLocaleString()}`} />
                                    )}
                                    {devotion.length > 0 && (
                                        <ActivityRow icon="book" color={c.warning} title="Latest Devotion" detail={`${devotion[0].month} — ${devotion[0].completed_days}/${devotion[0].total_days} days`}
                                            badge={devotion[0].completed_days >= 25 ? "Consistent" : "Inconsistent"} badgeColor={devotion[0].completed_days >= 25 ? c.success : c.danger} badgeBg={devotion[0].completed_days >= 25 ? "#e8f5e9" : "#ffebee"} />
                                    )}
                                    {lifeGroups.length > 0 && (
                                        <ActivityRow icon="users" color={c.purple} title="Latest Life Group" detail={`${lifeGroups[0].topic} at ${lifeGroups[0].place}`} />
                                    )}
                                    {invites.length > 0 && (
                                        <ActivityRow icon="user-plus" color={c.danger} title="Latest Invite" detail={`${invites[0].firstname} ${invites[0].lastname} — ${invites[0].remarks || "Newcomer"}`} />
                                    )}
                                    {attendance.length === 0 && tithes.length === 0 && devotion.length === 0 && lifeGroups.length === 0 && invites.length === 0 && (
                                        <p style={{ textAlign: "center", color: c.textMuted, fontSize: "12px", padding: "16px" }}>No activity yet. Start engaging!</p>
                                    )}
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* ATTENDANCE TAB — Admin only */}
                    {activeTab === "attendance" && canViewTLDA && (
                        <Card title="Attendance Records" badge={`${attendance.length} records`}>
                            {attendance.length === 0 ? (
                                <EmptyState text="No attendance records yet." />
                            ) : (
                                <div style={tableStyles.container}>
                                    <table style={tableStyles.table}>
                                        <thead style={tableStyles.thead}>
                                            <tr>
                                                <th style={ETH({ width: "40px" })}>#</th>
                                                <th style={ETH({ textAlign: "left", width: "130px" })}>SERVICE DATE</th>
                                                <th style={ETH({ width: "100px" })}>STATUS</th>
                                                <th style={ETH({ textAlign: "left" })}>REMARKS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                const { items, totalPages, startIndex } = getPaginatedData(attendance, tablePage);
                                                return items.map((record, idx) => (
                                                <tr key={record.id}>
                                                    <td style={ETD({ textAlign: "center", ...tableStyles.textMuted })}>{startIndex + idx + 1}</td>
                                                    <td style={ETD()}>{formatDate(record.service_date)}</td>
                                                    <td style={ETD({ textAlign: "center" })}>
                                                        <span style={tableStyles.badge(record.status === "Present" ? "#e8f5e9" : "#ffebee", record.status === "Present" ? c.success : c.danger)}>
                                                            {record.status}
                                                        </span>
                                                    </td>
                                                    <td style={ETD({ ...tableStyles.textMuted })}>{record.remarks || "—"}</td>
                                                </tr>
                                            ));})()}
                                        </tbody>
                                    </table>
                                    <PaginationControls totalPages={Math.ceil(attendance.length / ROWS_PER_PAGE) || 1} dataLength={attendance.length} />
                                </div>
                            )}
                        </Card>
                    )}

                    {/* TITHES TAB — Admin only */}
                    {activeTab === "tithes" && canViewTLDA && (
                        <Card title="Tithes Records" rightText={`Total: ₱${stats.totalTithes.toLocaleString()}`} rightColor={c.success}>
                            {tithes.length === 0 ? (
                                <EmptyState text="No tithes records yet." />
                            ) : (
                                <div style={tableStyles.container}>
                                    <table style={tableStyles.table}>
                                        <thead style={tableStyles.thead}>
                                            <tr>
                                                <th style={ETH({ width: "40px" })}>#</th>
                                                <th style={ETH({ textAlign: "left", width: "130px" })}>DATE</th>
                                                <th style={ETH({ width: "130px" })}>AMOUNT</th>
                                                <th style={ETH({ textAlign: "left" })}>REMARKS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                const { items, totalPages, startIndex } = getPaginatedData(tithes, tablePage);
                                                return items.map((tithe, idx) => (
                                                <tr key={tithe.id}>
                                                    <td style={ETD({ textAlign: "center", ...tableStyles.textMuted })}>{startIndex + idx + 1}</td>
                                                    <td style={ETD()}>{formatDate(tithe.date)}</td>
                                                    <td style={ETD({ ...tableStyles.rightAlign, fontWeight: 700, color: c.success })}>
                                                        ₱{Number(tithe.amount).toLocaleString()}
                                                    </td>
                                                    <td style={ETD({ ...tableStyles.textMuted })}>{tithe.remarks || "—"}</td>
                                                </tr>
                                            ));})()}
                                        </tbody>
                                    </table>
                                    <PaginationControls totalPages={Math.ceil(tithes.length / ROWS_PER_PAGE) || 1} dataLength={tithes.length} />
                                </div>
                            )}
                        </Card>
                    )}

                    {/* DEVOTION TAB — Admin only */}
                    {activeTab === "devotion" && canViewTLDA && (
                        <Card title="Devotion Consistency" badge={`${devotion.length} entries`}>
                            {devotion.length === 0 ? (
                                <EmptyState text="No devotion records yet." />
                            ) : (
                                <div style={tableStyles.container}>
                                    <table style={tableStyles.table}>
                                        <thead style={tableStyles.thead}>
                                            <tr>
                                                <th style={ETH({ width: "40px" })}>#</th>
                                                <th style={ETH({ textAlign: "left", width: "110px" })}>MONTH</th>
                                                <th style={ETH({ width: "90px" })}>COMPLETED</th>
                                                <th style={ETH({ width: "90px" })}>TARGET</th>
                                                <th style={ETH({ width: "160px" })}>PROGRESS</th>
                                                <th style={ETH({ width: "110px" })}>STATUS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                const { items, totalPages, startIndex } = getPaginatedData(devotion, tablePage);
                                                return items.map((dev, idx) => {
                                                const progress = Math.round((dev.completed_days / dev.total_days) * 100);
                                                const consistent = dev.completed_days >= 25;
                                                return (
                                                    <tr key={dev.id}>
                                                        <td style={ETD({ textAlign: "center", ...tableStyles.textMuted })}>{startIndex + idx + 1}</td>
                                                        <td style={ETD({ fontWeight: 600 })}>{dev.month}</td>
                                                        <td style={ETD({ textAlign: "center", fontWeight: 700 })}>{dev.completed_days}</td>
                                                        <td style={ETD({ textAlign: "center", ...tableStyles.textMuted })}>{dev.total_days}</td>
                                                        <td style={ETD()}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                                <div style={{ ...tableStyles.progressBar, flex: 1 }}>
                                                                    <div style={tableStyles.progressFill(progress, consistent ? c.success : c.warning)} />
                                                                </div>
                                                                <span style={{ fontSize: "10px", color: c.textMuted, fontWeight: 600, minWidth: "30px", textAlign: "right" }}>{progress}%</span>
                                                            </div>
                                                        </td>
                                                        <td style={ETD({ textAlign: "center" })}>
                                                            <span style={tableStyles.badge(consistent ? "#e8f5e9" : "#ffebee", consistent ? c.success : c.danger)}>
                                                                {consistent ? "Consistent" : "Inconsistent"}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            });})()}
                                        </tbody>
                                    </table>
                                    <PaginationControls totalPages={Math.ceil(devotion.length / ROWS_PER_PAGE) || 1} dataLength={devotion.length} />
                                </div>
                            )}
                        </Card>
                    )}

                    {/* LIFEGROUP TAB — Everyone */}
                    {activeTab === "lifegroup" && (
                        <Card title="Life Group Participation" badge={`${lifeGroups.length} records`}>
                            {lifeGroups.length === 0 ? (
                                <EmptyState text="No life group records yet." />
                            ) : (
                                <div style={tableStyles.container}>
                                    <table style={tableStyles.table}>
                                        <thead style={tableStyles.thead}>
                                            <tr>
                                                <th style={ETH({ width: "40px" })}>#</th>
                                                <th style={ETH({ textAlign: "left", width: "120px" })}>DATE</th>
                                                <th style={ETH({ textAlign: "left" })}>TOPIC</th>
                                                <th style={ETH({ width: "110px" })}>TYPE</th>
                                                <th style={ETH({ textAlign: "left", width: "140px" })}>PLACE</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                const { items, totalPages, startIndex } = getPaginatedData(lifeGroups, tablePage);
                                                return items.map((group, idx) => (
                                                <tr key={group.id}>
                                                    <td style={ETD({ textAlign: "center", ...tableStyles.textMuted })}>{startIndex + idx + 1}</td>
                                                    <td style={ETD()}>{formatDate(group.date)}</td>
                                                    <td style={ETD({ fontWeight: 600 })}>{group.topic}</td>
                                                    <td style={ETD({ textAlign: "center" })}>
                                                        <span style={tableStyles.badge("#fff8e1", c.warning)}>{group.type}</span>
                                                    </td>
                                                    <td style={ETD({ ...tableStyles.textMuted })}>{group.place}</td>
                                                </tr>
                                            ));})()}
                                        </tbody>
                                    </table>
                                    <PaginationControls totalPages={Math.ceil(lifeGroups.length / ROWS_PER_PAGE) || 1} dataLength={lifeGroups.length} />
                                </div>
                            )}
                        </Card>
                    )}

                    {/* MOMENTS TAB — Everyone */}
                    {activeTab === "moments" && (
                        <Card title="My Moments" badge={`${moments.length} posts`}>
                            {moments.length === 0 ? (
                                <EmptyState text="No moments posted yet." />
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                                    {moments.map(moment => (
                                        <div key={moment.id} style={{
                                            background: "#faf9f7", borderRadius: "10px",
                                            border: "1px solid " + c.border, overflow: "hidden",
                                            padding: "12px 14px"
                                        }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                                <span style={{ fontSize: "11px", color: c.textMuted, fontWeight: 500 }}>
                                                    {new Date(moment.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                                </span>
                                                <span style={{
                                                    fontSize: "10px", fontWeight: 700, padding: "2px 8px",
                                                    borderRadius: "8px", background: "rgba(201,164,92,0.12)",
                                                    color: "#c9a45c", border: "1px solid rgba(201,164,92,0.3)",
                                                    textTransform: "uppercase", letterSpacing: "0.5px"
                                                }}>
                                                    {Math.ceil((new Date(moment.expires_at) - Date.now()) / 3600000)}h left
                                                </span>
                                            </div>
                                            {moment.caption && (
                                                <p style={{ margin: "0 0 10px 0", fontSize: "13px", color: c.text, lineHeight: 1.6 }}>
                                                    {moment.caption}
                                                </p>
                                            )}
                                            {moment.image_url && (
                                                <img src={moment.image_url} alt="Moment" style={{
                                                    width: "100%", maxHeight: "200px", objectFit: "cover",
                                                    borderRadius: "8px", display: "block"
                                                }} />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    )}

                    {/* INVITES TAB — Everyone */}
                    {activeTab === "invites" && (
                        <Card title="Invites & Newcomers" badge={`${invites.length} total`}>
                            {invites.length === 0 ? (
                                <EmptyState text="No invites yet." />
                            ) : (
                                <div style={tableStyles.container}>
                                    <table style={tableStyles.table}>
                                        <thead style={tableStyles.thead}>
                                            <tr>
                                                <th style={ETH({ width: "40px" })}>#</th>
                                                <th style={ETH({ textAlign: "left", width: "180px" })}>NAME</th>
                                                <th style={ETH({ width: "100px" })}>TRIBE</th>
                                                <th style={ETH({ textAlign: "left", width: "150px" })}>STAGE</th>
                                                <th style={ETH({ width: "110px" })}>CATEGORY</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                const { items, totalPages, startIndex } = getPaginatedData(invites, tablePage);
                                                return items.map((invite, idx) => {
                                                const category = getStageCategory(invite.remarks);
                                                const catColors = getCategoryColor(category);
                                                return (
                                                    <tr key={invite.id}>
                                                        <td style={ETD({ textAlign: "center", ...tableStyles.textMuted })}>{startIndex + idx + 1}</td>
                                                        <td style={ETD({ fontWeight: 600 })}>{invite.firstname} {invite.lastname}</td>
                                                        <td style={ETD({ textAlign: "center" })}>{invite.tribe || "—"}</td>
                                                        <td style={ETD({ ...tableStyles.textMuted })}>{invite.remarks || "Newcomer"}</td>
                                                        <td style={ETD({ textAlign: "center" })}>
                                                            <span style={tableStyles.badge(catColors.bg, catColors.color)}>{catColors.label}</span>
                                                        </td>
                                                    </tr>
                                                );
                                            });})()}
                                        </tbody>
                                    </table>
                                    <PaginationControls totalPages={Math.ceil(invites.length / ROWS_PER_PAGE) || 1} dataLength={invites.length} />
                                </div>
                            )}
                        </Card>
                    )}

                </div>
            </div>
        </div>
    );
}

// ── REUSABLE COMPONENTS ──

function Card({ title, children, badge, rightText, rightColor }) {
    const c = theme;
    return (
        <div style={{ background: c.card, borderRadius: "10px", border: "1px solid " + c.border, overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
            <div style={{ padding: "10px 14px", borderBottom: children ? "1px solid " + c.borderLight : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h3 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: c.text, letterSpacing: "-0.2px" }}>{title}</h3>
                    {badge && (
                        <span style={{ padding: "1px 8px", borderRadius: "10px", background: c.borderLight, color: c.textMuted, fontSize: "10px", fontWeight: 700, letterSpacing: "0.3px" }}>
                            {badge}
                        </span>
                    )}
                </div>
                {rightText && (
                    <span style={{ fontSize: "12px", color: rightColor || c.textMuted, fontWeight: 700 }}>{rightText}</span>
                )}
            </div>
            {children && <div style={{ padding: "10px 14px" }}>{children}</div>}
        </div>
    );
}

function InfoRow({ icon, label, value }) {
    const c = theme;
    return (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: c.borderLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={c.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={iconPaths[icon] || iconPaths.user} />
                </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: "9px", color: c.textMuted, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</p>
                <p style={{ margin: "1px 0 0 0", fontSize: "12px", color: c.text, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</p>
            </div>
        </div>
    );
}

function ActivityRow({ icon, color, title, detail, badge, badgeColor, badgeBg }) {
    const c = theme;
    return (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "1px solid " + c.borderLight }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: color + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={activityIcons[icon] || activityIcons.users} />
                </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: c.text, letterSpacing: "-0.2px" }}>{title}</p>
                <p style={{ margin: "1px 0 0 0", fontSize: "11px", color: c.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{detail}</p>
            </div>
            {badge && (
                <span style={{ padding: "2px 8px", borderRadius: "10px", fontSize: "10px", fontWeight: 700, background: badgeBg, color: badgeColor, flexShrink: 0, letterSpacing: "0.3px" }}>
                    {badge}
                </span>
            )}
        </div>
    );
}

function EmptyState({ text }) {
    const c = theme;
    return (
        <div style={{ textAlign: "center", padding: "24px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: c.borderLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
            </div>
            <p style={{ margin: 0, color: c.textMuted, fontSize: "12px" }}>{text}</p>
        </div>
    );
}

export default LeaderProfile;