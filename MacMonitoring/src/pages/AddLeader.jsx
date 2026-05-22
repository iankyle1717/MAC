import Sidebar
from "../components/Sidebar";

import LeaderForm
from "../components/LeaderForm";

import {
    useLocation
} from "react-router-dom";

function AddLeader() {

    const location =
        useLocation();

    const newcomer =
        location.state?.newcomer;

    return (

        <div className="layout">

            <Sidebar />

            <div className="content">

                <h1>
                    Add Leader
                </h1>

                <p
                    style={{
                        opacity: 0.7,
                        marginBottom: "20px"
                    }}
                >
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