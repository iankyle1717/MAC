import { useState, useEffect } from "react";
import { tribes, leaderTypes, ministries, schoolingClasses, civilStatusOptions, tithingTypes, djTypes } from "../constants/options";
import { supabase } from "../lib/supabase";
import MultiSelect from "./MultiSelect";

function LeaderForm({ refreshLeaders, newcomer }) {
    const [firstname, setFirstname] = useState("");
    const [lastname, setLastname] = useState("");
    const [nickname, setNickname] = useState("");
    const [pin, setPin] = useState("");
    const [tribe, setTribe] = useState("");
    const [type, setType] = useState("");
    const [selectedMinistries, setSelectedMinistries] = useState([]);
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // New fields
    const [grossIncome, setGrossIncome] = useState("");
    const [civilStatus, setCivilStatus] = useState("Single");
    const [tithingType, setTithingType] = useState("Individual");
    const [combinedWith, setCombinedWith] = useState("");
    const [djType, setDjType] = useState("");
    const [assignedTribe, setAssignedTribe] = useState("");
    
    // Available leaders for "Combined With" dropdown
    const [availableLeaders, setAvailableLeaders] = useState([]);

    /* AUTO FILL FROM NEWCOMER */
    useEffect(() => {
        if (newcomer) {
            setFirstname(newcomer.firstname || "");
            setLastname(newcomer.lastname || "");
            setTribe(newcomer.tribe || "");
            setType("MEMBER");
            setSelectedMinistries(["FOUNDATION CLASS"]);
        }
    }, [newcomer]);

    // Fetch leaders for "Combined With" dropdown
    useEffect(() => {
        if (civilStatus === "Married" && tithingType === "Combined") {
            fetchAvailableLeaders();
        }
    }, [civilStatus, tithingType]);

    const fetchAvailableLeaders = async () => {
        const { data } = await supabase
            .from("tblMonitoring")
            .select("id, firstname, lastname")
            .eq("civil_status", "Married")
            .neq("id", newcomer?.id || 0);
        setAvailableLeaders(data || []);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!firstname || !lastname || !tribe || !type || !pin) {
            alert("Complete all required fields.");
            return;
        }

        setLoading(true);

        let imageUrl = "";

        /* UPLOAD IMAGE */
        if (image) {
            const fileExt = image.name.split(".").pop();
            const fileName = `${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase
                .storage
                .from("leader-images")
                .upload(fileName, image);

            if (uploadError) {
                alert(uploadError.message);
                setLoading(false);
                return;
            }

            const { data } = supabase
                .storage
                .from("leader-images")
                .getPublicUrl(fileName);

            imageUrl = data.publicUrl;
        }

        /* INSERT MEMBER */
        const insertData = {
            firstname,
            lastname,
            nickname: nickname || null,
            tribe,
            type,
            pin,
            ministries: selectedMinistries, // Array for multiple ministries
            image_url: imageUrl,
            gross_income: grossIncome ? parseFloat(grossIncome) : null,
            civil_status: civilStatus,
            tithing_type: civilStatus === "Married" ? tithingType : "Individual",
            combined_with: civilStatus === "Married" && tithingType === "Combined" ? combinedWith : null,
            dj_type: selectedMinistries.includes("DISCIPLESHIP JOURNEY") ? djType : null,
            assigned_tribe: selectedMinistries.includes("DISCIPLESHIP JOURNEY") && djType === "Devotion Checker" ? assignedTribe : null
        };

        const { error } = await supabase
            .from("tblMonitoring")
            .insert([insertData]);

        if (error) {
            console.log(error);
            alert("Failed to add leader.");
            setLoading(false);
            return;
        }

        /* DELETE FROM NEWCOMERS */
        if (newcomer?.id) {
            await supabase
                .from("tblNewMembers")
                .delete()
                .eq("id", newcomer.id);
        }

        alert("Leader added successfully.");

        /* RESET */
        setFirstname("");
        setLastname("");
        setNickname("");
        setPin("");
        setTribe("");
        setType("");
        setSelectedMinistries([]);
        setImage(null);
        setGrossIncome("");
        setCivilStatus("Single");
        setTithingType("Individual");
        setCombinedWith("");
        setDjType("");
        setAssignedTribe("");

        refreshLeaders();
        setLoading(false);
    };

    const showDjOptions = selectedMinistries.includes("DISCIPLESHIP JOURNEY");
    const showTithingOptions = civilStatus === "Married";

    return (
        <form className="leader-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                <input
                    type="text"
                    placeholder="First Name *"
                    value={firstname}
                    onChange={(e) => setFirstname(e.target.value)}
                    style={{ padding: "10px 12px", fontSize: "13px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                />

                <input
                    type="text"
                    placeholder="Last Name *"
                    value={lastname}
                    onChange={(e) => setLastname(e.target.value)}
                    style={{ padding: "10px 12px", fontSize: "13px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                />

                <input
                    type="text"
                    placeholder="Nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    style={{ padding: "10px 12px", fontSize: "13px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                />

                <input
                    type="password"
                    placeholder="Set PIN *"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    style={{ padding: "10px 12px", fontSize: "13px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                <select 
                    value={tribe} 
                    onChange={(e) => setTribe(e.target.value)}
                    style={{ padding: "10px 12px", fontSize: "13px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                >
                    <option value="">Select Tribe *</option>
                    {tribes.map((tribe) => (
                        <option key={tribe} value={tribe}>
                            {tribe}
                        </option>
                    ))}
                </select>

                <select 
                    value={type} 
                    onChange={(e) => setType(e.target.value)}
                    style={{ padding: "10px 12px", fontSize: "13px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                >
                    <option value="">Select Leader Type *</option>
                    {leaderTypes.map((type) => (
                        <option key={type} value={type}>
                            {type}
                        </option>
                    ))}
                </select>

                <select
                    value={civilStatus}
                    onChange={(e) => setCivilStatus(e.target.value)}
                    style={{ padding: "10px 12px", fontSize: "13px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                >
                    <option value="">Civil Status</option>
                    {civilStatusOptions.map((status) => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>

                <input
                    type="number"
                    placeholder="Gross Income (optional)"
                    value={grossIncome}
                    onChange={(e) => setGrossIncome(e.target.value)}
                    style={{ padding: "10px 12px", fontSize: "13px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                />
            </div>

            {/* MULTI-SELECT MINISTRIES */}
            <MultiSelect
                label="Ministries"
                options={ministries}
                selected={selectedMinistries}
                onChange={setSelectedMinistries}
                placeholder="Select ministries..."
            />

            {/* DJ TYPE - Only show if Discipleship Journey is selected */}
            {showDjOptions && (
                <div style={{ 
                    padding: "16px", 
                    background: "rgba(201, 164, 92, 0.06)", 
                    borderRadius: "10px",
                    border: "1px solid rgba(201, 164, 92, 0.2)"
                }}>
                    <h4 style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#92400e", fontWeight: 700 }}>
                        Discipleship Journey Configuration
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                        <select
                            value={djType}
                            onChange={(e) => setDjType(e.target.value)}
                            style={{ padding: "10px 12px", fontSize: "13px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                        >
                            <option value="">Select DJ Type</option>
                            {djTypes.map((type) => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>

                        {djType === "Devotion Checker" && (
                            <select
                                value={assignedTribe}
                                onChange={(e) => setAssignedTribe(e.target.value)}
                                style={{ padding: "10px 12px", fontSize: "13px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                            >
                                <option value="">Assigned Tribe</option>
                                {tribes.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>
            )}

            {/* TITHING TYPE - Only show if Married */}
            {showTithingOptions && (
                <div style={{ 
                    padding: "16px", 
                    background: "rgba(22, 163, 74, 0.06)", 
                    borderRadius: "10px",
                    border: "1px solid rgba(22, 163, 74, 0.2)"
                }}>
                    <h4 style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#166534", fontWeight: 700 }}>
                        Tithing Configuration
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                        <select
                            value={tithingType}
                            onChange={(e) => setTithingType(e.target.value)}
                            style={{ padding: "10px 12px", fontSize: "13px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                        >
                            <option value="">Tithing Type</option>
                            {tithingTypes.map((type) => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>

                        {tithingType === "Combined" && (
                            <select
                                value={combinedWith}
                                onChange={(e) => setCombinedWith(e.target.value)}
                                style={{ padding: "10px 12px", fontSize: "13px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                            >
                                <option value="">Combined With</option>
                                {availableLeaders.map((leader) => (
                                    <option key={leader.id} value={leader.id}>
                                        {leader.firstname} {leader.lastname}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>
            )}

            <input
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files[0])}
                style={{ padding: "8px 0", fontSize: "13px" }}
            />

            <button 
                type="submit"
                style={{
                    padding: "12px",
                    borderRadius: "10px",
                    border: "none",
                    background: "linear-gradient(135deg, #c9a45c 0%, #b8934a 100%)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "14px",
                    cursor: "pointer",
                    marginTop: "4px"
                }}
            >
                {loading ? "Adding..." : "Add Leader"}
            </button>
        </form>
    );
}

export default LeaderForm;