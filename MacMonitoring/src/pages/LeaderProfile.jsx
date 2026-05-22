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

import {
    getCurrentUser
} from "../utils/auth";

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

    const [invites, setInvites] =
        useState([]);

    const currentUser =
        getCurrentUser();

    useEffect(() => {

        if (!currentUser) {

            window.location.href =
                "/login";

            return;
        }

        loadData();

    }, []);

    /* =========================
        LOAD ALL DATA
        ========================= */

        const loadData =
            async () => {

            const { data } =
                await supabase
                    .from("tblMonitoring")
                    .select("*")
                    .eq("id", id)
                    .single();

            setLeader(data);

            if (data) {

                const fullName =
                    `${data.firstname} ${data.lastname}`;

                const { data: inviteData } =
                    await supabase
                        .from("tblNewMembers")
                        .select("*")
                        .eq(
                            "invited_by",
                            fullName
                        )
                        .order("id", {
                            ascending: false
                        });

                setInvites(
                    inviteData || []
                );
            }

            fetchTithes();

            fetchAttendance();

            fetchDevotion();

            fetchLifeGroups();
        };

    /* =========================
       FETCH LEADER
    ========================= */

    const fetchLeader =
        async () => {

        const { data } =
            await supabase
                .from("tblMonitoring")
                .select("*")
                .eq("id", id)
                .single();

        setLeader(data);
    };

    /* =========================
       FETCH TITHES
    ========================= */

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

    /* =========================
       FETCH ATTENDANCE
    ========================= */

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

    /* =========================
       FETCH DEVOTION
    ========================= */

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

    /* =========================
       FETCH LIFEGROUP
    ========================= */

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

    /* =========================
    FETCH INVITES
    ========================= */

    const fetchInvites =
        async () => {

        const fullName =
            `${leader?.firstname} ${leader?.lastname}`;

        const { data } =
            await supabase
                .from("tblNewMembers")
                .select("*")
                .eq(
                    "invited_by",
                    fullName
                )
                .order("id", {
                    ascending: false
                });

        setInvites(data || []);
    };

    /* =========================
       LOADING
    ========================= */

    if (!leader) {

        return <h1>Loading...</h1>;
    }

    /* =========================
       ROLE CHECKS
    ========================= */

    const isOwnProfile =
        currentUser?.id === leader.id;

    const isAdmin =
        currentUser?.ministry === "Admin";

    const isFinance =
        currentUser?.ministry === "Finance";

    const isUshering =
        currentUser?.ministry === "Ushering";

    const isDiscipleship =
        currentUser?.ministry ===
        "Discipleship Journey";

    /* =========================
       PAGE ACCESS
    ========================= */

    const canAccessProfile =

        isOwnProfile ||

        isAdmin ||

        isFinance ||

        isUshering ||

        isDiscipleship;

    if (!canAccessProfile) {

        return (

            <div className="layout">

                <Sidebar />

                <div className="content">

                    <h1>
                        Access Denied
                    </h1>

                    <p>
                        You are not allowed to open this profile.
                    </p>

                </div>

            </div>
        );
    }

    /* =========================
       TAB PERMISSIONS
    ========================= */

    const canViewAttendance =

        isOwnProfile ||

        isAdmin ||

        isUshering;

    const canViewTithes =

        isOwnProfile ||

        isAdmin ||

        isFinance;

    const canViewDevotion =

        isOwnProfile ||

        isAdmin ||

        isDiscipleship;

    const canViewLifeGroup = true;

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

                                <span className="profile-badge">

                                    {leader.ministry}

                                </span>

                            </div>

                        </div>

                    </div>

                    {(isOwnProfile || isAdmin) && (

                        <Link
                            to={`/edit-leader/${leader.id}`}
                        >

                            <button className="edit-profile-btn">

                                Edit Profile

                            </button>

                        </Link>

                    )}

                </div>

                {/* TABS */}

                <div className="profile-tabs">

                    {canViewAttendance && (

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

                    )}

                    {canViewTithes && (

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

                    {canViewDevotion && (

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

                    <button
                        className={
                            activeTab === "invites"
                                ? "tab-btn active-tab"
                                : "tab-btn"
                        }

                        onClick={() =>
                            setActiveTab(
                                "invites"
                            )
                        }
                    >

                        Invites & Newcomers

                    </button>

                    {canViewLifeGroup && (

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

                {/* ATTENDANCE */}

                {activeTab ===
                    "attendance" &&
                    canViewAttendance && (

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

                {/* TITHES */}

                {activeTab ===
                    "tithes" &&
                    canViewTithes && (

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

                {/* DEVOTION */}

                {activeTab ===
                    "devotion" &&
                    canViewDevotion && (

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

                {/* LIFEGROUP */}

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

                {/* INVITES */}

                {activeTab ===
                    "invites" && (

                    <div className="excel-card">

                        <div className="excel-header">

                            <h2>

                                Invites & Newcomers

                            </h2>

                        </div>

                        {/* STATS */}

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "repeat(auto-fit,minmax(180px,1fr))",
                                gap: "15px",
                                marginBottom: "20px"
                            }}
                        >

                            <div className="record-card">

                                <h3>
                                    Total Invites
                                </h3>

                                <h1>
                                    {invites.length}
                                </h1>

                            </div>

                            <div className="record-card">

                                <h3>
                                    Schooling
                                </h3>

                                <h1>

                                    {
                                        invites.filter(
                                            (i) =>
                                                i.remarks ===
                                                "Schooling"
                                        ).length
                                    }

                                </h1>

                            </div>

                            <div className="record-card">

                                <h3>
                                    Winning
                                </h3>

                                <h1>

                                    {
                                        invites.filter(
                                            (i) =>
                                                i.remarks ===
                                                "Winning"
                                        ).length
                                    }

                                </h1>

                            </div>

                        </div>

                        {/* TABLE */}

                        <div className="excel-wrapper">

                            <table className="excel-table">

                                <thead>

                                    <tr>

                                        <th>
                                            Name
                                        </th>

                                        <th>
                                            Tribe
                                        </th>

                                        <th>
                                            Status
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {invites.length === 0 ? (

                                        <tr>

                                            <td
                                                colSpan="3"
                                            >

                                                No invites yet.

                                            </td>

                                        </tr>

                                    ) : (

                                        invites.map(
                                            (invite) => (

                                            <tr
                                                key={
                                                    invite.id
                                                }
                                            >

                                                <td>

                                                    {
                                                        invite.firstname
                                                    }
                                                    {" "}
                                                    {
                                                        invite.lastname
                                                    }

                                                </td>

                                                <td>

                                                    {
                                                        invite.tribe
                                                    }

                                                </td>

                                                <td>

                                                    <span
                                                        className="profile-badge"
                                                    >

                                                        {
                                                            invite.remarks
                                                        }

                                                    </span>

                                                </td>

                                            </tr>

                                        ))
                                    )}

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