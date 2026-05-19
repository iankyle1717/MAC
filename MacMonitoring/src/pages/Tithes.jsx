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
                    Tithes Recording
                </h1>

                <form
                    className="leader-form"
                    onSubmit={handleSubmit}
                >

               <Select
                    options={leaderOptions}

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