
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { setCurrentUser, setNewcomer } from "../utils/auth";
import logo from "../assets/logo.png";
import backround from "../assets/backround.jpg";

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
            height: "100vh",
            width: "100vw",
            display: "flex",
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: "hidden",
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        }}>
            {/* LEFT SIDE — HERO SECTION WITH BACKGROUND */}
            <div style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "60px 80px",
                position: "relative",
                overflow: "hidden",
                height: "100vh"
            }}>
                {/* Background Image Layer */}
                <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: `url(${backround})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    zIndex: 0
                }} />

                {/* Dark Overlay */}
                <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `
                        linear-gradient(135deg, rgba(15,23,42,0.94) 0%, rgba(30,41,59,0.88) 50%, rgba(15,23,42,0.96) 100%)
                    `,
                    zIndex: 1
                }} />

                <div style={{ position: "relative", zIndex: 2, maxWidth: "600px" }}>
                    {/* Top Label */}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        marginBottom: "32px"
                    }}>
                        <div style={{
                            width: "50px",
                            height: "2px",
                            background: "#c9a45c"
                        }} />
                        <span style={{
                            fontSize: "13px",
                            fontWeight: 700,
                            color: "#c9a45c",
                            textTransform: "uppercase",
                            letterSpacing: "4px"
                        }}>
                            Modern Acts Church Cabangan
                        </span>
                    </div>

                    {/* Main Headline */}
                    <h1 style={{
                        fontSize: "52px",
                        fontWeight: 900,
                        color: "#ffffff",
                        lineHeight: 1.1,
                        margin: "0 0 16px 0",
                        letterSpacing: "-1px"
                    }}>
                        You Belong <br />
                        <span style={{ color: "#c9a45c" }}>Here</span>
                    </h1>

                    {/* Subtitle */}
                    <p style={{
                        fontSize: "22px",
                        fontWeight: 600,
                        color: "#ffffff",
                        margin: "0 0 12px 0"
                    }}>
                        Gather With Us, <span style={{ color: "#c9a45c" }}>Be Transformed Together</span>
                    </p>

                    {/* Description */}
                    <p style={{
                        fontSize: "15px",
                        color: "rgba(255,255,255,0.6)",
                        lineHeight: 1.7,
                        margin: "0 0 28px 0",
                        maxWidth: "480px"
                    }}>
                        Step into a place where worship meets encounter, and transformation begins — where broken lives find renewal, weary hearts find restoration, and Jesus remains at the center of all we do.
                    </p>

                    {/* Scripture Quote */}
                    <div style={{
                        borderLeft: "3px solid #c9a45c",
                        paddingLeft: "20px",
                        margin: "0 0 40px 0"
                    }}>
                        <p style={{
                            fontSize: "15px",
                            color: "rgba(255,255,255,0.7)",
                            fontStyle: "italic",
                            lineHeight: 1.6,
                            margin: 0,
                            fontFamily: "Georgia, serif"
                        }}>
                            "Therefore go and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit, and teaching them to obey everything I have commanded you. And surely I am with you always, to the very end of the age."
                        </p>
                        <p style={{
                            fontSize: "13px",
                            color: "#c9a45c",
                            fontWeight: 600,
                            margin: "8px 0 0 0"
                        }}>
                            Matthew 28:19-20
                        </p>
                    </div>

                    {/* Weekly Gatherings */}
                    <div style={{ marginBottom: "40px" }}>
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            marginBottom: "16px"
                        }}>
                            <div style={{
                                width: "30px",
                                height: "2px",
                                background: "#c9a45c"
                            }} />
                            <span style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                color: "rgba(255,255,255,0.4)",
                                textTransform: "uppercase",
                                letterSpacing: "3px"
                            }}>
                                Weekly Gatherings
                            </span>
                        </div>

                        <div style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "10px"
                        }}>
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "14px",
                                padding: "14px 18px",
                                background: "rgba(255,255,255,0.05)",
                                borderRadius: "10px",
                                border: "1px solid rgba(255,255,255,0.08)",
                                backdropFilter: "blur(10px)"
                            }}>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff", margin: "0 0 2px 0" }}>Prayer Works</p>
                                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", margin: 0 }}>Every Thursday &bull; 5:30 PM</p>
                                </div>
                                <span style={{
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    color: "#c9a45c",
                                    background: "rgba(201,164,92,0.15)",
                                    padding: "4px 12px",
                                    borderRadius: "20px",
                                    textTransform: "uppercase",
                                    letterSpacing: "1px"
                                }}>Prayer</span>
                            </div>

                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "14px",
                                padding: "14px 18px",
                                background: "rgba(255,255,255,0.05)",
                                borderRadius: "10px",
                                border: "1px solid rgba(255,255,255,0.08)",
                                backdropFilter: "blur(10px)"
                            }}>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff", margin: "0 0 2px 0" }}>Youth GIG</p>
                                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", margin: 0 }}>Every Friday &bull; 5:00 PM</p>
                                </div>
                                <span style={{
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    color: "#f59e0b",
                                    background: "rgba(245,158,11,0.15)",
                                    padding: "4px 12px",
                                    borderRadius: "20px",
                                    textTransform: "uppercase",
                                    letterSpacing: "1px"
                                }}>Youth</span>
                            </div>

                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "14px",
                                padding: "14px 18px",
                                background: "rgba(255,255,255,0.05)",
                                borderRadius: "10px",
                                border: "1px solid rgba(255,255,255,0.08)",
                                backdropFilter: "blur(10px)"
                            }}>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff", margin: "0 0 2px 0" }}>Sunday Family Celebration</p>
                                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", margin: 0 }}>Every Sunday &bull; Family Worship</p>
                                </div>
                                <span style={{
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    color: "#10b981",
                                    background: "rgba(16,185,129,0.15)",
                                    padding: "4px 12px",
                                    borderRadius: "20px",
                                    textTransform: "uppercase",
                                    letterSpacing: "1px"
                                }}>Family</span>
                            </div>
                        </div>
                    </div>

                    {/* Location */}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                    }}>
                        <p style={{
                            fontSize: "13px",
                            color: "rgba(255,255,255,0.35)",
                            margin: 0,
                            letterSpacing: "0.5px"
                        }}>
                            National Highway, Brgy. Del Carmen, Cabangan, Zambales
                        </p>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE — LOGIN FORM */}
            <div style={{
                width: "460px",
                minWidth: "460px",
                background: "#ffffff",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "60px 48px",
                position: "relative",
                zIndex: 2,
                boxShadow: "-20px 0 60px rgba(0,0,0,0.15)",
                height: "100vh",
                overflowY: "auto"
            }}>
                {/* Church Logo & Name */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    marginBottom: "40px"
                }}>
                    <img 
                        src={logo} 
                        alt="MAC" 
                        style={{ 
                            width: "48px", 
                            height: "48px", 
                            objectFit: "contain"
                        }}
                    />
                    <div>
                        <p style={{
                            fontSize: "16px",
                            fontWeight: 800,
                            color: "#111827",
                            margin: "0 0 2px 0"
                        }}>
                            Modern Acts Church
                        </p>
                        <p style={{
                            fontSize: "11px",
                            color: "#9ca3af",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "2px",
                            margin: 0
                        }}>
                            Cabangan
                        </p>
                    </div>
                </div>

                {/* Welcome Text */}
                <div style={{ marginBottom: "32px" }}>
                    <h2 style={{
                        fontSize: "26px",
                        fontWeight: 800,
                        color: "#111827",
                        margin: "0 0 8px 0"
                    }}>
                        Welcome Back
                    </h2>
                    <p style={{
                        fontSize: "14px",
                        color: "#6b7280",
                        margin: 0,
                        lineHeight: 1.6
                    }}>
                        Sign in to access your discipleship records and ministry dashboard.
                    </p>
                </div>

                {/* Mode Toggle */}
                <div style={{
                    display: "flex",
                    gap: "6px",
                    background: "#f3f4f6",
                    borderRadius: "12px",
                    padding: "5px",
                    marginBottom: "28px"
                }}>
                    <button
                        onClick={() => { setMode("leader"); setError(""); }}
                        style={{
                            flex: 1,
                            padding: "12px 16px",
                            borderRadius: "10px",
                            border: "none",
                            fontSize: "13px",
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.25s ease",
                            background: mode === "leader" ? "#c9a45c" : "transparent",
                            color: mode === "leader" ? "#fff" : "#6b7280"
                        }}
                    >
                        Leader
                    </button>
                    <button
                        onClick={() => { setMode("newcomer"); setError(""); }}
                        style={{
                            flex: 1,
                            padding: "12px 16px",
                            borderRadius: "10px",
                            border: "none",
                            fontSize: "13px",
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.25s ease",
                            background: mode === "newcomer" ? "#16a34a" : "transparent",
                            color: mode === "newcomer" ? "#fff" : "#6b7280"
                        }}
                    >
                        Newcomer
                    </button>
                </div>

                {error && (
                    <div style={{
                        background: "#fef2f2",
                        color: "#dc2626",
                        padding: "12px 16px",
                        borderRadius: "10px",
                        fontSize: "13px",
                        fontWeight: 500,
                        marginBottom: "20px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        border: "1px solid #fecaca"
                    }}>
                        <span style={{ fontSize: "16px" }}>&#9888;</span> {error}
                    </div>
                )}

                {mode === "leader" ? (
                    <form onSubmit={handleLeaderLogin} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                        <div>
                            <label style={{
                                display: "block",
                                fontSize: "12px",
                                fontWeight: 700,
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
                                    borderRadius: "10px",
                                    border: "2px solid #e5e7eb",
                                    fontSize: "15px",
                                    transition: "all 0.2s",
                                    outline: "none",
                                    boxSizing: "border-box",
                                    background: "#fafafa"
                                }}
                                onFocus={(e) => { e.target.style.borderColor = "#c9a45c"; e.target.style.boxShadow = "0 0 0 4px rgba(201,164,92,0.1)"; e.target.style.background = "#fff"; }}
                                onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; e.target.style.background = "#fafafa"; }}
                            />
                        </div>
                        <div>
                            <label style={{
                                display: "block",
                                fontSize: "12px",
                                fontWeight: 700,
                                color: "#374151",
                                marginBottom: "6px",
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
                                    padding: "14px 16px",
                                    borderRadius: "10px",
                                    border: "2px solid #e5e7eb",
                                    fontSize: "15px",
                                    transition: "all 0.2s",
                                    outline: "none",
                                    boxSizing: "border-box",
                                    background: "#fafafa"
                                }}
                                onFocus={(e) => { e.target.style.borderColor = "#c9a45c"; e.target.style.boxShadow = "0 0 0 4px rgba(201,164,92,0.1)"; e.target.style.background = "#fff"; }}
                                onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; e.target.style.background = "#fafafa"; }}
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={loading}
                            style={{
                                width: "100%",
                                padding: "15px",
                                borderRadius: "10px",
                                border: "none",
                                background: "#c9a45c",
                                color: "#fff",
                                fontSize: "15px",
                                fontWeight: 700,
                                cursor: loading ? "not-allowed" : "pointer",
                                opacity: loading ? 0.7 : 1,
                                transition: "all 0.2s",
                                marginTop: "4px",
                                boxShadow: "0 4px 14px rgba(201,164,92,0.3)"
                            }}
                            onMouseEnter={(e) => { if (!loading) { e.target.style.background = "#b8944a"; e.target.style.boxShadow = "0 6px 20px rgba(201,164,92,0.4)"; } }}
                            onMouseLeave={(e) => { e.target.style.background = "#c9a45c"; e.target.style.boxShadow = "0 4px 14px rgba(201,164,92,0.3)"; }}
                        >
                            {loading ? "Logging in..." : "Sign In as Leader"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleNewcomerLogin} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                        <div>
                            <label style={{
                                display: "block",
                                fontSize: "12px",
                                fontWeight: 700,
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
                                    borderRadius: "10px",
                                    border: "2px solid #e5e7eb",
                                    fontSize: "15px",
                                    transition: "all 0.2s",
                                    outline: "none",
                                    boxSizing: "border-box",
                                    background: "#fafafa"
                                }}
                                onFocus={(e) => { e.target.style.borderColor = "#16a34a"; e.target.style.boxShadow = "0 0 0 4px rgba(22,163,74,0.1)"; e.target.style.background = "#fff"; }}
                                onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; e.target.style.background = "#fafafa"; }}
                            />
                        </div>
                        <div>
                            <label style={{
                                display: "block",
                                fontSize: "12px",
                                fontWeight: 700,
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
                                    borderRadius: "10px",
                                    border: "2px solid #e5e7eb",
                                    fontSize: "15px",
                                    transition: "all 0.2s",
                                    outline: "none",
                                    boxSizing: "border-box",
                                    background: "#fafafa"
                                }}
                                onFocus={(e) => { e.target.style.borderColor = "#16a34a"; e.target.style.boxShadow = "0 0 0 4px rgba(22,163,74,0.1)"; e.target.style.background = "#fff"; }}
                                onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; e.target.style.background = "#fafafa"; }}
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={loading}
                            style={{
                                width: "100%",
                                padding: "15px",
                                borderRadius: "10px",
                                border: "none",
                                background: "#16a34a",
                                color: "#fff",
                                fontSize: "15px",
                                fontWeight: 700,
                                cursor: loading ? "not-allowed" : "pointer",
                                opacity: loading ? 0.7 : 1,
                                transition: "all 0.2s",
                                marginTop: "4px",
                                boxShadow: "0 4px 14px rgba(22,163,74,0.3)"
                            }}
                            onMouseEnter={(e) => { if (!loading) { e.target.style.background = "#15803d"; e.target.style.boxShadow = "0 6px 20px rgba(22,163,74,0.4)"; } }}
                            onMouseLeave={(e) => { e.target.style.background = "#16a34a"; e.target.style.boxShadow = "0 4px 14px rgba(22,163,74,0.3)"; }}
                        >
                            {loading ? "Loading..." : "View My Journey"}
                        </button>
                        <p style={{
                            textAlign: "center",
                            fontSize: "12px",
                            color: "#9ca3af",
                            margin: "8px 0 0 0",
                            lineHeight: 1.5
                        }}>
                            No password needed. Just enter your name to track your progress.
                        </p>
                    </form>
                )}

                {/* Footer */}
                <div style={{
                    marginTop: "auto",
                    paddingTop: "40px",
                    textAlign: "center"
                }}>
                    <p style={{
                        fontSize: "12px",
                        color: "#d1d5db",
                        margin: 0
                    }}>
                        &copy; 2026 Modern Acts Church Cabangan
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
                        box-shadow: none !important;
                        height: 100vh !important;
                        padding: 40px 24px !important;
                    }
                }
            `}</style>
        </div>
    );
}

export default Login;