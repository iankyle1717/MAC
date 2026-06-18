import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";
import { getCurrentUser, isAdmin, isFinance, isUshering, isDiscipleship } from "../utils/auth";
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
    const [activeTab, setActiveTab] = useState("overview");
    const [tithes, setTithes] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [devotion, setDevotion] = useState([]);
    const [lifeGroups, setLifeGroups] = useState([]);
    const [invites, setInvites] = useState([]);
    const currentUser = getCurrentUser();

    const admin = isAdmin();
    const finance = isFinance();
    const ushering = isUshering();
    const discipleship = isDiscipleship();

    const isOwnProfile = currentUser?.id === Number(id);

    const canAccessProfile = isOwnProfile || admin || finance || ushering || discipleship;
    const canViewAttendance = isOwnProfile || admin || ushering;
    const canViewTithes = isOwnProfile || admin || finance;
    const canViewDevotion = isOwnProfile || admin || discipleship;
    const canEditProfile = isOwnProfile || admin;

    useEffect(() => {
        if (!currentUser) { window.location.href = "/login"; return; }
        fetchLeader();
        fetchTithes();
        fetchAttendance();
        fetchDevotion();
        fetchLifeGroups();
    }, [id]);

    const fetchLeader = async () => {
        const { data } = await supabase
            .from("tblMonitoring").select("*").eq("id", id).single();
        setLeader(data);
        if (data) fetchInvites(`${data.firstname} ${data.lastname}`);
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

        return {
            totalTithes,
            attendanceRate,
            presentCount,
            totalAttendance: attendance.length,
            devotionMonths,
            consistentMonths,
            avgDevotion,
            inviteCounts,
            lifeGroupCount
        };
    };

    const stats = getStats();
    const leaderMinistries = getLeaderMinistries(leader);

    if (!leader) return (
        <div className="layout">
            <Sidebar />
            <div className="content" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
                <p style={{ color: theme.textMuted, fontSize: "14px" }}>Loading profile...</p>
            </div>
        </div>
    );

    if (!canAccessProfile) {
        return (
            <div className="layout">
                <Sidebar />
                <div className="content" style={{ textAlign: "center", paddingTop: "100px" }}>
                    <h2 style={{ color: theme.danger, fontSize: "18px", fontWeight: 600 }}>Access Denied</h2>
                    <p style={{ color: theme.textMuted, fontSize: "14px" }}>You are not allowed to view this profile.</p>
                </div>
            </div>
        );
    }

    const tabs = [
        { key: "overview", label: "Overview", always: true },
        { key: "attendance", label: "Attendance", show: canViewAttendance },
        { key: "tithes", label: "Tithes", show: canViewTithes },
        { key: "devotion", label: "Devotion", show: canViewDevotion },
        { key: "lifegroup", label: "Life Group", always: true },
        { key: "invites", label: "Invites", always: true },
    ].filter(t => t.always || t.show);

    const c = theme;

    return (
        <div className="layout">
            <Sidebar />
            {/* FULL WIDTH - no padding, no max-width constraint */}
            <div className="content" style={{ background: c.bg, minHeight: "100vh", padding: "0" }}>

                {/* COVER PHOTO - Full width using background.jpg */}
                <div style={{ position: "relative" }}>
                    <div style={{
                        height: "250px",
                        width: "100%",
                         backgroundImage: `url(${backround})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        position: "relative"
                    }}>
                        {/* Dark overlay for text readability */}
                        <div style={{
                            position: "absolute",
                            inset: 0,
                            background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 100%)"
                        }} />
                    </div>

                    {/* Profile section overlapping cover */}
                    <div style={{
                        position: "relative",
                        marginTop: "-60px",
                        padding: "0 24px 20px",
                        display: "flex",
                        alignItems: "flex-end",
                        gap: "20px"
                    }}>
                        {/* Profile Photo */}
                        <div style={{ position: "relative", flexShrink: 0 }}>
                            <img
                                src={leader.image_url || "https://placehold.co/150x150/f0ede8/9e9e9e?text=User"}
                                alt="Leader"
                                style={{
                                    width: "140px",
                                    height: "140px",
                                    borderRadius: "50%",
                                    objectFit: "cover",
                                    border: "5px solid " + c.bg,
                                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                                    background: c.card
                                }}
                            />
                            {leader.civil_status === "Married" && (
                                <div style={{
                                    position: "absolute",
                                    bottom: "10px",
                                    right: "10px",
                                    width: "24px",
                                    height: "24px",
                                    borderRadius: "50%",
                                    background: c.success,
                                    border: "3px solid " + c.bg,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                    </svg>
                                </div>
                            )}
                        </div>

                        {/* Name & Info */}
                        <div style={{ paddingBottom: "8px", flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "16px" }}>
                                <div style={{ minWidth: 0 }}>
                                    <h1 style={{
                                        fontSize: "26px",
                                        fontWeight: 700,
                                        color: c.text,
                                        margin: "0 0 4px 0",
                                        lineHeight: 1.2,
                                        letterSpacing: "-0.3px"
                                    }}>
                                        {leader.firstname} {leader.lastname}
                                    </h1>
                                    {leader.nickname && (
                                        <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: c.textMuted, fontStyle: "italic" }}>
                                            {leader.nickname}
                                        </p>
                                    )}
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                        <span style={{
                                            padding: "4px 12px",
                                            borderRadius: "20px",
                                            background: c.borderLight,
                                            color: c.textSecondary,
                                            fontSize: "12px",
                                            fontWeight: 600,
                                            letterSpacing: "0.3px"
                                        }}>
                                            {leader.tribe}
                                        </span>
                                        <span style={{
                                            padding: "4px 12px",
                                            borderRadius: "20px",
                                            background: "rgba(139,115,85,0.1)",
                                            color: c.primary,
                                            fontSize: "12px",
                                            fontWeight: 600,
                                            letterSpacing: "0.3px"
                                        }}>
                                            {leader.type}
                                        </span>
                                        {leaderMinistries.map(m => (
                                            <span key={m} style={{
                                                padding: "4px 12px",
                                                borderRadius: "20px",
                                                background: "#e8f0e8",
                                                color: "#4a7a4a",
                                                fontSize: "12px",
                                                fontWeight: 600,
                                                letterSpacing: "0.3px"
                                            }}>
                                                {m}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Edit Button */}
                                {canEditProfile && (
                                    <Link to={`/edit-leader/${leader.id}`} style={{ textDecoration: "none", flexShrink: 0 }}>
                                        <button style={{
                                            padding: "8px 18px",
                                            borderRadius: "8px",
                                            border: "1px solid " + c.border,
                                            background: c.card,
                                            color: c.textSecondary,
                                            fontSize: "13px",
                                            fontWeight: 600,
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            transition: "all 0.2s",
                                            boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                                        }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = c.primaryMuted; e.currentTarget.style.color = c.primary; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.color = c.textSecondary; }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

                {/* QUICK STATS ROW - Full width */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: "1px",
                    background: c.border,
                    marginBottom: "0"
                }}>
                    {[
                        { label: "Devotion", value: `${stats.avgDevotion}`, sub: `${stats.consistentMonths}/${stats.devotionMonths} consistent`, color: c.warning },
                        { label: "Invites", value: `${stats.inviteCounts.total}`, sub: `${stats.inviteCounts.winning} winning`, color: c.danger },
                        { label: "Life Group", value: `${stats.lifeGroupCount}`, sub: "sessions", color: c.purple },
                    ].map((stat, i) => (
                        <div key={i} style={{
                            background: c.card,
                            padding: "18px 12px",
                            textAlign: "center",
                            transition: "all 0.2s",
                            cursor: "default"
                        }}
                            onMouseEnter={e => { e.currentTarget.style.background = c.bg; }}
                            onMouseLeave={e => { e.currentTarget.style.background = c.card; }}
                        >
                            <p style={{ margin: "0", fontSize: "22px", fontWeight: 700, color: c.text, lineHeight: 1.2, letterSpacing: "-0.5px" }}>
                                {stat.value}
                            </p>
                            <p style={{ margin: "6px 0 0 0", fontSize: "11px", color: c.textMuted, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                {stat.label}
                            </p>
                            <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: stat.color, fontWeight: 600 }}>
                                {stat.sub}
                            </p>
                        </div>
                    ))}
                </div>

                {/* TAB NAVIGATION - Full width with padding */}
                <div style={{
                    display: "flex",
                    gap: "0",
                    borderBottom: "1px solid " + c.border,
                    background: c.card,
                    padding: "0 24px"
                }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                padding: "14px 20px",
                                border: "none",
                                background: "transparent",
                                color: activeTab === tab.key ? c.primary : c.textMuted,
                                fontSize: "14px",
                                fontWeight: activeTab === tab.key ? 600 : 500,
                                borderBottom: activeTab === tab.key ? "2.5px solid " + c.primary : "2.5px solid transparent",
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

                {/* TAB CONTENT - With padding */}
                <div style={{ padding: "20px 24px" }}>

                    {/* OVERVIEW TAB */}
                    {activeTab === "overview" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                            {/* About Section */}
                            <Card title="About">
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                                    <InfoRow icon="user" label="Full Name" value={`${leader.firstname} ${leader.lastname}`} />
                                    <InfoRow icon="tag" label="Nickname" value={leader.nickname || "—"} />
                                    <InfoRow icon="users" label="Tribe" value={leader.tribe} />
                                    <InfoRow icon="star" label="Leader Type" value={leader.type} />
                                    <InfoRow icon="heart" label="Ministries" value={leaderMinistries.join(", ") || "None"} />
                                    <InfoRow icon="heart" label="Civil Status" value={leader.civil_status || "Single"} />
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

                            {/* Recent Activity */}
                            <Card title="Recent Activity">
                                <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                                    {attendance.length > 0 && (
                                        <ActivityRow
                                            icon="map-pin"
                                            color={c.info}
                                            title="Latest Attendance"
                                            detail={`${formatDate(attendance[0].service_date)} — ${attendance[0].status}`}
                                            badge={attendance[0].status}
                                            badgeColor={attendance[0].status === "Present" ? c.success : c.danger}
                                            badgeBg={attendance[0].status === "Present" ? "#e8f5e9" : "#ffebee"}
                                        />
                                    )}
                                    {tithes.length > 0 && (
                                        <ActivityRow
                                            icon="dollar-sign"
                                            color={c.success}
                                            title="Latest Tithe"
                                            detail={`${formatDate(tithes[0].date)} — ₱${Number(tithes[0].amount).toLocaleString()}`}
                                        />
                                    )}
                                    {devotion.length > 0 && (
                                        <ActivityRow
                                            icon="book"
                                            color={c.warning}
                                            title="Latest Devotion"
                                            detail={`${devotion[0].month} — ${devotion[0].completed_days}/${devotion[0].total_days} days`}
                                            badge={devotion[0].completed_days >= 25 ? "Consistent" : "Inconsistent"}
                                            badgeColor={devotion[0].completed_days >= 25 ? c.success : c.danger}
                                            badgeBg={devotion[0].completed_days >= 25 ? "#e8f5e9" : "#ffebee"}
                                        />
                                    )}
                                    {lifeGroups.length > 0 && (
                                        <ActivityRow
                                            icon="users"
                                            color={c.purple}
                                            title="Latest Life Group"
                                            detail={`${lifeGroups[0].topic} at ${lifeGroups[0].place}`}
                                        />
                                    )}
                                    {invites.length > 0 && (
                                        <ActivityRow
                                            icon="user-plus"
                                            color={c.danger}
                                            title="Latest Invite"
                                            detail={`${invites[0].firstname} ${invites[0].lastname} — ${invites[0].remarks || "Newcomer"}`}
                                        />
                                    )}
                                    {attendance.length === 0 && tithes.length === 0 && devotion.length === 0 && lifeGroups.length === 0 && invites.length === 0 && (
                                        <p style={{ textAlign: "center", color: c.textMuted, fontSize: "13px", padding: "24px" }}>
                                            No activity yet. Start engaging!
                                        </p>
                                    )}
                                </div>
                            </Card>
                          
                        </div>
                    )}

                    {/* ATTENDANCE TAB */}
                    {activeTab === "attendance" && canViewAttendance && (
                        <Card title="Attendance Records" badge={`${attendance.length} records`}>
                            {attendance.length === 0 ? (
                                <EmptyState text="No attendance records yet." />
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    {attendance.map(record => (
                                        <ListItem
                                            key={record.id}
                                            title={formatDate(record.service_date)}
                                            subtitle={record.remarks || "Regular Service"}
                                            badge={record.status}
                                            badgeColor={record.status === "Present" ? c.success : c.danger}
                                            badgeBg={record.status === "Present" ? "#e8f5e9" : "#ffebee"}
                                        />
                                    ))}
                                </div>
                            )}
                        </Card>
                    )}

                    {/* TITHES TAB */}
                    {activeTab === "tithes" && canViewTithes && (
                        <Card title="Tithes Records" rightText={`Total: ₱${stats.totalTithes.toLocaleString()}`} rightColor={c.success}>
                            {tithes.length === 0 ? (
                                <EmptyState text="No tithes records yet." />
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    {tithes.map(tithe => (
                                        <ListItem
                                            key={tithe.id}
                                            title={formatDate(tithe.date)}
                                            subtitle={tithe.remarks || "Regular Tithe"}
                                            right={`₱${Number(tithe.amount).toLocaleString()}`}
                                            rightColor={c.success}
                                        />
                                    ))}
                                </div>
                            )}
                        </Card>
                    )}

                    {/* DEVOTION TAB */}
                    {activeTab === "devotion" && canViewDevotion && (
                        <Card title="Devotion Consistency" badge={`${devotion.length} entries`}>
                            {devotion.length === 0 ? (
                                <EmptyState text="No devotion records yet." />
                            ) : (
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
                                    {devotion.map(dev => {
                                        const progress = Math.round((dev.completed_days / dev.total_days) * 100);
                                        const consistent = dev.completed_days >= 25;
                                        return (
                                            <div key={dev.id} style={{
                                                padding: "16px",
                                                background: c.bg,
                                                borderRadius: "12px",
                                                border: "1px solid " + c.border
                                            }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                                                    <span style={{ fontSize: "14px", fontWeight: 600, color: c.text, letterSpacing: "-0.2px" }}>
                                                        {dev.month}
                                                    </span>
                                                    <span style={{
                                                        padding: "3px 10px",
                                                        borderRadius: "20px",
                                                        fontSize: "10px",
                                                        fontWeight: 700,
                                                        background: consistent ? "#e8f5e9" : "#ffebee",
                                                        color: consistent ? c.success : c.danger,
                                                        letterSpacing: "0.3px"
                                                    }}>
                                                        {consistent ? "Consistent" : "Inconsistent"}
                                                    </span>
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "8px" }}>
                                                    <span style={{ fontSize: "13px", color: c.textSecondary }}>
                                                        <strong style={{ color: c.text }}>{dev.completed_days}</strong> / {dev.total_days} days
                                                    </span>
                                                    <span style={{ fontSize: "12px", color: c.textMuted }}>
                                                        Target: 25 days
                                                    </span>
                                                </div>
                                                <div style={{ height: "6px", background: c.borderLight, borderRadius: "3px", overflow: "hidden" }}>
                                                    <div style={{
                                                        width: `${progress}%`,
                                                        height: "100%",
                                                        background: consistent ? c.success : c.warning,
                                                        borderRadius: "3px",
                                                        transition: "width 0.4s ease",
                                                        opacity: 0.85
                                                    }} />
                                                </div>
                                                <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: c.textMuted, textAlign: "right", fontWeight: 500 }}>
                                                    {progress}%
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>
                    )}

                    {/* LIFEGROUP TAB */}
                    {activeTab === "lifegroup" && (
                        <Card title="Life Group Participation" badge={`${lifeGroups.length} records`}>
                            {lifeGroups.length === 0 ? (
                                <EmptyState text="No life group records yet." />
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    {lifeGroups.map(group => (
                                        <div key={group.id} style={{
                                            padding: "16px",
                                            background: c.bg,
                                            borderRadius: "12px",
                                            border: "1px solid " + c.border
                                        }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                                                <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: c.text, letterSpacing: "-0.2px" }}>
                                                    {group.topic}
                                                </p>
                                                <span style={{
                                                    padding: "3px 12px",
                                                    borderRadius: "20px",
                                                    background: "#fff8e1",
                                                    color: c.warning,
                                                    fontSize: "11px",
                                                    fontWeight: 700,
                                                    letterSpacing: "0.3px"
                                                }}>
                                                    {group.type}
                                                </span>
                                            </div>
                                            <div style={{ display: "flex", gap: "20px" }}>
                                                <p style={{ margin: 0, fontSize: "13px", color: c.textSecondary }}>
                                                    {group.place}
                                                </p>
                                                <p style={{ margin: 0, fontSize: "13px", color: c.textMuted }}>
                                                    {formatDate(group.date)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    )}

                    {/* INVITES TAB */}
                    {activeTab === "invites" && (
                        <Card title="Invites & Newcomers" badge={`${invites.length} total`}>
                            {invites.length === 0 ? (
                                <EmptyState text="No invites yet." />
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    {invites.map(invite => {
                                        const category = getStageCategory(invite.remarks);
                                        const catColors = getCategoryColor(category);
                                        return (
                                            <ListItem
                                                key={invite.id}
                                                title={`${invite.firstname} ${invite.lastname}`}
                                                subtitle={`${invite.tribe} · ${invite.remarks || "Newcomer"}`}
                                                badge={catColors.label}
                                                badgeColor={catColors.color}
                                                badgeBg={catColors.bg}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </Card>
                    )}

                </div>
            </div>
        </div>
    );
}

// REUSABLE COMPONENTS

function Card({ title, children, badge, rightText, rightColor }) {
    const c = theme;
    return (
        <div style={{
            background: c.card,
            borderRadius: "14px",
            border: "1px solid " + c.border,
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
        }}>
            <div style={{
                padding: "16px 20px",
                borderBottom: children ? "1px solid " + c.borderLight : "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: c.text, letterSpacing: "-0.2px" }}>
                        {title}
                    </h3>
                    {badge && (
                        <span style={{
                            padding: "2px 10px",
                            borderRadius: "10px",
                            background: c.borderLight,
                            color: c.textMuted,
                            fontSize: "11px",
                            fontWeight: 700,
                            letterSpacing: "0.3px"
                        }}>
                            {badge}
                        </span>
                    )}
                </div>
                {rightText && (
                    <span style={{ fontSize: "13px", color: rightColor || c.textMuted, fontWeight: 700 }}>
                        {rightText}
                    </span>
                )}
            </div>
            {children && <div style={{ padding: "16px 20px" }}>{children}</div>}
        </div>
    );
}

function InfoRow({ icon, label, value }) {
    const c = theme;
    return (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: c.borderLight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
            }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={iconPaths[icon] || iconPaths.user} />
                </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: "10px", color: c.textMuted, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {label}
                </p>
                <p style={{ margin: "2px 0 0 0", fontSize: "14px", color: c.text, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {value}
                </p>
            </div>
        </div>
    );
}

function ActivityRow({ icon, color, title, detail, badge, badgeColor, badgeBg }) {
    const c = theme;
    return (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: "1px solid " + c.borderLight }}>
            <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: color + "15",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
            }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={activityIcons[icon] || activityIcons.users} />
                </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: c.text, letterSpacing: "-0.2px" }}>
                    {title}
                </p>
                <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: c.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {detail}
                </p>
            </div>
            {badge && (
                <span style={{
                    padding: "3px 10px",
                    borderRadius: "10px",
                    fontSize: "11px",
                    fontWeight: 700,
                    background: badgeBg,
                    color: badgeColor,
                    flexShrink: 0,
                    letterSpacing: "0.3px"
                }}>
                    {badge}
                </span>
            )}
        </div>
    );
}

function ListItem({ title, subtitle, badge, badgeColor, badgeBg, right, rightColor }) {
    const c = theme;
    return (
        <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 14px",
            background: c.bg,
            borderRadius: "10px",
            border: "1px solid " + c.borderLight
        }}>
            <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: c.text, letterSpacing: "-0.2px" }}>
                    {title}
                </p>
                {subtitle && (
                    <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: c.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {subtitle}
                    </p>
                )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                {badge && (
                    <span style={{
                        padding: "3px 10px",
                        borderRadius: "10px",
                        fontSize: "11px",
                        fontWeight: 700,
                        background: badgeBg,
                        color: badgeColor,
                        letterSpacing: "0.3px"
                    }}>
                        {badge}
                    </span>
                )}
                {right && (
                    <span style={{ fontSize: "14px", fontWeight: 700, color: rightColor || c.text }}>
                        {right}
                    </span>
                )}
            </div>
        </div>
    );
}

function EmptyState({ text }) {
    const c = theme;
    return (
        <div style={{ textAlign: "center", padding: "40px" }}>
            <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: c.borderLight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px"
            }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
            </div>
            <p style={{ margin: 0, color: c.textMuted, fontSize: "14px" }}>{text}</p>
        </div>
    );
}

export default LeaderProfile;