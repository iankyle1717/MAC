import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
    tribes,
    allNewcomerStages,
    getNextStage,
    isReadyForConversion,
    soulWinningStages,
    soakingStages,
    schoolingStages,
    consoStages,
    getStageCategory
} from "../constants/options";
import { isAdmin, isUshering, canConvertNewcomer } from "../utils/auth";

function Assimilation() {
    const navigate = useNavigate();
    const [members, setMembers] = useState([]);
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [firstname, setFirstname] = useState("");
    const [lastname, setLastname] = useState("");
    const [tribe, setTribe] = useState("");
    const [remarks, setRemarks] = useState("1st Timer");
    const [invitedBy, setInvitedBy] = useState("");
    const [search, setSearch] = useState("");
    const [filterTribe, setFilterTribe] = useState("ALL");
    const [filterStage, setFilterStage] = useState("ALL");

    // Permission flags
    const admin = isAdmin();
    const ushering = isUshering();
    const canAdd = admin || ushering;
    const canConvert = canConvertNewcomer();

    useEffect(() => {
        fetchMembers();
        fetchLeaders();
    }, []);

    const fetchMembers = async () => {
        setLoading(true);
        const { data } = await supabase
            .from("tblNewMembers")
            .select("*")
            .order("id", { ascending: false });
        setMembers(data || []);
        setLoading(false);
    };

    const fetchLeaders = async () => {
        const { data } = await supabase
            .from("tblMonitoring")
            .select("*")
            .order("firstname", { ascending: true });
        setLeaders(data || []);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!firstname || !lastname || !tribe) {
            alert("Complete all fields.");
            return;
        }

        const { error } = await supabase
            .from("tblNewMembers")
            .insert([{
                firstname,
                lastname,
                tribe,
                remarks,
                invited_by: invitedBy
            }]);

        if (error) {
            console.log(error);
            alert("Failed to add newcomer.");
        } else {
            alert("Newcomer added successfully.");
            setFirstname("");
            setLastname("");
            setTribe("");
            setRemarks("1st Timer");
            setInvitedBy("");
            fetchMembers();
            setShowForm(false);
        }
    };

    const updateRemarks = async (id, currentRemark) => {
        const nextRemark = getNextStage(currentRemark);
        
        if (!nextRemark) {
            alert("This newcomer has completed all stages!");
            return;
        }

        await supabase
            .from("tblNewMembers")
            .update({ remarks: nextRemark })
            .eq("id", id);

        fetchMembers();
    };

    // Filter helpers
    const countByStage = (stageList) => members.filter((m) => stageList.includes(m.remarks)).length;
    const countByExactStage = (stage) => members.filter((m) => m.remarks === stage).length;

    // Apply all filters
    const filteredMembers = members.filter((member) => {
        const fullName = `${member.firstname} ${member.lastname}`.toLowerCase();
        const matchesSearch = fullName.includes(search.toLowerCase());
        const matchesTribe = filterTribe === "ALL" ? true : member.tribe === filterTribe;
        
        // Stage filter: by category or specific stage
        let matchesStage = true;
        if (filterStage !== "ALL") {
            if (filterStage === "CONSO") {
                matchesStage = consoStages.includes(member.remarks);
            } else if (filterStage === "SOUL WINNING") {
                matchesStage = soulWinningStages.includes(member.remarks);
            } else if (filterStage === "SOAKING") {
                matchesStage = soakingStages.includes(member.remarks);
            } else if (filterStage === "SCHOOLING") {
                matchesStage = schoolingStages.includes(member.remarks);
            } else if (filterStage === "READY") {
                matchesStage = isReadyForConversion(member.remarks);
            } else {
                matchesStage = member.remarks === filterStage;
            }
        }
        
        return matchesSearch && matchesTribe && matchesStage;
    });

    const filteredLeaders = leaders.filter((leader) => leader.tribe === tribe);

    // Get stage color for badge
    const getStageColor = (stage) => {
        const category = getStageCategory(stage);
        switch (category) {
            case "CONSO": return "#dbeafe";
            case "SOUL WINNING": return "#dcfce7";
            case "SOAKING": return "#fef3c7";
            case "SCHOOLING": return "#fce7f3";
            default: return "#f3f4f6";
        }
    };

    const getStageTextColor = (stage) => {
        const category = getStageCategory(stage);
        switch (category) {
            case "CONSO": return "#1e40af";
            case "SOUL WINNING": return "#166534";
            case "SOAKING": return "#92400e";
            case "SCHOOLING": return "#9d174d";
            default: return "#374151";
        }
    };

    // Quick filter by clicking a stats card
    const handleQuickFilter = (category) => {
        setFilterStage(category);
    };

    return (
        <div className="layout">
            <Sidebar />
            <div className="content">
                <h1>Assimilation</h1>
                <p style={{ opacity: 0.7, marginBottom: "20px" }}>
                    Monitor visitors, invites, and newcomers.
                </p>

                {/* STATS CARDS - Clickable filters */}
                <div
                    className="stats-grid"
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
                        gap: "15px",
                        marginBottom: "30px"
                    }}
                >
                    <div 
                        className="record-card" 
                        onClick={() => handleQuickFilter("CONSO")}
                        style={{ cursor: "pointer", border: filterStage === "CONSO" ? "2px solid #3b82f6" : "none" }}
                    >
                        <h3>Conso</h3>
                        <h1>{countByStage(consoStages)}</h1>
                    </div>

                    <div 
                        className="record-card"
                        onClick={() => handleQuickFilter("SOUL WINNING")}
                        style={{ cursor: "pointer", border: filterStage === "SOUL WINNING" ? "2px solid #22c55e" : "none" }}
                    >
                        <h3>Soul Winning</h3>
                        <h1>{countByStage(soulWinningStages)}</h1>
                        <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>
                            {soulWinningStages.slice(0, 3).map(s => `${s.split(" - ")[1] || s}: ${countByExactStage(s)}`).join(" | ")}
                        </p>
                    </div>

                    <div 
                        className="record-card"
                        onClick={() => handleQuickFilter("SOAKING")}
                        style={{ cursor: "pointer", border: filterStage === "SOAKING" ? "2px solid #f59e0b" : "none" }}
                    >
                        <h3>Soaking</h3>
                        <h1>{countByStage(soakingStages)}</h1>
                        <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>
                            Candidate LR: {countByExactStage("Candidate for Life Retreat")}
                        </p>
                    </div>

                    <div 
                        className="record-card" 
                        onClick={() => handleQuickFilter("Candidate for Life Retreat")}
                        style={{ 
                            cursor: "pointer", 
                            border: filterStage === "Candidate for Life Retreat" ? "3px solid #c9a45c" : "2px solid #c9a45c",
                            background: filterStage === "Candidate for Life Retreat" ? "#fefce8" : "white"
                        }}
                    >
                        <h3>🎯 Candidates for LR</h3>
                        <h1>{countByExactStage("Candidate for Life Retreat")}</h1>
                    </div>

                    <div 
                        className="record-card"
                        onClick={() => handleQuickFilter("SCHOOLING")}
                        style={{ cursor: "pointer", border: filterStage === "SCHOOLING" ? "2px solid #ec4899" : "none" }}
                    >
                        <h3>Schooling</h3>
                        <h1>{countByStage(schoolingStages)}</h1>
                        <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>
                            {schoolingStages.map(s => `${s.replace(" Class", "")}: ${countByExactStage(s)}`).join(" | ")}
                        </p>
                    </div>

                    <div 
                        className="record-card"
                        onClick={() => handleQuickFilter("READY")}
                        style={{ 
                            cursor: "pointer", 
                            background: "#ecfdf5",
                            border: filterStage === "READY" ? "2px solid #16a34a" : "none"
                        }}
                    >
                        <h3>Ready to Convert</h3>
                        <h1 style={{ color: "#16a34a" }}>{countByExactStage("Life Group Class")}</h1>
                    </div>
                </div>

                {/* ADD NEWCOMER BUTTON - ONLY ADMIN & USHERING */}
                {canAdd && (
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "20px"
                        }}
                    >
                        <h2>Newcomer Registration</h2>
                        <button
                            onClick={() => setShowForm(!showForm)}
                            style={{
                                background: showForm ? "#dc2626" : "#16a34a"
                            }}
                        >
                            {showForm ? "Close Form" : "Add Newcomer"}
                        </button>
                    </div>
                )}

                {/* FORM - ONLY ADMIN & USHERING */}
                {canAdd && showForm && (
                    <form className="leader-form" onSubmit={handleSubmit}>
                        <input
                            type="text"
                            placeholder="First Name"
                            value={firstname}
                            onChange={(e) => setFirstname(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Last Name"
                            value={lastname}
                            onChange={(e) => setLastname(e.target.value)}
                        />

                        <select
                            value={tribe}
                            onChange={(e) => {
                                setTribe(e.target.value);
                                setInvitedBy("");
                            }}
                        >
                            <option value="">Select Tribe</option>
                            {tribes.map((tribe) => (
                                <option key={tribe} value={tribe}>
                                    {tribe}
                                </option>
                            ))}
                        </select>

                        <select
                            value={invitedBy}
                            onChange={(e) => setInvitedBy(e.target.value)}
                        >
                            <option value="">Select Inviter</option>
                            {filteredLeaders.map((leader) => (
                                <option key={leader.id} value={`${leader.firstname} ${leader.lastname}`}>
                                    {leader.firstname} {leader.lastname}
                                </option>
                            ))}
                        </select>

                        <select
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                        >
                            {allNewcomerStages.map((stage) => (
                                <option key={stage} value={stage}>
                                    {stage}
                                </option>
                            ))}
                        </select>

                        <button type="submit">Add Newcomer</button>
                    </form>
                )}

                {/* SEARCH & FILTER BAR */}
                <div
                    style={{
                        display: "flex",
                        gap: "15px",
                        marginTop: canAdd ? "30px" : "0",
                        marginBottom: "20px",
                        flexWrap: "wrap",
                        alignItems: "center"
                    }}
                >
                    <input
                        type="text"
                        placeholder="Search newcomer..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ flex: 1, minWidth: "200px" }}
                    />
                    
                    <select
                        value={filterTribe}
                        onChange={(e) => setFilterTribe(e.target.value)}
                        style={{ width: "160px" }}
                    >
                        <option value="ALL">All Tribes</option>
                        {tribes.map((tribe) => (
                            <option key={tribe} value={tribe}>
                                {tribe}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filterStage}
                        onChange={(e) => setFilterStage(e.target.value)}
                        style={{ width: "200px" }}
                    >
                        <option value="ALL">All Stages</option>
                        <optgroup label="By Category">
                            <option value="CONSO">Conso (1st-3rd Timer)</option>
                            <option value="SOUL WINNING">Soul Winning</option>
                            <option value="SOAKING">Soaking</option>
                            <option value="SCHOOLING">Schooling</option>
                            <option value="READY">Ready to Convert</option>
                        </optgroup>
                        <optgroup label="By Specific Stage">
                            {allNewcomerStages.map((stage) => (
                                <option key={stage} value={stage}>
                                    {stage}
                                </option>
                            ))}
                        </optgroup>
                    </select>

                    {filterStage !== "ALL" && (
                        <button
                            onClick={() => setFilterStage("ALL")}
                            style={{
                                padding: "8px 16px",
                                borderRadius: "8px",
                                border: "1px solid #d1d5db",
                                background: "#f3f4f6",
                                cursor: "pointer",
                                fontSize: "13px"
                            }}
                        >
                            Clear Filter
                        </button>
                    )}
                </div>

                {/* ACTIVE FILTER INDICATOR */}
                {filterStage !== "ALL" && (
                    <div style={{ marginBottom: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "14px", color: "#6b7280" }}>
                            Showing:
                        </span>
                        <span
                            style={{
                                padding: "4px 12px",
                                borderRadius: "20px",
                                background: getStageColor(filterStage === "READY" ? "Life Group Class" : filterStage),
                                color: getStageTextColor(filterStage === "READY" ? "Life Group Class" : filterStage),
                                fontSize: "13px",
                                fontWeight: "600"
                            }}
                        >
                            {filterStage === "READY" ? "Ready to Convert" : filterStage}
                        </span>
                        <span style={{ fontSize: "14px", color: "#6b7280" }}>
                            ({filteredMembers.length} results)
                        </span>
                    </div>
                )}

                {/* TABLE */}
                <div className="excel-card" style={{ marginTop: "10px" }}>
                    <div className="excel-header">
                        <h2>Newcomers List</h2>
                    </div>
                    <div className="excel-wrapper">
                        <table className="excel-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Tribe</th>
                                    <th>Invited By</th>
                                    <th>Stage</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="5">Loading...</td>
                                    </tr>
                                ) : filteredMembers.length === 0 ? (
                                    <tr>
                                        <td colSpan="5">No newcomers found.</td>
                                    </tr>
                                ) : (
                                    filteredMembers.map((member) => (
                                        <tr key={member.id}>
                                            <td>{member.firstname} {member.lastname}</td>
                                            <td>{member.tribe}</td>
                                            <td>{member.invited_by}</td>
                                            <td>
                                                <span
                                                    style={{
                                                        padding: "6px 12px",
                                                        borderRadius: "20px",
                                                        background: getStageColor(member.remarks),
                                                        color: getStageTextColor(member.remarks),
                                                        fontSize: "13px",
                                                        fontWeight: "600"
                                                    }}
                                                >
                                                    {member.remarks}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: "flex", gap: "10px" }}>
                                                    {canAdd && !isReadyForConversion(member.remarks) && (
                                                        <button
                                                            onClick={() =>
                                                                updateRemarks(member.id, member.remarks)
                                                            }
                                                        >
                                                            Next Step
                                                        </button>
                                                    )}

                                                    {canConvert && isReadyForConversion(member.remarks) && (
                                                        <button
                                                            onClick={() =>
                                                                navigate("/add-leader", {
                                                                    state: { newcomer: member }
                                                                })
                                                            }
                                                            style={{ background: "#16a34a" }}
                                                        >
                                                            Convert to Leader
                                                        </button>
                                                    )}

                                                    {!canConvert && isReadyForConversion(member.remarks) && (
                                                        <span style={{ color: "#16a34a", fontWeight: 600, fontSize: "13px" }}>
                                                            Ready for Conversion
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Assimilation;