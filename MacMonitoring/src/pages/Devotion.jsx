import {
    useEffect,
    useState
} from "react";

import Sidebar
from "../components/Sidebar";

import {
    supabase
} from "../lib/supabase";

function Devotion() {

    const [leaders, setLeaders] =
        useState([]);

    const [leaderId, setLeaderId] =
        useState("");

    const [month, setMonth] =
        useState("");

    const [
        completedDays,
        setCompletedDays
    ] = useState("");

    const [
        totalDays,
        setTotalDays
    ] = useState("");

    const [loading, setLoading] =
        useState(false);

    useEffect(() => {

        fetchLeaders();

    }, []);

    const fetchLeaders =
        async () => {

        const { data } =
            await supabase
                .from("tblMonitoring")
                .select("*");

        setLeaders(data || []);
    };

    const handleSubmit =
        async (e) => {

        e.preventDefault();

        setLoading(true);

        const { error } =
            await supabase
                .from("tblDevotion")
                .insert([
                    {
                        leader_id:
                            leaderId,
                        month,
                        completed_days:
                            completedDays,
                        total_days:
                            totalDays
                    }
                ]);

        if (error) {

            console.log(error);

            alert(
                "Failed to record devotion."
            );

        } else {

            alert(
                "Devotion recorded."
            );

            setLeaderId("");
            setMonth("");
            setCompletedDays("");
            setTotalDays("");
        }

        setLoading(false);
    };

    return (

        <div className="layout">

            <Sidebar />

            <div className="content">

                <h1>
                    Devotion Recording
                </h1>

                <form
                    className="leader-form"
                    onSubmit={handleSubmit}
                >

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

                    <input
                        type="text"
                        placeholder="Month Example: May 2026"
                        value={month}
                        onChange={(e) =>
                            setMonth(
                                e.target.value
                            )
                        }
                    />

                    <input
                        type="number"
                        placeholder="Completed Days"
                        value={completedDays}
                        onChange={(e) =>
                            setCompletedDays(
                                e.target.value
                            )
                        }
                    />

                    <input
                        type="number"
                        placeholder="Total Days"
                        value={totalDays}
                        onChange={(e) =>
                            setTotalDays(
                                e.target.value
                            )
                        }
                    />

                    <button
                        type="submit"
                    >

                        {loading
                            ? "Recording..."
                            : "Record Devotion"}

                    </button>

                </form>

            </div>

        </div>
    );
}

export default Devotion;