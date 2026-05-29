import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { getCurrentUser, getNewcomer, logout, getVisibleRoutes, isAdmin } from "../utils/auth";
import logo from "../assets/logo.png";

function Sidebar() {
    const location = useLocation();
    const [authVersion, setAuthVersion] = useState(0);
    const [hoveredLink, setHoveredLink] = useState(null);
    const user = getCurrentUser();
    const newcomer = getNewcomer();
    const visibleRoutes = getVisibleRoutes();

    useEffect(() => {
        const handleAuthChange = () => setAuthVersion(v => v + 1);
        window.addEventListener("ems-auth-change", handleAuthChange);
        return () => window.removeEventListener("ems-auth-change", handleAuthChange);
    }, []);

    const isActive = (path) => location.pathname === path;

    const handleLogout = () => logout();

    if (!user && !newcomer) return null;

    const getRouteIcon = (label) => {
        const icons = {
           "Dashboard": "◉",
            "Leaders": "◌",
            "New Invites": "✦",
            "Attendance": "✓",
            "Tithes": "◈",
            "Devotion": "✧",
            "Life Group": "⌂",
            "My Profile": "◎",
            "My Journey": "➜"
        };
        return icons[label] || "•";
    };

    return (
        <div 
            className="sidebar" 
            key={authVersion}
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100vh",
                background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
                borderRight: "1px solid rgba(201, 164, 92, 0.2)",
                boxShadow: "4px 0 24px rgba(0, 0, 0, 0.3)",
                overflow: "hidden"
            }}s
        >
            {/* LOGO - Compact */}
            <div 
                style={{
                    padding: "16px 12px 12px",
                    textAlign: "center",
                    borderBottom: "1px solid rgba(201, 164, 92, 0.15)"
                }}
            >
                <img 
                    src={logo} 
                    alt="MAC" 
                    style={{
                        width: "80px",
                        height: "80px",
                        objectFit: "contain",
                        marginBottom: "8px",
                        filter: "drop-shadow(0 2px 4px rgba(201, 164, 92, 0.3))"
                    }}
                />
                <h2 style={{
                    fontSize: "12px",
                     color: "#c9a45c",
                    fontWeight: "800",
                      margin: "0 0 2px 0",
                    letterSpacing: "1px"
                }}>
                    MODERN ACTS CHURCH
                </h2>
            
                  <p style={{
                    fontSize: "11px",
                    color: "#c9a45c",
                    textTransform: "uppercase",
                    letterSpacing: "2px",
                    margin: 0,
                    fontWeight: "600"
                }}>
                    Cabangan
                </p>
            </div>

            {/* USER - Compact */}
            <div 
                style={{
                    margin: "10px 10px 6px",
                    padding: "10px",
                    borderRadius: "10px",
                    background: "rgba(201, 164, 92, 0.08)",
                    border: "1px solid rgba(201, 164, 92, 0.15)",
                    textAlign: "center"
                }}
            >
                {user ? (
                    <>
                        <h3 style={{
                            fontSize: "14px",
                            fontWeight: "700",
                            color: "#fff",
                            margin: "0 0 2px 0"
                        }}>
                            {user.firstname} {user.lastname}
                        </h3>
                        <p style={{
                            fontSize: "12px",
                            color: "rgba(255,255,255,0.6)",
                            margin: "0 0 4px 0"
                        }}>
                            {user.type} • {user.tribe}
                        </p>
                        {isAdmin() && (
                            <span style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "10px",
                                background: "linear-gradient(135deg, #c9a45c 0%, #b8934a 100%)",
                                color: "#fff",
                                fontSize: "11px",
                                fontWeight: "700",
                                textTransform: "uppercase",
                                letterSpacing: "1px"
                            }}>
                                 Admin
                            </span>
                        )}
                    </>
                ) : newcomer ? (
                    <>
                        <h3 style={{
                            fontSize: "12px",
                            fontWeight: "700",
                            color: "#fff",
                            margin: "0 0 2px 0"
                        }}>
                            {newcomer.firstname} {newcomer.lastname}
                        </h3>
                        <p style={{
                            fontSize: "10px",
                            color: "rgba(255,255,255,0.6)",
                            margin: "0 0 4px 0"
                        }}>
                            Newcomer • {newcomer.tribe}
                        </p>
                        <span style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: "11px",
                            background: "rgba(22, 163, 74, 0.2)",
                            color: "#4ade80",
                            fontSize: "9px",
                            fontWeight: "700"
                        }}>
                             {newcomer.remarks}
                        </span>
                    </>
                ) : null}
            </div>

            {/* NAV LINKS - Compact, no scroll */}
            <div style={{ 
                flex: 1, 
                padding: "4px 8px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start"
            }}>
                {visibleRoutes.map((route, index) => {
                    const active = isActive(route.path);
                    return (
                        <Link
                            key={route.path}
                            to={route.path}
                            onMouseEnter={() => setHoveredLink(index)}
                            onMouseLeave={() => setHoveredLink(null)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "8px 10px",
                                marginBottom: "3px",
                                borderRadius: "8px",
                                textDecoration: "none",
                                fontSize: "12px",
                                fontWeight: active ? "700" : "500",
                                color: active ? "#1a1a2e" : "rgba(255,255,255,0.8)",
                                background: active 
                                    ? "linear-gradient(135deg, #c9a45c 0%, #b8934a 100%)"
                                    : hoveredLink === index 
                                        ? "rgba(201, 164, 92, 0.15)"
                                        : "transparent",
                                transition: "all 0.2s ease",
                                boxShadow: active ? "0 2px 8px rgba(201, 164, 92, 0.3)" : "none",
                                whiteSpace: "nowrap"
                            }}
                        >
                            <span style={{ fontSize: "14px" }}>
                                {getRouteIcon(route.label)}
                            </span>
                            <span>{route.label}</span>
                            {active && (
                                <span style={{
                                    marginLeft: "auto",
                                    width: "4px",
                                    height: "4px",
                                    borderRadius: "50%",
                                    background: "#1a1a2e"
                                }} />
                            )}
                        </Link>
                    );
                })}
            </div>

            {/* LOGOUT - Compact, bottom */}
            <div style={{ 
                padding: "10px",
                borderTop: "1px solid rgba(201, 164, 92, 0.15)"
            }}>
                <button 
                    onClick={handleLogout}
                    style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid rgba(220, 38, 38, 0.3)",
                        background: "rgba(220, 38, 38, 0.1)",
                        color: "#fca5a5",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px"
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(220, 38, 38, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(220, 38, 38, 0.1)";
                    }}
                >
                    🚪 Logout
                </button>
            </div>
        </div>
    );
}

export default Sidebar;