import Sidebar from "../components/Sidebar";
import LeaderForm from "../components/LeaderForm";
import { useLocation, Navigate } from "react-router-dom";
import { canConvertNewcomer } from "../utils/auth";

function AddLeader() {
    const location = useLocation();
    const newcomer = location.state?.newcomer;

    // Block access if user doesn't have permission
    if (!canConvertNewcomer()) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="layout">
            <Sidebar />
            <div className="content">
                <h1>Add Leader</h1>
                <p style={{ opacity: 0.7, marginBottom: "20px" }}>
                    Convert newcomer into official member.
                </p>
                <LeaderForm
                    refreshLeaders={() => {}}
                    newcomer={newcomer}
                />
            </div>
        </div>
    );
}

export default AddLeader;