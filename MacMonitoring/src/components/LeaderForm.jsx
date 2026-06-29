import { useState } from "react";
import { supabase } from "../lib/supabase";
import { tribes, leaderTypes, ministries, civilStatusOptions, tithingTypes, djTypes } from "../constants/options";
import Swal from "sweetalert2";

// ── BUCKET CONFIG ───────────────────────────────────────────────────────────
const STORAGE_BUCKET = "leader-images";
const MAX_FILE_SIZE_MB = 5;
const TARGET_WIDTH = 600;
const TARGET_QUALITY = 0.8;
const TARGET_FORMAT = "image/jpeg";

function LeaderForm({ refreshLeaders, newcomer }) {
    const [loading, setLoading] = useState(false);
    const [imageFile, setImageFile] = useState(null);
    const [previewImage, setPreviewImage] = useState("");

    const [firstname, setFirstname] = useState(newcomer?.firstname || "");
    const [lastname, setLastname] = useState(newcomer?.lastname || "");
    const [nickname, setNickname] = useState("");
    const [pin, setPin] = useState("");
    const [tribe, setTribe] = useState(newcomer?.tribe || "");
    const [type, setType] = useState("MEMBER");
    const [selectedMinistries, setSelectedMinistries] = useState([]);
    const [grossIncome, setGrossIncome] = useState("");
    const [civilStatus, setCivilStatus] = useState("Single");
    const [tithingType, setTithingType] = useState("Individual");
    const [combinedWith, setCombinedWith] = useState("");
    const [djType, setDjType] = useState("");
    const [assignedTribe, setAssignedTribe] = useState("");
    const [availableLeaders, setAvailableLeaders] = useState([]);

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
            Swal.fire({
                icon: "warning",
                title: "Invalid File",
                text: "Please select an image file (JPG, PNG, WEBP).",
                confirmButtonColor: "#c9a45c"
            });
            e.target.value = "";
            return;
        }

        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB > MAX_FILE_SIZE_MB) {
            Swal.fire({
                icon: "warning",
                title: "File Too Large",
                text: `Image is ${sizeMB.toFixed(1)}MB. It will be auto-compressed before upload.`,
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
            Swal.fire({
                icon: "info",
                title: "Compression Failed",
                text: "Using original file. Upload may fail if too large.",
                confirmButtonColor: "#c9a45c"
            });
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

    const deleteImageFromStorage = async (imageUrl) => {
        const path = getStoragePathFromUrl(imageUrl);
        if (!path) return;
        await supabase.storage.from(STORAGE_BUCKET).remove([path]);
    };

    const fetchMarriedLeaders = async () => {
        const { data } = await supabase
            .from("tblMonitoring")
            .select("id, firstname, lastname")
            .eq("civil_status", "Married");
        setAvailableLeaders(data || []);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!firstname || !lastname || !tribe || !type) {
            Swal.fire({
                icon: "warning",
                title: "Missing Fields",
                text: "Please fill in all required fields (First Name, Last Name, Tribe, Type).",
                confirmButtonColor: "#c9a45c"
            });
            return;
        }

        setLoading(true);

        let imageUrl = "";

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

            const { error: uploadError } = await supabase.storage
                .from(STORAGE_BUCKET)
                .upload(filePath, imageFile);

            if (!uploadError) {
                const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
                imageUrl = data.publicUrl;
            } else {
                console.error("Upload error:", uploadError);
                setLoading(false);
                Swal.fire({
                    icon: "error",
                    title: "Image Upload Failed",
                    text: uploadError.message,
                    confirmButtonColor: "#c9a45c"
                });
                return;
            }
        }

        const insertData = {
            firstname,
            lastname,
            nickname: nickname || null,
            pin: pin || null,
            tribe,
            type,
            ministries: selectedMinistries,
            ministry: selectedMinistries[0] || "NONE",
            image_url: imageUrl || null,
            gross_income: grossIncome !== "" ? parseFloat(grossIncome) : null,
            civil_status: civilStatus,
            tithing_type: civilStatus === "Married" ? tithingType : "Individual",
            combined_with: civilStatus === "Married" && tithingType === "Combined" && combinedWith
                ? parseInt(combinedWith)
                : null,
            dj_type: selectedMinistries.includes("DISCIPLESHIP JOURNEY") ? djType : null,
            assigned_tribe: selectedMinistries.includes("DISCIPLESHIP JOURNEY") && (djType === "Devotion Checker" || djType === "LifeGroup Checker")
                ? assignedTribe
                : null,
            ...(newcomer?.remarks && { remarks: newcomer.remarks }),
            ...(newcomer?.invited_by && { invited_by: newcomer.invited_by }),
        };

        const { data: newLeader, error } = await supabase
            .from("tblMonitoring")
            .insert(insertData)
            .select()
            .single();

        if (!error && newLeader && insertData.combined_with) {
            await supabase.from("tblMonitoring").update({
                combined_with: newLeader.id,
                tithing_type: "Combined",
                civil_status: "Married"
            }).eq("id", insertData.combined_with);
        }

        if (!error && newcomer?.id) {
            await supabase.from("tblNewMembers").delete().eq("id", newcomer.id);
        }

        setLoading(false);

        if (error) {
            if (imageUrl) {
                await deleteImageFromStorage(imageUrl);
            }
            console.error("Insert error:", error);
            Swal.fire({
                icon: "error",
                title: "Failed to Add Leader",
                text: error.message,
                confirmButtonColor: "#c9a45c"
            });
        } else {
            Swal.fire({
                icon: "success",
                title: "Leader Added",
                text: `${firstname} ${lastname} has been added successfully.`,
                timer: 1800,
                showConfirmButton: false,
            }).then(() => {
                refreshLeaders();
                setFirstname("");
                setLastname("");
                setNickname("");
                setPin("");
                setTribe("");
                setType("MEMBER");
                setSelectedMinistries([]);
                setGrossIncome("");
                setCivilStatus("Single");
                setTithingType("Individual");
                setCombinedWith("");
                setDjType("");
                setAssignedTribe("");
                setImageFile(null);
                setPreviewImage("");
                setAvailableLeaders([]);
            });
        }
    };

    const showDjOptions = selectedMinistries.includes("DISCIPLESHIP JOURNEY");
    const showTithingOptions = civilStatus === "Married";

    return (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                gap: "16px"
            }}>
                <img
                    src={previewImage || "https://placehold.co/100x100/e5e7eb/9ca3af?text=No+Photo"}
                    alt="Preview"
                    style={{
                        width: "72px",
                        height: "72px",
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "2px solid #c9a45c",
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
                    <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>
                        JPG, PNG, WEBP accepted. Auto-compressed to ~600px width.
                    </p>
                    {imageFile && (
                        <p style={{ fontSize: "11px", color: "#16a34a", marginTop: "4px", fontWeight: 500 }}>
                            ✓ Ready: {(imageFile.size / 1024).toFixed(1)}KB
                        </p>
                    )}
                </div>
            </div>

            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", color: "#9ca3af", marginBottom: "12px" }}>
                    Basic Information
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                    <Field label="First Name *">
                        <input type="text" value={firstname} onChange={e => setFirstname(e.target.value)} placeholder="First Name" style={inputStyle} />
                    </Field>
                    <Field label="Last Name *">
                        <input type="text" value={lastname} onChange={e => setLastname(e.target.value)} placeholder="Last Name" style={inputStyle} />
                    </Field>
                    <Field label="Nickname">
                        <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Nickname (optional)" style={inputStyle} />
                    </Field>
                    <Field label="PIN">
                        <input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="Set PIN" style={inputStyle} />
                    </Field>
                    <Field label="Tribe *">
                        <select value={tribe} onChange={e => setTribe(e.target.value)} style={inputStyle}>
                            <option value="">Select Tribe</option>
                            {tribes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </Field>
                    <Field label="Leader Type *">
                        <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
                            <option value="MEMBER">MEMBER</option>
                            {leaderTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </Field>
                </div>
            </div>

            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", color: "#9ca3af", marginBottom: "12px" }}>
                    Ministry Assignments
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {ministries.map((ministry) => (
                        <label key={ministry} style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 12px",
                            borderRadius: "8px",
                            border: selectedMinistries.includes(ministry) ? "1px solid #c9a45c" : "1px solid #e5e7eb",
                            background: selectedMinistries.includes(ministry) ? "rgba(201, 164, 92, 0.08)" : "#fff",
                            cursor: "pointer",
                            fontSize: "12px",
                            color: selectedMinistries.includes(ministry) ? "#92400e" : "#374151",
                            fontWeight: selectedMinistries.includes(ministry) ? 600 : 400,
                            transition: "all 0.2s"
                        }}>
                            <input
                                type="checkbox"
                                checked={selectedMinistries.includes(ministry)}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setSelectedMinistries([...selectedMinistries, ministry]);
                                    } else {
                                        setSelectedMinistries(selectedMinistries.filter(m => m !== ministry));
                                    }
                                }}
                                style={{ accentColor: "#c9a45c" }}
                            />
                            {ministry}
                        </label>
                    ))}
                </div>

                {showDjOptions && (
                    <div style={{
                        marginTop: "14px",
                        padding: "14px",
                        background: "rgba(201, 164, 92, 0.06)",
                        borderRadius: "10px",
                        border: "1px solid rgba(201, 164, 92, 0.25)"
                    }}>
                        <p style={{ fontSize: "12px", fontWeight: 700, color: "#92400e", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            Discipleship Journey Configuration
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
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
            </div>

            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", color: "#9ca3af", marginBottom: "12px" }}>
                    Financial Information
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                    <Field label="Civil Status">
                        <select value={civilStatus} onChange={e => { setCivilStatus(e.target.value); if (e.target.value === "Married") fetchMarriedLeaders(); }} style={inputStyle}>
                            {civilStatusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </Field>
                    <Field label="Gross Income (optional)">
                        <input type="number" value={grossIncome} onChange={e => setGrossIncome(e.target.value)} placeholder="Monthly gross income" min="0" style={inputStyle} />
                    </Field>
                </div>

                {showTithingOptions && (
                    <div style={{
                        marginTop: "14px",
                        padding: "14px",
                        background: "rgba(22, 163, 74, 0.06)",
                        borderRadius: "10px",
                        border: "1px solid rgba(22, 163, 74, 0.2)"
                    }}>
                        <p style={{ fontSize: "12px", fontWeight: 700, color: "#166534", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            Tithing Configuration
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
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
            </div>

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
                {loading ? "Adding Leader..." : "Add Leader"}
            </button>
        </form>
    );
}

function Field({ label, children }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#374151", textTransform: "uppercase", letterSpacing: "0.4px" }}>
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

export default LeaderForm;