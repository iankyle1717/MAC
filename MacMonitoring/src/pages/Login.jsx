import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { setCurrentUser, setNewcomer } from "../utils/auth";
import logo from "../assets/logo.png";

function Login() {
    const navigate = useNavigate();
    const [mode, setMode] = useState("leader");

    const [leaderFirstname, setLeaderFirstname] = useState("");
    const [pin, setPin] = useState("");

    const [newcomerFirstname, setNewcomerFirstname] = useState("");
    const [newcomerLastname, setNewcomerLastname] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLeaderLogin = async (e) => {
        e.preventDefault();
        setError("");

        if (!leaderFirstname || !pin) {
            setError("Please enter your first name and PIN.");
            return;
        }

        setLoading(true);

        const { data, error } = await supabase
            .from("tblMonitoring")
            .select("*")
            .ilike("firstname", leaderFirstname)
            .eq("pin", pin)
            .single();

        setLoading(false);

        if (error || !data) {
            setError("Invalid credentials. Please check your first name and PIN.");
            return;
        }

        setCurrentUser(data);

        if (data.type === "ADMIN" || data.ministry === "ADMIN") {
            navigate("/dashboard");
        } else {
            navigate(`/leader/${data.id}`);
        }
    };

    const handleNewcomerLogin = async (e) => {
        e.preventDefault();
        setError("");

        if (!newcomerFirstname || !newcomerLastname) {
            setError("Please enter your first and last name.");
            return;
        }

        setLoading(true);

        const { data, error } = await supabase
            .from("tblNewMembers")
            .select("*")
            .ilike("firstname", newcomerFirstname)
            .ilike("lastname", newcomerLastname)
            .single();

        setLoading(false);

        if (error || !data) {
            setError("No record found. Please check your name or contact your leader.");
            return;
        }

        setNewcomer(data);
        navigate(`/newcomer/${data.id}`);
    };

    return (
        <div className="login-page" style={{
            minHeight: "100vh",
            display: "flex",
            background: "#fff",
            position: "relative",
            overflow: "hidden"
        }}>
            {/* LEFT SIDE — CHURCH INFO (CENTERED) */}
            <div style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "48px",
                position: "relative",
                overflow: "hidden"
            }}>
                {/* Subtle background */}
                <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `
                        radial-gradient(ellipse 60% 50% at 50% 30%, rgba(201,164,92,0.06) 0%, transparent 70%),
                        radial-gradient(ellipse 40% 40% at 80% 80%, rgba(22,163,74,0.04) 0%, transparent 50%)
                    `
                }} />

                <div style={{ position: "relative", zIndex: 1, maxWidth: "420px", width: "100%", textAlign: "center" }}>
                    {/* Logo */}
                    <img 
                        src={logo} 
                        alt="MAC" 
                        style={{ 
                            width: "72px", 
                            height: "72px", 
                            objectFit: "contain", 
                            marginBottom: "20px",
                            filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.1))"
                        }}
                    />

                    {/* Church Name */}
                    <h1 style={{
                        fontSize: "26px",
                        fontWeight: 800,
                        color: "#111827",
                        margin: "0 0 4px 0",
                        letterSpacing: "-0.5px"
                    }}>
                        Modern Acts Church
                    </h1>
                    <p style={{
                        fontSize: "12px",
                        color: "#9ca3af",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "3px",
                        margin: "0 0 32px 0"
                    }}>
                        Cabangan • Disciple-Sheep Monitoring
                    </p>

                    {/* Scripture Quote */}
                    <p style={{
                        fontSize: "15px",
                        color: "#4b5563",
                        lineHeight: 1.7,
                        margin: "0 0 12px 0",
                        fontStyle: "italic",
                        fontFamily: "Georgia, serif"
                    }}>
                        "Therefore go and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit."
                    </p>
                    <p style={{
                        fontSize: "12px",
                        color: "#c9a45c",
                        fontWeight: 600,
                        margin: "0 0 40px 0"
                    }}>
                        Matthew 28:19
                    </p>

                    {/* Feature Cards */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", textAlign: "left" }}>
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "14px",
                            padding: "14px 16px",
                            background: "#f9fafb",
                            borderRadius: "10px",
                            border: "1px solid #f3f4f6"
                        }}>
                            <span style={{ fontSize: "20px" }}></span>
                            <div>
                                <p style={{ fontSize: "13px", fontWeight: 600, color: "#111827", margin: "0 0 2px 0" }}>Leader Monitoring</p>
                                <p style={{ fontSize: "11px", color: "#9ca3af", margin: 0 }}>Track TLDA performance & ministry growth</p>
                            </div>
                        </div>

                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "14px",
                            padding: "14px 16px",
                            background: "#f9fafb",
                            borderRadius: "10px",
                            border: "1px solid #f3f4f6"
                        }}>
                            <span style={{ fontSize: "20px" }}></span>
                            <div>
                                <p style={{ fontSize: "13px", fontWeight: 600, color: "#111827", margin: "0 0 2px 0" }}>Newcomer Tracking</p>
                                <p style={{ fontSize: "11px", color: "#9ca3af", margin: 0 }}>Monitor discipleship journey stages</p>
                            </div>
                        </div>

                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "14px",
                            padding: "14px 16px",
                            background: "#f9fafb",
                            borderRadius: "10px",
                            border: "1px solid #f3f4f6"
                        }}>
                            <span style={{ fontSize: "20px" }}></span>
                            <div>
                                <p style={{ fontSize: "13px", fontWeight: 600, color: "#111827", margin: "0 0 2px 0" }}>Tithes Recording</p>
                                <p style={{ fontSize: "11px", color: "#9ca3af", margin: 0 }}>Record and export tithe reports</p>
                            </div>
                        </div>

                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "14px",
                            padding: "14px 16px",
                            background: "#f9fafb",
                            borderRadius: "10px",
                            border: "1px solid #f3f4f6"
                        }}>
                            <span style={{ fontSize: "20px" }}></span>
                            <div>
                                <p style={{ fontSize: "13px", fontWeight: 600, color: "#111827", margin: "0 0 2px 0" }}>Monthly Reports</p>
                                <p style={{ fontSize: "11px", color: "#9ca3af", margin: 0 }}>Life group & devotion consistency stats</p>
                            </div>
                        </div>
                    </div>

                    {/* Location */}
                    <p style={{
                        fontSize: "11px",
                        color: "#d1d5db",
                        margin: "32px 0 0 0",
                        letterSpacing: "0.5px"
                    }}>
                        📍 National Highway, Brgy. Del Carmen, Cabangan, Zambales
                    </p>
                </div>
            </div>

            {/* RIGHT SIDE — LOGIN FORM */}
            <div style={{
                width: "420px",
                minWidth: "420px",
                background: "#f8f9fb",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "48px 40px",
                position: "relative",
                zIndex: 2,
                borderLeft: "1px solid #e5e7eb"
            }}>
                {/* Welcome Text */}
                <div style={{ marginBottom: "28px" }}>
                    <h1 style={{
                        fontSize: "24px",
                        fontWeight: 800,
                        color: "#111827",
                        margin: "0 0 6px 0"
                    }}>
                        Welcome Back
                    </h1>
                    <p style={{
                        fontSize: "13px",
                        color: "#6b7280",
                        margin: 0,
                        lineHeight: 1.5
                    }}>
                        Sign in to access your discipleship records and ministry dashboard.
                    </p>
                </div>

                {/* Mode Toggle */}
                <div style={{
                    display: "flex",
                    gap: "6px",
                    background: "#e5e7eb",
                    borderRadius: "10px",
                    padding: "5px",
                    marginBottom: "24px"
                }}>
                    <button
                        onClick={() => { setMode("leader"); setError(""); }}
                        style={{
                            flex: 1,
                            padding: "10px 16px",
                            borderRadius: "8px",
                            border: "none",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 0.25s ease",
                            background: mode === "leader" ? "#c9a45c" : "transparent",
                            color: mode === "leader" ? "#fff" : "#6b7280"
                        }}
                    >
                        👤 Leader
                    </button>
                    <button
                        onClick={() => { setMode("newcomer"); setError(""); }}
                        style={{
                            flex: 1,
                            padding: "10px 16px",
                            borderRadius: "8px",
                            border: "none",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 0.25s ease",
                            background: mode === "newcomer" ? "#16a34a" : "transparent",
                            color: mode === "newcomer" ? "#fff" : "#6b7280"
                        }}
                    >
                        🌱 Newcomer
                    </button>
                </div>

                {error && (
                    <div style={{
                        background: "#fee2e2",
                        color: "#dc2626",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: 500,
                        marginBottom: "16px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                {mode === "leader" ? (
                    <form onSubmit={handleLeaderLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        <div>
                            <label style={{
                                display: "block",
                                fontSize: "11px",
                                fontWeight: 700,
                                color: "#374151",
                                marginBottom: "5px",
                                textTransform: "uppercase",
                                letterSpacing: "0.5px"
                            }}>
                                First Name
                            </label>
                            <input
                                type="text"
                                placeholder="Enter your first name"
                                value={leaderFirstname}
                                onChange={(e) => setLeaderFirstname(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "11px 14px",
                                    borderRadius: "8px",
                                    border: "1.5px solid #d1d5db",
                                    fontSize: "14px",
                                    transition: "all 0.2s",
                                    outline: "none",
                                    boxSizing: "border-box",
                                    background: "#fff"
                                }}
                                onFocus={(e) => { e.target.style.borderColor = "#c9a45c"; e.target.style.boxShadow = "0 0 0 3px rgba(201,164,92,0.1)"; }}
                                onBlur={(e) => { e.target.style.borderColor = "#d1d5db"; e.target.style.boxShadow = "none"; }}
                            />
                        </div>
                        <div>
                            <label style={{
                                display: "block",
                                fontSize: "11px",
                                fontWeight: 700,
                                color: "#374151",
                                marginBottom: "5px",
                                textTransform: "uppercase",
                                letterSpacing: "0.5px"
                            }}>
                                Password (PIN)
                            </label>
                            <input
                                type="password"
                                placeholder="Enter your PIN"
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "11px 14px",
                                    borderRadius: "8px",
                                    border: "1.5px solid #d1d5db",
                                    fontSize: "14px",
                                    transition: "all 0.2s",
                                    outline: "none",
                                    boxSizing: "border-box",
                                    background: "#fff"
                                }}
                                onFocus={(e) => { e.target.style.borderColor = "#c9a45c"; e.target.style.boxShadow = "0 0 0 3px rgba(201,164,92,0.1)"; }}
                                onBlur={(e) => { e.target.style.borderColor = "#d1d5db"; e.target.style.boxShadow = "none"; }}
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={loading}
                            style={{
                                width: "100%",
                                padding: "12px",
                                borderRadius: "8px",
                                border: "none",
                                background: "#c9a45c",
                                color: "#fff",
                                fontSize: "14px",
                                fontWeight: 700,
                                cursor: loading ? "not-allowed" : "pointer",
                                opacity: loading ? 0.7 : 1,
                                transition: "all 0.2s",
                                marginTop: "4px"
                            }}
                            onMouseEnter={(e) => { if (!loading) e.target.style.background = "#b8934a"; }}
                            onMouseLeave={(e) => { e.target.style.background = "#c9a45c"; }}
                        >
                            {loading ? "⏳ Logging in..." : "🔐 Sign In as Leader"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleNewcomerLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        <div>
                            <label style={{
                                display: "block",
                                fontSize: "11px",
                                fontWeight: 700,
                                color: "#374151",
                                marginBottom: "5px",
                                textTransform: "uppercase",
                                letterSpacing: "0.5px"
                            }}>
                                First Name
                            </label>
                            <input
                                type="text"
                                placeholder="Enter your first name"
                                value={newcomerFirstname}
                                onChange={(e) => setNewcomerFirstname(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "11px 14px",
                                    borderRadius: "8px",
                                    border: "1.5px solid #d1d5db",
                                    fontSize: "14px",
                                    transition: "all 0.2s",
                                    outline: "none",
                                    boxSizing: "border-box",
                                    background: "#fff"
                                }}
                                onFocus={(e) => { e.target.style.borderColor = "#16a34a"; e.target.style.boxShadow = "0 0 0 3px rgba(22,163,74,0.1)"; }}
                                onBlur={(e) => { e.target.style.borderColor = "#d1d5db"; e.target.style.boxShadow = "none"; }}
                            />
                        </div>
                        <div>
                            <label style={{
                                display: "block",
                                fontSize: "11px",
                                fontWeight: 700,
                                color: "#374151",
                                marginBottom: "5px",
                                textTransform: "uppercase",
                                letterSpacing: "0.5px"
                            }}>
                                Last Name
                            </label>
                            <input
                                type="text"
                                placeholder="Enter your last name"
                                value={newcomerLastname}
                                onChange={(e) => setNewcomerLastname(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "11px 14px",
                                    borderRadius: "8px",
                                    border: "1.5px solid #d1d5db",
                                    fontSize: "14px",
                                    transition: "all 0.2s",
                                    outline: "none",
                                    boxSizing: "border-box",
                                    background: "#fff"
                                }}
                                onFocus={(e) => { e.target.style.borderColor = "#16a34a"; e.target.style.boxShadow = "0 0 0 3px rgba(22,163,74,0.1)"; }}
                                onBlur={(e) => { e.target.style.borderColor = "#d1d5db"; e.target.style.boxShadow = "none"; }}
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={loading}
                            style={{
                                width: "100%",
                                padding: "12px",
                                borderRadius: "8px",
                                border: "none",
                                background: "#16a34a",
                                color: "#fff",
                                fontSize: "14px",
                                fontWeight: 700,
                                cursor: loading ? "not-allowed" : "pointer",
                                opacity: loading ? 0.7 : 1,
                                transition: "all 0.2s",
                                marginTop: "4px"
                            }}
                            onMouseEnter={(e) => { if (!loading) e.target.style.background = "#15803d"; }}
                            onMouseLeave={(e) => { e.target.style.background = "#16a34a"; }}
                        >
                            {loading ? "⏳ Loading..." : " View My Journey"}
                        </button>
                        <p style={{
                            textAlign: "center",
                            fontSize: "11px",
                            color: "#9ca3af",
                            margin: "8px 0 0 0",
                            lineHeight: 1.4
                        }}>
                            No password needed. Just enter your name to track your progress.
                        </p>
                    </form>
                )}

                {/* Footer */}
                <div style={{
                    marginTop: "auto",
                    paddingTop: "24px",
                    textAlign: "center"
                }}>
                    <p style={{
                        fontSize: "11px",
                        color: "#d1d5db",
                        margin: 0
                    }}>
                        © 2026 Modern Acts Church Cabangan
                    </p>
                </div>
            </div>

            {/* Mobile responsive */}
            <style>{`
                @media (max-width: 900px) {
                    .login-page {
                        flex-direction: column-reverse !important;
                    }
                    .login-page > div:first-child {
                        display: none !important;
                    }
                    .login-page > div:last-child {
                        width: 100% !important;
                        min-width: auto !important;
                        border-left: none !important;
                        min-height: 100vh;
                    }
                }
            `}</style>
        </div>
    );
}

export default Login;