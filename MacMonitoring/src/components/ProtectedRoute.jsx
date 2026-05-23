import { Navigate, useLocation, useParams } from "react-router-dom";
import { getCurrentUser, getNewcomer, canViewLeaderProfile, canViewNewcomerProfile } from "../utils/auth";

function ProtectedRoute({ children, requireAuth = true, requireAdmin = false, checkProfileAccess = false, isNewcomerRoute = false }) {
    const location = useLocation();
    const params = useParams();
    const user = getCurrentUser();
    const newcomer = getNewcomer();

    // Get targetId from URL params if available
    const targetId = params.id ? Number(params.id) : null;

    // Not logged in - redirect to login
    if (requireAuth && !user && !newcomer) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Admin requirement check
    if (requireAdmin) {
        const isAdmin = user?.type === "ADMIN" || user?.ministry === "ADMIN";
        if (!isAdmin) {
            return <Navigate to="/" replace />;
        }
    }

    // Profile access check for leaders
    if (checkProfileAccess && targetId) {
        if (!canViewLeaderProfile(targetId)) {
            return (
                <div className="layout">
                    <div className="content" style={{ textAlign: 'center', paddingTop: '100px' }}>
                        <h1>🔒 Access Denied</h1>
                        <p>You don't have permission to view this profile.</p>
                        <button 
                            onClick={() => window.history.back()}
                            style={{ marginTop: '20px', padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#c9a45c', color: '#111', fontWeight: 600, cursor: 'pointer' }}
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            );
        }
    }

    // Profile access check for newcomers
    if (isNewcomerRoute && targetId) {
        if (!canViewNewcomerProfile(targetId)) {
            return (
                <div className="layout">
                    <div className="content" style={{ textAlign: 'center', paddingTop: '100px' }}>
                        <h1>🔒 Access Denied</h1>
                        <p>You don't have permission to view this profile.</p>
                        <button 
                            onClick={() => window.history.back()}
                            style={{ marginTop: '20px', padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#c9a45c', color: '#111', fontWeight: 600, cursor: 'pointer' }}
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            );
        }
    }

    return children;
}

export default ProtectedRoute;