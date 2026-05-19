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

    const [loading, setLoading] =
        useState(true);

    useEffect(() => {

        fetchLeaders();

    }, []);

    const fetchLeaders = async () => {

        setLoading(true);

        const { data, error } =
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

                <LeaderForm
                    refreshLeaders={
                        fetchLeaders
                    }
                />

                {loading ? (

                    <p>
                        Loading leaders...
                    </p>

                ) : leaders.length === 0 ? (

                    <p>
                        No leaders found.
                    </p>

                ) : (

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