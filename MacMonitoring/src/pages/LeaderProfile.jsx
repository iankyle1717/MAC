import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";
import { getCurrentUser, isAdmin, isFinance, isUshering, isDiscipleship } from "../utils/auth";

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
        "WINNING":  { bg: "#dcfce7", color: "#16a34a", label: "Winning" },
        "SOAKING":  { bg: "#fef3c7", color: "#d97706", label: "Soaking" },
        "SCHOOLING":{ bg: "#dbeafe", color: "#1e40af", label: "Schooling" },
        "UNKNOWN":  { bg: "#f3f4f6", color: "#374151", label: "Unknown" }
    };
    return colors[category] || colors["UNKNOWN"];
};

// Helper: safely get ministries as array from leader object
const getLeaderMinistries = (leader) => {
    if (!leader) return [];
    if (Array.isArray(leader.ministries) && leader.ministries.length > 0) return leader.ministries;
    if (leader.ministry && leader.ministry !== "NONE") return [leader.ministry];
    return [];
};

function LeaderProfile() {
    const { id } = useParams();
    const [leader, setLeader] = useState(null);
    const [activeTab, setActiveTab] = useState("attendance");
    const [tithes, setTithes] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [devotion, setDevotion] = useState([]);
    const [lifeGroups, setLifeGroups] = useState([]);
    const [invites, setInvites] = useState([]);
    const currentUser = getCurrentUser();

    // ── Permission flags (use auth.js helpers — they already read from localStorage) ──
    const admin    = isAdmin();
    const finance  = isFinance();
    const ushering = isUshering();
    const discipleship = isDiscipleship();

    const isOwnProfile = currentUser?.id === Number(id);

    // Computed permission flags
    const canAccessProfile  = isOwnProfile || admin || finance || ushering || discipleship;
    const canViewAttendance = isOwnProfile || admin || ushering;
    const canViewTithes     = isOwnProfile || admin || finance;
    const canViewDevotion   = isOwnProfile || admin || discipleship;
    const canEditProfile    = isOwnProfile || admin;

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
        return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    };

    const getInviteCounts = () => ({
        total:    invites.length,
        winning:  invites.filter(m => getStageCategory(m.remarks) === "WINNING").length,
        soaking:  invites.filter(m => getStageCategory(m.remarks) === "SOAKING").length,
        schooling:invites.filter(m => getStageCategory(m.remarks) === "SCHOOLING").length,
    });

    if (!leader) return (
        <div className="layout">
            <Sidebar />
            <div className="content" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
                <p style={{ color: "#6b7280" }}>Loading...</p>
            </div>
        </div>
    );

    if (!canAccessProfile) {
        return (
            <div className="layout">
                <Sidebar />
                <div className="content">
                    <h1>Access Denied</h1>
                    <p>You are not allowed to view this profile.</p>
                </div>
            </div>
        );
    }

    const counts = getInviteCounts();
    const leaderMinistries = getLeaderMinistries(leader);

    return (
        <div className="layout">
            <Sidebar />
            <div className="content">

                {/* PROFILE HEADER */}
                <div className="profile-header">
                    <div className="profile-left">
                        <img
                            src={leader.image_url || "https://placehold.co/150x150"}
                            alt="Leader"
                            className="profile-avatar"
                        />
                        <div>
                            <h1 className="profile-name">
                                {leader.firstname} {leader.lastname}
                                {leader.nickname && (
                                    <span style={{ fontSize: "18px", color: "#9ca3af", fontWeight: 400, marginLeft: "10px" }}>
                                        "{leader.nickname}"
                                    </span>
                                )}
                            </h1>

                            <div className="profile-tags" style={{ marginTop: "8px" }}>
                                {/* Tribe */}
                                <span className="profile-badge">{leader.tribe}</span>

                                {/* Type */}
                                <span className="profile-badge gold">{leader.type}</span>

                                {/* All ministries — supports array or legacy string */}
                                {leaderMinistries.map(m => (
                                    <span key={m} className="profile-badge" style={{
                                        background: "rgba(201,164,92,0.12)",
                                        color: "#b8934a"
                                    }}>
                                        {m}
                                    </span>
                                ))}

                                {/* Civil status badge */}
                                {leader.civil_status && (
                                    <span className="profile-badge" style={{
                                        background: "#f0fdf4",
                                        color: "#16a34a"
                                    }}>
                                        {leader.civil_status}
                                    </span>
                                )}

                                {/* DJ Type badge if applicable */}
                                {leader.dj_type && (
                                    <span className="profile-badge" style={{
                                        background: "rgba(201,164,92,0.08)",
                                        color: "#92400e",
                                        fontSize: "11px"
                                    }}>
                                        {leader.dj_type}
                                        {leader.assigned_tribe && ` · ${leader.assigned_tribe}`}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {canEditProfile && (
                        <Link to={`/edit-leader/${leader.id}`}>
                            <button className="edit-profile-btn">Edit Profile</button>
                        </Link>
                    )}
                </div>

                {/* INVITE SUMMARY CARDS */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: "12px",
                    marginBottom: "24px"
                }}>
                    {[
                        { label: "Total Invites", value: counts.total, bg: "#fff", color: "#111827" },
                        { label: "Winning",  value: counts.winning,  bg: "#dcfce7", color: "#16a34a" },
                        { label: "Soaking",  value: counts.soaking,  bg: "#fef3c7", color: "#d97706" },
                        { label: "Schooling",value: counts.schooling,bg: "#dbeafe", color: "#1e40af" },
                    ].map(card => (
                        <div key={card.label} className="record-card" style={{
                            background: card.bg,
                            padding: "14px 16px",
                            borderRadius: "10px",
                            border: "1px solid #e5e7eb"
                        }}>
                            <h3 style={{ fontSize: "11px", color: card.color, margin: "0 0 6px 0", fontWeight: 600 }}>{card.label}</h3>
                            <h1 style={{ fontSize: "26px", margin: 0, color: card.color, fontWeight: 700 }}>{card.value}</h1>
                            {card.label !== "Total Invites" && counts.total > 0 && (
                                <p style={{ fontSize: "10px", color: card.color, margin: "4px 0 0 0", opacity: 0.7 }}>
                                    {Math.round((card.value / counts.total) * 100)}% of total
                                </p>
                            )}
                        </div>
                    ))}
                </div>

                {/* TABS */}
                <div className="profile-tabs">
                    {canViewAttendance && (
                        <button
                            className={activeTab === "attendance" ? "tab-btn active-tab" : "tab-btn"}
                            onClick={() => setActiveTab("attendance")}
                        >
                            Attendance
                        </button>
                    )}
                    {canViewTithes && (
                        <button
                            className={activeTab === "tithes" ? "tab-btn active-tab" : "tab-btn"}
                            onClick={() => setActiveTab("tithes")}
                        >
                            Tithes
                        </button>
                    )}
                    {canViewDevotion && (
                        <button
                            className={activeTab === "devotion" ? "tab-btn active-tab" : "tab-btn"}
                            onClick={() => setActiveTab("devotion")}
                        >
                            Devotion
                        </button>
                    )}
                    <button
                        className={activeTab === "lifegroup" ? "tab-btn active-tab" : "tab-btn"}
                        onClick={() => setActiveTab("lifegroup")}
                    >
                        Life Group
                    </button>
                    <button
                        className={activeTab === "invites" ? "tab-btn active-tab" : "tab-btn"}
                        onClick={() => setActiveTab("invites")}
                    >
                        Invites & Newcomers
                    </button>
                </div>

                {/* ── ATTENDANCE TAB ── */}
                {activeTab === "attendance" && canViewAttendance && (
                    <div className="excel-card">
                        <div className="excel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h2>Attendance Records</h2>
                            <span style={{ fontSize: "12px", color: "#9ca3af" }}>{attendance.length} records</span>
                        </div>
                        <div className="excel-wrapper">
                            <table className="excel-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Service</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attendance.length === 0 ? (
                                        <tr><td colSpan="3" style={{ textAlign: "center", color: "#9ca3af", padding: "30px" }}>No attendance records yet.</td></tr>
                                    ) : attendance.map(record => (
                                        <tr key={record.id}>
                                            <td>{formatDate(record.service_date)}</td>
                                            <td style={{ color: "#6b7280", fontSize: "13px" }}>{record.remarks}</td>
                                            <td>
                                                <span className={`status-badge ${record.status === "Present" ? "status-present" : "status-absent"}`}>
                                                    {record.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── TITHES TAB ── */}
                {activeTab === "tithes" && canViewTithes && (
                    <div className="excel-card">
                        <div className="excel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h2>Tithes Records</h2>
                            <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                                Total: ₱{tithes.reduce((s, t) => s + Number(t.amount || 0), 0).toLocaleString()}
                            </span>
                        </div>
                        <div className="excel-wrapper">
                            <table className="excel-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th style={{ textAlign: "right" }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tithes.length === 0 ? (
                                        <tr><td colSpan="2" style={{ textAlign: "center", color: "#9ca3af", padding: "30px" }}>No tithes records yet.</td></tr>
                                    ) : tithes.map(tithe => (
                                        <tr key={tithe.id}>
                                            <td>{formatDate(tithe.date)}</td>
                                            <td style={{ textAlign: "right", color: "#16a34a", fontWeight: 700 }}>
                                                ₱{Number(tithe.amount).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── DEVOTION TAB ── */}
                {activeTab === "devotion" && canViewDevotion && (
                    <div className="excel-card">
                        <div className="excel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h2>Devotion Consistency</h2>
                            <span style={{ fontSize: "12px", color: "#9ca3af" }}>{devotion.length} entries</span>
                        </div>
                        <div className="excel-wrapper">
                            <table className="excel-table">
                                <thead>
                                    <tr>
                                        <th>Month</th>
                                        <th>Completed</th>
                                        <th>Total</th>
                                        <th>Progress</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {devotion.length === 0 ? (
                                        <tr><td colSpan="5" style={{ textAlign: "center", color: "#9ca3af", padding: "30px" }}>No devotion records yet.</td></tr>
                                    ) : devotion.map(dev => {
                                        const progress = Math.round((dev.completed_days / dev.total_days) * 100);
                                        const consistent = dev.completed_days >= 25;
                                        return (
                                            <tr key={dev.id}>
                                                <td style={{ fontWeight: 600 }}>{dev.month}</td>
                                                <td>{dev.completed_days} days</td>
                                                <td>{dev.total_days} days</td>
                                                <td>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                        <div style={{ flex: 1, height: "6px", background: "#e5e7eb", borderRadius: "4px", overflow: "hidden", minWidth: "60px" }}>
                                                            <div style={{ width: `${progress}%`, height: "100%", background: consistent ? "#16a34a" : "#f59e0b", borderRadius: "4px" }} />
                                                        </div>
                                                        <span style={{ fontSize: "11px", color: "#6b7280" }}>{progress}%</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span style={{
                                                        padding: "3px 10px", borderRadius: "10px", fontSize: "11px", fontWeight: 700,
                                                        background: consistent ? "#dcfce7" : "#fee2e2",
                                                        color: consistent ? "#16a34a" : "#dc2626"
                                                    }}>
                                                        {consistent ? "Consistent" : "Inconsistent"}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── LIFEGROUP TAB ── */}
                {activeTab === "lifegroup" && (
                    <div className="excel-card">
                        <div className="excel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h2>Life Group Participation</h2>
                            <span style={{ fontSize: "12px", color: "#9ca3af" }}>{lifeGroups.length} records</span>
                        </div>
                        <div className="excel-wrapper">
                            <table className="excel-table">
                                <thead>
                                    <tr>
                                        <th>Topic</th>
                                        <th>Place</th>
                                        <th>Type</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lifeGroups.length === 0 ? (
                                        <tr><td colSpan="4" style={{ textAlign: "center", color: "#9ca3af", padding: "30px" }}>No life group records yet.</td></tr>
                                    ) : lifeGroups.map(group => (
                                        <tr key={group.id}>
                                            <td style={{ fontWeight: 600 }}>{group.topic}</td>
                                            <td style={{ color: "#6b7280" }}>{group.place}</td>
                                            <td>
                                                <span style={{ padding: "2px 8px", borderRadius: "6px", background: "#fef3c7", color: "#92400e", fontSize: "11px", fontWeight: 600 }}>
                                                    {group.type}
                                                </span>
                                            </td>
                                            <td style={{ color: "#6b7280", fontSize: "13px" }}>{formatDate(group.date)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── INVITES TAB ── */}
                {activeTab === "invites" && (
                    <div className="excel-card">
                        <div className="excel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h2>Invites & Newcomers</h2>
                            <span style={{ fontSize: "12px", color: "#9ca3af" }}>{invites.length} total</span>
                        </div>
                        <div className="excel-wrapper">
                            <table className="excel-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Tribe</th>
                                        <th>Current Stage</th>
                                        <th>Category</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invites.length === 0 ? (
                                        <tr><td colSpan="4" style={{ textAlign: "center", color: "#9ca3af", padding: "30px" }}>No invites yet.</td></tr>
                                    ) : invites.map(invite => {
                                        const category = getStageCategory(invite.remarks);
                                        const colors = getCategoryColor(category);
                                        return (
                                            <tr key={invite.id}>
                                                <td style={{ fontWeight: 600 }}>{invite.firstname} {invite.lastname}</td>
                                                <td style={{ color: "#6b7280" }}>{invite.tribe}</td>
                                                <td style={{ color: "#6b7280", fontSize: "13px" }}>{invite.remarks || "—"}</td>
                                                <td>
                                                    <span style={{
                                                        padding: "3px 10px", borderRadius: "10px", fontSize: "11px",
                                                        fontWeight: 700, background: colors.bg, color: colors.color
                                                    }}>
                                                        {colors.label}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

export default LeaderProfile;
