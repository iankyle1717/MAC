import {
    useEffect,
    useState
} from "react";

import {
    useParams
} from "react-router-dom";

import Sidebar
from "../components/Sidebar";

import {
    supabase
} from "../lib/supabase";

function LeaderProfile() {

    const { id } =
        useParams();

    const [leader, setLeader] =
        useState(null);

    const [tithes, setTithes] =
        useState([]);

    const [attendance, setAttendance] =
        useState([]);

    const [devotion, setDevotion] =
        useState([]);

    const [lifeGroups, setLifeGroups] =
        useState([]);

    useEffect(() => {

        fetchLeader();

        fetchTithes();

        fetchAttendance();

        fetchDevotion();

        fetchLifeGroups();

    }, []);

    /* FETCH LEADER */

    const fetchLeader =
        async () => {

        const { data, error } =
            await supabase
                .from("tblMonitoring")
                .select("*")
                .eq("id", id)
                .single();

        if (!error) {

            setLeader(data);
        }
    };

    /* FETCH TITHES */

    const fetchTithes =
        async () => {

        const { data } =
            await supabase
                .from("tblTithes")
                .select("*")
                .eq("leader_id", id)
                .order("date", {
                    ascending: false
                });

        setTithes(data || []);
    };

    /* FETCH ATTENDANCE */

    const fetchAttendance =
        async () => {

        const { data } =
            await supabase
                .from("tblAttendance")
                .select("*")
                .eq("leader_id", id)
                .order("date", {
                    ascending: false
                });

        setAttendance(
            data || []
        );
    };

    /* FETCH DEVOTION */

    const fetchDevotion =
        async () => {

        const { data } =
            await supabase
                .from("tblDevotion")
                .select("*")
                .eq("leader_id", id);

        setDevotion(
            data || []
        );
    };

    /* FETCH LIFEGROUP */

    const fetchLifeGroups =
        async () => {

        const { data } =
            await supabase
                .from("tblLifeGroup")
                .select("*")
                .eq("leader_id", id)
                .order("date", {
                    ascending: false
                });

        setLifeGroups(
            data || []
        );
    };

    if (!leader) {

        return (
            <h1>
                Loading...
            </h1>
        );
    }

    return (

        <div className="layout">

            <Sidebar />

            <div className="content">

                {/* HEADER */}

                <div
                    className="leader-card"
                    style={{
                        marginBottom:
                            "30px"
                    }}
                >

                    <div
                        style={{
                            display:
                                "flex",
                            alignItems:
                                "center",
                            gap:
                                "20px"
                        }}
                    >

                        <img
                            src={
                                leader.image_url
                            }
                            alt="Leader"
                            style={{
                                width:
                                    "120px",
                                height:
                                    "120px",
                                borderRadius:
                                    "50%",
                                objectFit:
                                    "cover",
                                border:
                                    "4px solid var(--primary)"
                            }}
                        />

                        <div>

                            <h1>

                                {
                                    leader.firstname
                                }
                                {" "}
                                {
                                    leader.lastname
                                }

                            </h1>

                            <p>

                                {
                                    leader.tribe
                                }
                                {" • "}
                                {
                                    leader.type
                                }

                            </p>

                        </div>

                    </div>

                </div>

                {/* TITHES */}

                <div
                    className="record-card"
                >

                    <h2>
                        Tithes
                    </h2>

                    <br />

                    {tithes.length === 0 ? (

                        <p>
                            No records.
                        </p>

                    ) : (

                        tithes.map(
                            (tithe) => (

                            <div
                                key={tithe.id}
                                className="record-card"
                            >

                                ₱
                                {
                                    tithe.amount
                                }
                                {" — "}
                                {
                                    tithe.date
                                }

                            </div>

                        ))

                    )}

                </div>

                <br />

                {/* ATTENDANCE */}

                <div
                    className="record-card"
                >

                    <h2>
                        Attendance
                    </h2>

                    <br />

                    {attendance.length === 0 ? (

                        <p>
                            No records.
                        </p>

                    ) : (

                        attendance.map(
                            (record) => (

                            <div
                                key={record.id}
                                className="record-card"
                            >

                                {
                                    record.status
                                }
                                {" — "}
                                {
                                    record.date
                                }

                            </div>

                        ))

                    )}

                </div>

                <br />

                {/* DEVOTION */}

                <div
                    className="record-card"
                >

                    <h2>
                        Devotion
                    </h2>

                    <br />

                    {devotion.length === 0 ? (

                        <p>
                            No records.
                        </p>

                    ) : (

                        devotion.map(
                            (dev) => (

                            <div
                                key={dev.id}
                                className="record-card"
                            >

                                {
                                    dev.month
                                }
                                {" — "}
                                {
                                    dev.completed_days
                                }
                                /
                                {
                                    dev.total_days
                                }

                            </div>

                        ))

                    )}

                </div>

                <br />

                {/* LIFEGROUP */}

                <div
                    className="record-card"
                >

                    <h2>
                        Life Group
                    </h2>

                    <br />

                    {lifeGroups.length === 0 ? (

                        <p>
                            No records.
                        </p>

                    ) : (

                        lifeGroups.map(
                            (group) => (

                            <div
                                key={group.id}
                                className="record-card"
                            >

                                <strong>
                                    {
                                        group.topic
                                    }
                                </strong>

                                <br />

                                {
                                    group.place
                                }

                                {" • "}

                                {
                                    group.type
                                }

                                <br />

                                {
                                    group.date
                                }

                            </div>

                        ))

                    )}

                </div>

            </div>

        </div>
    );
}

export default LeaderProfile;