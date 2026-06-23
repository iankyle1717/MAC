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
    canConvertNewcomer,
    canAddMember,
    isAdmin
} from "../utils/auth";

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
    requireAddMember = false,
}) {
    const location = useLocation();
    const params = useParams();
    const user = getCurrentUser();
    const newcomer = getNewcomer();
    const targetId = params.id ? Number(params.id) : null;
    const admin = isAdmin();

    if (requireAuth && !user && !newcomer) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requireAdmin && !admin) {
        return <AccessDenied />;
    }

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

    // ── EDIT ACCESS ──────────────────────────────────────────────────────────
    // Admin can edit anyone. Any logged-in user can reach their OWN edit page
    // (EditLeader.js itself limits which fields a non-admin can actually change).
    if (requireEditAccess && targetId) {
        const isOwnProfile = user?.id === targetId;
        if (!admin && !isOwnProfile) {
            return <AccessDenied />;
        }
    }

    if (requireConvertAccess && !admin && !canConvertNewcomer()) {
        return <AccessDenied />;
    }

    if (requireAddMember && !admin && !canAddMember()) {
        return <AccessDenied />;
    }

    if (checkProfileAccess && targetId) {
        if (!canViewLeaderProfile(targetId)) {
            return <AccessDenied />;
        }
    }

    if (isNewcomerRoute && targetId) {
        if (!canViewNewcomerProfile(targetId)) {
            return <AccessDenied />;
        }
    }

    return children;
}

export default ProtectedRoute;