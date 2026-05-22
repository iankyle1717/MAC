import {
    useState
} from "react";

import {
    tribes,
    leaderTypes,
    ministries
} from "../constants/options";

import {
    supabase
} from "../lib/supabase";

function LeaderForm({
    refreshLeaders
}) {

    const [firstname, setFirstname] =
        useState("");

    const [lastname, setLastname] =
        useState("");

    const [pin, setPin] =
        useState("");

    const [tribe, setTribe] =
        useState("");

    const [type, setType] =
        useState("");

    const [ministry, setMinistry] =
        useState("NONE");

    const [image, setImage] =
        useState(null);

    const [loading, setLoading] =
        useState(false);

    /* =========================
       SUBMIT
    ========================= */

    const handleSubmit =
        async (e) => {

        e.preventDefault();

        if (
            !firstname ||
            !lastname ||
            !tribe ||
            !type ||
            !pin
        ) {

            alert(
                "Complete all fields."
            );

            return;
        }

        setLoading(true);

        let imageUrl = "";

        /* =========================
           UPLOAD IMAGE
        ========================= */

        if (image) {

            const fileExt =
                image.name
                    .split(".")
                    .pop();

            const fileName =
                `${Date.now()}.${fileExt}`;

            /* IMPORTANT:
               REMOVE leaders/
               because your bucket is already
               leader-images
            */

            const {
                data: uploadData,
                error: uploadError
            } =
                await supabase
                    .storage
                    .from("leader-images")
                    .upload(
                        fileName,
                        image
                    );

            console.log(
                "UPLOAD:",
                uploadData
            );

            console.log(
                "UPLOAD ERROR:",
                uploadError
            );

            if (uploadError) {

                alert(
                    uploadError.message
                );

                setLoading(false);

                return;
            }

            const {
                data
            } =
                supabase
                    .storage
                    .from("leader-images")
                    .getPublicUrl(
                        fileName
                    );

            imageUrl =
                data.publicUrl;
        }

        /* =========================
           INSERT USER
        ========================= */

        const { error } =
            await supabase
                .from("tblMonitoring")
                .insert([
                    {
                        firstname,
                        lastname,
                        tribe,
                        type,
                        ministry,
                        pin,
                        image_url:
                            imageUrl
                    }
                ]);

        if (error) {

            console.log(error);

            alert(
                "Failed to add leader."
            );

        } else {

            alert(
                "Leader added successfully."
            );

            /* RESET */

            setFirstname("");
            setLastname("");
            setPin("");
            setTribe("");
            setType("");
            setMinistry("NONE");
            setImage(null);

            refreshLeaders();
        }

        setLoading(false);
    };

    return (

        <form
            className="leader-form"
            onSubmit={handleSubmit}
        >

            {/* FIRSTNAME */}

            <input
                type="text"
                placeholder="First Name"
                value={firstname}
                onChange={(e) =>
                    setFirstname(
                        e.target.value
                    )
                }
            />

            {/* LASTNAME */}

            <input
                type="text"
                placeholder="Last Name"
                value={lastname}
                onChange={(e) =>
                    setLastname(
                        e.target.value
                    )
                }
            />

            {/* PIN */}

            <input
                type="password"
                placeholder="Set PIN"
                value={pin}
                onChange={(e) =>
                    setPin(
                        e.target.value
                    )
                }
            />

            {/* TRIBE */}

            <select
                value={tribe}
                onChange={(e) =>
                    setTribe(
                        e.target.value
                    )
                }
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

            {/* TYPE */}

            <select
                value={type}
                onChange={(e) =>
                    setType(
                        e.target.value
                    )
                }
            >

                <option value="">
                    Select Leader Type
                </option>

                {leaderTypes.map(
                    (type) => (

                    <option
                        key={type}
                        value={type}
                    >

                        {type}

                    </option>

                ))}

            </select>

            {/* MINISTRY */}

            <select
                value={ministry}
                onChange={(e) =>
                    setMinistry(
                        e.target.value
                    )
                }
            >

                {ministries.map(
                    (ministry) => (

                    <option
                        key={ministry}
                        value={ministry}
                    >

                        {ministry}

                    </option>

                ))}

            </select>

            {/* IMAGE */}

            <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                    setImage(
                        e.target.files[0]
                    )
                }
            />

            {/* BUTTON */}

            <button type="submit">

                {loading
                    ? "Adding..."
                    : "Add Leader"}

            </button>

        </form>
    );
}

export default LeaderForm;