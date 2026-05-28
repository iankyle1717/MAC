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
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
            position: "relative",
            overflow: "hidden"
        }}>
            {/* Animated background particles */}
            <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: "radial-gradient(circle at 20% 50%, rgba(201, 164, 92, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(201, 164, 92, 0.08) 0%, transparent 50%)",
                animation: "pulse 8s ease-in-out infinite"
            }} />

            <div className="login-card" style={{
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(20px)",
                borderRadius: "24px",
                padding: "40px",
                width: "100%",
                maxWidth: "480px",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)",
                position: "relative",
                zIndex: 1,
                animation: "slideUp 0.6s ease-out"
            }}>
                {/* LOGO & BRANDING */}
                <div style={{ textAlign: "center", marginBottom: "30px" }}>
                    <img 
                        src={logo} 
                        alt="Modern Acts Church" 
                        style={{
                            width: "100px",
                            height: "100px",
                            objectFit: "contain",
                            marginBottom: "16px",
                            filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.15))"
                        }}
                    />
                    <h1 style={{
                        fontSize: "28px",
                        fontWeight: "800",
                        color: "#1a1a2e",
                        margin: "0 0 4px 0",
                        letterSpacing: "-0.5px"
                    }}>
                        Modern Acts Church
                    </h1>
                    <p style={{
                        fontSize: "14px",
                        color: "#c9a45c",
                        fontWeight: "600",
                        textTransform: "uppercase",
                        letterSpacing: "2px",
                        margin: 0
                    }}>
                        Cabangan • <Disciple-sheep>Disciple-Sheep</Disciple-sheep> Monitoring
                    </p>
                </div>

                {/* Scripture Quote */}
                <div style={{
                    background: "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
                    borderRadius: "16px",
                    padding: "16px 20px",
                    marginBottom: "24px",
                    textAlign: "center",
                    borderLeft: "4px solid #c9a45c"
                }}>
                    <p style={{
                        fontSize: "13px",
                        color: "#4b5563",
                        fontStyle: "italic",
                        margin: 0,
                        lineHeight: "1.6"
                    }}>
                        "Therefore go and make disciples of all nations..."
                    </p>
                    <p style={{
                        fontSize: "12px",
                        color: "#c9a45c",
                        fontWeight: "600",
                        margin: "8px 0 0 0"
                    }}>
                        — Matthew 28:19
                    </p>
                </div>

                {/* Mode Toggle */}
                <div style={{
                    display: "flex",
                    gap: "8px",
                    background: "#f3f4f6",
                    borderRadius: "14px",
                    padding: "6px",
                    marginBottom: "24px"
                }}>
                    <button
                        onClick={() => { setMode("leader"); setError(""); }}
                        style={{
                            flex: 1,
                            padding: "12px 20px",
                            borderRadius: "10px",
                            border: "none",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: "pointer",
                            transition: "all 0.3s ease",
                            background: mode === "leader" ? "#c9a45c" : "transparent",
                            color: mode === "leader" ? "#fff" : "#6b7280",
                            boxShadow: mode === "leader" ? "0 4px 12px rgba(201, 164, 92, 0.3)" : "none"
                        }}
                    >
                        👤 Leader
                    </button>
                    <button
                        onClick={() => { setMode("newcomer"); setError(""); }}
                        style={{
                            flex: 1,
                            padding: "12px 20px",
                            borderRadius: "10px",
                            border: "none",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: "pointer",
                            transition: "all 0.3s ease",
                            background: mode === "newcomer" ? "#16a34a" : "transparent",
                            color: mode === "newcomer" ? "#fff" : "#6b7280",
                            boxShadow: mode === "newcomer" ? "0 4px 12px rgba(22, 163, 74, 0.3)" : "none"
                        }}
                    >
                         👤 Newcomer
                    </button>
                </div>

                {error && (
                    <div style={{
                        background: "#fee2e2",
                        color: "#dc2626",
                        padding: "12px 16px",
                        borderRadius: "12px",
                        fontSize: "13px",
                        fontWeight: "500",
                        marginBottom: "20px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        animation: "shake 0.5s ease"
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                {mode === "leader" ? (
                    <form onSubmit={handleLeaderLogin}>
                        <div style={{ marginBottom: "16px" }}>
                            <label style={{
                                display: "block",
                                fontSize: "13px",
                                fontWeight: "600",
                                color: "#374151",
                                marginBottom: "6px",
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
                                    padding: "14px 16px",
                                    borderRadius: "12px",
                                    border: "2px solid #e5e7eb",
                                    fontSize: "15px",
                                    transition: "all 0.3s ease",
                                    outline: "none",
                                    boxSizing: "border-box"
                                }}
                                onFocus={(e) => e.target.style.borderColor = "#c9a45c"}
                                onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                            />
                        </div>
                        <div style={{ marginBottom: "24px" }}>
                            <label style={{
                                display: "block",
                                fontSize: "13px",
                                fontWeight: "600",
                                color: "#374151",
                                marginBottom: "6px",
                                textTransform: "uppercase",
                                letterSpacing: "0.5px"
                            }}>
                                Password
                            </label>
                            <input
                                type="password"
                                placeholder="Enter Password (PIN)"
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "14px 16px",
                                    borderRadius: "12px",
                                    border: "2px solid #e5e7eb",
                                    fontSize: "15px",
                                    transition: "all 0.3s ease",
                                    outline: "none",
                                    boxSizing: "border-box"
                                }}
                                onFocus={(e) => e.target.style.borderColor = "#c9a45c"}
                                onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={loading}
                            style={{
                                width: "100%",
                                padding: "16px",
                                borderRadius: "14px",
                                border: "none",
                                background: "linear-gradient(135deg, #c9a45c 0%, #b8934a 100%)",
                                color: "#fff",
                                fontSize: "16px",
                                fontWeight: "700",
                                cursor: loading ? "not-allowed" : "pointer",
                                opacity: loading ? 0.7 : 1,
                                transition: "all 0.3s ease",
                                boxShadow: "0 4px 16px rgba(201, 164, 92, 0.3)"
                            }}
                        >
                            {loading ? "⏳ Logging in..." : "🔐 Login as Leader"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleNewcomerLogin}>
                        <div style={{ marginBottom: "16px" }}>
                            <label style={{
                                display: "block",
                                fontSize: "13px",
                                fontWeight: "600",
                                color: "#374151",
                                marginBottom: "6px",
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
                                    padding: "14px 16px",
                                    borderRadius: "12px",
                                    border: "2px solid #e5e7eb",
                                    fontSize: "15px",
                                    transition: "all 0.3s ease",
                                    outline: "none",
                                    boxSizing: "border-box"
                                }}
                                onFocus={(e) => e.target.style.borderColor = "#16a34a"}
                                onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                            />
                        </div>
                        <div style={{ marginBottom: "24px" }}>
                            <label style={{
                                display: "block",
                                fontSize: "13px",
                                fontWeight: "600",
                                color: "#374151",
                                marginBottom: "6px",
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
                                    padding: "14px 16px",
                                    borderRadius: "12px",
                                    border: "2px solid #e5e7eb",
                                    fontSize: "15px",
                                    transition: "all 0.3s ease",
                                    outline: "none",
                                    boxSizing: "border-box"
                                }}
                                onFocus={(e) => e.target.style.borderColor = "#16a34a"}
                                onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={loading}
                            style={{
                                width: "100%",
                                padding: "16px",
                                borderRadius: "14px",
                                border: "none",
                                background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                                color: "#fff",
                                fontSize: "16px",
                                fontWeight: "700",
                                cursor: loading ? "not-allowed" : "pointer",
                                opacity: loading ? 0.7 : 1,
                                transition: "all 0.3s ease",
                                boxShadow: "0 4px 16px rgba(22, 163, 74, 0.3)"
                            }}
                        >
                            {loading ? "⏳ Loading..." : "✨ View My Journey"}
                        </button>
                        <p style={{
                            textAlign: "center",
                            fontSize: "12px",
                            color: "#9ca3af",
                            marginTop: "16px",
                            lineHeight: "1.5"
                        }}>
                            No password needed. Just enter your name to track your discipleship progress.
                        </p>
                    </form>
                )}

                {/* Footer */}
                <div style={{
                    marginTop: "30px",
                    paddingTop: "20px",
                    borderTop: "1px solid #e5e7eb",
                    textAlign: "center"
                }}>
                    <p style={{
                        fontSize: "12px",
                        color: "#9ca3af",
                        margin: 0
                    }}>
                        © 2026 Modern Acts Church Cabangan. All rights reserved.
                    </p>
                    <p style={{
                        fontSize: "11px",
                        color: "#c9a45c",
                        margin: "4px 0 0 0",
                        fontWeight: "600"
                    }}>
                        Made with ❤️ for the Kingdom
                    </p>
                </div>
            </div>

            {/* CSS Animations */}
            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 1; }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
            `}</style>
        </div>
    );
}

export default Login;