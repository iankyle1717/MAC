import { useEffect } from "react";
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
import { startHeartbeat, stopHeartbeat } from "./utils/heartbeat";
import "./styles/global.css";
import "./styles/login.css";
import Newsfeed from "./pages/Newsfeed";

const RoleBasedRedirect = () => {
    const user = getCurrentUser();
    const newcomer = getNewcomer();

    if (newcomer) return <Navigate to={`/newcomer/${newcomer.id}`} replace />;
    if (user) return <Navigate to="/dashboard" replace />;
    return <Navigate to="/login" replace />;
};

function App() {
    // Heartbeat: track online status
    useEffect(() => {
        const user = getCurrentUser();
        if (user) startHeartbeat();

        const handleAuth = () => {
            getCurrentUser() ? startHeartbeat() : stopHeartbeat();
        };
        window.addEventListener("ems-auth-change", handleAuth);

        return () => {
            stopHeartbeat();
            window.removeEventListener("ems-auth-change", handleAuth);
        };
    }, []);

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<RoleBasedRedirect />} />
                <Route path="/newsfeed" element={<Newsfeed />} />

                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/leaders"
                    element={
                        <ProtectedRoute>
                            <Leaders />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/leader/:id"
                    element={
                        <ProtectedRoute checkProfileAccess={true}>
                            <LeaderProfile />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/newcomer/:id"
                    element={
                        <ProtectedRoute isNewcomerRoute={true}>
                            <NewcomerProfile />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/attendance"
                    element={
                        <ProtectedRoute requireAttendance={true}>
                            <Attendance />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/tithes"
                    element={
                        <ProtectedRoute requireTithes={true}>
                            <Tithes />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/devotion"
                    element={
                        <ProtectedRoute requireDevotion={true}>
                            <Devotion />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/lifegroup"
                    element={
                        <ProtectedRoute requireLifeGroup={true}>
                            <LifeGroup />
                        </ProtectedRoute>
                    }
                />

                {/* Edit Leader - ADMIN ONLY now */}
                <Route
                    path="/edit-leader/:id"
                    element={
                        <ProtectedRoute requireEditAccess={true}>
                            <EditLeader />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/assimilation"
                    element={
                        <ProtectedRoute requireAssimilation={true}>
                            <Assimilation />
                        </ProtectedRoute>
                    }
                />

                {/* Add Leader - Admin & Discipleship only */}
                <Route
                    path="/add-leader"
                    element={
                        <ProtectedRoute requireConvertAccess={true}>
                            <AddLeader />
                        </ProtectedRoute>
                    }
                />

                <Route path="*" element={<RoleBasedRedirect />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;