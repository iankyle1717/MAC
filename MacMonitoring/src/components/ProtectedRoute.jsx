import { Navigate, useLocation, useParams } from "react-router-dom";
import {
    getCurrentUser,
    getNewcomer,
    canViewLeaderProfile,
    canViewNewcomerProfile,
    canAccessAttendance,
    canAccessTithes,
    canAccessDevotion,
    canAccessAssimilation,
    canAccessLifeGroup,
    canEditAnyProfile,
    isAdmin
} from "../utils/auth";

function ProtectedRoute({
    children,
    requireAuth = true,
    requireAdmin = false,
    checkProfileAccess = false,
    isNewcomerRoute = false,
    requireAttendance = false,
    requireTithes = false,
    requireDevotion = false,
    requireAssimilation = false,
    requireLifeGroup = false,
    requireEditAccess = false,
    requireConvertAccess = false,
}) {
    const location = useLocation();
    const params = useParams();
    const user = getCurrentUser();
    const newcomer = getNewcomer();

    const targetId = params.id ? Number(params.id) : null;

    // Not logged in - redirect to login
    if (requireAuth && !user && !newcomer) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Admin bypass - admin has ALL access (except newcomer routes which are separate)
    const admin = isAdmin();

    // Admin requirement check
    if (requireAdmin && !admin) {
        return <Navigate to="/" replace />;
    }

    // Module permission checks
    if (requireAttendance && !admin && !canAccessAttendance()) {
        return <AccessDenied />;
    }

    if (requireTithes && !admin && !canAccessTithes()) {
        return <AccessDenied />;
    }

    if (requireDevotion && !admin && !canAccessDevotion()) {
        return <AccessDenied />;
    }

    if (requireAssimilation && !admin && !canAccessAssimilation()) {
        return <AccessDenied />;
    }

    if (requireLifeGroup && !admin && !canAccessLifeGroup()) {
        return <AccessDenied />;
    }

    // Edit access check (for edit-leader page)
    if (requireEditAccess && !admin && !canEditAnyProfile() && user?.id !== targetId) {
        return <AccessDenied />;
    }

    // Convert newcomer check
    if (requireConvertAccess && !admin && !canConvertNewcomer()) {
        return <AccessDenied />;
    }

    // Profile access check for leaders
    if (checkProfileAccess && targetId) {
        if (!canViewLeaderProfile(targetId)) {
            return <AccessDenied />;
        }
    }

    // Profile access check for newcomers
    if (isNewcomerRoute && targetId) {
        if (!canViewNewcomerProfile(targetId)) {
            return <AccessDenied />;
        }
    }

    return children;
}

// Reusable Access Denied component
const AccessDenied = () => (
    <div className="layout">
        <div className="content" style={{ textAlign: 'center', paddingTop: '100px' }}>
            <h1 style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</h1>
            <h2 style={{ fontSize: '24px', marginBottom: '12px', color: '#111827' }}>Access Denied</h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                You don't have permission to access this page.<br />
                This module is restricted to specific ministry roles.
            </p>
            <button
                onClick={() => window.location.href = "/"}
                style={{
                    padding: '12px 28px',
                    borderRadius: '14px',
                    border: 'none',
                    background: '#c9a45c',
                    color: '#111',
                    fontWeight: 600,
                    fontSize: '15px',
                    cursor: 'pointer',
                    transition: '0.2s'
                }}
            >
                Go to Home
            </button>
        </div>
    </div>
);

export default ProtectedRoute;