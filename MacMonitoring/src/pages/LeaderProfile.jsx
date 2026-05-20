import {
    useEffect,
    useState
} from "react";

import {
    useParams,
    Link
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

    const [activeTab,
        setActiveTab] =
        useState("attendance");

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

    /* =======================
       FETCH LEADER
    ======================= */

    const fetchLeader =
        async () => {

        const {
            data
        } = await supabase
            .from("tblMonitoring")
            .select("*")
            .eq("id", id)
            .single();

        setLeader(data);
    };

    /* =======================
       FETCH TITHES
    ======================= */

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

    /* =======================
       FETCH ATTENDANCE
    ======================= */

    const fetchAttendance =
        async () => {

        const { data } =
            await supabase
                .from("tblAttendance")
                .select("*")
                .eq("leader_id", id)
                .order(
                    "service_date",
                    {
                        ascending: false
                    }
                );

        setAttendance(data || []);
    };

    /* =======================
       FETCH DEVOTION
    ======================= */

    const fetchDevotion =
        async () => {

        const { data } =
            await supabase
                .from("tblDevotion")
                .select("*")
                .eq("leader_id", id)
                .order("month", {
                    ascending: false
                });

        setDevotion(data || []);
    };

    /* =======================
       FETCH LIFEGROUP
    ======================= */

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

        setLifeGroups(data || []);
    };

    if (!leader) {

        return <h1>Loading...</h1>;
    }

    const isMember =
        leader.type ===
        "MEMBER";

    return (

        <div className="layout">

            <Sidebar />

            <div className="content">

                {/* PROFILE HEADER */}

                <div className="profile-header">

                    <div className="profile-left">

                        <img
                            src={
                                leader.image_url ||
                                "https://via.placeholder.com/150"
                            }
                            alt="Leader"
                            className="profile-avatar"
                        />

                        <div>

                            <h1 className="profile-name">

                                {leader.firstname}
                                {" "}
                                {leader.lastname}

                            </h1>

                            <div className="profile-tags">

                                <span className="profile-badge">

                                    {leader.tribe}

                                </span>

                                <span className="profile-badge gold">

                                    {leader.type}

                                </span>

                            </div>

                        </div>

                    </div>

                    <Link
                        to={`/edit-leader/${leader.id}`}
                    >

                        <button className="edit-profile-btn">

                            Edit Profile

                        </button>

                    </Link>

                </div>

                {/* TAB NAVIGATION */}

                <div className="profile-tabs">

                    <button
                        className={
                            activeTab === "attendance"
                                ? "tab-btn active-tab"
                                : "tab-btn"
                        }
                        onClick={() =>
                            setActiveTab(
                                "attendance"
                            )
                        }
                    >

                        Attendance

                    </button>

                    {!isMember && (

                        <button
                            className={
                                activeTab === "tithes"
                                    ? "tab-btn active-tab"
                                    : "tab-btn"
                            }
                            onClick={() =>
                                setActiveTab(
                                    "tithes"
                                )
                            }
                        >

                            Tithes

                        </button>

                    )}

                    {!isMember && (

                        <button
                            className={
                                activeTab === "devotion"
                                    ? "tab-btn active-tab"
                                    : "tab-btn"
                            }
                            onClick={() =>
                                setActiveTab(
                                    "devotion"
                                )
                            }
                        >

                            Devotion

                        </button>

                    )}

                    {!isMember && (

                        <button
                            className={
                                activeTab === "lifegroup"
                                    ? "tab-btn active-tab"
                                    : "tab-btn"
                            }
                            onClick={() =>
                                setActiveTab(
                                    "lifegroup"
                                )
                            }
                        >

                            Life Group

                        </button>

                    )}

                </div>

                {/* =========================
                    ATTENDANCE
                ========================= */}

                {activeTab ===
                    "attendance" && (

                    <div className="excel-card">

                        <div className="excel-header">

                            <h2>
                                Attendance Records
                            </h2>

                        </div>

                        <div className="excel-wrapper">

                            <table className="excel-table">

                                <thead>

                                    <tr>

                                        <th>
                                            Date
                                        </th>

                                        <th>
                                            Remarks
                                        </th>

                                        <th>
                                            Status
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {attendance.map(
                                        (
                                            record
                                        ) => (

                                        <tr
                                            key={
                                                record.id
                                            }
                                        >

                                            <td>

                                                {
                                                    record.service_date
                                                }

                                            </td>

                                            <td>

                                                {
                                                    record.remarks
                                                }

                                            </td>

                                            <td>

                                                <span
                                                    className={`status-badge ${
                                                        record.status ===
                                                        "Present"
                                                            ? "status-present"
                                                            : "status-absent"
                                                    }`}
                                                >

                                                    {
                                                        record.status
                                                    }

                                                </span>

                                            </td>

                                        </tr>

                                    ))}

                                </tbody>

                            </table>

                        </div>

                    </div>

                )}

                {/* =========================
                    TITHES
                ========================= */}

                {activeTab ===
                    "tithes" && (

                    <div className="excel-card">

                        <div className="excel-header">

                            <h2>
                                Tithes Records
                            </h2>

                        </div>

                        <div className="excel-wrapper">

                            <table className="excel-table">

                                <thead>

                                    <tr>

                                        <th>
                                            Date
                                        </th>

                                        <th>
                                            Amount
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {tithes.map(
                                        (
                                            tithe
                                        ) => (

                                        <tr
                                            key={
                                                tithe.id
                                            }
                                        >

                                            <td>

                                                {
                                                    tithe.date
                                                }

                                            </td>

                                            <td>

                                                ₱
                                                {
                                                    tithe.amount
                                                }

                                            </td>

                                        </tr>

                                    ))}

                                </tbody>

                            </table>

                        </div>

                    </div>

                )}

                {/* =========================
                    DEVOTION
                ========================= */}

                {activeTab ===
                    "devotion" && (

                    <div className="excel-card">

                        <div className="excel-header">

                            <h2>
                                Devotion Consistency
                            </h2>

                        </div>

                        <div className="excel-wrapper">

                            <table className="excel-table">

                                <thead>

                                    <tr>

                                        <th>
                                            Month
                                        </th>

                                        <th>
                                            Completed
                                        </th>

                                        <th>
                                            Total
                                        </th>

                                        <th>
                                            Progress
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {devotion.map(
                                        (
                                            dev
                                        ) => {

                                        const progress =
                                            Math.round(
                                                (
                                                    dev.completed_days /
                                                    dev.total_days
                                                ) * 100
                                            );

                                        return (

                                            <tr
                                                key={
                                                    dev.id
                                                }
                                            >

                                                <td>

                                                    {
                                                        dev.month
                                                    }

                                                </td>

                                                <td>

                                                    {
                                                        dev.completed_days
                                                    }

                                                </td>

                                                <td>

                                                    {
                                                        dev.total_days
                                                    }

                                                </td>

                                                <td>

                                                    {progress}%

                                                </td>

                                            </tr>

                                        );
                                    })}

                                </tbody>

                            </table>

                        </div>

                    </div>

                )}

                {/* =========================
                    LIFEGROUP
                ========================= */}

                {activeTab ===
                    "lifegroup" && (

                    <div className="excel-card">

                        <div className="excel-header">

                            <h2>
                                Life Group Participation
                            </h2>

                        </div>

                        <div className="excel-wrapper">

                            <table className="excel-table">

                                <thead>

                                    <tr>

                                        <th>
                                            Topic
                                        </th>

                                        <th>
                                            Place
                                        </th>

                                        <th>
                                            Type
                                        </th>

                                        <th>
                                            Date
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {lifeGroups.map(
                                        (
                                            group
                                        ) => (

                                        <tr
                                            key={
                                                group.id
                                            }
                                        >

                                            <td>

                                                {
                                                    group.topic
                                                }

                                            </td>

                                            <td>

                                                {
                                                    group.place
                                                }

                                            </td>

                                            <td>

                                                {
                                                    group.type
                                                }

                                            </td>

                                            <td>

                                                {
                                                    group.date
                                                }

                                            </td>

                                        </tr>

                                    ))}

                                </tbody>

                            </table>

                        </div>

                    </div>

                )}

            </div>

        </div>
    );
}

export default LeaderProfile;