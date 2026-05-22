import {
    useEffect,
    useState
} from "react";

import Sidebar
from "../components/Sidebar";

import {
    supabase
} from "../lib/supabase";

import {
    tribes
} from "../constants/options";

function Assimilation() {

    const [members,
        setMembers] =
        useState([]);

    const [leaders,
        setLeaders] =
        useState([]);

    const [loading,
        setLoading] =
        useState(true);

    const [firstname,
        setFirstname] =
        useState("");

    const [lastname,
        setLastname] =
        useState("");

    const [tribe,
        setTribe] =
        useState("");

    const [remarks,
        setRemarks] =
        useState("1st Timer");

    const [invitedBy,
        setInvitedBy] =
        useState("");

    useEffect(() => {

        fetchMembers();

        fetchLeaders();

    }, []);

    /* =========================
       FETCH MEMBERS
    ========================= */

    const fetchMembers =
        async () => {

        setLoading(true);

        const { data } =
            await supabase
                .from("tblNewMembers")
                .select("*")
                .order("id", {
                    ascending: false
                });

        setMembers(data || []);

        setLoading(false);
    };

    /* =========================
       FETCH LEADERS
    ========================= */

    const fetchLeaders =
        async () => {

        const { data } =
            await supabase
                .from("tblMonitoring")
                .select("*")
                .order("firstname", {
                    ascending: true
                });

        setLeaders(data || []);
    };

    /* =========================
       ADD NEWCOMER
    ========================= */

    const handleSubmit =
        async (e) => {

        e.preventDefault();

        if (
            !firstname ||
            !lastname ||
            !tribe
        ) {

            alert(
                "Complete all fields."
            );

            return;
        }

        const { error } =
            await supabase
                .from("tblNewMembers")
                .insert([
                    {
                        firstname,
                        lastname,
                        tribe,
                        remarks,
                        invited_by:
                            invitedBy
                    }
                ]);

        if (error) {

            console.log(error);

            alert(
                "Failed to add newcomer."
            );

        } else {

            alert(
                "Newcomer added successfully."
            );

            setFirstname("");
            setLastname("");
            setTribe("");
            setRemarks(
                "1st Timer"
            );
            setInvitedBy("");

            fetchMembers();
        }
    };

    /* =========================
       UPDATE REMARKS
    ========================= */

    const updateRemarks =
        async (
            id,
            currentRemark
        ) => {

        const flow = [

            "1st Timer",

            "2nd Timer",

            "3rd Timer",

            "Winning",

            "Soaking",

            "Schooling"
        ];

        const currentIndex =
            flow.indexOf(
                currentRemark
            );

        if (
            currentIndex === -1 ||
            currentIndex ===
            flow.length - 1
        ) {

            return;
        }

        const nextRemark =
            flow[
                currentIndex + 1
            ];

        await supabase
            .from(
                "tblNewMembers"
            )
            .update({
                remarks:
                    nextRemark
            })
            .eq("id", id);

        fetchMembers();
    };

    /* =========================
       CONVERT TO MEMBER
    ========================= */

    const convertToLeader =
        async (member) => {

        const confirmConvert =
            window.confirm(

                "Convert this newcomer into official member?"
            );

        if (!confirmConvert)
            return;

        const {
            error: insertError
        } =
            await supabase
                .from("tblMonitoring")
                .insert([
                    {
                        firstname:
                            member.firstname,

                        lastname:
                            member.lastname,

                        tribe:
                            member.tribe,

                        type:
                            "MEMBER",

                        ministry:
                            "NONE",

                        pin:
                            "1234",

                        image_url:
                            ""
                    }
                ]);

        if (insertError) {

            console.log(
                insertError
            );

            alert(
                "Failed to convert member."
            );

            return;
        }

        await supabase
            .from("tblNewMembers")
            .delete()
            .eq("id", member.id);

        alert(
            "Member converted successfully."
        );

        fetchMembers();
    };

    /* =========================
       FILTER LEADERS BY TRIBE
    ========================= */

    const filteredLeaders =
        leaders.filter(
            (leader) =>
                leader.tribe === tribe
        );

    return (

        <div className="layout">

            <Sidebar />

            <div className="content">

                <h1>
                    Assimilation
                </h1>

                <p
                    style={{
                        opacity: 0.7,
                        marginBottom:
                            "20px"
                    }}
                >
                    Monitor visitors,
                    invites, and
                    newcomers.
                </p>

                {/* =========================
                    STATS
                ========================= */}

                <div
                    className="stats-grid"
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fit,minmax(220px,1fr))",
                        gap: "20px",
                        marginBottom: "30px"
                    }}
                >

                    <div className="record-card">

                        <h3>
                            Total Newcomers
                        </h3>

                        <h1>
                            {members.length}
                        </h1>

                    </div>

                    <div className="record-card">

                        <h3>
                            Schooling
                        </h3>

                        <h1>

                            {
                                members.filter(
                                    (m) =>
                                        m.remarks ===
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
                                members.filter(
                                    (m) =>
                                        m.remarks ===
                                        "Winning"
                                ).length
                            }

                        </h1>

                    </div>

                    <div className="record-card">

                        <h3>
                            1st Timers
                        </h3>

                        <h1>

                            {
                                members.filter(
                                    (m) =>
                                        m.remarks ===
                                        "1st Timer"
                                ).length
                            }

                        </h1>

                    </div>

                </div>

                {/* =========================
                    FORM
                ========================= */}

                <form
                    className="leader-form"
                    onSubmit={
                        handleSubmit
                    }
                >

                    <input
                        type="text"
                        placeholder="First Name"
                        value={
                            firstname
                        }
                        onChange={(e) =>
                            setFirstname(
                                e.target.value
                            )
                        }
                    />

                    <input
                        type="text"
                        placeholder="Last Name"
                        value={
                            lastname
                        }
                        onChange={(e) =>
                            setLastname(
                                e.target.value
                            )
                        }
                    />

                    {/* TRIBE */}

                    <select
                        value={tribe}
                        onChange={(e) => {

                            setTribe(
                                e.target.value
                            );

                            setInvitedBy("");
                        }}
                    >

                        <option value="">
                            Select Tribe
                        </option>

                        {tribes.map(
                            (tribe) => (

                            <option
                                key={tribe}
                                value={tribe}
                            >

                                {tribe}

                            </option>

                        ))}

                    </select>

                    {/* INVITED BY */}

                    <select
                        value={invitedBy}
                        onChange={(e) =>
                            setInvitedBy(
                                e.target.value
                            )
                        }
                    >

                        <option value="">
                            Select Inviter
                        </option>

                        {filteredLeaders.map(
                            (leader) => (

                            <option
                                key={leader.id}
                                value={`${leader.firstname} ${leader.lastname}`}
                            >

                                {leader.firstname}
                                {" "}
                                {leader.lastname}

                            </option>

                        ))}

                    </select>

                    {/* REMARKS */}

                    <select
                        value={remarks}
                        onChange={(e) =>
                            setRemarks(
                                e.target.value
                            )
                        }
                    >

                        <option>
                            1st Timer
                        </option>

                        <option>
                            2nd Timer
                        </option>

                        <option>
                            3rd Timer
                        </option>

                        <option>
                            Winning
                        </option>

                        <option>
                            Soaking
                        </option>

                        <option>
                            Schooling
                        </option>

                    </select>

                    <button
                        type="submit"
                    >

                        Add Newcomer

                    </button>

                </form>

                {/* =========================
                    TABLE
                ========================= */}

                <div
                    className="excel-card"
                    style={{
                        marginTop:
                            "30px"
                    }}
                >

                    <div className="excel-header">

                        <h2>
                            Newcomers List
                        </h2>

                    </div>

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
                                        Invited By
                                    </th>

                                    <th>
                                        Remarks
                                    </th>

                                    <th>
                                        Action
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                {loading ? (

                                    <tr>

                                        <td
                                            colSpan="5"
                                        >

                                            Loading...

                                        </td>

                                    </tr>

                                ) : (

                                    members.map(
                                        (
                                            member
                                        ) => (

                                        <tr
                                            key={
                                                member.id
                                            }
                                        >

                                            <td>

                                                {
                                                    member.firstname
                                                }
                                                {" "}
                                                {
                                                    member.lastname
                                                }

                                            </td>

                                            <td>

                                                {
                                                    member.tribe
                                                }

                                            </td>

                                            <td>

                                                {
                                                    member.invited_by
                                                }

                                            </td>

                                            <td>

                                                {
                                                    member.remarks
                                                }

                                            </td>

                                            <td>

                                                <div
                                                    style={{
                                                        display:
                                                            "flex",
                                                        gap:
                                                            "10px"
                                                    }}
                                                >

                                                    {member.remarks !==
                                                        "Schooling" && (

                                                        <button
                                                            onClick={() =>
                                                                updateRemarks(
                                                                    member.id,
                                                                    member.remarks
                                                                )
                                                            }
                                                        >

                                                            Next Step

                                                        </button>

                                                    )}

                                                    {member.remarks ===
                                                        "Schooling" && (

                                                        <button
                                                            onClick={() =>
                                                                convertToLeader(
                                                                    member
                                                                )
                                                            }
                                                            style={{
                                                                background:
                                                                    "#16a34a"
                                                            }}
                                                        >

                                                            Convert

                                                        </button>

                                                    )}

                                                </div>

                                            </td>

                                        </tr>

                                    ))
                                )}

                            </tbody>

                        </table>

                    </div>

                </div>

            </div>

        </div>
    );
}

export default Assimilation;