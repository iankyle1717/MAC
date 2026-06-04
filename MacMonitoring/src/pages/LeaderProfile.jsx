import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";
import { getCurrentUser } from "../utils/auth";

// Stage definitions (from your constants)
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

// Get category based on stage
const getStageCategory = (stage) => {
    if (!stage) return "UNKNOWN";
    if (consoStages.includes(stage) || soulWinningStages.includes(stage)) return "WINNING";
    if (soakingStages.includes(stage)) return "SOAKING";
    if (schoolingStages.includes(stage)) return "SCHOOLING";
    return "UNKNOWN";
};

// Get color for category
const getCategoryColor = (category) => {
    const colors = {
        "WINNING": { bg: "#dcfce7", color: "#16a34a", label: "Winning" },
        "SOAKING": { bg: "#fef3c7", color: "#d97706", label: "Soaking" },
        "SCHOOLING": { bg: "#dbeafe", color: "#1e40af", label: "Schooling" },
        "UNKNOWN": { bg: "#f3f4f6", color: "#374151", label: "Unknown" }
    };
    return colors[category] || colors["UNKNOWN"];
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

    useEffect(() => {
        if (!currentUser) {
            window.location.href = "/login";
            return;
        }
        fetchLeader();
        fetchTithes();
        fetchAttendance();
        fetchDevotion();
        fetchLifeGroups();
    }, []);

    const fetchLeader = async () => {
        const { data } = await supabase
            .from("tblMonitoring")
            .select("*")
            .eq("id", id)
            .single();

        setLeader(data);
        if (data) {
            fetchInvites(`${data.firstname} ${data.lastname}`);
        }
    };

    const fetchInvites = async (leaderName) => {
        const { data } = await supabase
            .from("tblNewMembers")
            .select("*")
            .eq("invited_by", leaderName)
            .order("id", { ascending: false });

        setInvites(data || []);
    };

    const fetchTithes = async () => {
        const { data } = await supabase
            .from("tblTithes")
            .select("*")
            .eq("leader_id", id)
            .order("date", { ascending: false });

        setTithes(data || []);
    };

    const fetchAttendance = async () => {
        const { data } = await supabase
            .from("tblAttendance")
            .select("*")
            .eq("leader_id", id)
            .order("service_date", { ascending: false });

        setAttendance(data || []);
    };

    const fetchDevotion = async () => {
        const { data } = await supabase
            .from("tblDevotion")
            .select("*")
            .eq("leader_id", id)
            .order("month", { ascending: false });

        setDevotion(data || []);
    };

    const fetchLifeGroups = async () => {
        const { data } = await supabase
            .from("tblLifeGroup")
            .select("*")
            .eq("leader_id", id)
            .order("date", { ascending: false });

        setLifeGroups(data || []);
    };

    // Format date nicely
    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        const d = new Date(dateStr + "T00:00:00");
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    };

    // Count invites by category (Winning/Soaking/Schooling)
    const getInviteCounts = () => {
        return {
            total: invites.length,
            winning: invites.filter(m => getStageCategory(m.remarks) === "WINNING").length,
            soaking: invites.filter(m => getStageCategory(m.remarks) === "SOAKING").length,
            schooling: invites.filter(m => getStageCategory(m.remarks) === "SCHOOLING").length
        };
    };

    if (!leader) {
        return <h1>Loading...</h1>;
    }

    const isOwnProfile = currentUser?.id === leader.id;
    const isAdmin = currentUser?.ministry === "ADMIN";
    const isFinance = currentUser?.ministry === "FINANCE";
    const isUshering = currentUser?.ministry === "USHERING";
    const isDiscipleship = currentUser?.ministry === "DISCIPLESHIP JOURNEY";

    const canAccessProfile = isOwnProfile || isAdmin || isFinance || isUshering || isDiscipleship;

    if (!canAccessProfile) {
        return (
            <div className="layout">
                <Sidebar />
                <div className="content">
                    <h1>Access Denied</h1>
                    <p>You are not allowed to open this profile.</p>
                </div>
            </div>
        );
    }

    const canViewAttendance = isOwnProfile || isAdmin || isUshering;
    const canViewTithes = isOwnProfile || isAdmin || isFinance;
    const canViewDevotion = isOwnProfile || isAdmin || isDiscipleship;
    const canViewLifeGroup = true;

    const counts = getInviteCounts();

    return (
        <div className="layout">
            <Sidebar />
            <div className="content">
                {/* PROFILE HEADER */}
                <div className="profile-header">
                    <div className="profile-left">
                        <img
                            src={leader.image_url || "https://via.placeholder.com/150"}
                            alt="Leader"
                            className="profile-avatar"
                        />
                        <div>
                            <h1 className="profile-name">
                                {leader.firstname} {leader.lastname}
                            </h1>
                            <div className="profile-tags">
                                <span className="profile-badge">{leader.tribe}</span>
                                <span className="profile-badge gold">{leader.type}</span>
                                <span className="profile-badge">{leader.ministry}</span>
                            </div>
                        </div>
                    </div>

                    {(isOwnProfile || isAdmin) && (
                        <Link to={`/edit-leader/${leader.id}`}>
                            <button className="edit-profile-btn">Edit Profile</button>
                        </Link>
                    )}
                </div>

                {/* INVITES SUMMARY - BY CATEGORY */}
                <div className="stats-grid" style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
                    gap: "15px",
                    marginBottom: "30px"
                }}>
                    <div className="record-card">
                        <h3>Total Invites</h3>
                        <h1>{counts.total}</h1>
                    </div>
                    <div className="record-card" style={{ background: "#dcfce7" }}>
                        <h3 style={{ color: "#16a34a" }}>Winning</h3>
                        <h1 style={{ color: "#16a34a" }}>{counts.winning}</h1>
                        <p style={{ fontSize: "12px", color: "#6b7280" }}>
                            {counts.total > 0 ? Math.round((counts.winning / counts.total) * 100) : 0}% of total
                        </p>
                    </div>
                    <div className="record-card" style={{ background: "#fef3c7" }}>
                        <h3 style={{ color: "#d97706" }}>Soaking</h3>
                        <h1 style={{ color: "#d97706" }}>{counts.soaking}</h1>
                        <p style={{ fontSize: "12px", color: "#6b7280" }}>
                            {counts.total > 0 ? Math.round((counts.soaking / counts.total) * 100) : 0}% of total
                        </p>
                    </div>
                    <div className="record-card" style={{ background: "#dbeafe" }}>
                        <h3 style={{ color: "#1e40af" }}>Schooling</h3>
                        <h1 style={{ color: "#1e40af" }}>{counts.schooling}</h1>
                        <p style={{ fontSize: "12px", color: "#6b7280" }}>
                            {counts.total > 0 ? Math.round((counts.schooling / counts.total) * 100) : 0}% of total
                        </p>
                    </div>
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
                    {canViewLifeGroup && (
                        <button
                            className={activeTab === "lifegroup" ? "tab-btn active-tab" : "tab-btn"}
                            onClick={() => setActiveTab("lifegroup")}
                        >
                            Life Group
                        </button>
                    )}
                    <button
                        className={activeTab === "invites" ? "tab-btn active-tab" : "tab-btn"}
                        onClick={() => setActiveTab("invites")}
                    >
                        Invites & Newcomers
                    </button>
                </div>

                {/* ATTENDANCE */}
                {activeTab === "attendance" && canViewAttendance && (
                    <div className="excel-card">
                        <div className="excel-header">
                            <h2>Attendance Records</h2>
                        </div>
                        <div className="excel-wrapper">
                            <table className="excel-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Remarks</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attendance.length === 0 ? (
                                        <tr><td colSpan="3">No attendance records yet.</td></tr>
                                    ) : (
                                        attendance.map(record => (
                                            <tr key={record.id}>
                                                <td>{formatDate(record.service_date)}</td>
                                                <td>{record.remarks}</td>
                                                <td>
                                                    <span className={`status-badge ${record.status === "Present" ? "status-present" : "status-absent"}`}>
                                                        {record.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TITHES */}
                {activeTab === "tithes" && canViewTithes && (
                    <div className="excel-card">
                        <div className="excel-header">
                            <h2>Tithes Records</h2>
                        </div>
                        <div className="excel-wrapper">
                            <table className="excel-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tithes.length === 0 ? (
                                        <tr><td colSpan="2">No tithes records yet.</td></tr>
                                    ) : (
                                        tithes.map(tithe => (
                                            <tr key={tithe.id}>
                                                <td>{formatDate(tithe.date)}</td>
                                                <td style={{ color: "#16a34a", fontWeight: "700" }}>
                                                    P{Number(tithe.amount).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* DEVOTION */}
                {activeTab === "devotion" && canViewDevotion && (
                    <div className="excel-card">
                        <div className="excel-header">
                            <h2>Devotion Consistency</h2>
                        </div>
                        <div className="excel-wrapper">
                            <table className="excel-table">
                                <thead>
                                    <tr>
                                        <th>Month</th>
                                        <th>Completed</th>
                                        <th>Total</th>
                                        <th>Progress</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {devotion.length === 0 ? (
                                        <tr><td colSpan="4">No devotion records yet.</td></tr>
                                    ) : (
                                        devotion.map(dev => {
                                            const progress = Math.round((dev.completed_days / dev.total_days) * 100);
                                            return (
                                                <tr key={dev.id}>
                                                    <td>{dev.month}</td>
                                                    <td>{dev.completed_days}</td>
                                                    <td>{dev.total_days}</td>
                                                    <td>{progress}%</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* LIFEGROUP */}
                {activeTab === "lifegroup" && (
                    <div className="excel-card">
                        <div className="excel-header">
                            <h2>Life Group Participation</h2>
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
                                        <tr><td colSpan="4">No life group records yet.</td></tr>
                                    ) : (
                                        lifeGroups.map(group => (
                                            <tr key={group.id}>
                                                <td>{group.topic}</td>
                                                <td>{group.place}</td>
                                                <td>{group.type}</td>
                                                <td>{formatDate(group.date)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* INVITES TAB - WITH CATEGORY AND STAGE */}
                {activeTab === "invites" && (
                    <div className="excel-card">
                        <div className="excel-header">
                            <h2>Invites & Newcomers</h2>
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
                                        <tr><td colSpan="4">No invites yet.</td></tr>
                                    ) : (
                                        invites.map(invite => {
                                            const category = getStageCategory(invite.remarks);
                                            const colors = getCategoryColor(category);
                                            return (
                                                <tr key={invite.id}>
                                                    <td>{invite.firstname} {invite.lastname}</td>
                                                    <td>{invite.tribe}</td>
                                                    <td>{invite.remarks || "-"}</td>
                                                    <td>
                                                        <span style={{
                                                            padding: "4px 12px",
                                                            borderRadius: "12px",
                                                            fontSize: "12px",
                                                            fontWeight: "600",
                                                            background: colors.bg,
                                                            color: colors.color,
                                                            display: "inline-block"
                                                        }}>
                                                            {colors.label}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
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
