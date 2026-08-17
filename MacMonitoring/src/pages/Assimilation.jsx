import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";
import {
    tribes,
    allNewcomerStages,
    usheringStages,
    soulWinningStages,
    soakingStages,
    schoolingStages,
    consoStages,
    getStageCategory,
    REGULAR_ATTENDEE
} from "../constants/options";
import { isAdmin, isUshering, isDiscipleship, canConvertNewcomer } from "../utils/auth";


// ── Excel-style table tokens (from Tithes) ─────────────────────────────────
const ETH = (extra = {}) => ({
    padding: "5px 4px",
    fontWeight: 700,
    fontSize: "11px",
    textAlign: "center",
    color: "#000",
    background: "#f3f4f6",
    border: "1px solid #000",
    whiteSpace: "nowrap",
    ...extra,
});

const ETD = (extra = {}) => ({
    padding: "0",
    fontSize: "11px",
    textAlign: "center",
    border: "1px solid #000",
    background: "#fff",
    ...extra,
});

// ═══════════════════════════════════════════════════════════════════════════
// JOURNEY CHECKLIST — replaces the old one-step-at-a-time "Next" button.
//
// Why: clicking "Next" repeatedly is easy to fumble (double-click, wrong
// row) and there was no way back once a stage was set — a mis-click stuck a
// newcomer on the wrong stage permanently. Instead, the whole journey is
// shown as a checklist grouped by phase. Tapping ANY stage sets the
// newcomer's current stage to exactly that one: everything up to and
// including it is marked done, everything after is not. So correcting a
// mistake is just tapping the right (earlier) stage — no separate "undo".
// ═══════════════════════════════════════════════════════════════════════════
const journeySections = [
    { label: "Conso (Ushering)", stages: consoStages },
    { label: "Soul Winning", stages: soulWinningStages },
    { label: "Soaking", stages: soakingStages },
    { label: "Schooling", stages: schoolingStages },
];

// All DJ-owned stages, tracked as an INDEPENDENT checklist (not sequential).
// A member can have "Make Disciple Class" done without "Foundation Class"
// yet — real-world attendance doesn't always happen in a strict order, so
// checking one item must never auto-check or auto-clear another.
const DJ_STAGES = [...soulWinningStages, ...soakingStages, ...schoolingStages];

