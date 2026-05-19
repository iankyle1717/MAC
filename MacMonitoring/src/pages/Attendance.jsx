import {
    useEffect,
    useState
} from "react";

import Sidebar
from "../components/Sidebar";

import {
    supabase
} from "../lib/supabase";

function Attendance() {

    const [leaders, setLeaders] =
        useState([]);

    const [leaderId, setLeaderId] =
        useState("");

    const [status, setStatus] =
        useState("Present");

    const [date, setDate] =
        useState(
            new Date()
                .toISOString()
                .split("T")[0]
        );

    const [loading, setLoading] =
        useState(false);

    useEffect(() => {

        fetchLeaders();

    }, []);

    /* FETCH LEADERS */

    const fetchLeaders =
        async () => {

        const { data, error } =
            await supabase
                .from("tblMonitoring")
                .select("*")
                .order(
                    "firstname",
                    {
                        ascending: true
                    }
                );

        if (error) {

            console.log(error);

        } else {

            setLeaders(data);
        }
    };

    /* RECORD ATTENDANCE */

    const handleSubmit =
        async (e) => {

        e.preventDefault();

        if (!leaderId) {

            alert(
                "Please select a leader."
            );

            return;
        }

        setLoading(true);

        const { error } =
            await supabase
                .from("tblAttendance")
                .insert([
                    {
                        leader_id:
                            leaderId,
                        status,
                        date
                    }
                ]);

        if (error) {

            console.log(error);

            alert(
                "Failed to record attendance."
            );

        } else {

            alert(
                "Attendance recorded successfully."
            );

            setLeaderId("");

            setStatus(
                "Present"
            );
        }

        setLoading(false);
    };

    return (

        <div className="layout">

            <Sidebar />

            <div className="content">

                <div
                    style={{
                        marginBottom:
                            "25px"
                    }}
                >

                    <h1>
                        Attendance Recording
                    </h1>

                    <p
                        style={{
                            color:
                                "var(--secondary)"
                        }}
                    >
                        Record church
                        attendance for
                        leaders.
                    </p>

                </div>

                <form
                    className="leader-form"
                    onSubmit={handleSubmit}
                >

                    {/* LEADER */}

                    <select
                        value={leaderId}
                        onChange={(e) =>
                            setLeaderId(
                                e.target.value
                            )
                        }
                    >

                        <option value="">
                            Select Leader
                        </option>

                        {leaders.map(
                            (leader) => (

                            <option
                                key={leader.id}
                                value={leader.id}
                            >

                                {
                                    leader.firstname
                                }
                                {" "}
                                {
                                    leader.lastname
                                }

                            </option>

                        ))}

                    </select>

                    {/* STATUS */}

                    <select
                        value={status}
                        onChange={(e) =>
                            setStatus(
                                e.target.value
                            )
                        }
                    >

                        <option value="Present">
                            Present
                        </option>

                        <option value="Late">
                            Late
                        </option>

                        <option value="Absent">
                            Absent
                        </option>

                        <option value="Excused">
                            Excused
                        </option>

                    </select>

                    {/* DATE */}

                    <input
                        type="date"
                        value={date}
                        onChange={(e) =>
                            setDate(
                                e.target.value
                            )
                        }
                    />

                    {/* BUTTON */}

                    <button
                        type="submit"
                    >

                        {loading
                            ? "Recording..."
                            : "Record Attendance"}

                    </button>

                </form>

            </div>

        </div>
    );
}

export default Attendance;