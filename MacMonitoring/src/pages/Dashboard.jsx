import Sidebar from "../components/Sidebar";
import ThemeToggle from "../components/ThemeToggle";

function Dashboard() {

    return (
        <div className="layout">

            <Sidebar />

            <div className="content">

                <div
                    style={{
                        display: "flex",
                        justifyContent:
                            "space-between",
                        alignItems:
                            "center"
                    }}
                >

                    <div>

                        <h1>
                            MAC TLDA Monitoring
                        </h1>

                        <p>
                            Modern Acts Church
                            Cabangan
                        </p>

                    </div>

                    <ThemeToggle />

                </div>

                <div
                    className="leaders-grid"
                >

                    <div className="leader-card">
                        <h3>
                            Total Leaders
                        </h3>

                        <h1>24</h1>
                    </div>

                    <div className="leader-card">
                        <h3>
                            Attendance Today
                        </h3>

                        <h1>18</h1>
                    </div>

                    <div className="leader-card">
                        <h3>
                            Life Groups
                        </h3>

                        <h1>12</h1>
                    </div>

                </div>

            </div>

        </div>
    );
}

export default Dashboard;