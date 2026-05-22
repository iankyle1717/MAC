import {
    BrowserRouter,
    Routes,
    Route
} from "react-router-dom";

import Dashboard
from "./pages/Dashboard";

import Leaders
from "./pages/Leaders";

import LeaderProfile
from "./pages/LeaderProfile";

import Attendance
from "./pages/Attendance";

import Tithes
from "./pages/Tithes";

import Devotion
from "./pages/Devotion";

import LifeGroup
from "./pages/LifeGroup";

import Login
from "./pages/Login";

import EditLeader
from "./pages/EditLeader";

import Assimilation
from "./pages/Assimilation";

import AddLeader
from "./pages/AddLeader";

import "./styles/global.css";

function App() {

    return (

        <BrowserRouter>

            <Routes>

                <Route
                    path="/"
                    element={<Dashboard />}
                />

                <Route
                    path="/leaders"
                    element={<Leaders />}
                />

                <Route
                    path="/leader/:id"
                    element={<LeaderProfile />}
                />

                <Route
                    path="/attendance"
                    element={<Attendance />}
                />

                <Route
                    path="/tithes"
                    element={<Tithes />}
                />

                <Route
                    path="/devotion"
                    element={<Devotion />}
                />

                <Route
                    path="/lifegroup"
                    element={<LifeGroup />}
                />

                <Route
                    path="/edit-leader/:id"
                    element={<EditLeader />}
                />

                <Route
                    path="/login"
                    element={<Login />}
                />

                <Route
                    path="/assimilation"
                    element={<Assimilation />}
                />

                {/* NEW ROUTE */}

                <Route
                    path="/add-leader"
                    element={<AddLeader />}
                />

            </Routes>

        </BrowserRouter>

    );
}

export default App;