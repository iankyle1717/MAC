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
                .select("*")
                .neq("type", "MEMBER")
                .order(
                    "firstname",
                    {
                        ascending: true
                    }
                );

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
                "Life Group recorded."
            );

            setLeaderId("");
            setTopic("");
            setPlace("");
            setType("");
        }

        setLoading(false);
    };

    const leaderOptions =
        leaders.map(
            (leader) => ({

            value: leader.id,

            label:
                `${leader.firstname} ${leader.lastname} (${leader.type})`

        }));

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

                    <Select
                        options={
                            leaderOptions
                        }

                        placeholder="Search leader..."

                        onChange={(selected) =>
                            setLeaderId(
                                selected.value
                            )
                        }

                        className="react-select-container"

                        classNamePrefix="react-select"
                    />

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