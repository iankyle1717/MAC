import {
    useEffect,
    useState
} from "react";

import Sidebar
from "../components/Sidebar";

import {
    supabase
} from "../lib/supabase";

import Select
from "react-select";

function Tithes() {

    const [leaders, setLeaders] =
        useState([]);

    const [records, setRecords] =
        useState([]);

    const [filteredRecords,
        setFilteredRecords] =
        useState([]);

    const [leaderId, setLeaderId] =
        useState("");

    const [amount, setAmount] =
        useState("");

    const [date, setDate] =
        useState(
            new Date()
                .toISOString()
                .split("T")[0]
        );

    const [loading, setLoading] =
        useState(false);

    /* =========================
       FILTER STATES
    ========================= */

    const [selectedLeader,
        setSelectedLeader] =
        useState(null);

    const [viewLeader,
        setViewLeader] =
        useState(false);

    useEffect(() => {

        fetchLeaders();

        fetchRecords();

    }, []);

    /* =========================
       FILTER RECORDS
    ========================= */

    useEffect(() => {

        if (
            selectedLeader &&
            viewLeader
        ) {

            const filtered =
                records.filter(
                    (record) =>
                        record.leader_id ===
                        selectedLeader.value
                );

            setFilteredRecords(
                filtered
            );

        } else {

            setFilteredRecords(
                records
            );
        }

    }, [
        selectedLeader,
        records,
        viewLeader
    ]);

    /* =========================
       FETCH LEADERS
    ========================= */

    const fetchLeaders =
        async () => {

        const { data } =
            await supabase
                .from("tblMonitoring")
                .select("*")
                .order(
                    "firstname",
                    {
                        ascending: true
                    }
                );

        setLeaders(data || []);
    };

    /* =========================
       FETCH RECORDS
    ========================= */

    const fetchRecords =
        async () => {

        const { data, error } =
            await supabase
                .from("tblTithes")
                .select("*")
                .order("date", {
                    ascending: false
                });

        if (error) {

            console.log(error);

            return;
        }

        const recordsWithLeaders =
            await Promise.all(

            (data || []).map(
                async (record) => {

                const {
                    data: leader
                } =
                    await supabase
                        .from(
                            "tblMonitoring"
                        )
                        .select(`
                            firstname,
                            lastname,
                            type,
                            tribe
                        `)
                        .eq(
                            "id",
                            record.leader_id
                        )
                        .single();

                return {

                    ...record,

                    leader
                };
            }));

        setRecords(
            recordsWithLeaders
        );
    };

    /* =========================
       SUBMIT
    ========================= */

    const handleSubmit =
        async (e) => {

        e.preventDefault();

        if (
            !leaderId ||
            !amount
        ) {

            alert(
                "Complete all fields."
            );

            return;
        }

        setLoading(true);

        const { error } =
            await supabase
                .from("tblTithes")
                .insert([
                    {
                        leader_id:
                            leaderId,
                        amount,
                        date
                    }
                ]);

        if (error) {

            console.log(error);

            alert(
                "Failed to record tithe."
            );

        } else {

            alert(
                "Tithe recorded."
            );

            setLeaderId("");
            setAmount("");

            fetchRecords();
        }

        setLoading(false);
    };

    /* =========================
       SELECT OPTIONS
    ========================= */

    const leaderOptions =
        leaders.map(
            (leader) => ({

            value:
                leader.id,

            label:
                `${leader.firstname} ${leader.lastname} (${leader.type})`

        }));

    /* =========================
       SINGLE LEADER TOTAL
    ========================= */

    const singleLeaderTotal =
        filteredRecords.reduce(
            (sum, record) =>
                sum +
                Number(
                    record.amount
                ),
            0
        );

    return (

        <div className="layout">

            <Sidebar />

            <div className="content">

                <h1>
                    Tithes Recording
                </h1>


                {/* =========================
                    FORM
                ========================= */}

                <form
                    className="leader-form"
                    onSubmit={handleSubmit}
                >

                    <Select
                        options={
                            leaderOptions
                        }

                        placeholder="Search leader..."

                        onChange={(
                            selected
                        ) =>
                            setLeaderId(
                                selected.value
                            )
                        }

                        className="react-select-container"

                        classNamePrefix="react-select"
                    />

                    <input
                        type="number"
                        placeholder="Amount"
                        value={amount}
                        onChange={(e) =>
                            setAmount(
                                e.target.value
                            )
                        }
                    />

                    <input
                        type="date"
                        value={date}
                        onChange={(e) =>
                            setDate(
                                e.target.value
                            )
                        }
                    />

                    <button
                        type="submit"
                    >

                        {loading
                            ? "Recording..."
                            : "Record Tithe"}

                    </button>

                </form>

                {/* =========================
                    FILTER
                ========================= */}
                    
                <div
                    style={{
                        marginTop:
                            "30px",
                        marginBottom:
                            "20px",
                        display:
                            "flex",
                        gap: "15px",
                        alignItems:
                            "center",
                        flexWrap:
                            "wrap"
                    }}
                >

                    <div
                        style={{
                            minWidth:
                                "350px",
                            flex: 1
                        }}
                    >

                        <Select
                            options={
                                leaderOptions
                            }

                            placeholder="Search leader records..."

                            value={
                                selectedLeader
                            }

                            onChange={(
                                selected
                            ) => {

                                setSelectedLeader(
                                    selected
                                );

                                setViewLeader(
                                    false
                                );
                            }}

                            isClearable

                            className="react-select-container"

                            classNamePrefix="react-select"
                        />

                    </div>

                    {selectedLeader && (

                        <button
                            type="button"

                            onClick={() =>
                                setViewLeader(
                                    !viewLeader
                                )
                            }

                            style={{
                                background:
                                    viewLeader
                                        ? "#dc2626"
                                        : "#2563eb"
                            }}
                        >

                            {viewLeader
                                ? "Show All Records"
                                : "View Leader Records"}

                        </button>

                    )}

                </div>
                

                {/* =========================
                    LEADER TOTAL
                ========================= */}

                {viewLeader &&
                    selectedLeader && (

                    <div
                        className="record-card"
                        style={{
                            marginBottom:
                                "20px"
                        }}
                    >

                        <h3>

                            {
                                selectedLeader.label
                            }

                        </h3>

                        <h1>

                            ₱
                            {singleLeaderTotal.toLocaleString()}

                        </h1>

                        <p
                            style={{
                                opacity:
                                    0.7
                            }}
                        >
                            Total recorded
                            tithes
                        </p>

                    </div>

                )}

                {/* =========================
                    TABLE
                ========================= */}

                <div
                    className="excel-card"
                >

                    <div className="excel-header">

                        <h2>

                            {viewLeader
                                ? "Leader Tithes Records"
                                : "All Tithes Records"}

                        </h2>

                    </div>

                    <div className="excel-wrapper">

                        <table className="excel-table">

                            <thead>

                                <tr>

                                    <th>
                                        Leader
                                    </th>

                                    <th>
                                        Tribe
                                    </th>

                                    <th>
                                        Type
                                    </th>

                                    <th>
                                        Amount
                                    </th>

                                    <th>
                                        Date
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                {filteredRecords.length === 0 ? (

                                    <tr>

                                        <td
                                            colSpan="5"
                                        >

                                            No tithes found.

                                        </td>

                                    </tr>

                                ) : (

                                    filteredRecords.map(
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
                                                    record.leader?.firstname
                                                }
                                                {" "}
                                                {
                                                    record.leader?.lastname
                                                }

                                            </td>

                                            <td>

                                                {
                                                    record.leader?.tribe
                                                }

                                            </td>

                                            <td>

                                                {
                                                    record.leader?.type
                                                }

                                            </td>

                                            <td>

                                                ₱
                                                {
                                                    Number(
                                                        record.amount
                                                    ).toLocaleString()
                                                }

                                            </td>

                                            <td>

                                                {
                                                    record.date
                                                }

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

export default Tithes;