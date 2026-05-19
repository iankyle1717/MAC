import {
    useEffect,
    useState
} from "react";

import Sidebar
from "../components/Sidebar";

import {
    supabase
} from "../lib/supabase";

function Tithes() {

    const [leaders, setLeaders] =
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

    useEffect(() => {

        fetchLeaders();

    }, []);

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

    const handleSubmit =
        async (e) => {

        e.preventDefault();

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
        }

        setLoading(false);
    };

    return (

        <div className="layout">

            <Sidebar />

            <div className="content">

                <h1>
                    Tithes Recording
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

            </div>

        </div>
    );
}

export default Tithes;