// tblNewMembers needs a `completed_stages` column (jsonb / text[], default
// '[]') to store this independent checklist. Conso stages stay sequential
// on the existing `remarks` column, since Attendance-driven 1st->2nd->3rd
// Timer progress is genuinely linear.
const getCompletedStages = (member) => {
    if (Array.isArray(member?.completed_stages)) return member.completed_stages;
    // Legacy fallback ONLY: if this member has never had completed_stages
    // set, but `remarks` already points at a DJ stage from the old
    // sequential system, treat everything up to that point as done so
    // existing progress isn't lost on the switch-over. This reads old data
    // once for display — it never writes it back and never auto-fills
    // anything going forward once completed_stages exists.
    if (member?.remarks && !consoStages.includes(member.remarks)) {
        const idx = DJ_STAGES.indexOf(member.remarks);
        if (idx !== -1) return DJ_STAGES.slice(0, idx + 1);
    }
    return [];
};

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
    const [checklistMember, setChecklistMember] = useState(null);

    // Permission flags
    // ────────────────────────────────────────────────────────────────────────
    // Two separate ministries share this list, each owning a different part
    // of the journey:
    //   • Ushering — only 1st Timer -> 2nd Timer -> 3rd Timer -> Regular
    //     Attendee. Their job is recording attendance (done on the
    //     Attendance page); here they can still correct the Conso stage
    //     manually via the checklist if needed.
    //   • Discipleship Journey (DJ) — everything from Soul Winning
    //     onward. Only DJ/Admin decide that path forward.
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

    // Can the CURRENT user set a newcomer's stage TO this target stage?
    // - Target still inside Ushering's own 1st/2nd/3rd Timer -> Regular
    //   Attendee range -> Admin or Ushering.
    // - Target is Soul Winning / Soaking / Schooling (handed to DJ) ->
    //   Admin or Discipleship.
    const canSetStage = (targetStage) => {
        if (usheringStages.includes(targetStage) || targetStage === REGULAR_ATTENDEE) {
            return admin || ushering;
        }
        return admin || discipleship;
    };

    // Does the CURRENT user have ANY edit rights over this member at all?
    // (Used to decide whether the checklist opens read-only or editable.)
    const canEditMember = () => admin || ushering || discipleship;

    // CONSO stages (1st/2nd/3rd Timer -> Regular Attendee) stay sequential —
    // tap any step to jump straight to it. This part really is linear
    // (Attendance-driven), so tap-to-set + auto-fill-before is correct here.
    const setConsoStage = async (member, stage) => {
        if (!canSetStage(stage)) {
            alert("You don't have permission to set this stage.");
            return;
        }
        const { error } = await supabase
            .from("tblNewMembers")
            .update({ remarks: stage })
            .eq("id", member.id);

        if (error) {
            console.log(error);
            alert("Failed to update stage.");
            return;
        }

        setMembers(prev => prev.map(m => (m.id === member.id ? { ...m, remarks: stage } : m)));
        setChecklistMember(prev => (prev && prev.id === member.id ? { ...prev, remarks: stage } : prev));
    };

    // DJ stages (Soul Winning / Soaking / Schooling) are an INDEPENDENT
    // checklist — tapping one only toggles that one item. Nothing else gets
    // auto-checked or auto-cleared, because these processes don't happen in
    // a guaranteed order in real life.
    const toggleDjStage = async (member, stage) => {
        if (!canSetStage(stage)) {
            alert("You don't have permission to set this stage.");
            return;
        }

        const current = getCompletedStages(member);
        const nextCompleted = current.includes(stage)
            ? current.filter(s => s !== stage)
            : [...current, stage];

        const { error } = await supabase
            .from("tblNewMembers")
            .update({ completed_stages: nextCompleted })
            .eq("id", member.id);

        if (error) {
            console.log(error);
            alert("Failed to update checklist. (If this is the first time, make sure the 'completed_stages' column exists on tblNewMembers.)");
            return;
        }

        setMembers(prev => prev.map(m => (m.id === member.id ? { ...m, completed_stages: nextCompleted } : m)));
        setChecklistMember(prev => (prev && prev.id === member.id ? { ...prev, completed_stages: nextCompleted } : prev));
    };

    // Ready to convert: EVERY Soul Winning / Soaking / Schooling item must
    // be individually checked — not just "reached Life Group Class". A
    // member who did Make Disciple Class but skipped Foundation Class is
    // NOT ready, even though they're "further along" in the old linear sense.
    const isFullyDiscipled = (member) => {
        const completed = getCompletedStages(member);
        return DJ_STAGES.every(stage => completed.includes(stage));
    };

    // Who can delete a newcomer record? Same people who can add one, plus
    // admin always — this is for typos or someone who's no longer around,
    // not a stage-progression action, so it doesn't need Discipleship perms.
    const canDeleteNewcomer = () => admin || ushering;

    const handleDeleteMember = async (member) => {
        if (!canDeleteNewcomer()) return;
        const confirmed = window.confirm(
            `Delete ${member.firstname} ${member.lastname}? This permanently removes their record and cannot be undone.`
        );
        if (!confirmed) return;

        const { error } = await supabase
            .from("tblNewMembers")
            .delete()
            .eq("id", member.id);

        if (error) {
            console.log(error);
            alert("Failed to delete newcomer. Please try again.");
            return;
        }

        setMembers(prev => prev.filter(m => m.id !== member.id));
        if (checklistMember?.id === member.id) setChecklistMember(null);
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
                matchesStage = isFullyDiscipled(member);
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
                    <span>team decides the next step (Life Track, Life Retreat, Schooling, etc.). Tap</span>
                    <span style={{ fontWeight: 700, color: "#c9a45c" }}>📋 Checklist</span>
                    <span>on any row to see and correct exactly where someone is in the journey.</span>
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
                        <h1 style={{ fontSize: "22px", margin: 0, color: "#16a34a" }}>{members.filter(isFullyDiscipled).length}</h1>
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

                {/* EXCEL-STYLE TABLE */}
                <div style={{ overflowX: "auto", border: "1px solid #000" }}>
                    <table style={{ width: "100%", fontSize: "11px", borderCollapse: "collapse", minWidth: "700px" }}>
                        <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                            <tr>
                                <th style={ETH({ textAlign: "left", width: "220px" })}>NAME</th>
                                <th style={ETH({ width: "100px" })}>TRIBE</th>
                                <th style={ETH({ textAlign: "left", width: "140px" })}>INVITED BY</th>
                                <th style={ETH({ width: "140px" })}>STAGE</th>
                                <th style={ETH({ width: "130px" })}>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "#9ca3af", border: "1px solid #000" }}>Loading...</td></tr>
                            ) : filteredMembers.length === 0 ? (
                                <tr><td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "#9ca3af", border: "1px solid #000" }}>No newcomers found.</td></tr>
                            ) : (
                                filteredMembers.map((member) => (
                                    <tr key={member.id}>
                                        <td style={ETD({ textAlign: "left", padding: "4px 6px" })}>
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
                                        <td style={ETD()}>{member.tribe}</td>
                                        <td style={ETD({ textAlign: "left", padding: "4px 6px", color: "#6b7280", fontSize: "11px" })}>{member.invited_by || "—"}</td>
                                        <td style={ETD()}>
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
                                        <td style={ETD()}>
                                            <div style={{ display: "flex", gap: "6px", justifyContent: "center", alignItems: "center" }}>
                                                <button
                                                    onClick={() => setChecklistMember(member)}
                                                    title="View / update journey checklist"
                                                    style={{
                                                        padding: "4px 10px",
                                                        borderRadius: "6px",
                                                        border: "1px solid #c9a45c",
                                                        background: "#fdf6e8",
                                                        color: "#92400e",
                                                        fontSize: "10px",
                                                        fontWeight: 600,
                                                        cursor: "pointer",
                                                        whiteSpace: "nowrap"
                                                    }}
                                                >
                                                    📋 Checklist
                                                </button>

                                                {canConvert && isFullyDiscipled(member) && (
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

                                                {!canConvert && isFullyDiscipled(member) && (
                                                    <span style={{ color: "#16a34a", fontWeight: 700, fontSize: "10px" }}>
                                                        Ready
                                                    </span>
                                                )}

                                                {canDeleteNewcomer() && (
                                                    <button
                                                        onClick={() => handleDeleteMember(member)}
                                                        title="Delete this newcomer record"
                                                        style={{
                                                            padding: "4px 8px",
                                                            borderRadius: "6px",
                                                            border: "1px solid #fca5a5",
                                                            background: "#fef2f2",
                                                            color: "#dc2626",
                                                            fontSize: "11px",
                                                            fontWeight: 600,
                                                            cursor: "pointer",
                                                            flexShrink: 0
                                                        }}
                                                    >
                                                        🗑
                                                    </button>
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

            {/* JOURNEY CHECKLIST MODAL */}
            {checklistMember && (() => {
                const consoIndex = allNewcomerStages.indexOf(checklistMember.remarks);
                const consoInProgress = consoStages.includes(checklistMember.remarks);
                const completedDj = getCompletedStages(checklistMember);
                const djDoneCount = DJ_STAGES.filter(s => completedDj.includes(s)).length;
                const fullyDiscipled = djDoneCount === DJ_STAGES.length;
                const editable = canEditMember();
                return (
                    <div
                        className="modal-overlay"
                        style={{
                            position: "fixed",
                            top: 0, left: 0, right: 0, bottom: 0,
                            background: "rgba(0,0,0,0.5)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 1000,
                            padding: "20px"
                        }}
                        onClick={(e) => { if (e.target === e.currentTarget) setChecklistMember(null); }}
                    >
                        <div style={{
                            background: "#fff",
                            borderRadius: "12px",
                            width: "100%",
                            maxWidth: "460px",
                            maxHeight: "88vh",
                            overflow: "auto",
                            position: "relative"
                        }}>
                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                padding: "14px 18px",
                                borderBottom: "1px solid #e5e7eb",
                                position: "sticky",
                                top: 0,
                                background: "#fff",
                                zIndex: 10,
                                borderRadius: "12px 12px 0 0"
                            }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
                                        {checklistMember.firstname} {checklistMember.lastname}
                                    </h2>
                                    <p style={{ margin: "3px 0 0 0", fontSize: "11px", color: "#6b7280" }}>
                                        Conso stage: <strong style={{ color: getStageTextColor(checklistMember.remarks) }}>{checklistMember.remarks}</strong>
                                    </p>
                                    <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: fullyDiscipled ? "#16a34a" : "#6b7280" }}>
                                        Discipleship checklist: <strong>{djDoneCount}/{DJ_STAGES.length} done</strong>
                                        {fullyDiscipled && " — ✅ Fully discipled"}
                                    </p>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                    {canDeleteNewcomer() && (
                                        <button
                                            onClick={() => handleDeleteMember(checklistMember)}
                                            title="Delete this newcomer record"
                                            style={{
                                                background: "none",
                                                border: "1px solid #fca5a5",
                                                borderRadius: "6px",
                                                color: "#dc2626",
                                                fontSize: "11px",
                                                fontWeight: 600,
                                                cursor: "pointer",
                                                padding: "5px 8px",
                                                lineHeight: 1
                                            }}
                                        >
                                            🗑 Delete
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setChecklistMember(null)}
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
                            </div>

                            <div style={{ padding: "12px 18px 18px" }}>
                                {journeySections.map((section) => {
                                    const isConsoSection = section.label === "Conso (Ushering)";
                                    return (
                                        <div key={section.label} style={{ marginBottom: "14px" }}>
                                            <p style={{
                                                margin: "0 0 4px 0",
                                                fontSize: "10px",
                                                fontWeight: 700,
                                                color: "#9ca3af",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.5px"
                                            }}>
                                                {section.label}
                                            </p>
                                            <p style={{ margin: "0 0 6px 0", fontSize: "10px", color: "#c9c9c9" }}>
                                                {isConsoSection
                                                    ? "Sequential — tap a step to jump straight to it."
                                                    : "Independent checklist — tap to check/uncheck each item on its own, in any order."}
                                            </p>
                                            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                                {section.stages.map((stage) => {
                                                    let checked;
                                                    let isCurrent = false;
                                                    if (isConsoSection) {
                                                        const stageIndex = allNewcomerStages.indexOf(stage);
                                                        checked = consoInProgress
                                                            ? (consoIndex !== -1 && stageIndex <= consoIndex)
                                                            : true; // already handed off to DJ -> conso is fully done
                                                        isCurrent = consoInProgress && stage === checklistMember.remarks;
                                                    } else {
                                                        checked = completedDj.includes(stage);
                                                    }
                                                    const allowed = editable && canSetStage(stage);
                                                    const handleClick = () => {
                                                        if (!allowed) return;
                                                        if (isConsoSection) setConsoStage(checklistMember, stage);
                                                        else toggleDjStage(checklistMember, stage);
                                                    };
                                                    return (
                                                        <div
                                                            key={stage}
                                                            onClick={handleClick}
                                                            style={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: "8px",
                                                                padding: "6px 8px",
                                                                borderRadius: "6px",
                                                                cursor: allowed ? "pointer" : "not-allowed",
                                                                opacity: allowed ? 1 : 0.55,
                                                                background: isCurrent ? "#fdf6e8" : "transparent",
                                                                transition: "background 0.15s"
                                                            }}
                                                            onMouseEnter={(e) => { if (allowed && !isCurrent) e.currentTarget.style.background = "#f9fafb"; }}
                                                            onMouseLeave={(e) => { if (allowed && !isCurrent) e.currentTarget.style.background = "transparent"; }}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                readOnly
                                                                style={{ pointerEvents: "none", width: "14px", height: "14px", flexShrink: 0 }}
                                                            />
                                                            <span style={{
                                                                fontSize: "12px",
                                                                fontWeight: isCurrent ? 700 : 500,
                                                                color: checked ? "#111827" : "#9ca3af",
                                                                flex: 1
                                                            }}>
                                                                {stage}
                                                            </span>
                                                            {isCurrent && (
                                                                <span style={{
                                                                    fontSize: "9px",
                                                                    fontWeight: 700,
                                                                    color: "#c9a45c",
                                                                    letterSpacing: "0.3px",
                                                                    flexShrink: 0
                                                                }}>
                                                                    CURRENT
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

export default Assimilation;