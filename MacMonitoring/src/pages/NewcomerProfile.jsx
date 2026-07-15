import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { getNewcomer, getCurrentUser, logout, canViewNewcomerProfile } from "../utils/auth";

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
    textPrimary: "#f5f5f5",
    textSecondary: "#a3a3a3",
    textMuted: "#737373",
    border: "rgba(255, 255, 255, 0.08)",
    borderGold: "rgba(201, 164, 92, 0.3)",
    gradientGold: "linear-gradient(135deg, #c9a45c 0%, #a88b4a 100%)",
    shadowGold: "0 4px 24px rgba(201, 164, 92, 0.15)",
};

function NewcomerProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [newcomer, setNewcomer] = useState(null);
    const [inviter, setInviter] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const currentNewcomer = getNewcomer();
    const currentUser = getCurrentUser();

    useEffect(() => {
        // Check permission
        if (!canViewNewcomerProfile(Number(id))) {
            setError("You don't have permission to view this profile.");
            setLoading(false);
            return;
        }

        fetchNewcomer();
    }, [id]);

    const fetchNewcomer = async () => {
        setLoading(true);

        const { data, error } = await supabase
            .from("tblNewMembers")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !data) {
            setError("Profile not found.");
            setLoading(false);
            return;
        }

        setNewcomer(data);

        // Fetch inviter info if available
        if (data.invited_by) {
            const { data: inviterData } = await supabase
                .from("tblMonitoring")
                .select("firstname, lastname, tribe, type")
                .ilike("firstname", data.invited_by.split(" ")[0])
                .single();

            if (inviterData) {
                setInviter(inviterData);
            }
        }

        setLoading(false);
    };

    // Progress bar calculation
    const getProgressPercent = () => {
        if (!newcomer) return 0;
        const stages = ["1st Timer", "2nd Timer", "3rd Timer", "Winning", "Soaking", "Schooling"];
        const currentIndex = stages.indexOf(newcomer.remarks);
        if (currentIndex === -1) return 0;
        return ((currentIndex + 1) / stages.length) * 100;
    };

    const getStageColor = () => {
        if (!newcomer) return "#6b7280";
        switch (newcomer.remarks) {
            case "1st Timer": return "#ef4444";
            case "2nd Timer": return "#f97316";
            case "3rd Timer": return "#eab308";
            case "Winning": return "#22c55e";
            case "Soaking": return "#3b82f6";
            case "Schooling": return "#8b5cf6";
            default: return "#6b7280";
        }
    };

    if (loading) {
        return (
            <div className="login-page">
                <div className="loading-spinner">Loading your journey...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="login-page">
                <div className="login-card">
                    <h2>Access Denied</h2>
                    <p>{error}</p>
                    <button onClick={() => navigate("/login")} className="login-btn">
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    if (!newcomer) return null;

    const isOwnProfile = currentNewcomer?.id === newcomer.id;

    return (
        <div className="newcomer-profile-page">
            {/* Header */}
            <div className="newcomer-header">
                <div className="newcomer-header-content">
                    <div className="newcomer-avatar-large">
                        {newcomer.firstname[0]}{newcomer.lastname[0]}
                    </div>
                    <div className="newcomer-header-info">
                        <h1>{newcomer.firstname} {newcomer.lastname}</h1>
                        <p className="newcomer-tribe">{newcomer.tribe} Tribe</p>
                        <span 
                            className="stage-badge"
                            style={{ backgroundColor: getStageColor() + "20", color: getStageColor() }}
                        >
                            {newcomer.remarks}
                        </span>
                    </div>
                    <button onClick={logout} className="logout-btn-small">
                        Logout
                    </button>
                </div>
            </div>

            <div className="newcomer-content">
                {/* Community Navigation Cards */}
                {isOwnProfile && (
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                        gap: "16px",
                        marginBottom: "24px"
                    }}>
                        {/* Dashboard Card */}
                        <Link to="/dashboard" style={{ textDecoration: "none" }}>
                            <div style={{
                                background: THEME.blackCard,
                                borderRadius: "16px",
                                border: `1px solid ${THEME.border}`,
                                padding: "20px",
                                cursor: "pointer",
                                transition: "all 0.3s ease",
                                display: "flex",
                                alignItems: "center",
                                gap: "16px"
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = THEME.gold;
                                e.currentTarget.style.transform = "translateY(-2px)";
                                e.currentTarget.style.boxShadow = THEME.shadowGold;
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = THEME.border;
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.boxShadow = "none";
                            }}>
                                <div style={{
                                    width: "48px", height: "48px", borderRadius: "12px",
                                    background: THEME.goldMuted,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: "24px"
                                }}>
                                    📋
                                </div>
                                <div>
                                    <h4 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: 700, color: THEME.textPrimary }}>
                                        MAC Dashboard
                                    </h4>
                                    <p style={{ margin: 0, fontSize: "12px", color: THEME.textMuted }}>
                                        View events, announcements & updates
                                    </p>
                                </div>
                                <span style={{ marginLeft: "auto", fontSize: "20px", color: THEME.gold }}>→</span>
                            </div>
                        </Link>

                        {/* Newsfeed Card */}
                        <Link to="/newsfeed" style={{ textDecoration: "none" }}>
                            <div style={{
                                background: THEME.blackCard,
                                borderRadius: "16px",
                                border: `1px solid ${THEME.border}`,
                                padding: "20px",
                                cursor: "pointer",
                                transition: "all 0.3s ease",
                                display: "flex",
                                alignItems: "center",
                                gap: "16px"
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = THEME.gold;
                                e.currentTarget.style.transform = "translateY(-2px)";
                                e.currentTarget.style.boxShadow = THEME.shadowGold;
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = THEME.border;
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.boxShadow = "none";
                            }}>
                                <div style={{
                                    width: "48px", height: "48px", borderRadius: "12px",
                                    background: "rgba(96, 165, 250, 0.12)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: "24px"
                                }}>
                                    💬
                                </div>
                                <div>
                                    <h4 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: 700, color: THEME.textPrimary }}>
                                        Community Newsfeed
                                    </h4>
                                    <p style={{ margin: 0, fontSize: "12px", color: THEME.textMuted }}>
                                        React & comment on community moments
                                    </p>
                                </div>
                                <span style={{ marginLeft: "auto", fontSize: "20px", color: THEME.gold }}>→</span>
                            </div>
                        </Link>
                    </div>
                )}

                {/* Welcome Message */}
                {isOwnProfile && (
                    <div className="welcome-card">
                        <h2>Welcome back, {newcomer.firstname}! 👋</h2>
                        <p>You are a cherished member of the MAC family. Here&apos;s your discipleship journey progress.</p>
                    </div>
                )}

                {/* Journey Progress */}
                <div className="journey-card">
                    <h3>Discipleship Journey</h3>

                    <div className="progress-section">
                        <div className="progress-header">
                            <span>Current Stage</span>
                            <span style={{ color: getStageColor(), fontWeight: 700 }}>
                                {newcomer.remarks}
                            </span>
                        </div>
                        <div className="progress-bar-bg">
                            <div 
                                className="progress-bar-fill"
                                style={{ 
                                    width: `${getProgressPercent()}%`,
                                    backgroundColor: getStageColor()
                                }}
                            />
                        </div>
                        <p className="progress-text">
                            {getProgressPercent().toFixed(0)}% completed
                        </p>
                    </div>

                    {/* Stages Timeline */}
                    <div className="stages-timeline">
                        {["1st Timer", "2nd Timer", "3rd Timer", "Winning", "Soaking", "Schooling"].map((stage, index) => {
                            const stages = ["1st Timer", "2nd Timer", "3rd Timer", "Winning", "Soaking", "Schooling"];
                            const currentIndex = stages.indexOf(newcomer.remarks);
                            const isCompleted = index <= currentIndex;
                            const isCurrent = index === currentIndex;

                            return (
                                <div 
                                    key={stage} 
                                    className={`timeline-item ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                                >
                                    <div 
                                        className="timeline-dot"
                                        style={{ 
                                            backgroundColor: isCompleted ? getStageColor() : "#e5e7eb",
                                            boxShadow: isCurrent ? `0 0 0 4px ${getStageColor()}30` : 'none'
                                        }}
                                    >
                                        {isCompleted && "✓"}
                                    </div>
                                    <span className="timeline-label">{stage}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Invited By */}
                {inviter && (
                    <div className="info-card">
                        <h3>Invited By</h3>
                        <div className="inviter-info">
                            <div className="inviter-avatar">
                                {inviter.firstname[0]}{inviter.lastname[0]}
                            </div>
                            <div>
                                <p className="inviter-name">{inviter.firstname} {inviter.lastname}</p>
                                <p className="inviter-meta">{inviter.type} • {inviter.tribe}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Quick Info */}
                <div className="info-grid">
                    <div className="info-item">
                        <span className="info-label">Tribe</span>
                        <span className="info-value">{newcomer.tribe}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">Status</span>
                        <span className="info-value" style={{ color: getStageColor() }}>
                            {newcomer.remarks}
                        </span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">Date Added</span>
                        <span className="info-value">
                            {new Date(newcomer.created_at).toLocaleDateString()}
                        </span>
                    </div>
                </div>

                {/* Encouragement Message */}
                <div className="encouragement-card">
                    <h4>Keep Going! 🙏</h4>
                    <p style={{ margin: "8px 0 0 0", fontSize: "14px", color: "#737373", lineHeight: 1.6 }}>
                        &ldquo;Therefore go and make disciples of all nations...&rdquo; — Matthew 28:19
                    </p>
                    <p style={{ margin: "12px 0 0 0", fontSize: "13px", color: "#a3a3a3" }}>
                        You belong here. We&apos;re walking this journey with you! 💛
                    </p>
                </div>
            </div>
        </div>
    );
}

export default NewcomerProfile;