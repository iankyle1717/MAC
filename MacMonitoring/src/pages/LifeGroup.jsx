import {
    useEffect,
    useState
} from "react";

import Sidebar
from "../components/Sidebar";

import {
    supabase
} from "../lib/supabase";

function LifeGroup() {

    const [leaders, setLeaders] =
        useState([]);

    const [leaderId, setLeaderId] =
        useState("");

    const [topic, setTopic] =
        useState("");

    const [place, setPlace] =
        useState("");

    const [type, setType] =
        useState("");

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
                .from("tblLifeGroup")
                .insert([
                    {
                        leader_id:
                            leaderId,
                        topic,
                        place,
                        type,
                        date
                    }
                ]);

        if (error) {

            console.log(error);

            alert(
                "Failed to record life group."
            );

        } else {

            alert(
                "Life group recorded."
            );

            setLeaderId("");
            setTopic("");
            setPlace("");
            setType("");
        }

        setLoading(false);
    };

    return (

        <div className="layout">

            <Sidebar />

            <div className="content">

                <h1>
                    Life Group Recording
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
                        placeholder="Topic"
                        value={topic}
                        onChange={(e) =>
                            setTopic(
                                e.target.value
                            )
                        }
                    />

                    <input
                        type="text"
                        placeholder="Place"
                        value={place}
                        onChange={(e) =>
                            setPlace(
                                e.target.value
                            )
                        }
                    />

                    <input
                        type="text"
                        placeholder="Type"
                        value={type}
                        onChange={(e) =>
                            setType(
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
                            : "Record Life Group"}

                    </button>

                </form>

            </div>

        </div>
    );
}

export default LifeGroup;