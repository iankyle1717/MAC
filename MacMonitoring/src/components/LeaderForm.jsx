import {
    useState
} from "react";

import {
    tribes,
    leaderTypes
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

    const [tribe, setTribe] =
        useState("");

    const [type, setType] =
        useState("");

    const [image, setImage] =
        useState(null);

    const [loading, setLoading] =
        useState(false);

    const handleSubmit =
        async (e) => {

        e.preventDefault();

        if (
            !firstname ||
            !lastname ||
            !tribe ||
            !type
        ) {

            alert(
                "Complete all fields."
            );

            return;
        }

        setLoading(true);

        let imageUrl = "";

        /* UPLOAD IMAGE */

       if (image) {

    console.log(
        "Uploading image..."
    );

    const fileName =
        `${Date.now()}-${image.name}`;

    const {
        data: uploadData,
        error: uploadError
    } = await supabase
        .storage
        .from("leader-images")
        .upload(
            fileName,
            image
        );

    console.log(
        "UPLOAD DATA:",
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
    } = supabase
        .storage
        .from("leader-images")
        .getPublicUrl(
            fileName
        );

    imageUrl =
        data.publicUrl;

    console.log(
        "IMAGE URL:",
        imageUrl
    );
}

        /* INSERT LEADER */

        const { error } =
            await supabase
                .from("tblMonitoring")
                .insert([
                    {
                        firstname,
                        lastname,
                        tribe,
                        type,
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
                "Leader added."
            );

            setFirstname("");
            setLastname("");
            setTribe("");
            setType("");
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

                {tribes.map((tribe) => (

                    <option
                        key={tribe}
                        value={tribe}
                    >

                        {tribe}

                    </option>

                ))}

            </select>

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

                {leaderTypes.map((type) => (

                    <option
                        key={type}
                        value={type}
                    >

                        {type}

                    </option>

                ))}

            </select>

            <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                    setImage(
                        e.target.files[0]
                    )
                }
            />

            <button type="submit">

                {loading
                    ? "Adding..."
                    : "Add Leader"}

            </button>

        </form>
    );
}

export default LeaderForm;