import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";
import {
    tribes,
    allNewcomerStages,
    getNextStage,
    isReadyForConversion,
    usheringStages,
    soulWinningStages,
    soakingStages,
    schoolingStages,
    consoStages,
    getStageCategory
} from "../constants/options";
import { isAdmin, isUshering, isDiscipleship, canConvertNewcomer } from "../utils/auth";

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
    // ────────────────────────────────────────────────────────────────────────
    // Two separate ministries share this list, each owning a different part
    // of the journey:
    //   • Ushering — only 1st Timer -> 2nd Timer -> 3rd Timer. Their job is
    //     recording attendance (done on the Attendance page); here they can
    //     still nudge someone to the next Conso stage manually if needed.
    //   • Discipleship Journey (DJ) — everything from "Regular Attendee"
    //     onward (Soul Winning, Soaking, Schooling). Only DJ/Admin decide
    //     that path forward.
    // ────────────────────────────────────────────────────────────────────────
    const admin = isAdmin();
    const ushering = isUshering();
    const discipleship = isDiscipleship();
    const canAddNewcomer = admin || ushering;
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

    // Can the CURRENT user advance THIS member's stage?
    // - Still inside Ushering's own 1st/2nd/3rd Timer range -> Admin or Ushering.
    // - Regular Attendee and beyond (handed off to DJ) -> Admin or Discipleship.
    const canAdvanceStage = (member) => {
        if (usheringStages.includes(member.remarks)) {
            return admin || ushering;
        }
        return admin || discipleship;
    };

    // Filter helpers
    const countByStage = (stageList) => members.filter((m) => stageList.includes(m.remarks)).length;
    const countByExactStage = (stage) => members.filter((m) => m.remarks === stage).length;

    // Apply all filters
    const filteredMembers = members.filter((member) => {
        const fullName = `${member.firstname} ${member.lastname}`.toLowerCase();
        const matchesSearch = fullName.includes(search.toLowerCase());
        const matchesTribe = filterTribe === "ALL" ? true : member.tribe === filterTribe;

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

    const getStageBorderColor = (stage) => {
        const category = getStageCategory(stage);
        switch (category) {
            case "CONSO": return "#3b82f6";
            case "SOUL WINNING": return "#22c55e";
            case "SOAKING": return "#f59e0b";
            case "SCHOOLING": return "#ec4899";
            default: return "#9ca3af";
        }
    };

    // Quick filter by clicking a stats card
    const handleQuickFilter = (category) => {
        setFilterStage(category);
    };

    const getInitials = (first, last) => {
        return `${first?.charAt(0) || ""}${last?.charAt(0) || ""}`.toUpperCase();
    };

    return (
        <div className="layout">
            <Sidebar />
            <div className="content">
                {/* COMPACT HEADER */}
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "12px",
                    padding: "12px 0",
                    borderBottom: "1px solid #e5e7eb"
                }}>
                    <div>
                        <h1 style={{ fontSize: "20px", margin: 0, fontWeight: 700 }}>Invites</h1>
                        <p style={{ opacity: 0.7, margin: "2px 0 0 0", fontSize: "12px" }}>
                            Monitor visitors, invites, and newcomers.
                        </p>
                    </div>
                    {canAddNewcomer && (
                        <button
                            className="btn-sm btn-primary"
                            onClick={() => setShowForm(true)}
                            style={{ padding: "6px 14px", fontSize: "13px" }}
                        >
                            + Add Newcomer
                        </button>
                    )}
                </div>

                {/* WORKFLOW LEGEND — keeps the Ushering / DJ hand-off clear for everyone */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "wrap",
                    marginBottom: "15px",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    background: "#fdf6e8",
                    border: "1px solid #f3e3c1",
                    fontSize: "11px",
                    color: "#6b7280"
                }}>
                    <span style={{ fontWeight: 700, color: "#92400e" }}>How this works:</span>
                    <span>Ushering records attendance and carries newcomers through</span>
                    <span style={{ fontWeight: 700, color: "#1e40af" }}>1st → 2nd → 3rd Timer → Regular Attendee</span>
                    <span>. From Regular Attendee onward, the</span>
                    <span style={{ fontWeight: 700, color: "#166534" }}>Discipleship Journey (DJ)</span>
                    <span>team decides the next step (Life Track, Life Retreat, Schooling, etc.).</span>
                </div>

                {/* COMPACT STATS CARDS */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
                        gap: "8px",
                        marginBottom: "15px"
                    }}
                >
                    <div 
                        className="record-card"
                        onClick={() => handleQuickFilter("CONSO")}
                        style={{ 
                            cursor: "pointer", 
                            border: filterStage === "CONSO" ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                            padding: "10px 12px",
                            borderRadius: "8px",
                            background: "#fff"
                        }}
                    >
                        <h3 style={{ fontSize: "11px", margin: "0 0 4px 0", color: "#6b7280", fontWeight: 500 }}>Conso</h3>
                        <h1 style={{ fontSize: "22px", margin: 0, color: "#3b82f6" }}>{countByStage(consoStages)}</h1>
                        <p style={{ fontSize: "9px", color: "#9ca3af", marginTop: "2px", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {consoStages.map(s => `${s.split(" ")[0]}: ${countByExactStage(s)}`).join(" | ")}
                        </p>
                    </div>

                    <div 
                        className="record-card"
                        onClick={() => handleQuickFilter("SOUL WINNING")}
                        style={{ 
                            cursor: "pointer", 
                            border: filterStage === "SOUL WINNING" ? "2px solid #22c55e" : "1px solid #e5e7eb",
                            padding: "10px 12px",
                            borderRadius: "8px",
                            background: "#fff"
                        }}
                    >
                        <h3 style={{ fontSize: "11px", margin: "0 0 4px 0", color: "#6b7280", fontWeight: 500 }}>Soul Winning</h3>
                        <h1 style={{ fontSize: "22px", margin: 0, color: "#22c55e" }}>{countByStage(soulWinningStages)}</h1>
                        <p style={{ fontSize: "9px", color: "#9ca3af", marginTop: "2px", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {soulWinningStages.slice(0, 3).map(s => `${s.split(" - ")[1] || s}: ${countByExactStage(s)}`).join(" | ")}
                        </p>
                    </div>

                    <div 
                        className="record-card"
                        onClick={() => handleQuickFilter("SOAKING")}
                        style={{ 
                            cursor: "pointer", 
                            border: filterStage === "SOAKING" ? "2px solid #f59e0b" : "1px solid #e5e7eb",
                            padding: "10px 12px",
                            borderRadius: "8px",
                            background: "#fff"
                        }}
                    >
                        <h3 style={{ fontSize: "11px", margin: "0 0 4px 0", color: "#6b7280", fontWeight: 500 }}>Soaking</h3>
                        <h1 style={{ fontSize: "22px", margin: 0, color: "#f59e0b" }}>{countByStage(soakingStages)}</h1>
                        <p style={{ fontSize: "9px", color: "#9ca3af", marginTop: "2px", margin: 0 }}>
                            LR: {countByExactStage("Candidate for Life Retreat")}
                        </p>
                    </div>

                    <div 
                        className="record-card" 
                        onClick={() => handleQuickFilter("Candidate for Life Retreat")}
                        style={{ 
                            cursor: "pointer", 
                            border: filterStage === "Candidate for Life Retreat" ? "3px solid #c9a45c" : "1px solid #c9a45c",
                            background: filterStage === "Candidate for Life Retreat" ? "#fefce8" : "#fff",
                            padding: "10px 12px",
                            borderRadius: "8px"
                        }}
                    >
                        <h3 style={{ fontSize: "11px", margin: "0 0 4px 0", color: "#92400e", fontWeight: 500 }}>🎯 Candidates for LR</h3>
                        <h1 style={{ fontSize: "22px", margin: 0, color: "#c9a45c" }}>{countByExactStage("Candidate for Life Retreat")}</h1>
                    </div>

                    <div 
                        className="record-card"
                        onClick={() => handleQuickFilter("SCHOOLING")}
                        style={{ 
                            cursor: "pointer", 
                            border: filterStage === "SCHOOLING" ? "2px solid #ec4899" : "1px solid #e5e7eb",
                            padding: "10px 12px",
                            borderRadius: "8px",
                            background: "#fff"
                        }}
                    >
                        <h3 style={{ fontSize: "11px", margin: "0 0 4px 0", color: "#6b7280", fontWeight: 500 }}>Schooling</h3>
                        <h1 style={{ fontSize: "22px", margin: 0, color: "#ec4899" }}>{countByStage(schoolingStages)}</h1>
                        <p style={{ fontSize: "9px", color: "#9ca3af", marginTop: "2px", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {schoolingStages.map(s => `${s.replace(" Class", "")}: ${countByExactStage(s)}`).join(" | ")}
                        </p>
                    </div>

                    <div 
                        className="record-card"
                        onClick={() => handleQuickFilter("READY")}
                        style={{ 
                            cursor: "pointer", 
                            background: "#ecfdf5",
                            border: filterStage === "READY" ? "2px solid #16a34a" : "1px solid #bbf7d0",
                            padding: "10px 12px",
                            borderRadius: "8px"
                        }}
                    >
                        <h3 style={{ fontSize: "11px", margin: "0 0 4px 0", color: "#16a34a", fontWeight: 500 }}>Ready to Convert</h3>
                        <h1 style={{ fontSize: "22px", margin: 0, color: "#16a34a" }}>{countByExactStage("Life Group Class")}</h1>
                    </div>
                </div>

                {/* COMPACT SEARCH & FILTER BAR */}
                <div
                    style={{
                        display: "flex",
                        gap: "8px",
                        marginBottom: "12px",
                        flexWrap: "wrap",
                        alignItems: "center",
                        padding: "10px",
                        background: "#f9fafb",
                        borderRadius: "8px"
                    }}
                >
                    <input
                        type="text"
                        placeholder="Search newcomer..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ flex: 1, minWidth: "150px", padding: "6px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                    />

                    <select
                        value={filterTribe}
                        onChange={(e) => setFilterTribe(e.target.value)}
                        style={{ width: "130px", padding: "6px 8px", fontSize: "12px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                    >
                        <option value="ALL">All Tribes</option>
                        {tribes.map((tribe) => (
                            <option key={tribe} value={tribe}>{tribe}</option>
                        ))}
                    </select>

                    <select
                        value={filterStage}
                        onChange={(e) => setFilterStage(e.target.value)}
                        style={{ width: "140px", padding: "6px 8px", fontSize: "12px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                    >
                        <option value="ALL">All Stages</option>
                        <optgroup label="By Category">
                            <option value="CONSO">Conso</option>
                            <option value="SOUL WINNING">Soul Winning</option>
                            <option value="SOAKING">Soaking</option>
                            <option value="SCHOOLING">Schooling</option>
                            <option value="READY">Ready to Convert</option>
                        </optgroup>
                        <optgroup label="By Stage">
                            {allNewcomerStages.map((stage) => (
                                <option key={stage} value={stage}>{stage}</option>
                            ))}
                        </optgroup>
                    </select>

                    {(filterTribe !== "ALL" || filterStage !== "ALL" || search) && (
                        <button
                            onClick={() => { setFilterTribe("ALL"); setFilterStage("ALL"); setSearch(""); }}
                            style={{
                                padding: "6px 12px",
                                borderRadius: "6px",
                                border: "1px solid #d1d5db",
                                background: "#fff",
                                cursor: "pointer",
                                fontSize: "12px",
                                color: "#6b7280"
                            }}
                        >
                            Clear
                        </button>
                    )}
                </div>

                {/* COMPACT ACTIVE FILTER INDICATOR */}
                {filterStage !== "ALL" && (
                    <div style={{ marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "12px", color: "#6b7280" }}>Showing:</span>
                        <span style={{
                            padding: "2px 8px",
                            borderRadius: "12px",
                            background: getStageColor(filterStage === "READY" ? "Life Group Class" : filterStage),
                            color: getStageTextColor(filterStage === "READY" ? "Life Group Class" : filterStage),
                            fontSize: "11px",
                            fontWeight: 600
                        }}>
                            {filterStage === "READY" ? "Ready to Convert" : filterStage}
                        </span>
                        <span style={{ fontSize: "12px", color: "#6b7280" }}>({filteredMembers.length} results)</span>
                    </div>
                )}

                {/* COMPACT TABLE */}
                <div style={{ borderRadius: "8px", border: "1px solid #e5e7eb", overflow: "hidden", background: "#fff" }}>
                    <div style={{ padding: "10px 14px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>Newcomers List</h2>
                        <span style={{ fontSize: "11px", color: "#9ca3af" }}>{filteredMembers.length} total</span>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "#f9fafb" }}>
                                    <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Name</th>
                                    <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Tribe</th>
                                    <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Invited By</th>
                                    <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Stage</th>
                                    <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="5" style={{ padding: "20px", textAlign: "center", color: "#6b7280" }}>Loading...</td></tr>
                                ) : filteredMembers.length === 0 ? (
                                    <tr><td colSpan="5" style={{ padding: "20px", textAlign: "center", color: "#6b7280" }}>No newcomers found.</td></tr>
                                ) : (
                                    filteredMembers.map((member) => (
                                        <tr key={member.id} style={{ borderBottom: "1px solid #f3f4f6", transition: "background 0.15s" }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                        >
                                            <td style={{ padding: "8px 10px" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                    <div style={{
                                                        width: "28px",
                                                        height: "28px",
                                                        borderRadius: "50%",
                                                        background: getStageColor(member.remarks),
                                                        color: getStageTextColor(member.remarks),
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontSize: "10px",
                                                        fontWeight: 700,
                                                        flexShrink: 0
                                                    }}>
                                                        {getInitials(member.firstname, member.lastname)}
                                                    </div>
                                                    <span style={{ fontWeight: 600, color: "#111827" }}>{member.firstname} {member.lastname}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: "8px 10px", color: "#6b7280" }}>{member.tribe}</td>
                                            <td style={{ padding: "8px 10px", color: "#6b7280", fontSize: "11px" }}>{member.invited_by || "—"}</td>
                                            <td style={{ padding: "8px 10px" }}>
                                                <span style={{
                                                    padding: "2px 8px",
                                                    borderRadius: "10px",
                                                    background: getStageColor(member.remarks),
                                                    color: getStageTextColor(member.remarks),
                                                    fontSize: "10px",
                                                    fontWeight: 700
                                                }}>
                                                    {member.remarks}
                                                </span>
                                            </td>
                                            <td style={{ padding: "8px 10px", textAlign: "center" }}>
                                                <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                                                    {canAdvanceStage(member) && !isReadyForConversion(member.remarks) && (
                                                        <button
                                                            onClick={() => updateRemarks(member.id, member.remarks)}
                                                            style={{
                                                                padding: "4px 10px",
                                                                borderRadius: "6px",
                                                                border: `1px solid ${getStageBorderColor(member.remarks)}`,
                                                                background: getStageColor(member.remarks),
                                                                color: getStageTextColor(member.remarks),
                                                                fontSize: "10px",
                                                                fontWeight: 600,
                                                                cursor: "pointer"
                                                            }}
                                                        >
                                                            Next
                                                        </button>
                                                    )}

                                                    {canConvert && isReadyForConversion(member.remarks) && (
                                                        <button
                                                            onClick={() => navigate("/add-leader", { state: { newcomer: member } })}
                                                            style={{
                                                                padding: "4px 10px",
                                                                borderRadius: "6px",
                                                                border: "1px solid #16a34a",
                                                                background: "#dcfce7",
                                                                color: "#166534",
                                                                fontSize: "10px",
                                                                fontWeight: 600,
                                                                cursor: "pointer"
                                                            }}
                                                        >
                                                            Convert
                                                        </button>
                                                    )}

                                                    {!canConvert && isReadyForConversion(member.remarks) && (
                                                        <span style={{ color: "#16a34a", fontWeight: 700, fontSize: "10px" }}>
                                                            Ready
                                                        </span>
                                                    )}

                                                    {!canAdvanceStage(member) && !isReadyForConversion(member.remarks) && member.remarks === "Regular Attendee" && (
                                                        <span style={{ color: "#b8934a", fontWeight: 700, fontSize: "10px" }}>
                                                            Awaiting DJ
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

            {/* ADD NEWCOMER MODAL */}
            {showForm && (
                <div
                    className="modal-overlay"
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(0,0,0,0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1000,
                        padding: "20px"
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowForm(false);
                    }}
                >
                    <div
                        style={{
                            background: "#fff",
                            borderRadius: "12px",
                            width: "100%",
                            maxWidth: "500px",
                            maxHeight: "90vh",
                            overflow: "auto",
                            position: "relative"
                        }}
                    >
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "14px 18px",
                            borderBottom: "1px solid #e5e7eb",
                            position: "sticky",
                            top: 0,
                            background: "#fff",
                            zIndex: 10,
                            borderRadius: "12px 12px 0 0"
                        }}>
                            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Add New Newcomer</h2>
                            <button
                                onClick={() => setShowForm(false)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    fontSize: "18px",
                                    cursor: "pointer",
                                    color: "#6b7280",
                                    padding: "4px",
                                    lineHeight: 1
                                }}
                            >
                                ✕
                            </button>
                        </div>
                        <div style={{ padding: "14px 18px 18px" }}>
                            <p style={{ margin: "0 0 12px 0", fontSize: "11px", color: "#9ca3af" }}>
                                Ushering adds newcomers on their Conso stage only (1st/2nd/3rd Timer or
                                Regular Attendee). Anything further along their journey is set by the
                                Discipleship Journey team.
                            </p>
                            <form className="leader-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                <input
                                    type="text"
                                    placeholder="First Name"
                                    value={firstname}
                                    onChange={(e) => setFirstname(e.target.value)}
                                    style={{ padding: "8px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                                />
                                <input
                                    type="text"
                                    placeholder="Last Name"
                                    value={lastname}
                                    onChange={(e) => setLastname(e.target.value)}
                                    style={{ padding: "8px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                                />

                                <select
                                    value={tribe}
                                    onChange={(e) => {
                                        setTribe(e.target.value);
                                        setInvitedBy("");
                                    }}
                                    style={{ padding: "8px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                                >
                                    <option value="">Select Tribe</option>
                                    {tribes.map((tribe) => (
                                        <option key={tribe} value={tribe}>{tribe}</option>
                                    ))}
                                </select>

                                <select
                                    value={invitedBy}
                                    onChange={(e) => setInvitedBy(e.target.value)}
                                    style={{ padding: "8px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d1d5db" }}
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
                                    style={{ padding: "8px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                                >
                                    {consoStages.map((stage) => (
                                        <option key={stage} value={stage}>{stage}</option>
                                    ))}
                                </select>

                                <button type="submit" style={{ marginTop: "4px", padding: "8px", fontSize: "13px" }}>
                                    Add Newcomer
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Assimilation;