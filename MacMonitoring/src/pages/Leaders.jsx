import {
    useEffect,
    useState
} from "react";

import {
    Link
} from "react-router-dom";

import Sidebar
from "../components/Sidebar";

import LeaderForm
from "../components/LeaderForm";

import {
    supabase
} from "../lib/supabase";

function Leaders() {

    const [leaders, setLeaders] =
        useState([]);

    const [showForm, setShowForm] =
        useState(false);

    const [loading, setLoading] =
        useState(true);

    useEffect(() => {

        fetchLeaders();

    }, []);

    /* =========================
       FETCH LEADERS
    ========================= */

    const fetchLeaders =
        async () => {

        setLoading(true);

        const {
            data,
            error
        } =
            await supabase
                .from("tblMonitoring")
                .select("*")
                .order("id", {
                    ascending: false
                });

        if (error) {

            console.log(
                "Fetch Error:",
                error
            );

        } else {

            setLeaders(data);
        }

        setLoading(false);
    };

    return (

        <div className="layout">

            <Sidebar />

            <div className="content">

                {/* =========================
                    PAGE HEADER
                ========================= */}

                <div
                    style={{
                        display: "flex",
                        justifyContent:
                            "space-between",
                        alignItems:
                            "center",
                        marginBottom:
                            "20px"
                    }}
                >

                    <div>

                        <h1>
                            Leaders
                        </h1>

                        <p
                            style={{
                                color:
                                    "var(--secondary)"
                            }}
                        >
                            Monitor TLDA
                            performance
                            records
                        </p>

                    </div>

                </div>

                {/* =========================
                    TOGGLE LEADER FORM
                ========================= */}

                <div className="leader-action-bar">

                    <div>

                        <h2 className="leader-action-title">
                            Leader Registration
                        </h2>


                    </div>

                    <button
                        className="leader-toggle-btn"
                        onClick={() =>
                            setShowForm(
                                !showForm
                            )
                        }
                    >

                        {showForm
                            ? "Close Form"
                            : "Add Leader"}

                    </button>

                </div>

                {/* =========================
                    FORM
                ========================= */}

                {showForm && (

                    <div className="leader-form-wrapper">

                        <LeaderForm
                            refreshLeaders={
                                fetchLeaders
                            }
                        />

                    </div>

                )}

                {/* =========================
                    LOADING
                ========================= */}

                {loading ? (

                    <p>
                        Loading leaders...
                    </p>

                ) : leaders.length === 0 ? (

                    <p>
                        No leaders found.
                    </p>

                ) : (

                    /* =========================
                        LEADERS GRID
                    ========================= */

                    <div
                        className="leaders-grid"
                    >

                        {leaders.map(
                            (leader) => (

                            <Link
                                key={leader.id}
                                to={`/leader/${leader.id}`}
                                className="leader-card"
                            >

                                <div
                                    style={{
                                        display:
                                            "flex",
                                        alignItems:
                                            "center",
                                        gap:
                                            "15px",
                                        marginBottom:
                                            "15px"
                                    }}
                                >

                                    <img
                                        src={
                                            leader.image_url ||

                                            "https://placehold.co/100x100"
                                        }

                                        alt="Leader"

                                        style={{
                                            width:
                                                "60px",

                                            height:
                                                "60px",

                                            borderRadius:
                                                "50%",

                                            objectFit:
                                                "cover",

                                            border:
                                                "2px solid var(--primary)"
                                        }}
                                    />

                                    <div>

                                        <h3>

                                            {
                                                leader.firstname
                                            }
                                            {" "}
                                            {
                                                leader.lastname
                                            }

                                        </h3>

                                        <p>

                                            {
                                                leader.tribe
                                            }

                                        </p>

                                    </div>

                                </div>

                                <span>

                                    {
                                        leader.type
                                    }

                                </span>

                            </Link>

                        ))}

                    </div>

                )}

            </div>

        </div>
    );
}

export default Leaders;