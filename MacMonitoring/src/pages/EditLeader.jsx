import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import MultiSelect from "../components/MultiSelect";
import { supabase } from "../lib/supabase";
import { tribes, leaderTypes, ministries, civilStatusOptions, tithingTypes, djTypes } from "../constants/options";
import { getCurrentUser, isAdmin } from "../utils/auth";
import Swal from "sweetalert2";

// ── BUCKET CONFIG ───────────────────────────────────────────────────────────
const STORAGE_BUCKET = "leader-images";
const MAX_FILE_SIZE_MB = 5;
const TARGET_WIDTH = 600;
const TARGET_QUALITY = 0.8;
const TARGET_FORMAT = "image/jpeg";

function EditLeader() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteInput, setDeleteInput] = useState("");
    const [imageFile, setImageFile] = useState(null);
    const [previewImage, setPreviewImage] = useState("");
    const [originalImageUrl, setOriginalImageUrl] = useState("");

    const [firstname, setFirstname] = useState("");
    const [lastname, setLastname] = useState("");
    const [nickname, setNickname] = useState("");
    const [username, setUsername] = useState("");
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
    const [availableLeaders, setAvailableLeaders] = useState([]);

    const currentUser = getCurrentUser();
    const admin = isAdmin();
    const isOwnProfile = currentUser?.id === Number(id);
    const fullAccess = admin;

    useEffect(() => { fetchLeader(); }, []);

    useEffect(() => {
        if (fullAccess && civilStatus === "Married" && tithingType === "Combined") {
            fetchMarriedLeaders();
        }
    }, [civilStatus, tithingType, fullAccess]);

    // ── USERNAME GENERATOR ─────────────────────────────────────────────────
    const generateUsername = (fname, lname) => {
        const clean = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "");
        return `${clean(fname)}.${clean(lname)}@modernacts.com`;
    };

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
            setUsername(data.username || "");
            setPin(data.pin || "");
            setTribe(data.tribe || "");
            setType(data.type || "");
            setPreviewImage(data.image_url || "");
            setOriginalImageUrl(data.image_url || "");
            setGrossIncome(data.gross_income ?? "");
            setCivilStatus(data.civil_status || "Single");
            setTithingType(data.tithing_type || "Individual");
            setCombinedWith(data.combined_with ? String(data.combined_with) : "");
            setDjType(data.dj_type || "");
            setAssignedTribe(data.assigned_tribe || "");

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

    // ── IMAGE COMPRESSION HELPER ─────────────────────────────────────────────
    const compressImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    let width = img.width;
                    let height = img.height;

                    if (width > TARGET_WIDTH) {
                        height = Math.round((height * TARGET_WIDTH) / width);
                        width = TARGET_WIDTH;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                                    type: TARGET_FORMAT,
                                    lastModified: Date.now(),
                                });
                                resolve(compressedFile);
                            } else {
                                reject(new Error("Canvas toBlob failed"));
                            }
                        },
                        TARGET_FORMAT,
                        TARGET_QUALITY
                    );
                };
                img.onerror = () => reject(new Error("Image load failed"));
            };
            reader.onerror = () => reject(new Error("FileReader failed"));
        });
    };

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            Swal.fire({ icon: "warning", title: "Invalid File", text: "Please select an image file (JPG, PNG, WEBP).", confirmButtonColor: "#c9a45c" });
            e.target.value = "";
            return;
        }

        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB > MAX_FILE_SIZE_MB) {
            Swal.fire({
                icon: "warning",
                title: "File Too Large",
                text: `Image is ${sizeMB.toFixed(1)}MB. Maximum allowed is ${MAX_FILE_SIZE_MB}MB. Try a smaller image or it will be compressed.`,
                confirmButtonColor: "#c9a45c"
            });
        }

        try {
            const compressed = await compressImage(file);
            setImageFile(compressed);
            setPreviewImage(URL.createObjectURL(compressed));

            const compressedSizeKB = (compressed.size / 1024).toFixed(1);
            console.log(`Original: ${(file.size / 1024).toFixed(1)}KB → Compressed: ${compressedSizeKB}KB`);
        } catch (err) {
            console.error("Compression failed:", err);
            setImageFile(file);
            setPreviewImage(URL.createObjectURL(file));
            Swal.fire({ icon: "info", title: "Compression Failed", text: "Using original file. Upload may fail if too large.", confirmButtonColor: "#c9a45c" });
        }
    };

    // ── STORAGE HELPERS ──────────────────────────────────────────────────────
    const getStoragePathFromUrl = (url) => {
        if (!url) return null;
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split(`/object/public/${STORAGE_BUCKET}/`);
            if (pathParts.length === 2) return pathParts[1];
            const segments = urlObj.pathname.split('/');
            const bucketIndex = segments.indexOf(STORAGE_BUCKET);
            if (bucketIndex !== -1 && segments[bucketIndex + 1]) {
                return segments.slice(bucketIndex + 1).join('/');
            }
        } catch {
            return null;
        }
        return null;
    };

    const deleteOldImage = async (imageUrl) => {
        const path = getStoragePathFromUrl(imageUrl);
        if (!path) return;
        await supabase.storage.from(STORAGE_BUCKET).remove([path]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!firstname || !lastname) {
            Swal.fire({ icon: "warning", title: "Missing Fields", text: "Please fill in your first and last name.", confirmButtonColor: "#c9a45c" });
            return;
        }
        if (fullAccess && (!tribe || !type)) {
            Swal.fire({ icon: "warning", title: "Missing Fields", text: "Please fill in all required fields.", confirmButtonColor: "#c9a45c" });
            return;
        }

        setLoading(true);

        let imageUrl = previewImage;

        if (imageFile) {
            const finalSizeMB = imageFile.size / (1024 * 1024);
            if (finalSizeMB > MAX_FILE_SIZE_MB) {
                setLoading(false);
                Swal.fire({
                    icon: "error",
                    title: "Image Still Too Large",
                    text: `Compressed image is ${finalSizeMB.toFixed(1)}MB. Max is ${MAX_FILE_SIZE_MB}MB. Please choose a smaller image.`,
                    confirmButtonColor: "#c9a45c"
                });
                return;
            }

            const fileExt = "jpg";
            const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
            const filePath = `leaders/${fileName}`;

            if (originalImageUrl && originalImageUrl.includes(STORAGE_BUCKET)) {
                await deleteOldImage(originalImageUrl);
            }

            const { error: uploadError } = await supabase.storage
                .from(STORAGE_BUCKET)
                .upload(filePath, imageFile);

            if (!uploadError) {
                const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
                imageUrl = data.publicUrl;
            } else {
                console.error("Upload error:", uploadError);
                setLoading(false);
                Swal.fire({ icon: "error", title: "Upload Failed", text: uploadError.message, confirmButtonColor: "#c9a45c" });
                return;
            }
        }

        // ── Auto-generate username if missing ─────────────────────────────
        let finalUsername = username;
        if (!finalUsername && firstname && lastname) {
            finalUsername = generateUsername(firstname, lastname);
            // Check uniqueness
            const { data: existing } = await supabase
                .from("tblMonitoring")
                .select("id")
                .eq("username", finalUsername)
                .neq("id", Number(id))
                .maybeSingle();
            if (existing) {
                finalUsername = `${generateUsername(firstname, lastname).replace('@modernacts.com', '')}${Math.floor(Math.random() * 100)}@modernacts.com`;
            }
        }

        if (!fullAccess) {
            const limitedUpdate = {
                firstname, lastname,
                nickname: nickname || null,
                username: finalUsername,
                pin,
                image_url: imageUrl,
            };
            const { error } = await supabase.from("tblMonitoring").update(limitedUpdate).eq("id", id);
            setLoading(false);
            if (error) {
                Swal.fire({ icon: "error", title: "Update Failed", text: error.message, confirmButtonColor: "#c9a45c" });
            } else {
                Swal.fire({ icon: "success", title: "Profile Updated", text: "Your profile has been updated.", timer: 1800, showConfirmButton: false })
                    .then(() => navigate(`/leader/${id}`));
            }
            return;
        }

        const { data: oldLeaderData } = await supabase
            .from("tblMonitoring")
            .select("combined_with")
            .eq("id", id)
            .single();
        const oldCombinedWith = oldLeaderData?.combined_with || null;

        const updateData = {
            firstname, lastname,
            nickname: nickname || null,
            username: finalUsername,
            pin,
            tribe, type,
            ministries: selectedMinistries,
            ministry: selectedMinistries[0] || "NONE",
            image_url: imageUrl,
            gross_income: grossIncome !== "" ? parseFloat(grossIncome) : null,
            civil_status: civilStatus,
            tithing_type: civilStatus === "Married" ? tithingType : "Individual",
            combined_with: civilStatus === "Married" && tithingType === "Combined" && combinedWith ? parseInt(combinedWith) : null,
            dj_type: selectedMinistries.includes("DISCIPLESHIP JOURNEY") ? djType : null,
            assigned_tribe: selectedMinistries.includes("DISCIPLESHIP JOURNEY") && (djType === "Devotion Checker" || djType === "LifeGroup Checker")
                ? assignedTribe
                : null,
        };

        const { error } = await supabase.from("tblMonitoring").update(updateData).eq("id", id);

        if (!error) {
            const newCombinedWith = updateData.combined_with;
            if (!newCombinedWith || updateData.tithing_type !== "Combined") {
                if (oldCombinedWith && oldCombinedWith !== parseInt(id)) {
                    await supabase.from("tblMonitoring").update({ combined_with: null, tithing_type: "Individual" }).eq("id", oldCombinedWith);
                }
            } else if (newCombinedWith) {
                if (oldCombinedWith && oldCombinedWith !== newCombinedWith) {
                    await supabase.from("tblMonitoring").update({ combined_with: null, tithing_type: "Individual" }).eq("id", oldCombinedWith);
                }
                await supabase.from("tblMonitoring").update({ combined_with: parseInt(id), tithing_type: "Combined", civil_status: "Married" }).eq("id", newCombinedWith);
            }
        }

        setLoading(false);
        if (error) {
            Swal.fire({ icon: "error", title: "Update Failed", text: error.message, confirmButtonColor: "#c9a45c" });
        } else {
            Swal.fire({ icon: "success", title: "Profile Updated", text: `${firstname} ${lastname}'s profile has been updated.`, timer: 1800, showConfirmButton: false })
                .then(() => navigate(`/leader/${id}`));
        }
    };

    const handleDelete = async () => {
        if (deleteInput !== "ADMIN") {
            Swal.fire({ icon: "warning", title: "Wrong Confirmation", text: 'Type "ADMIN" to confirm.', confirmButtonColor: "#c9a45c" });
            return;
        }
        setLoading(true);

        if (originalImageUrl && originalImageUrl.includes(STORAGE_BUCKET)) {
            await deleteOldImage(originalImageUrl);
        }

        const { data: linkedPartner } = await supabase.from("tblMonitoring").select("id").eq("combined_with", id).single();
        if (linkedPartner) {
            await supabase.from("tblMonitoring").update({ combined_with: null, tithing_type: "Individual" }).eq("id", linkedPartner.id);
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

    // Live preview of username
    const previewUsername = firstname && lastname
        ? generateUsername(firstname, lastname)
        : "";

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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid #e5e7eb" }}>
                    <div>
                        <h1 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>{fullAccess ? "Edit Profile" : "My Profile Settings"}</h1>
                        <p style={{ fontSize: "12px", color: "#6b7280", margin: "3px 0 0 0" }}>
                            {fullAccess ? `${firstname} ${lastname} — update leader information` : "Update your name, nickname, password, and photo"}
                        </p>
                    </div>
                    <button onClick={() => navigate(`/leader/${id}`)} style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid #d1d5db", background: "#fff", fontSize: "13px", cursor: "pointer", color: "#374151", fontWeight: 500 }}>
                        ← Back
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "720px" }}>
                    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px", display: "flex", alignItems: "center", gap: "20px" }}>
                        <img src={previewImage || "https://placehold.co/100x100"} alt="Preview" style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", border: "3px solid #c9a45c", flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Profile Photo</p>
                            <input type="file" accept="image/*" onChange={handleImageChange} style={{ fontSize: "12px", color: "#6b7280" }} />
                            <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>JPG, PNG, WEBP accepted. Auto-compressed to ~600px width.</p>
                            {imageFile && (
                                <p style={{ fontSize: "11px", color: "#16a34a", marginTop: "4px", fontWeight: 500 }}>
                                    ✓ Ready: { (imageFile.size / 1024).toFixed(1) }KB
                                    {originalImageUrl && " (old image will be deleted on save)"}
                                </p>
                            )}
                        </div>
                    </div>

                    <Section title="Basic Information">
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                            <Field label="First Name *"><input type="text" value={firstname} onChange={e => setFirstname(e.target.value)} placeholder="First Name" style={inputStyle} /></Field>
                            <Field label="Last Name *"><input type="text" value={lastname} onChange={e => setLastname(e.target.value)} placeholder="Last Name" style={inputStyle} /></Field>
                            <Field label="Nickname"><input type="text" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Nickname (optional)" style={inputStyle} /></Field>
                            <Field label="Change Password"><input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="Enter new password" style={inputStyle} /></Field>
                        </div>

                        {/* Username Display */}
                        <div style={{
                            marginTop: "12px",
                            padding: "12px 16px",
                            background: "rgba(201,164,92,0.06)",
                            borderRadius: "10px",
                            border: "1px solid rgba(201,164,92,0.2)",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px"
                        }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b8934a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                            </svg>
                            <div style={{ flex: 1 }}>
                                <p style={{ margin: 0, fontSize: "11px", color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                    MAC Username
                                </p>
                                <p style={{
                                    margin: "3px 0 0 0",
                                    fontSize: "14px",
                                    fontWeight: 700,
                                    color: "#92400e",
                                    fontFamily: "'SF Mono', 'Courier New', monospace",
                                    letterSpacing: "0.3px"
                                }}>
                                    {username || previewUsername || "Will be auto-generated on save"}
                                </p>
                            </div>
                            {username && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(username);
                                        Swal.fire({ icon: "success", title: "Copied!", text: "Username copied to clipboard", timer: 1200, showConfirmButton: false, toast: true, position: "top-end" });
                                    }}
                                    style={{
                                        background: "none", border: "1px solid #c9a45c", borderRadius: "6px",
                                        padding: "4px 10px", fontSize: "11px", color: "#c9a45c", fontWeight: 700,
                                        cursor: "pointer", display: "flex", alignItems: "center", gap: "4px"
                                    }}
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                    Copy
                                </button>
                            )}
                        </div>

                        {fullAccess && (
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
                        )}
                    </Section>

                    {fullAccess && (
                        <Section title="Ministry Assignments">
                            <MultiSelect label="Assigned Ministries" options={ministries} selected={selectedMinistries} onChange={setSelectedMinistries} placeholder="Select one or more ministries..." />
                            {showDjOptions && (
                                <div style={{ marginTop: "14px", padding: "16px", background: "rgba(201, 164, 92, 0.06)", borderRadius: "10px", border: "1px solid rgba(201, 164, 92, 0.25)" }}>
                                    <p style={{ fontSize: "12px", fontWeight: 700, color: "#92400e", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Discipleship Journey Configuration</p>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                                        <Field label="DJ Type">
                                            <select value={djType} onChange={e => setDjType(e.target.value)} style={inputStyle}>
                                                <option value="">Select DJ Type</option>
                                                {djTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </Field>
                                        {(djType === "Devotion Checker" || djType === "LifeGroup Checker") && (
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
                    )}

                    {fullAccess && (
                        <Section title="Financial Information">
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                                <Field label="Civil Status">
                                    <select value={civilStatus} onChange={e => setCivilStatus(e.target.value)} style={inputStyle}>
                                        {civilStatusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </Field>
                                <Field label="Gross Income (optional)">
                                    <input type="number" value={grossIncome} onChange={e => setGrossIncome(e.target.value)} placeholder="Monthly gross income" min="0" style={inputStyle} />
                                </Field>
                            </div>
                            {showTithingOptions && (
                                <div style={{ marginTop: "14px", padding: "16px", background: "rgba(22, 163, 74, 0.06)", borderRadius: "10px", border: "1px solid rgba(22, 163, 74, 0.2)" }}>
                                    <p style={{ fontSize: "12px", fontWeight: 700, color: "#166534", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Tithing Configuration</p>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                                        <Field label="Tithing Type">
                                            <select value={tithingType} onChange={e => setTithingType(e.target.value)} style={inputStyle}>
                                                {tithingTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </Field>
                                        {tithingType === "Combined" && (
                                            <Field label="Combined With">
                                                {availableLeaders.length === 0 ? (
                                                    <p style={{ fontSize: "12px", color: "#9ca3af", padding: "10px 0" }}>Loading married leaders...</p>
                                                ) : (
                                                    <select value={combinedWith} onChange={e => setCombinedWith(e.target.value)} style={inputStyle}>
                                                        <option value="">— Select Spouse —</option>
                                                        {availableLeaders.map(leader => (
                                                            <option key={leader.id} value={String(leader.id)}>{leader.firstname} {leader.lastname}</option>
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
                    )}

                    <button type="submit" disabled={loading} style={{ padding: "13px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #c9a45c 0%, #b8934a 100%)", color: "#fff", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, transition: "all 0.2s" }}>
                        {loading ? "Saving..." : "Save Changes"}
                    </button>
                </form>

                {fullAccess && (
                    <div style={{ marginTop: "40px", maxWidth: "720px", padding: "20px", borderRadius: "12px", border: "1px solid rgba(220, 38, 38, 0.2)", background: "#fff" }}>
                        <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#dc2626", marginBottom: "6px" }}>Danger Zone</h3>
                        <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "14px" }}>Permanently delete this account and all associated records. This cannot be undone.</p>
                        <button type="button" onClick={() => setShowDeleteModal(true)} style={{ padding: "8px 18px", borderRadius: "8px", border: "1px solid #dc2626", background: "#fef2f2", color: "#dc2626", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Delete Account</button>
                    </div>
                )}
            </div>

            {fullAccess && showDeleteModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}
                    onClick={e => { if (e.target === e.currentTarget) { setShowDeleteModal(false); setDeleteInput(""); } }}>
                    <div style={{ background: "#fff", borderRadius: "14px", padding: "24px", width: "100%", maxWidth: "420px", boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }}>
                        <h2 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px", color: "#111827" }}>Confirm Deletion</h2>
                        <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "16px", lineHeight: 1.6 }}>
                            This will permanently delete <strong>{firstname} {lastname}</strong> and all their records.<br /><br />Type <strong>ADMIN</strong> to confirm.
                        </p>
                        <input type="text" placeholder="Type ADMIN to confirm" value={deleteInput} onChange={e => setDeleteInput(e.target.value)} style={{ ...inputStyle, marginBottom: "14px", borderColor: "#dc2626" }} />
                        <div style={{ display: "flex", gap: "10px" }}>
                            <button type="button" onClick={() => { setShowDeleteModal(false); setDeleteInput(""); }} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", background: "#fff", fontSize: "13px", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                            <button type="button" onClick={handleDelete} disabled={loading || deleteInput !== "ADMIN"} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: deleteInput === "ADMIN" ? "#dc2626" : "#f3f4f6", color: deleteInput === "ADMIN" ? "#fff" : "#9ca3af", fontSize: "13px", cursor: deleteInput === "ADMIN" ? "pointer" : "not-allowed", fontWeight: 700, transition: "all 0.2s" }}>
                                {loading ? "Deleting..." : "Confirm Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", color: "#9ca3af", marginBottom: "14px" }}>{title}</p>
            {children}
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#374151", textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</label>
            {children}
        </div>
    );
}

const inputStyle = {
    width: "100%", padding: "9px 12px", fontSize: "13px", borderRadius: "8px",
    border: "1px solid #d1d5db", background: "#f9fafb", color: "#111827",
    outline: "none", boxSizing: "border-box", transition: "border-color 0.2s"
};

export default EditLeader;