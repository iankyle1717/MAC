import { useEffect, useState } from "react";

import {
    useNavigate,
    useParams
} from "react-router-dom";

import Sidebar
from "../components/Sidebar";

import {
    supabase
} from "../lib/supabase";

import {
    tribes,
    leaderTypes,
    ministries
} from "../constants/options";

function EditLeader() {

    const { id } =
        useParams();

    const navigate =
        useNavigate();

    const [formData,
        setFormData] =
        useState({

        firstname: "",

        lastname: "",

        tribe: "",

        type: "",

        ministry: "",

        image_url: ""
    });

    const [loading,
        setLoading] =
        useState(false);

    const [showDeleteModal,
        setShowDeleteModal] =
        useState(false);

    const [deleteInput,
        setDeleteInput] =
        useState("");

    /* =========================
       IMAGE STATES
    ========================= */

    const [imageFile,
        setImageFile] =
        useState(null);

    const [previewImage,
        setPreviewImage] =
        useState("");

    useEffect(() => {

        fetchLeader();

    }, []);

    /* =========================
       FETCH LEADER
    ========================= */

    const fetchLeader =
        async () => {

        const { data } =
            await supabase
                .from("tblMonitoring")
                .select("*")
                .eq("id", id)
                .single();

        if (data) {

            setFormData(data);

            setPreviewImage(
                data.image_url || ""
            );
        }
    };

    /* =========================
       HANDLE INPUT
    ========================= */

    const handleChange =
        (e) => {

        setFormData({

            ...formData,

            [e.target.name]:
                e.target.value
        });
    };

    /* =========================
       HANDLE IMAGE
    ========================= */

    const handleImageChange =
        (e) => {

        const file =
            e.target.files[0];

        if (!file) return;

        setImageFile(file);

        setPreviewImage(
            URL.createObjectURL(file)
        );
    };

    /* =========================
       UPDATE PROFILE
    ========================= */

    const handleSubmit =
        async (e) => {

        e.preventDefault();

        setLoading(true);

        let imageUrl =
            formData.image_url || "";

        /* =========================
           UPLOAD IMAGE
        ========================= */

        if (imageFile) {

            const fileExt =
                imageFile.name
                    .split(".")
                    .pop();

            const fileName =
                `${Date.now()}.${fileExt}`;

            const filePath =
                `leaders/${fileName}`;

            const {
                error: uploadError
            } =
                await supabase.storage
                    .from("leaders")
                    .upload(
                        filePath,
                        imageFile
                    );

            if (!uploadError) {

                const { data } =
                    supabase.storage
                        .from("leaders")
                        .getPublicUrl(
                            filePath
                        );

                imageUrl =
                    data.publicUrl;
            }
        }

        /* =========================
           UPDATE DATABASE
        ========================= */

        const { error } =
            await supabase
                .from("tblMonitoring")
                .update({

                    firstname:
                        formData.firstname,

                    lastname:
                        formData.lastname,

                    tribe:
                        formData.tribe,

                    type:
                        formData.type,

                    ministry:
                        formData.ministry,

                    image_url:
                        imageUrl
                })
                .eq("id", id);

        if (error) {

            alert(
                "Failed to update profile."
            );

        } else {

            alert(
                "Profile updated successfully."
            );

            navigate(
                `/leader/${id}`
            );
        }

        setLoading(false);
    };

    /* =========================
       DELETE ACCOUNT
    ========================= */

    const handleDelete =
        async () => {

        if (
            deleteInput !==
            "ADMIN"
        ) {

            alert(
                "Incorrect confirmation."
            );

            return;
        }

        const confirmDelete =
            window.confirm(

                "Are you sure you want to permanently delete this account?"
            );

        if (!confirmDelete)
            return;

        setLoading(true);

        /* DELETE RELATED RECORDS */

        await supabase
            .from("tblTithes")
            .delete()
            .eq("leader_id", id);

        await supabase
            .from("tblAttendance")
            .delete()
            .eq("leader_id", id);

        await supabase
            .from("tblDevotion")
            .delete()
            .eq("leader_id", id);

        await supabase
            .from("tblLifeGroup")
            .delete()
            .eq("leader_id", id);

        /* DELETE PROFILE */

        const { error } =
            await supabase
                .from("tblMonitoring")
                .delete()
                .eq("id", id);

        if (error) {

            alert(
                "Failed to delete account."
            );

        } else {

            alert(
                "Account deleted successfully."
            );

            navigate("/leaders");
        }

        setLoading(false);

        setShowDeleteModal(false);

        setDeleteInput("");
    };

    return (

        <div className="layout">

            <Sidebar />

            <div className="content">

                <h1>
                    Edit Profile
                </h1>

                <form
                    className="leader-form"
                    onSubmit={handleSubmit}
                >

                    {/* PROFILE IMAGE */}

                    <div className="edit-image-section">

                        <img
                            src={
                                previewImage ||

                                "https://via.placeholder.com/150"
                            }

                            alt="Preview"

                            className="edit-profile-image"
                        />

                        <input
                            type="file"

                            accept="image/*"

                            onChange={
                                handleImageChange
                            }
                        />

                    </div>

                    {/* FIRSTNAME */}

                    <input
                        type="text"

                        name="firstname"

                        placeholder="First Name"

                        value={
                            formData.firstname
                        }

                        onChange={
                            handleChange
                        }
                    />

                    {/* LASTNAME */}

                    <input
                        type="text"

                        name="lastname"

                        placeholder="Last Name"

                        value={
                            formData.lastname
                        }

                        onChange={
                            handleChange
                        }
                    />

                    {/* TRIBE */}

                    <select
                        name="tribe"

                        value={
                            formData.tribe
                        }

                        onChange={
                            handleChange
                        }
                    >

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
                        name="type"

                        value={
                            formData.type
                        }

                        onChange={
                            handleChange
                        }
                    >

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
                        name="ministry"

                        value={
                            formData.ministry
                        }

                        onChange={
                            handleChange
                        }
                    >

                        <option value="">
                            Select Ministry
                        </option>

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

                    {/* SAVE BUTTON */}

                    <button
                        type="submit"
                    >

                        {loading
                            ? "Saving..."
                            : "Save Changes"}

                    </button>

                </form>

                {/* DELETE SECTION */}

                <div
                    className="record-card"
                    style={{

                        marginTop:
                            "40px",

                        border:
                            "1px solid rgba(255,0,0,0.2)"
                    }}
                >

                    <h2>
                        Delete Account
                    </h2>

                    <p
                        style={{

                            marginTop:
                                "10px",

                            opacity:
                                0.7
                        }}
                    >

                        This action cannot be undone.

                    </p>

                    <button
                        type="button"

                        onClick={() =>
                            setShowDeleteModal(
                                true
                            )
                        }

                        className="danger-button"
                    >

                        Delete Account

                    </button>

                </div>

            </div>

            {/* DELETE MODAL */}

            {showDeleteModal && (

                <div className="modal-overlay">

                    <div className="modal">

                        <h2>
                            Confirm Deletion
                        </h2>

                        <p>

                            Type the confirmation word to permanently delete this account.

                        </p>

                        <input
                            type="text"

                            placeholder="Enter confirmation"

                            value={deleteInput}

                            onChange={(e) =>
                                setDeleteInput(
                                    e.target.value
                                )
                            }
                        />

                        <div
                            style={{

                                display:
                                    "flex",

                                gap:
                                    "10px",

                                marginTop:
                                    "15px"
                            }}
                        >

                            <button
                                type="button"

                                onClick={() => {

                                    setShowDeleteModal(
                                        false
                                    );

                                    setDeleteInput(
                                        ""
                                    );
                                }}
                            >

                                Cancel

                            </button>

                            <button
                                type="button"

                                onClick={
                                    handleDelete
                                }

                                disabled={loading}

                                style={{
                                    background:
                                        "#dc2626"
                                }}
                            >

                                Confirm Delete

                            </button>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}

export default EditLeader;