import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import MultiSelect from "../components/MultiSelect";
import { supabase } from "../lib/supabase";
import { tribes, leaderTypes, ministries, civilStatusOptions, tithingTypes, djTypes } from "../constants/options";
import Swal from "sweetalert2";

function EditLeader() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteInput, setDeleteInput] = useState("");
    const [imageFile, setImageFile] = useState(null);
    const [previewImage, setPreviewImage] = useState("");

    // Form fields
    const [firstname, setFirstname] = useState("");
    const [lastname, setLastname] = useState("");
    const [nickname, setNickname] = useState("");
    const [pin, setPin] = useState("");
    const [tribe, setTribe] = useState("");
    const [type, setType] = useState("");
    const [selectedMinistries, setSelectedMinistries] = useState([]);
    const [grossIncome, setGrossIncome] = useState("");
    const [civilStatus, setCivilStatus] = useState("Single");
    const [tithingType, setTithingType] = useState("Individual");
    const [combinedWith, setCombinedWith] = useState("");
    const [djType, setDjType] = useState("");
    const [assignedTribe, setAssignedTribe] = useState("");

    // For combined partner dropdown
    const [availableLeaders, setAvailableLeaders] = useState([]);

    useEffect(() => { fetchLeader(); }, []);

    useEffect(() => {
        if (civilStatus === "Married" && tithingType === "Combined") {
            fetchMarriedLeaders();
        }
    }, [civilStatus, tithingType]);

    const fetchLeader = async () => {
        setFetching(true);
        const { data } = await supabase
            .from("tblMonitoring")
            .select("*")
            .eq("id", id)
            .single();

        if (data) {
            setFirstname(data.firstname || "");
            setLastname(data.lastname || "");
            setNickname(data.nickname || "");
            setPin(data.pin || "");
            setTribe(data.tribe || "");
            setType(data.type || "");
            setPreviewImage(data.image_url || "");
            setGrossIncome(data.gross_income ?? "");
            setCivilStatus(data.civil_status || "Single");
            setTithingType(data.tithing_type || "Individual");
            setCombinedWith(data.combined_with ? String(data.combined_with) : "");
            setDjType(data.dj_type || "");
            setAssignedTribe(data.assigned_tribe || "");

            // Handle both array (new) and string (legacy) ministries
            if (Array.isArray(data.ministries) && data.ministries.length > 0) {
                setSelectedMinistries(data.ministries);
            } else if (data.ministry && data.ministry !== "NONE") {
                setSelectedMinistries([data.ministry]);
            } else {
                setSelectedMinistries([]);
            }
        }
        setFetching(false);
    };

    const fetchMarriedLeaders = async () => {
        const { data } = await supabase
            .from("tblMonitoring")
            .select("id, firstname, lastname")
            .eq("civil_status", "Married")
            .neq("id", Number(id));
        setAvailableLeaders(data || []);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImageFile(file);
        setPreviewImage(URL.createObjectURL(file));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!firstname || !lastname || !tribe || !type) {
            Swal.fire({ icon: "warning", title: "Missing Fields", text: "Please fill in all required fields.", confirmButtonColor: "#c9a45c" });
            return;
        }

        setLoading(true);

        // ── FETCH OLD combined_with BEFORE UPDATE ──
        const { data: oldLeaderData } = await supabase
            .from("tblMonitoring")
            .select("combined_with")
            .eq("id", id)
            .single();
        const oldCombinedWith = oldLeaderData?.combined_with || null;

        let imageUrl = previewImage;

        if (imageFile) {
            const fileExt = imageFile.name.split(".").pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `leaders/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("leaders")
                .upload(filePath, imageFile);

            if (!uploadError) {
                const { data } = supabase.storage.from("leaders").getPublicUrl(filePath);
                imageUrl = data.publicUrl;
            }
        }

        const updateData = {
            firstname,
            lastname,
            nickname: nickname || null,
            pin,
            tribe,
            type,
            ministries: selectedMinistries,
            ministry: selectedMinistries[0] || "NONE",
            image_url: imageUrl,
            gross_income: grossIncome !== "" ? parseFloat(grossIncome) : null,
            civil_status: civilStatus,
            tithing_type: civilStatus === "Married" ? tithingType : "Individual",
            combined_with: civilStatus === "Married" && tithingType === "Combined" && combinedWith
                ? parseInt(combinedWith)
                : null,
            dj_type: selectedMinistries.includes("DISCIPLESHIP JOURNEY") ? djType : null,
            assigned_tribe: selectedMinistries.includes("DISCIPLESHIP JOURNEY") && djType === "Devotion Checker"
                ? assignedTribe
                : null,
        };

        const { error } = await supabase
            .from("tblMonitoring")
            .update(updateData)
            .eq("id", id);

        // ── BIDIRECTIONAL COMBINED LINKING ──
        if (!error) {
            const newCombinedWith = updateData.combined_with;

            // CASE A: Removing combined link
            if (!newCombinedWith || updateData.tithing_type !== "Combined") {
                if (oldCombinedWith && oldCombinedWith !== parseInt(id)) {
                    await supabase.from("tblMonitoring").update({
                        combined_with: null,
                        tithing_type: "Individual"
                    }).eq("id", oldCombinedWith);
                }
            }
            // CASE B: Setting or changing combined link
            else if (newCombinedWith) {
                // Clear old partner if different
                if (oldCombinedWith && oldCombinedWith !== newCombinedWith) {
                    await supabase.from("tblMonitoring").update({
                        combined_with: null,
                        tithing_type: "Individual"
                    }).eq("id", oldCombinedWith);
                }
                // Link new partner back to this leader
                await supabase.from("tblMonitoring").update({
                    combined_with: parseInt(id),
                    tithing_type: "Combined",
                    civil_status: "Married"
                }).eq("id", newCombinedWith);
            }
        }

        setLoading(false);

        if (error) {
            console.error(error);
            Swal.fire({ icon: "error", title: "Update Failed", text: error.message, confirmButtonColor: "#c9a45c" });
        } else {
            Swal.fire({
                icon: "success",
                title: "Profile Updated",
                text: `${firstname} ${lastname}'s profile has been updated.`,
                timer: 1800,
                showConfirmButton: false,
            }).then(() => navigate(`/leader/${id}`));
        }
    };

    const handleDelete = async () => {
        if (deleteInput !== "ADMIN") {
            Swal.fire({ icon: "warning", title: "Wrong Confirmation", text: 'Type "ADMIN" to confirm deletion.', confirmButtonColor: "#c9a45c" });
            return;
        }

        setLoading(true);

        // ── CLEAR PARTNER'S COMBINED LINK BEFORE DELETE ──
        const { data: linkedPartner } = await supabase
            .from("tblMonitoring")
            .select("id")
            .eq("combined_with", id)
            .single();
        if (linkedPartner) {
            await supabase.from("tblMonitoring").update({
                combined_with: null,
                tithing_type: "Individual"
            }).eq("id", linkedPartner.id);
        }

        await supabase.from("tblTithes").delete().eq("leader_id", id);
        await supabase.from("tblAttendance").delete().eq("leader_id", id);
        await supabase.from("tblDevotion").delete().eq("leader_id", id);
        await supabase.from("tblLifeGroup").delete().eq("leader_id", id);

        const { error } = await supabase.from("tblMonitoring").delete().eq("id", id);

        setLoading(false);
        setShowDeleteModal(false);
        setDeleteInput("");

        if (error) {
            Swal.fire({ icon: "error", title: "Delete Failed", text: error.message });
        } else {
            Swal.fire({ icon: "success", title: "Account Deleted", timer: 1500, showConfirmButton: false })
                .then(() => navigate("/leaders"));
        }
    };

    const showDjOptions = selectedMinistries.includes("DISCIPLESHIP JOURNEY");
    const showTithingOptions = civilStatus === "Married";

    if (fetching) {
        return (
            <div className="layout">
                <Sidebar />
                <div className="content" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <p style={{ color: "#6b7280", fontSize: "14px" }}>Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="layout">
            <Sidebar />
            <div className="content">

                {/* HEADER */}
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "24px",
                    paddingBottom: "16px",
                    borderBottom: "1px solid #e5e7eb"
                }}>
                    <div>
                        <h1 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>Edit Profile</h1>
                        <p style={{ fontSize: "12px", color: "#6b7280", margin: "3px 0 0 0" }}>
                            {firstname} {lastname} — update leader information
                        </p>
                    </div>
                    <button
                        onClick={() => navigate(`/leader/${id}`)}
                        style={{
                            padding: "6px 14px",
                            borderRadius: "8px",
                            border: "1px solid #d1d5db",
                            background: "#fff",
                            fontSize: "13px",
                            cursor: "pointer",
                            color: "#374151",
                            fontWeight: 500
                        }}
                    >
                        ← Back
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "720px" }}>

                    {/* PROFILE IMAGE */}
                    <div style={{
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        padding: "20px",
                        display: "flex",
                        alignItems: "center",
                        gap: "20px"
                    }}>
                        <img
                            src={previewImage || "https://placehold.co/100x100"}
                            alt="Preview"
                            style={{
                                width: "80px",
                                height: "80px",
                                borderRadius: "50%",
                                objectFit: "cover",
                                border: "3px solid #c9a45c",
                                flexShrink: 0
                            }}
                        />
                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Profile Photo</p>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                style={{ fontSize: "12px", color: "#6b7280" }}
                            />
                            <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>JPG, PNG. Photo will be updated on save.</p>
                        </div>
                    </div>

                    {/* BASIC INFO */}
                    <Section title="Basic Information">
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                            <Field label="First Name *">
                                <input
                                    type="text"
                                    value={firstname}
                                    onChange={e => setFirstname(e.target.value)}
                                    placeholder="First Name"
                                    style={inputStyle}
                                />
                            </Field>
                            <Field label="Last Name *">
                                <input
                                    type="text"
                                    value={lastname}
                                    onChange={e => setLastname(e.target.value)}
                                    placeholder="Last Name"
                                    style={inputStyle}
                                />
                            </Field>
                            <Field label="Nickname">
                                <input
                                    type="text"
                                    value={nickname}
                                    onChange={e => setNickname(e.target.value)}
                                    placeholder="Nickname (optional)"
                                    style={inputStyle}
                                />
                            </Field>
                            <Field label="Change PIN">
                                <input
                                    type="password"
                                    value={pin}
                                    onChange={e => setPin(e.target.value)}
                                    placeholder="Enter new PIN"
                                    style={inputStyle}
                                />
                            </Field>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginTop: "12px" }}>
                            <Field label="Tribe *">
                                <select value={tribe} onChange={e => setTribe(e.target.value)} style={inputStyle}>
                                    <option value="">Select Tribe</option>
                                    {tribes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </Field>
                            <Field label="Leader Type *">
                                <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
                                    <option value="">Select Type</option>
                                    {leaderTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </Field>
                        </div>
                    </Section>

                    {/* MINISTRIES */}
                    <Section title="Ministry Assignments">
                        <MultiSelect
                            label="Assigned Ministries"
                            options={ministries}
                            selected={selectedMinistries}
                            onChange={setSelectedMinistries}
                            placeholder="Select one or more ministries..."
                        />

                        {/* DJ CONFIG */}
                        {showDjOptions && (
                            <div style={{
                                marginTop: "14px",
                                padding: "16px",
                                background: "rgba(201, 164, 92, 0.06)",
                                borderRadius: "10px",
                                border: "1px solid rgba(201, 164, 92, 0.25)"
                            }}>
                                <p style={{ fontSize: "12px", fontWeight: 700, color: "#92400e", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                    Discipleship Journey Configuration
                                </p>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                                    <Field label="DJ Type">
                                        <select value={djType} onChange={e => setDjType(e.target.value)} style={inputStyle}>
                                            <option value="">Select DJ Type</option>
                                            {djTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </Field>
                                    {djType === "Devotion Checker" && (
                                        <Field label="Assigned Tribe">
                                            <select value={assignedTribe} onChange={e => setAssignedTribe(e.target.value)} style={inputStyle}>
                                                <option value="">Select Tribe</option>
                                                {tribes.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </Field>
                                    )}
                                </div>
                            </div>
                        )}
                    </Section>

                    {/* FINANCIAL INFO */}
                    <Section title="Financial Information">
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                            <Field label="Civil Status">
                                <select value={civilStatus} onChange={e => setCivilStatus(e.target.value)} style={inputStyle}>
                                    {civilStatusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </Field>
                            <Field label="Gross Income (optional)">
                                <input
                                    type="number"
                                    value={grossIncome}
                                    onChange={e => setGrossIncome(e.target.value)}
                                    placeholder="Monthly gross income"
                                    min="0"
                                    style={inputStyle}
                                />
                            </Field>
                        </div>

                        {/* TITHING CONFIG — only when Married */}
                        {showTithingOptions && (
                            <div style={{
                                marginTop: "14px",
                                padding: "16px",
                                background: "rgba(22, 163, 74, 0.06)",
                                borderRadius: "10px",
                                border: "1px solid rgba(22, 163, 74, 0.2)"
                            }}>
                                <p style={{ fontSize: "12px", fontWeight: 700, color: "#166534", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                    Tithing Configuration
                                </p>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                                    <Field label="Tithing Type">
                                        <select value={tithingType} onChange={e => setTithingType(e.target.value)} style={inputStyle}>
                                            {tithingTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </Field>

                                    {tithingType === "Combined" && (
                                        <Field label="Combined With">
                                            {availableLeaders.length === 0 ? (
                                                <p style={{ fontSize: "12px", color: "#9ca3af", padding: "10px 0" }}>
                                                    Loading married leaders...
                                                </p>
                                            ) : (
                                                <select
                                                    value={combinedWith}
                                                    onChange={e => setCombinedWith(e.target.value)}
                                                    style={inputStyle}
                                                >
                                                    <option value="">— Select Spouse —</option>
                                                    {availableLeaders.map(leader => (
                                                        <option key={leader.id} value={String(leader.id)}>
                                                            {leader.firstname} {leader.lastname}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                            {combinedWith && (
                                                <p style={{ fontSize: "11px", color: "#16a34a", marginTop: "4px", fontWeight: 600 }}>
                                                    ✓ Combined with: {availableLeaders.find(l => String(l.id) === combinedWith)?.firstname} {availableLeaders.find(l => String(l.id) === combinedWith)?.lastname}
                                                </p>
                                            )}
                                        </Field>
                                    )}
                                </div>
                            </div>
                        )}
                    </Section>

                    {/* SAVE BUTTON */}
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: "13px",
                            borderRadius: "10px",
                            border: "none",
                            background: "linear-gradient(135deg, #c9a45c 0%, #b8934a 100%)",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: "14px",
                            cursor: loading ? "not-allowed" : "pointer",
                            opacity: loading ? 0.7 : 1,
                            transition: "all 0.2s"
                        }}
                    >
                        {loading ? "Saving..." : "Save Changes"}
                    </button>
                </form>

                {/* DANGER ZONE */}
                <div style={{
                    marginTop: "40px",
                    maxWidth: "720px",
                    padding: "20px",
                    borderRadius: "12px",
                    border: "1px solid rgba(220, 38, 38, 0.2)",
                    background: "#fff"
                }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#dc2626", marginBottom: "6px" }}>Danger Zone</h3>
                    <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "14px" }}>
                        Permanently delete this account and all associated records. This cannot be undone.
                    </p>
                    <button
                        type="button"
                        onClick={() => setShowDeleteModal(true)}
                        style={{
                            padding: "8px 18px",
                            borderRadius: "8px",
                            border: "1px solid #dc2626",
                            background: "#fef2f2",
                            color: "#dc2626",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: "pointer"
                        }}
                    >
                        Delete Account
                    </button>
                </div>
            </div>

            {/* DELETE MODAL */}
            {showDeleteModal && (
                <div style={{
                    position: "fixed", inset: 0,
                    background: "rgba(0,0,0,0.5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: 1000, padding: "20px"
                }}
                    onClick={e => { if (e.target === e.currentTarget) { setShowDeleteModal(false); setDeleteInput(""); } }}
                >
                    <div style={{
                        background: "#fff",
                        borderRadius: "14px",
                        padding: "24px",
                        width: "100%",
                        maxWidth: "420px",
                        boxShadow: "0 20px 50px rgba(0,0,0,0.2)"
                    }}>
                        <h2 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px", color: "#111827" }}>Confirm Deletion</h2>
                        <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "16px", lineHeight: 1.6 }}>
                            This will permanently delete <strong>{firstname} {lastname}</strong> and all their records (tithes, attendance, devotion, life group).
                            <br /><br />Type <strong>ADMIN</strong> to confirm.
                        </p>
                        <input
                            type="text"
                            placeholder="Type ADMIN to confirm"
                            value={deleteInput}
                            onChange={e => setDeleteInput(e.target.value)}
                            style={{ ...inputStyle, marginBottom: "14px", borderColor: "#dc2626" }}
                        />
                        <div style={{ display: "flex", gap: "10px" }}>
                            <button
                                type="button"
                                onClick={() => { setShowDeleteModal(false); setDeleteInput(""); }}
                                style={{
                                    flex: 1, padding: "10px", borderRadius: "8px",
                                    border: "1px solid #d1d5db", background: "#fff",
                                    fontSize: "13px", cursor: "pointer", fontWeight: 600
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={loading || deleteInput !== "ADMIN"}
                                style={{
                                    flex: 1, padding: "10px", borderRadius: "8px",
                                    border: "none", background: deleteInput === "ADMIN" ? "#dc2626" : "#f3f4f6",
                                    color: deleteInput === "ADMIN" ? "#fff" : "#9ca3af",
                                    fontSize: "13px", cursor: deleteInput === "ADMIN" ? "pointer" : "not-allowed",
                                    fontWeight: 700, transition: "all 0.2s"
                                }}
                            >
                                {loading ? "Deleting..." : "Confirm Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Small layout helpers ──────────────────────────────────────────────────────

function Section({ title, children }) {
    return (
        <div style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "20px"
        }}>
            <p style={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.6px",
                color: "#9ca3af",
                marginBottom: "14px"
            }}>
                {title}
            </p>
            {children}
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#374151",
                textTransform: "uppercase",
                letterSpacing: "0.4px"
            }}>
                {label}
            </label>
            {children}
        </div>
    );
}

const inputStyle = {
    width: "100%",
    padding: "9px 12px",
    fontSize: "13px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    background: "#f9fafb",
    color: "#111827",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s"
};

export default EditLeader;