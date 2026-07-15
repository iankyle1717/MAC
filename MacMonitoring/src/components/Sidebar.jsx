
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { getCurrentUser, getNewcomer, logout, getVisibleRoutes, isAdmin, getUserMinistries } from "../utils/auth";
import { getOnlineUsersCount, getOnlineUsers, subscribeOnlineCount } from "../utils/heartbeat";
import logo from "../assets/logo.png";

function Sidebar() {
    const location = useLocation();
    const [authVersion, setAuthVersion] = useState(0);
    const [hoveredLink, setHoveredLink] = useState(null);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [onlineCount, setOnlineCount] = useState(0);
    const [showOnlinePanel, setShowOnlinePanel] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [loadingOnline, setLoadingOnline] = useState(false);
    const user = getCurrentUser();
    const newcomer = getNewcomer();
    const visibleRoutes = getVisibleRoutes();
    const userMinistries = getUserMinistries();
    const admin = isAdmin();

    useEffect(() => {
        const handleAuthChange = () => setAuthVersion(v => v + 1);
        window.addEventListener("ems-auth-change", handleAuthChange);
        return () => window.removeEventListener("ems-auth-change", handleAuthChange);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    // Handle escape key and body scroll lock
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === "Escape") {
                setMobileOpen(false);
                setShowOnlinePanel(false);
            }
        };
        if (mobileOpen || showOnlinePanel) {
            document.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
            document.body.classList.add("menu-open");
        } else {
            document.body.style.overflow = "";
            document.body.classList.remove("menu-open");
        }
        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "";
            document.body.classList.remove("menu-open");
        };
    }, [mobileOpen, showOnlinePanel]);

    // Subscribe to online user count (admin only)
    useEffect(() => {
        if (!admin) return;

        const unsubscribe = subscribeOnlineCount((count) => {
            setOnlineCount(count);
        });

        return unsubscribe;
    }, [admin]);

    // Fetch online users list when panel opens
    useEffect(() => {
        if (!showOnlinePanel || !admin) return;

        const fetchUsers = async () => {
            setLoadingOnline(true);
            const users = await getOnlineUsers(2); // 2 minute threshold
            setOnlineUsers(users);
            setLoadingOnline(false);
        };

        fetchUsers();
        const interval = setInterval(fetchUsers, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, [showOnlinePanel, admin]);

    const isActive = (path) => location.pathname === path;

    const handleLogout = () => logout();

    if (!user && !newcomer) return null;

    const getRouteIcon = (label) => {
        const icons = {
            "Dashboard": "◉",
            "Newsfeed": "✎",
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

    // Build navigation links
    const navLinks = [];
    let newsfeedAdded = false;

    for (const route of visibleRoutes) {
        navLinks.push(route);
        if (route.label === "Dashboard" && !newsfeedAdded) {
            navLinks.push({ path: "/newsfeed", label: "Newsfeed" });
            newsfeedAdded = true;
        }
    }

    if (!newsfeedAdded) {
        navLinks.unshift({ path: "/newsfeed", label: "Newsfeed" });
    }

    const sidebarContent = (
        <>
            {/* LOGO */}
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

            {/* ADMIN: Online Users Badge */}
            {admin && (
                <div 
                    onClick={() => setShowOnlinePanel(true)}
                    style={{
                        margin: "10px 10px 6px",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        background: "rgba(34, 197, 94, 0.1)",
                        border: "1px solid rgba(34, 197, 94, 0.25)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        transition: "all 0.2s ease"
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = "rgba(34, 197, 94, 0.18)";
                        e.currentTarget.style.borderColor = "rgba(34, 197, 94, 0.4)";
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = "rgba(34, 197, 94, 0.1)";
                        e.currentTarget.style.borderColor = "rgba(34, 197, 94, 0.25)";
                    }}
                >
                    <div style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        background: "#22c55e",
                        boxShadow: "0 0 8px rgba(34, 197, 94, 0.5)",
                        animation: "pulse 2s infinite"
                    }} />
                    <div style={{ flex: 1 }}>
                        <p style={{
                            margin: 0,
                            fontSize: "11px",
                            fontWeight: "700",
                            color: "#4ade80",
                            letterSpacing: "0.5px"
                        }}>
                            {onlineCount} Online
                        </p>
                        <p style={{
                            margin: "1px 0 0 0",
                            fontSize: "9px",
                            color: "rgba(255,255,255,0.5)"
                        }}>
                            Tap to view
                        </p>
                    </div>
                    <span style={{
                        fontSize: "16px",
                        color: "#4ade80"
                    }}>👥</span>
                </div>
            )}

            {/* USER */}
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

                        {userMinistries.length > 0 && (
                            <div style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "4px",
                                justifyContent: "center",
                                marginBottom: "4px"
                            }}>
                                {userMinistries.map(ministry => (
                                    <span key={ministry} style={{
                                        display: "inline-block",
                                        padding: "2px 8px",
                                        borderRadius: "10px",
                                        background: "rgba(201, 164, 92, 0.2)",
                                        color: "#c9a45c",
                                        fontSize: "9px",
                                        fontWeight: "700",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.5px"
                                    }}>
                                        {ministry}
                                    </span>
                                ))}
                            </div>
                        )}

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

            {/* NAV LINKS */}
            <div style={{ 
                flex: 1, 
                padding: "4px 8px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start"
            }}>
                {navLinks.map((route, index) => {
                    const active = isActive(route.path);
                    return (
                        <Link
                            key={route.path}
                            to={route.path}
                            onMouseEnter={() => setHoveredLink(index)}
                            onMouseLeave={() => setHoveredLink(null)}
                            onClick={() => setMobileOpen(false)}
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

            {/* LOGOUT */}
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
        </>
    );

    const timeAgo = (isoDate) => {
        const diff = Date.now() - new Date(isoDate).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "Just now";
        if (mins < 2) return "1 min ago";
        if (mins < 60) return `${mins} mins ago`;
        return `${Math.floor(mins / 60)}h ago`;
    };

    return (
        <>
            {/* Mobile Hamburger Button */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="mobile-menu-btn"
                aria-label="Toggle menu"
                style={{
                    position: "fixed",
                    top: "12px",
                    left: "12px",
                    zIndex: 1100,
                    width: "44px",
                    height: "44px",
                    borderRadius: "10px",
                    border: "1px solid rgba(201, 164, 92, 0.3)",
                    background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
                    color: "#c9a45c",
                    fontSize: "20px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                    transition: "all 0.2s ease"
                }}
            >
                {mobileOpen ? "✕" : "☰"}
            </button>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    onClick={() => setMobileOpen(false)}
                    className="mobile-overlay"
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0, 0, 0, 0.6)",
                        backdropFilter: "blur(4px)",
                        zIndex: 998,
                        animation: "fadeIn 0.2s ease"
                    }}
                />
            )}

            {/* Online Users Panel Overlay */}
            {showOnlinePanel && admin && (
                <div
                    onClick={() => setShowOnlinePanel(false)}
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0, 0, 0, 0.7)",
                        backdropFilter: "blur(6px)",
                        zIndex: 1000,
                        animation: "fadeIn 0.2s ease",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "20px"
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)",
                            borderRadius: "16px",
                            border: "1px solid rgba(201, 164, 92, 0.25)",
                            width: "100%",
                            maxWidth: "360px",
                            maxHeight: "80vh",
                            overflow: "hidden",
                            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                            display: "flex",
                            flexDirection: "column"
                        }}
                    >
                        {/* Panel Header */}
                        <div style={{
                            padding: "16px 20px",
                            borderBottom: "1px solid rgba(201, 164, 92, 0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <div style={{
                                    width: "10px",
                                    height: "10px",
                                    borderRadius: "50%",
                                    background: "#22c55e",
                                    boxShadow: "0 0 8px rgba(34, 197, 94, 0.5)"
                                }} />
                                <h3 style={{
                                    margin: 0,
                                    fontSize: "15px",
                                    fontWeight: "700",
                                    color: "#fff"
                                }}>
                                    Online Users
                                </h3>
                                <span style={{
                                    padding: "2px 10px",
                                    borderRadius: "12px",
                                    background: "rgba(34, 197, 94, 0.15)",
                                    color: "#4ade80",
                                    fontSize: "12px",
                                    fontWeight: "700"
                                }}>
                                    {onlineCount}
                                </span>
                            </div>
                            <button
                                onClick={() => setShowOnlinePanel(false)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "rgba(255,255,255,0.5)",
                                    fontSize: "20px",
                                    cursor: "pointer",
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "8px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    transition: "all 0.2s"
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                                onMouseLeave={e => e.currentTarget.style.background = "none"}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Users List */}
                        <div style={{
                            flex: 1,
                            overflowY: "auto",
                            padding: "10px",
                            scrollbarWidth: "thin",
                            scrollbarColor: "rgba(201,164,92,0.3) transparent"
                        }}>
                            {loadingOnline ? (
                                <div style={{ textAlign: "center", padding: "30px" }}>
                                    <div style={{
                                        width: "24px",
                                        height: "24px",
                                        border: "2px solid rgba(255,255,255,0.1)",
                                        borderTopColor: "#c9a45c",
                                        borderRadius: "50%",
                                        margin: "0 auto 10px",
                                        animation: "spin 0.8s linear infinite"
                                    }} />
                                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>
                                        Loading...
                                    </p>
                                </div>
                            ) : onlineUsers.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "30px" }}>
                                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", margin: 0 }}>
                                        No users online right now
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                    {onlineUsers.map(u => (
                                        <div
                                            key={u.id}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "10px",
                                                padding: "10px 12px",
                                                borderRadius: "10px",
                                                background: "rgba(255,255,255,0.03)",
                                                border: "1px solid rgba(255,255,255,0.05)",
                                                transition: "all 0.2s"
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.background = "rgba(201, 164, 92, 0.08)";
                                                e.currentTarget.style.borderColor = "rgba(201, 164, 92, 0.2)";
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                                                e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
                                            }}
                                        >
                                            <img
                                                src={u.image_url || "https://placehold.co/40x40/1a1a2e/c9a45c?text=" + (u.firstname?.[0] || "?")}
                                                alt=""
                                                style={{
                                                    width: "36px",
                                                    height: "36px",
                                                    borderRadius: "50%",
                                                    objectFit: "cover",
                                                    border: "2px solid rgba(34, 197, 94, 0.4)"
                                                }}
                                            />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{
                                                    margin: 0,
                                                    fontSize: "13px",
                                                    fontWeight: "600",
                                                    color: "#fff",
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis"
                                                }}>
                                                    {u.firstname} {u.lastname}
                                                </p>
                                                <p style={{
                                                    margin: "2px 0 0 0",
                                                    fontSize: "10px",
                                                    color: "rgba(255,255,255,0.5)"
                                                }}>
                                                    {u.type} • {u.tribe}
                                                </p>
                                            </div>
                                            <span style={{
                                                fontSize: "10px",
                                                color: "#4ade80",
                                                fontWeight: "500",
                                                whiteSpace: "nowrap"
                                            }}>
                                                {timeAgo(u.last_seen)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Panel Footer */}
                        <div style={{
                            padding: "10px 16px",
                            borderTop: "1px solid rgba(201, 164, 92, 0.1)",
                            textAlign: "center"
                        }}>
                            <p style={{
                                margin: 0,
                                fontSize: "10px",
                                color: "rgba(255,255,255,0.35)"
                            }}>
                                Updates every 10 seconds • 2 min threshold
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Sidebar */}
            <div 
                className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}
                key={authVersion}
                style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100vh",
                    background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
                    borderRight: "1px solid rgba(201, 164, 92, 0.2)",
                    boxShadow: "4px 0 24px rgba(0, 0, 0, 0.3)",
                    overflow: "hidden"
                }}
            >
                {sidebarContent}
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.1); }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </>
    );
}

export default Sidebar;