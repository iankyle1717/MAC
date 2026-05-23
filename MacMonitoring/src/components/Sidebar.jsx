import { Link, useLocation, useNavigate } from "react-router-dom";
import { getCurrentUser, getNewcomer, logout, getVisibleRoutes, isAdmin } from "../utils/auth";
import logo from "../assets/logo.png";

function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const user = getCurrentUser();
    const newcomer = getNewcomer();
    const visibleRoutes = getVisibleRoutes();

    const isActive = (path) => {
        return location.pathname === path;
    };

    const handleLogout = () => {
        logout();
    };

    // If no user and no newcomer, don't show sidebar (login page)
    if (!user && !newcomer) {
        return null;
    }

    return (
        <div className="sidebar">
            <div className="sidebar-logo">
                <img src={logo} alt="Logo" className="logo-image" />
                <div>
                    <h2>MAC TLDA</h2>
                    <p>Monitoring</p>
                </div>
            </div>

            {/* User Info */}
            <div className="sidebar-user">
                {user ? (
                    <>
                        <h3>{user.firstname} {user.lastname}</h3>
                        <p>{user.type} • {user.tribe}</p>
                        {isAdmin() && <span className="admin-badge">ADMIN</span>}
                    </>
                ) : newcomer ? (
                    <>
                        <h3>{newcomer.firstname} {newcomer.lastname}</h3>
                        <p>Newcomer • {newcomer.tribe}</p>
                        <span className="newcomer-badge">{newcomer.remarks}</span>
                    </>
                ) : null}
            </div>

            {/* Navigation Links */}
            <div className="sidebar-links">
                {visibleRoutes.map((route) => (
                    <Link
                        key={route.path}
                        to={route.path}
                        className={isActive(route.path) ? "active-link" : ""}
                    >
                        {route.label}
                    </Link>
                ))}
            </div>

            {/* Logout */}
            <button className="logout-btn" onClick={handleLogout}>
                Logout
            </button>
        </div>
    );
}

export default Sidebar;