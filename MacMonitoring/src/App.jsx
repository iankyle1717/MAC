import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Leaders from "./pages/Leaders";
import LeaderProfile from "./pages/LeaderProfile";
import NewcomerProfile from "./pages/NewcomerProfile";
import Attendance from "./pages/Attendance";
import Tithes from "./pages/Tithes";
import Devotion from "./pages/Devotion";
import LifeGroup from "./pages/LifeGroup";
import Login from "./pages/Login";
import EditLeader from "./pages/EditLeader";
import Assimilation from "./pages/Assimilation";
import AddLeader from "./pages/AddLeader";
import ProtectedRoute from "./components/ProtectedRoute";
import { getCurrentUser, getNewcomer, canAccessAttendance, canAccessTithes, canAccessDevotion, canAccessAssimilation, canAccessLifeGroup } from "./utils/auth";
import "./styles/global.css";
import "./styles/login.css";

// Redirect based on role
const RoleBasedRedirect = () => {
    const user = getCurrentUser();
    const newcomer = getNewcomer();

    if (newcomer) return <Navigate to={`/newcomer/${newcomer.id}`} replace />;
    if (user) return <Navigate to="/dashboard" replace />;
    return <Navigate to="/login" replace />;
};

// Access Denied Page
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

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public Route */}
                <Route path="/login" element={<Login />} />

                {/* Root redirect */}
                <Route path="/" element={<RoleBasedRedirect />} />

                {/* DASHBOARD - All authenticated users can view */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Leaders List - All authenticated users */}
                <Route
                    path="/leaders"
                    element={
                        <ProtectedRoute>
                            <Leaders />
                        </ProtectedRoute>
                    }
                />

                {/* Leader Profile - with access control */}
                <Route
                    path="/leader/:id"
                    element={
                        <ProtectedRoute checkProfileAccess={true}>
                            <LeaderProfile />
                        </ProtectedRoute>
                    }
                />

                {/* Newcomer Profile - read only */}
                <Route
                    path="/newcomer/:id"
                    element={
                        <ProtectedRoute isNewcomerRoute={true}>
                            <NewcomerProfile />
                        </ProtectedRoute>
                    }
                />

                {/* ATTENDANCE - Admin & Ushering ONLY */}
                <Route
                    path="/attendance"
                    element={
                        <ProtectedRoute>
                            {canAccessAttendance() ? <Attendance /> : <AccessDenied />}
                        </ProtectedRoute>
                    }
                />

                {/* TITHES - Admin & Finance ONLY */}
                <Route
                    path="/tithes"
                    element={
                        <ProtectedRoute>
                            {canAccessTithes() ? <Tithes /> : <AccessDenied />}
                        </ProtectedRoute>
                    }
                />

                {/* DEVOTION - Admin & Discipleship ONLY */}
                <Route
                    path="/devotion"
                    element={
                        <ProtectedRoute>
                            {canAccessDevotion() ? <Devotion /> : <AccessDenied />}
                        </ProtectedRoute>
                    }
                />

                {/* LIFE GROUP - All authenticated leaders */}
                <Route
                    path="/lifegroup"
                    element={
                        <ProtectedRoute>
                            {canAccessLifeGroup() ? <LifeGroup /> : <AccessDenied />}
                        </ProtectedRoute>
                    }
                />

                {/* Edit Leader */}
                <Route
                    path="/edit-leader/:id"
                    element={
                        <ProtectedRoute>
                            <EditLeader />
                        </ProtectedRoute>
                    }
                />

                {/* ASSIMILATION - Admin, Discipleship, Leaders */}
                <Route
                    path="/assimilation"
                    element={
                        <ProtectedRoute>
                            {canAccessAssimilation() ? <Assimilation /> : <AccessDenied />}
                        </ProtectedRoute>
                    }
                />

                {/* Add Leader (Convert Newcomer) */}
                <Route
                    path="/add-leader"
                    element={
                        <ProtectedRoute>
                            <AddLeader />
                        </ProtectedRoute>
                    }
                />

                {/* Catch all */}
                <Route path="*" element={<RoleBasedRedirect />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;