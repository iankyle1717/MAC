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
import { ThemeProvider } from "./context/ThemeContext";   // ← added
import "./styles/global.css";
import "./styles/login.css";
import Newsfeed from "./pages/Newsfeed";
import Messages from "./pages/Messages";

const RoleBasedRedirect = () => {
    const user = getCurrentUser();
    const newcomer = getNewcomer();

    if (newcomer) return <Navigate to={`/newcomer/${newcomer.id}`} replace />;
    if (user) return <Navigate to="/dashboard" replace />;
    return <Navigate to="/login" replace />;
};

function App() {
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
        <ThemeProvider>   {/* ← wrap everything */}
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<RoleBasedRedirect />} />
                    <Route path="/newsfeed" element={<Newsfeed />} />

                    <Route path="/dashboard" element={ <ProtectedRoute><Dashboard /></ProtectedRoute> } />
                    <Route path="/messages"  element={ <ProtectedRoute><Messages /></ProtectedRoute> } />
                    <Route path="/leaders"   element={ <ProtectedRoute><Leaders /></ProtectedRoute> } />
                    <Route path="/leader/:id" element={ <ProtectedRoute checkProfileAccess={true}><LeaderProfile /></ProtectedRoute> } />
                    <Route path="/newcomer/:id" element={ <ProtectedRoute isNewcomerRoute={true}><NewcomerProfile /></ProtectedRoute> } />
                    <Route path="/attendance" element={ <ProtectedRoute requireAttendance={true}><Attendance /></ProtectedRoute> } />
                    <Route path="/tithes"     element={ <ProtectedRoute requireTithes={true}><Tithes /></ProtectedRoute> } />
                    <Route path="/devotion"   element={ <ProtectedRoute requireDevotion={true}><Devotion /></ProtectedRoute> } />
                    <Route path="/lifegroup"  element={ <ProtectedRoute requireLifeGroup={true}><LifeGroup /></ProtectedRoute> } />
                    <Route path="/edit-leader/:id" element={ <ProtectedRoute requireEditAccess={true}><EditLeader /></ProtectedRoute> } />
                    <Route path="/assimilation" element={ <ProtectedRoute requireAssimilation={true}><Assimilation /></ProtectedRoute> } />
                    <Route path="/add-leader" element={ <ProtectedRoute requireConvertAccess={true}><AddLeader /></ProtectedRoute> } />

                    <Route path="*" element={<RoleBasedRedirect />} />
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;