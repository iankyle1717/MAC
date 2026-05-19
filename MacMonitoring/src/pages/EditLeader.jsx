import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";
import { tribes, leaderTypes } from "../constants/options";

function EditLeader() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        firstname: "",
        lastname: "",
        tribe: "",
        type: ""
    });

    const [loading, setLoading] = useState(false);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteInput, setDeleteInput] = useState("");

    useEffect(() => {
        fetchLeader();
    }, []);

    const fetchLeader = async () => {
        const { data } = await supabase
            .from("tblMonitoring")
            .select("*")
            .eq("id", id)
            .single();

        if (data) setFormData(data);
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase
            .from("tblMonitoring")
            .update({
                firstname: formData.firstname,
                lastname: formData.lastname,
                tribe: formData.tribe,
                type: formData.type
            })
            .eq("id", id);

        if (error) {
            alert("Failed to update profile.");
        } else {
            alert("Profile updated successfully.");
            navigate(`/leader/${id}`);
        }

        setLoading(false);
    };

    const handleDelete = async () => {
        if (deleteInput !== "ADMIN") {
            alert("Incorrect confirmation.");
            return;
        }

        const confirmDelete = window.confirm(
            "Are you sure you want to permanently delete this account?"
        );

        if (!confirmDelete) return;

        setLoading(true);

        // DELETE RELATED RECORDS
        await supabase.from("tblTithes").delete().eq("leader_id", id);
        await supabase.from("tblAttendance").delete().eq("leader_id", id);
        await supabase.from("tblDevotion").delete().eq("leader_id", id);
        await supabase.from("tblLifeGroup").delete().eq("leader_id", id);

        // DELETE MAIN PROFILE
        const { error } = await supabase
            .from("tblMonitoring")
            .delete()
            .eq("id", id);

        if (error) {
            alert("Failed to delete account.");
        } else {
            alert("Account deleted successfully.");
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
                <h1>Edit Profile</h1>

                <form className="leader-form" onSubmit={handleSubmit}>
                    <input
                        type="text"
                        name="firstname"
                        placeholder="First Name"
                        value={formData.firstname}
                        onChange={handleChange}
                    />

                    <input
                        type="text"
                        name="lastname"
                        placeholder="Last Name"
                        value={formData.lastname}
                        onChange={handleChange}
                    />

                    <select
                        name="tribe"
                        value={formData.tribe}
                        onChange={handleChange}
                    >
                        {tribes.map((tribe) => (
                            <option key={tribe} value={tribe}>
                                {tribe}
                            </option>
                        ))}
                    </select>

                    <select
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                    >
                        {leaderTypes.map((type) => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>

                    <button type="submit">
                        {loading ? "Saving..." : "Save Changes"}
                    </button>
                </form>

                {/* DELETE SECTION */}
                <div
                    className="record-card"
                    style={{
                        marginTop: "40px",
                        border: "1px solid rgba(255,0,0,0.2)"
                    }}
                >
                    <h2>Delete Account</h2>

                    <p style={{ marginTop: "10px", opacity: 0.7 }}>
                        This action cannot be undone.
                    </p>

                   <button
                        type="button"
                        onClick={() => setShowDeleteModal(true)}
                        className="danger-button"
                    >
                        Delete Account
                    </button>
                </div>
            </div>

            {/* MODAL */}
            {showDeleteModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h2>Confirm Deletion</h2>

                        <p>
                            Type the confirmation word to permanently delete this account.
                        </p>

                        <input
                            type="text"
                            placeholder="Enter confirmation"
                            value={deleteInput}
                            onChange={(e) => setDeleteInput(e.target.value)}
                        />

                        <div
                            style={{
                                display: "flex",
                                gap: "10px",
                                marginTop: "15px"
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeleteInput("");
                                }}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={loading}
                                style={{ background: "#dc2626" }}
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