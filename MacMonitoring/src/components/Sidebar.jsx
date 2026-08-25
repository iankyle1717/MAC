import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { getCurrentUser, getNewcomer, logout, getVisibleRoutes, isAdmin, getUserMinistries } from "../utils/auth";
import { getOnlineUsersCount, getOnlineUsers, subscribeOnlineCount } from "../utils/heartbeat";
import { useTheme } from "../context/ThemeContext";   // ← added
import logo from "../assets/logo.png";

function Sidebar() {
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();   // ← added
    const [authVersion, setAuthVersion] = useState(0);
    const [hoveredLink, setHoveredLink] = useState(null);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [onlineCount, setOnlineCount] = useState(0);
    const [showOnlinePanel, setShowOnlinePanel] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [loadingOnline, setLoadingOnline] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
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

    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

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

    useEffect(() => {
        if (!admin) return;
        const unsubscribe = subscribeOnlineCount((count) => setOnlineCount(count));
        return unsubscribe;
    }, [admin]);

    useEffect(() => {
        if (!showOnlinePanel || !admin) return;
        const fetchUsers = async () => {
            setLoadingOnline(true);
            const users = await getOnlineUsers(2);
            setOnlineUsers(users);
            setLoadingOnline(false);
        };
        fetchUsers();
        const interval = setInterval(fetchUsers, 10000);
        return () => clearInterval(interval);
    }, [showOnlinePanel, admin]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            const fsElement = document.fullscreenElement
                || document.webkitFullscreenElement
                || document.mozFullScreenElement
                || document.msFullscreenElement;
            setIsFullscreen(!!fsElement);
        };
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
        document.addEventListener("mozfullscreenchange", handleFullscreenChange);
        document.addEventListener("MSFullscreenChange", handleFullscreenChange);
        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
            document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
            document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
        };
    }, []);

    const toggleFullscreen = () => {
        const fsElement = document.fullscreenElement
            || document.webkitFullscreenElement
            || document.mozFullScreenElement
            || document.msFullscreenElement;

        if (!fsElement) {
            const el = document.documentElement;
            const request = el.requestFullscreen || el.webkitRequestFullscreen
                || el.mozRequestFullScreen || el.msRequestFullscreen;
            if (request) {
                request.call(el).catch(() => {
                    alert("Fullscreen isn't supported on this device/browser.");
                });
            } else {
                alert("Fullscreen isn't supported on this device/browser.");
            }
        } else {
            const exit = document.exitFullscreen || document.webkitExitFullscreen
                || document.mozCancelFullScreen || document.msExitFullscreen;
            if (exit) exit.call(document);
        }
    };

    const isActive = (path) => location.pathname === path;
    const handleLogout = () => logout();
    if (!user && !newcomer) return null;

    const getRouteIcon = (label) => {
        const icons = {
            "Dashboard": "◉",
            "Newsfeed": "✎",
            "MAC-MESSAGE": "✉",
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

    const navLinks = [];
    let newsfeedAdded = false;
    for (const route of visibleRoutes) {
        navLinks.push(route);
        if (route.label === "Dashboard" && !newsfeedAdded) {
            navLinks.push({ path: "/newsfeed", label: "Newsfeed" });
            navLinks.push({ path: "/messages", label: "MAC-MESSAGE" });
            newsfeedAdded = true;
        }
    }
    if (!newsfeedAdded) {
        navLinks.unshift({ path: "/newsfeed", label: "Newsfeed" });
        navLinks.splice(1, 0, { path: "/messages", label: "MAC-MESSAGE" });
    }

    const sidebarContent = (
        <>
            {/* LOGO */}
            <div style={{
                padding: "16px 12px 12px",
                textAlign: "center",
                borderBottom: "1px solid var(--gold-transparent-15)",
                flexShrink: 0
            }}>
                <img src={logo} alt="MAC" style={{
                    width: "80px",
                    height: "80px",
                    objectFit: "contain",
                    marginBottom: "8px",
                    filter: "drop-shadow(0 2px 4px rgba(201, 164, 92, 0.3))"
                }} />
                <h2 style={{
                    fontSize: "12px",
                    color: "var(--gold)",
                    fontWeight: "800",
                    margin: "0 0 2px 0",
                    letterSpacing: "1px"
                }}>
                    MODERN ACTS CHURCH
                </h2>
                <p style={{
                    fontSize: "11px",
                    color: "var(--gold)",
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
                <div onClick={() => setShowOnlinePanel(true)} style={{
                    margin: "10px 10px 6px",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    background: "rgba(34, 197, 94, 0.1)",
                    border: "1px solid rgba(34, 197, 94, 0.25)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    transition: "all 0.2s ease",
                    flexShrink: 0
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.background = "rgba(34, 197, 94, 0.18)";
                    e.currentTarget.style.borderColor = "rgba(34, 197, 94, 0.4)";
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.background = "rgba(34, 197, 94, 0.1)";
                    e.currentTarget.style.borderColor = "rgba(34, 197, 94, 0.25)";
                }}>
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
                            color: "var(--text-faint)"
                        }}>
                            Tap to view
                        </p>
                    </div>
                    <span style={{ fontSize: "16px", color: "#4ade80" }}>👥</span>
                </div>
            )}

            {/* USER */}
            <div style={{
                margin: "10px 10px 6px",
                padding: "10px",
                borderRadius: "10px",
                background: "var(--card-bg)",
                border: "1px solid var(--gold-transparent-15)",
                textAlign: "center",
                flexShrink: 0
            }}>
                {user ? (
                    <>
                        <h3 style={{
                            fontSize: "10px",
                            fontWeight: "700",
                            color: "var(--text-main)",
                            margin: "0 0 2px 0"
                        }}>
                            {user.firstname} {user.lastname}
                        </h3>
                        <p style={{
                            fontSize: "8px",
                            color: "var(--text-muted)",
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
                                        background: "var(--gold-transparent-20)",
                                        color: "var(--gold)",
                                        fontSize: "8px",
                                        fontWeight: "700",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.5px"
                                    }}>
                                        {ministry}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* {isAdmin() && (
                            <span style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "10px",
                                background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                                color: "#fff",
                                fontSize: "8px",
                                fontWeight: "700",
                                textTransform: "uppercase",
                                letterSpacing: "1px"
                            }}>
                                Admin
                            </span>
                        )} */}
                    </>
                ) : newcomer ? (
                    <>
                        <h3 style={{
                            fontSize: "12px",
                            fontWeight: "700",
                            color: "var(--text-main)",
                            margin: "0 0 2px 0"
                        }}>
                            {newcomer.firstname} {newcomer.lastname}
                        </h3>
                        <p style={{
                            fontSize: "10px",
                            color: "var(--text-muted)",
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
                flex: "1 1 auto",
                padding: "4px 8px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
                overflowY: "auto",
                overflowX: "hidden",
                minHeight: 0
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
                                color: active ? "var(--text-active-nav)" : "var(--text-secondary)",
                                background: active
                                    ? "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)"
                                    : hoveredLink === index
                                        ? "var(--gold-transparent-15)"
                                        : "transparent",
                                transition: "all 0.2s ease",
                                boxShadow: active ? "0 2px 8px rgba(201, 164, 92, 0.3)" : "none",
                                whiteSpace: "nowrap",
                                flexShrink: 0
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
                                    background: "var(--text-active-nav)"
                                }} />
                            )}
                        </Link>
                    );
                })}
            </div>

            {/* MAXIMIZE / THEME / LOGOUT */}
                <div
                    className="sidebar-bottom-actions"
                    style={{
                        padding: "8px",
                        borderTop: "1px solid var(--gold-transparent-15)",
                        flexShrink: 0,
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: "5px"
                    }}
                >
                    <button
                        onClick={toggleFullscreen}
                        title={isFullscreen ? "Exit Full Screen" : "Maximize View"}
                        style={{
                            padding: "8px 4px",
                            borderRadius: "7px",
                            border: "1px solid var(--gold-transparent-30)",
                            background: "var(--card-bg)",
                            color: "var(--gold)",
                            fontSize: "10px",
                            fontWeight: "600",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "3px"
                        }}
                    >
                        {isFullscreen ? "🗗" : "⛶"}
                    </button>

                    <button
                        onClick={toggleTheme}
                        title={theme === "dark" ? "Light Mode" : "Dark Mode"}
                        style={{
                            padding: "8px 4px",
                            borderRadius: "7px",
                            border: "1px solid var(--gold-transparent-30)",
                            background: "var(--card-bg)",
                            color: "var(--gold)",
                            fontSize: "10px",
                            fontWeight: "600",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "3px"
                        }}
                    >
                        {theme === "dark" ? "☀" : "🌙"}
                    </button>

                    <button
                        onClick={handleLogout}
                        title="Logout"
                        style={{
                            padding: "8px 4px",
                            borderRadius: "7px",
                            border: "1px solid var(--danger-border)",
                            background: "var(--danger-bg)",
                            color: "var(--danger-text)",
                            fontSize: "10px",
                            fontWeight: "600",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "3px"
                        }}
                    >
                        🚪
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
            {/* Mobile Hamburger */}
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
                    border: "1px solid var(--gold-transparent-30)",
                    background: "var(--fab-bg)",
                    color: "var(--gold)",
                    fontSize: "20px",
                    cursor: "pointer",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                    transition: "all 0.2s ease"
                }}
            >
                {mobileOpen ? "✕" : "☰"}
            </button>

            {/* Floating Maximize Button */}
            <button
                onClick={toggleFullscreen}
                className="maximize-fab-btn"
                aria-label={isFullscreen ? "Exit full screen" : "Maximize view"}
                title={isFullscreen ? "Exit full screen" : "Maximize view"}
                style={{
                    position: "fixed",
                    top: "12px",
                    right: "12px",
                    zIndex: 1100,
                    width: "44px",
                    height: "44px",
                    borderRadius: "10px",
                    border: "1px solid var(--gold-transparent-30)",
                    background: "var(--fab-bg)",
                    color: "var(--gold)",
                    fontSize: "18px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                    transition: "all 0.2s ease"
                }}
            >
                {isFullscreen ? "🗗" : "⛶"}
            </button>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    onClick={() => setMobileOpen(false)}
                    className="mobile-overlay"
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "var(--overlay-bg)",
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
                        background: "var(--overlay-bg)",
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
                            background: "var(--panel-bg)",
                            borderRadius: "16px",
                            border: "1px solid var(--gold-transparent-25)",
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
                            borderBottom: "1px solid var(--gold-transparent-15)",
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
                                    color: "var(--text-main)"
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
                                    color: "var(--text-faint)",
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
                                onMouseEnter={e => e.currentTarget.style.background = "var(--item-bg)"}
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
                            scrollbarColor: "var(--gold-transparent-30) transparent"
                        }}>
                            {loadingOnline ? (
                                <div style={{ textAlign: "center", padding: "30px" }}>
                                    <div style={{
                                        width: "24px",
                                        height: "24px",
                                        border: "2px solid var(--item-border)",
                                        borderTopColor: "var(--gold)",
                                        borderRadius: "50%",
                                        margin: "0 auto 10px",
                                        animation: "spin 0.8s linear infinite"
                                    }} />
                                    <p style={{ color: "var(--text-faint)", fontSize: "12px" }}>
                                        Loading...
                                    </p>
                                </div>
                            ) : onlineUsers.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "30px" }}>
                                    <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: 0 }}>
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
                                                background: "var(--item-bg)",
                                                border: "1px solid var(--item-border)",
                                                transition: "all 0.2s"
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.background = "var(--gold-transparent-15)";
                                                e.currentTarget.style.borderColor = "var(--gold-transparent-20)";
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.background = "var(--item-bg)";
                                                e.currentTarget.style.borderColor = "var(--item-border)";
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
                                                    color: "var(--text-main)",
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis"
                                                }}>
                                                    {u.firstname} {u.lastname}
                                                </p>
                                                <p style={{
                                                    margin: "2px 0 0 0",
                                                    fontSize: "10px",
                                                    color: "var(--text-faint)"
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
                            borderTop: "1px solid var(--gold-transparent-15)",
                            textAlign: "center"
                        }}>
                            <p style={{
                                margin: 0,
                                fontSize: "10px",
                                color: "var(--text-very-faint)"
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
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "min(270px, 85vw)",
                    background: "linear-gradient(180deg, var(--sidebar-start) 0%, var(--sidebar-mid) 50%, var(--sidebar-end) 100%)",
                    borderRight: "1px solid var(--gold-transparent-20)",
                    boxShadow: "4px 0 24px rgba(0, 0, 0, 0.3)",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    zIndex: 999
                }}
            >
                {sidebarContent}
            </div>

            {/* Spacer */}
            <div className="sidebar-spacer" style={{ width: "270px", flexShrink: 0 }} />

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
                .sidebar {
                    height: 100vh;
                    height: 100dvh;
                }
                .mobile-menu-btn {
                    display: none !important;
                }
                .mobile-overlay {
                    display: none !important;
                }
                @media (max-width: 1024px) {
                    .sidebar {
                        transform: translateX(-100%);
                        transition: transform 0.25s ease;
                    }
                    .sidebar.mobile-open {
                        transform: translateX(0);
                    }
                    .mobile-menu-btn {
                        display: flex !important;
                    }
                    .sidebar-spacer {
                        display: none !important;
                        width: 0 !important;
                    }
                }
                @media (min-width: 1025px) {
                    .sidebar {
                        transform: translateX(0) !important;
                    }
                }
            `}</style>
        </>
    );
}

export default Sidebar;