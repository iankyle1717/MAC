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
import { getCurrentUser, getNewcomer } from "./utils/auth";
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
                        <ProtectedRoute requireAttendance={true}>
                            <Attendance />
                        </ProtectedRoute>
                    }
                />

                {/* TITHES - Admin & Finance ONLY */}
                <Route
                    path="/tithes"
                    element={
                        <ProtectedRoute requireTithes={true}>
                            <Tithes />
                        </ProtectedRoute>
                    }
                />

                {/* DEVOTION - Admin & Discipleship ONLY */}
                <Route
                    path="/devotion"
                    element={
                        <ProtectedRoute requireDevotion={true}>
                            <Devotion />
                        </ProtectedRoute>
                    }
                />

                {/* LIFE GROUP - All authenticated leaders */}
                <Route
                    path="/lifegroup"
                    element={
                        <ProtectedRoute requireLifeGroup={true}>
                            <LifeGroup />
                        </ProtectedRoute>
                    }
                />

                {/* Edit Leader - Admin can edit any, users can edit own */}
                <Route
                    path="/edit-leader/:id"
                    element={
                        <ProtectedRoute requireEditAccess={true}>
                            <EditLeader />
                        </ProtectedRoute>
                    }
                />

                {/* ASSIMILATION - Admin, Discipleship, Leaders */}
                <Route
                    path="/assimilation"
                    element={
                        <ProtectedRoute requireAssimilation={true}>
                            <Assimilation />
                        </ProtectedRoute>
                    }
                />

                {/* Add Leader (Convert Newcomer) - Admin & Discipleship */}
                <Route
                    path="/add-leader"
                    element={
                        <ProtectedRoute requireConvertAccess={true}>
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