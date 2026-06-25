import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";
import {
    tribes as allTribes,
    allNewcomerStages,
    getStageCategory,
    consoStages,
} from "../constants/options";
import Swal from "sweetalert2";
import * as XLSX from "xlsx-js-style";

const tribes = allTribes && allTribes.length ? allTribes : [
    "DANALI", "REUBEN", "ASHER", "EPHRAIM",
    "MANASSEH", "JOSEPH", "GAD", "EZRA"
];

const SERVICE_PRESETS = ["PRAYER WORKS", "YOUTH GIG", "SUNDAY SERVICE"];

// Conso-only auto-advance: 1st Timer -> 2nd Timer -> 3rd Timer.
const CONSO_STAGES = ["1st Timer", "2nd Timer", "3rd Timer"];
const getConsoAutoAdvance = (currentStage) => {
    const idx = CONSO_STAGES.indexOf(currentStage);
    if (idx === -1 || idx === CONSO_STAGES.length - 1) return null;
    return CONSO_STAGES[idx + 1];
};

const INACTIVE_STREAK = 5;
const ACTIVE_STREAK = 5;

// ── Helpers ───────────────────────────────────────────────────────────────
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
const getInitials = (first, last) =>
    `${first?.charAt(0) || ""}${last?.charAt(0) || ""}`.toUpperCase();

const getNewcomerStatusStyle = (status) => {
    if (status === "INACTIVE") return { bg: "#fee2e2", color: "#dc2626", border: "#fca5a5" };
    return { bg: "#dcfce7", color: "#16a34a", border: "#86efac" };
};

// Determine display status for export: 1st/2nd/3rd Timer or Regular
const getDisplayStatus = (isLeader, remarks) => {
    if (isLeader) return "Regular";
    if (consoStages.includes(remarks)) return remarks;
    return "Regular";
};

const modalInputStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "2px solid #e5e7eb",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s"
};

// ═══════════════════════════════════════════════════════════════════════════
// NEW: Fetch default tribe goals from tblTribeGoalDefaults
// These persist until manually changed by an admin
// ═══════════════════════════════════════════════════════════════════════════
const fetchDefaultTribeGoals = async () => {
    const { data, error } = await supabase
        .from("tblTribeGoalDefaults")
        .select("tribe, goal_number")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching default tribe goals:", error);
        return {};
    }

    // Take the most recent goal for each tribe
    const goals = {};
    data?.forEach(row => {
        if (goals[row.tribe] === undefined) {
            goals[row.tribe] = row.goal_number;
        }
    });
    return goals;
};

// Save default tribe goals — robust delete-then-insert approach
const saveDefaultTribeGoals = async (goals) => {
    const records = Object.entries(goals)
        .filter(([_, goal]) => goal !== "" && goal !== undefined && goal !== null)
        .map(([tribe, goal_number]) => ({
            tribe,
            goal_number: parseInt(goal_number) || 0,
        }));

    if (records.length === 0) return { error: null };

    // Try upsert first (newer Supabase versions)
    const { error: upsertError } = await supabase
        .from("tblTribeGoalDefaults")
        .upsert(records, { onConflict: "tribe" });

    if (!upsertError) {
        console.log("✅ Goals saved via upsert");
        return { error: null };
    }

    console.warn("Upsert failed, trying delete-then-insert fallback:", upsertError.message);

    // Fallback: delete existing records for these tribes, then insert fresh
    const tribesToUpdate = records.map(r => r.tribe);
    const { error: deleteError } = await supabase
        .from("tblTribeGoalDefaults")
        .delete()
        .in("tribe", tribesToUpdate);

    if (deleteError) {
        console.error("Delete failed:", deleteError.message);
        return { error: deleteError };
    }

    const { error: insertError } = await supabase
        .from("tblTribeGoalDefaults")
        .insert(records);

    if (insertError) {
        console.error("Insert failed:", insertError.message);
        return { error: insertError };
    }

    console.log("✅ Goals saved via delete-then-insert fallback");
    return { error: null };
};

// ═══════════════════════════════════════════════════════════════════════════
// Get effective goals: use per-service goals if they exist, otherwise fall back
// to default goals from tblTribeGoalDefaults
// ═══════════════════════════════════════════════════════════════════════════
const getEffectiveGoals = async (serviceDate, serviceType) => {
    // First try to get per-service goals for this exact date+service
    const { data: serviceGoals } = await supabase
        .from("tblTribeTargets")
        .select("tribe, target_number")
        .eq("service_date", serviceDate)
        .eq("service_type", serviceType);

    const perService = {};
    serviceGoals?.forEach(g => { perService[g.tribe] = g.target_number; });

    // Check if ALL tribes have per-service goals
    const allHaveServiceGoals = tribes.every(t => perService[t] !== undefined);

    if (allHaveServiceGoals) {
        return perService;
    }

    // Fall back to default goals for missing tribes
    const defaults = await fetchDefaultTribeGoals();
    const effective = {};
    tribes.forEach(t => {
        effective[t] = perService[t] !== undefined ? perService[t] : (defaults[t] || 0);
    });
    return effective;
};

// ── Attendance Modal (Record / Export) ────────────────────────────────────
function AttendanceModal({
    showModal, modalTab, setModalTab, date, serviceType, exportMonth, exportDate,
    tribeTargets, onDateChange, onServiceTypeChange, onServicePreset, onTargetChange,
    onStartRecording, onExport, onExportMonthChange, onExportDateChange, onClose,
    defaultGoalsLoaded, // new prop
}) {
    if (!showModal) return null;

    return (
        <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, backdropFilter: "blur(4px)", padding: "20px", overflowY: "auto"
        }}>
            {/* MODAL MADE LARGER: maxWidth increased from 560px to 720px */}
            <div style={{
                background: "#fff", borderRadius: "16px", width: "95%", maxWidth: "720px",
                boxShadow: "0 25px 50px rgba(0,0,0,0.25)", overflow: "hidden", position: "relative",
                maxHeight: "92vh", display: "flex", flexDirection: "column"
            }}>
                <button onClick={onClose} style={{
                    position: "absolute", top: "16px", right: "16px",
                    width: "32px", height: "32px", borderRadius: "50%",
                    border: "none", background: "rgba(255,255,255,0.25)",
                    color: "#fff", fontSize: "18px", fontWeight: 700,
                    cursor: "pointer", display: "flex", alignItems: "center",
                    justifyContent: "center", zIndex: 10
                }}>✕</button>

                <div style={{
                    background: "linear-gradient(135deg, #c9a45c 0%, #b8934a 100%)",
                    padding: "24px 28px", color: "#fff", flexShrink: 0
                }}>
                    <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>Attendance</h2>
                    <p style={{ margin: "6px 0 0 0", opacity: 0.9, fontSize: "14px" }}>
                        Record attendance or export reports
                    </p>
                </div>

                <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", flexShrink: 0 }}>
                    {["record", "export"].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setModalTab(tab)}
                            style={{
                                flex: 1, padding: "16px", border: "none",
                                background: modalTab === tab ? "#fff" : "#f9fafb",
                                color: modalTab === tab ? "#b8934a" : "#6b7280",
                                fontWeight: 700, fontSize: "14px", cursor: "pointer",
                                borderBottom: modalTab === tab ? "3px solid #b8934a" : "3px solid transparent",
                                transition: "all 0.2s"
                            }}
                        >
                            {tab === "record" ? "Record Attendance" : "Export Report"}
                        </button>
                    ))}
                </div>

                <div style={{ padding: "28px", overflowY: "auto" }}>
                    {modalTab === "record" ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                                    Service Date *
                                </label>
                                <input type="date" value={date} onChange={onDateChange} style={modalInputStyle}
                                    onFocus={e => e.target.style.borderColor = "#c9a45c"}
                                    onBlur={e => e.target.style.borderColor = "#e5e7eb"} />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                                    Service Type / Remarks *
                                </label>
                                <div style={{ display: "flex", gap: "6px", marginBottom: "8px", flexWrap: "wrap" }}>
                                    {SERVICE_PRESETS.map(preset => (
                                        <button key={preset} type="button" onClick={() => onServicePreset(preset)}
                                            style={{
                                                padding: "6px 12px", borderRadius: "8px",
                                                border: serviceType.toUpperCase().startsWith(preset) ? "1.5px solid #c9a45c" : "1px solid #d1d5db",
                                                background: serviceType.toUpperCase().startsWith(preset) ? "#fdf6e8" : "#fff",
                                                color: serviceType.toUpperCase().startsWith(preset) ? "#b8934a" : "#6b7280",
                                                fontSize: "12px", fontWeight: 600, cursor: "pointer"
                                            }}>{preset}</button>
                                    ))}
                                </div>
                                <input type="text" value={serviceType} onChange={onServiceTypeChange}
                                    placeholder="e.g. SUNDAY June 4, 2026 or custom event name"
                                    style={modalInputStyle}
                                    onFocus={e => e.target.style.borderColor = "#c9a45c"}
                                    onBlur={e => e.target.style.borderColor = "#e5e7eb"} autoComplete="off" />
                                <p style={{ fontSize: "12px", color: "#9ca3af", margin: "4px 0 0 0" }}>
                                    Pick a preset above or type a custom event name.
                                </p>
                            </div>

                            <div>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151" }}>
                                        Tribe Targets {defaultGoalsLoaded && <span style={{ color: "#16a34a", fontSize: "11px" }}>(Default goals loaded)</span>}
                                    </label>
                                    <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                                        These will be saved as default for future services
                                    </span>
                                </div>
                                <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 10px 0" }}>
                                    Set the attendee goal for each tribe. Goals persist across services until you change them.
                                </p>
                                {/* Wider grid for larger modal */}
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
                                    {tribes.map(tribe => (
                                        <div key={tribe} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                            <span style={{ fontSize: "12px", fontWeight: 600, color: "#374151" }}>
                                                {tribe}
                                            </span>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="0"
                                                value={tribeTargets[tribe] ?? ""}
                                                onChange={e => onTargetChange(tribe, e.target.value)}
                                                style={{
                                                    padding: "10px 12px", borderRadius: "8px",
                                                    border: "1.5px solid #e5e7eb", fontSize: "14px", outline: "none",
                                                    width: "100%"
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button onClick={onStartRecording} style={{
                                width: "100%", padding: "14px", borderRadius: "10px", border: "none",
                                background: "linear-gradient(135deg, #c9a45c 0%, #b8934a 100%)",
                                color: "#fff", fontWeight: 700, fontSize: "15px", cursor: "pointer", marginTop: "4px"
                            }}>Start Recording</button>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                                    Export by Month
                                </label>
                                <input type="month" value={exportMonth} onChange={onExportMonthChange} style={modalInputStyle} />
                            </div>
                            <div style={{ textAlign: "center", color: "#9ca3af", fontSize: "13px", fontWeight: 600 }}>— OR —</div>
                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                                    Export by Specific Date
                                </label>
                                <input type="date" value={exportDate} onChange={onExportDateChange} style={modalInputStyle} />
                            </div>
                            <button onClick={onExport} style={{
                                width: "100%", padding: "14px", borderRadius: "10px", border: "none",
                                background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                                color: "#fff", fontWeight: 700, fontSize: "15px", cursor: "pointer",
                                marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
                            }}>Export to Excel</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Add Newcomer Modal ──────────────────────────────────────────────────────
function AddNewcomerModal({ show, onClose, onAdd, tribesList }) {
    const [firstname, setFirstname] = useState("");
    const [lastname, setLastname] = useState("");
    const [tribe, setTribe] = useState("");
    const [invitedBy, setInvitedBy] = useState("");
    const [remarks, setRemarks] = useState("1st Timer");
    const [saving, setSaving] = useState(false);

    if (!show) return null;

    const handleSave = async () => {
        if (!firstname || !lastname || !tribe) {
            Swal.fire({ icon: "warning", title: "Missing Info", text: "First name, last name, and tribe are required.", confirmButtonColor: "#c9a45c" });
            return;
        }
        setSaving(true);
        await onAdd({ firstname, lastname, tribe, invitedBy, remarks });
        setSaving(false);
        setFirstname(""); setLastname(""); setTribe(""); setInvitedBy(""); setRemarks("1st Timer");
    };

    return (
        <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1100, padding: "20px"
        }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{
                background: "#fff", borderRadius: "14px", width: "100%", maxWidth: "420px",
                padding: "22px", boxShadow: "0 20px 50px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto"
            }}>
                <h2 style={{ margin: "0 0 4px 0", fontSize: "17px", fontWeight: 700 }}>Add Newcomer</h2>
                <p style={{ margin: "0 0 16px 0", fontSize: "12px", color: "#9ca3af" }}>
                    Walk-in during this service — will be marked Present automatically.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <input type="text" placeholder="First Name" value={firstname} onChange={e => setFirstname(e.target.value)} style={modalInputStyle} />
                    <input type="text" placeholder="Last Name" value={lastname} onChange={e => setLastname(e.target.value)} style={modalInputStyle} />
                    <select value={tribe} onChange={e => setTribe(e.target.value)} style={modalInputStyle}>
                        <option value="">Select Tribe *</option>
                        {tribesList.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input type="text" placeholder="Invited By (optional)" value={invitedBy} onChange={e => setInvitedBy(e.target.value)} style={modalInputStyle} />
                    <select value={remarks} onChange={e => setRemarks(e.target.value)} style={modalInputStyle}>
                        {(allNewcomerStages && allNewcomerStages.length ? allNewcomerStages : ["1st Timer", "2nd Timer", "3rd Timer"]).map(stage => (
                            <option key={stage} value={stage}>{stage}</option>
                        ))}
                    </select>
                </div>
                <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                    <button onClick={onClose} style={{
                        flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db",
                        background: "#fff", fontWeight: 600, fontSize: "13px", cursor: "pointer"
                    }}>Cancel</button>
                    <button onClick={handleSave} disabled={saving} style={{
                        flex: 1, padding: "10px", borderRadius: "8px", border: "none",
                        background: "#16a34a", color: "#fff", fontWeight: 700, fontSize: "13px",
                        cursor: "pointer", opacity: saving ? 0.7 : 1
                    }}>{saving ? "Adding..." : "Add & Mark Present"}</button>
                </div>
            </div>
        </div>
    );
}

// ── Main Component ───────────────────────────────────────────────────────────
function Attendance() {
    const navigate = useNavigate();
    const [leaders, setLeaders] = useState([]);
    const [attendanceMap, setAttendanceMap] = useState({});
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [selectedTribe, setSelectedTribe] = useState("");
    const [sortOrder, setSortOrder] = useState("asc");
    const [loading, setLoading] = useState(false);
    const [exportMonth, setExportMonth] = useState("");
    const [exportDate, setExportDate] = useState("");
    const [serviceType, setServiceType] = useState("");
    const [showModal, setShowModal] = useState(true);
    const [modalTab, setModalTab] = useState("record");
    const [isRecording, setIsRecording] = useState(false);
    const [stats, setStats] = useState({ total: 0, present: 0, absent: 0 });
    const [tribeTargets, setTribeTargets] = useState({});
    const [defaultGoalsLoaded, setDefaultGoalsLoaded] = useState(false);

    const [recordTab, setRecordTab] = useState("leaders");
    const [newcomers, setNewcomers] = useState([]);
    const [newcomerAttendanceMap, setNewcomerAttendanceMap] = useState({});
    const [newcomersLoading, setNewcomersLoading] = useState(false);
    const [newcomerSearch, setNewcomerSearch] = useState("");
    const [showAddNewcomer, setShowAddNewcomer] = useState(false);

    // ════════════════════════════════════════════════════════════════════════
    // Load default tribe goals on mount + when modal opens
    // ════════════════════════════════════════════════════════════════════════
    useEffect(() => {
        loadDefaultGoals();
    }, []);

    const loadDefaultGoals = async () => {
        const defaults = await fetchDefaultTribeGoals();
        if (Object.keys(defaults).length > 0) {
            setTribeTargets(prev => {
                const merged = { ...prev };
                tribes.forEach(t => {
                    if (defaults[t] !== undefined && merged[t] === undefined) {
                        merged[t] = defaults[t];
                    }
                });
                return merged;
            });
            setDefaultGoalsLoaded(true);
        }
    };

    useEffect(() => { fetchLeaders(); }, []);

    useEffect(() => {
        if (isRecording && date) {
            fetchAttendance(date);
            fetchNewcomerAttendance(date);
        }
    }, [date, isRecording]);

    useEffect(() => {
        if (isRecording) fetchNewcomers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRecording]);

    useEffect(() => {
        if (recordTab === "leaders") {
            const present = Object.values(attendanceMap).filter(s => s === "Present").length;
            const total = sorted.length;
            setStats({ total, present, absent: total - present });
        } else {
            const present = Object.values(newcomerAttendanceMap).filter(s => s === "Present").length;
            const total = filteredNewcomers.length;
            setStats({ total, present, absent: total - present });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attendanceMap, newcomerAttendanceMap, selectedTribe, sortOrder, newcomerSearch, recordTab, newcomers]);

    const fetchLeaders = async () => {
        const { data } = await supabase
            .from("tblMonitoring").select("*").order("firstname", { ascending: true });
        setLeaders(data || []);
    };

    const fetchAttendance = async (selectedDate) => {
        const { data } = await supabase
            .from("tblAttendance").select("*").eq("service_date", selectedDate);
        const map = {};
        data?.forEach(item => { map[item.leader_id] = item.status; });
        setAttendanceMap(map);
    };

    const fetchNewcomers = async () => {
        setNewcomersLoading(true);
        const { data, error } = await supabase
            .from("tblNewMembers")
            .select("*")
            .order("firstname", { ascending: true });
        if (error) console.log("Fetch Newcomers Error:", error);
        else setNewcomers(data || []);
        setNewcomersLoading(false);
    };

    const fetchNewcomerAttendance = async (selectedDate) => {
        const { data } = await supabase
            .from("tblNewcomerAttendance").select("*").eq("service_date", selectedDate);
        const map = {};
        data?.forEach(item => { map[item.newcomer_id] = item.status; });
        setNewcomerAttendanceMap(map);
    };

    const toggleNewcomerAttendance = (newcomerId) => {
        const current = newcomerAttendanceMap[newcomerId];
        setNewcomerAttendanceMap(prev => ({ ...prev, [newcomerId]: current === "Present" ? "Absent" : "Present" }));
    };

    const handleAddWalkInNewcomer = async ({ firstname, lastname, tribe, invitedBy, remarks }) => {
        const { data, error } = await supabase
            .from("tblNewMembers")
            .insert([{
                firstname, lastname, tribe, remarks,
                invited_by: invitedBy || null,
                attendance_count: 0,
                visit_number: 0,
                consecutive_absences: 0,
                status: "ACTIVE",
            }])
            .select();

        if (error) {
            Swal.fire({ icon: "error", title: "Failed to Add", text: error.message });
            return;
        }
        const newMember = data[0];
        setNewcomers(prev => [...prev, newMember]);
        setNewcomerAttendanceMap(prev => ({ ...prev, [newMember.id]: "Present" }));
        setShowAddNewcomer(false);
        Swal.fire({
            icon: "success", title: "Newcomer Added",
            text: `${firstname} ${lastname} marked Present.`,
            timer: 1500, showConfirmButton: false,
        });
    };

    const getAutoServiceType = (d) => {
        const day = new Date(d).getDay();
        const formatted = new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
        if (day === 0) return `SUNDAY SERVICE ${formatted}`;
        if (day === 4) return `PRAYER WORKS ${formatted}`;
        if (day === 5) return `YOUTH GIG ${formatted}`;
        return `SERVICE ${formatted}`;
    };

    const handleDateChange = useCallback((e) => {
        const newDate = e.target.value;
        setDate(newDate);
        setServiceType(getAutoServiceType(newDate));
    }, []);

    const handleServiceTypeChange = useCallback((e) => { setServiceType(e.target.value); }, []);

    const handleServicePreset = useCallback((preset) => {
        const formatted = new Date(date || Date.now()).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
        setServiceType(`${preset} ${formatted}`);
    }, [date]);

    const handleTargetChange = useCallback((tribe, value) => {
        setTribeTargets(prev => ({ ...prev, [tribe]: value === "" ? "" : Math.max(0, parseInt(value) || 0) }));
    }, []);

    // ════════════════════════════════════════════════════════════════════════
    // Start Recording: Save goals as defaults, then proceed
    // ════════════════════════════════════════════════════════════════════════
    const startRecording = async () => {
        if (!date) {
            Swal.fire({ icon: "warning", title: "Date Required", text: "Please select a date.", confirmButtonColor: "#c9a45c" });
            return;
        }
        if (!serviceType.trim()) {
            Swal.fire({ icon: "warning", title: "Service Type Required", text: "Please enter the service type.", confirmButtonColor: "#c9a45c" });
            return;
        }
        const missingTargets = tribes.filter(t => tribeTargets[t] === undefined || tribeTargets[t] === "");
        if (missingTargets.length > 0) {
            Swal.fire({ icon: "warning", title: "Tribe Targets Required", text: `Please set a target for: ${missingTargets.join(", ")}`, confirmButtonColor: "#c9a45c" });
            return;
        }

        // Save goals as defaults for future services
        const { error: goalError } = await saveDefaultTribeGoals(tribeTargets);
        if (goalError) {
            console.error("⚠️ Could not save default goals:", goalError.message);
            // Don't block the user - per-service goals are still saved in tblTribeTargets
        }

        setIsRecording(true);
        setShowModal(false);
        setRecordTab("leaders");
    };

    const toggleAttendance = (leaderId) => {
        const current = attendanceMap[leaderId];
        setAttendanceMap(prev => ({ ...prev, [leaderId]: current === "Present" ? "Absent" : "Present" }));
    };

    // ════════════════════════════════════════════════════════════════════════
    // SINGLE SAVE: Both leaders and newcomers saved together in ONE action
    // ════════════════════════════════════════════════════════════════════════
    const handleSave = async () => {
        if (!serviceType.trim() || !date) {
            Swal.fire({ icon: "warning", title: "Missing Info", text: "Date and service type are required.", confirmButtonColor: "#c9a45c" });
            return;
        }

        setLoading(true);

        // ── 1. Delete old records for this date ──
        await supabase.from("tblAttendance").delete().eq("service_date", date);
        await supabase.from("tblNewcomerAttendance").delete().eq("service_date", date);

        // ── 2. Build leader attendance records ──
        const leaderRecords = sorted.map(leader => ({
            leader_id: leader.id,
            service_date: date,
            status: attendanceMap[leader.id] || "Absent",
            remarks: serviceType,
        }));

        // ── 3. Build newcomer attendance records + compute updates ──
        const newcomerAttendanceRecords = [];
        const newcomerUpdates = [];

        for (const member of newcomers) {
            const status = newcomerAttendanceMap[member.id] || "Absent";
            const wasPresent = status === "Present";

            const prevAttendanceCount = member.attendance_count || 0;
            const prevVisitNumber = member.visit_number || 0;
            const prevConsecutiveAbsences = member.consecutive_absences || 0;
            const prevStatus = member.status || "ACTIVE";
            const prevStage = member.remarks;

            let newAttendanceCount = prevAttendanceCount;
            let newVisitNumber = prevVisitNumber;
            let newConsecutiveAbsences = prevConsecutiveAbsences;
            let newStatus = prevStatus;
            let newStage = prevStage;

            if (wasPresent) {
                newAttendanceCount = prevAttendanceCount + 1;
                newVisitNumber = prevVisitNumber + 1;
                newConsecutiveAbsences = 0;
                if (newVisitNumber >= ACTIVE_STREAK) newStatus = "ACTIVE";
                const advanced = getConsoAutoAdvance(prevStage);
                if (advanced) newStage = advanced;
            } else {
                newVisitNumber = 0;
                newConsecutiveAbsences = prevConsecutiveAbsences + 1;
                if (newConsecutiveAbsences >= INACTIVE_STREAK) newStatus = "INACTIVE";
            }

            newcomerAttendanceRecords.push({
                newcomer_id: member.id,
                service_date: date,
                status,
                remarks: serviceType,
                visit_number: newVisitNumber,
            });

            newcomerUpdates.push({
                id: member.id,
                attendance_count: newAttendanceCount,
                visit_number: newVisitNumber,
                consecutive_absences: newConsecutiveAbsences,
                status: newStatus,
                remarks: newStage,
            });
        }

        // ── 4. Insert all records (leaders + newcomers) ──
        const { error: leaderError } = leaderRecords.length
            ? await supabase.from("tblAttendance").insert(leaderRecords)
            : { error: null };

        const { error: newcomerAttError } = newcomerAttendanceRecords.length
            ? await supabase.from("tblNewcomerAttendance").insert(newcomerAttendanceRecords)
            : { error: null };

        // ── 5. Update newcomer statuses/stages ──
        for (const update of newcomerUpdates) {
            await supabase.from("tblNewMembers").update({
                attendance_count: update.attendance_count,
                visit_number: update.visit_number,
                consecutive_absences: update.consecutive_absences,
                status: update.status,
                remarks: update.remarks,
            }).eq("id", update.id);
        }

        setNewcomers(prev => prev.map(member => {
            const update = newcomerUpdates.find(u => u.id === member.id);
            return update ? { ...member, ...update } : member;
        }));

        // ── 6. Save tribe targets for this service (per-service record) ──
        await supabase.from("tblTribeTargets").delete().eq("service_date", date).eq("service_type", serviceType);
        const targetRecords = tribes.map(tribe => ({
            service_date: date,
            service_type: serviceType,
            tribe,
            target_number: tribeTargets[tribe] || 0,
        }));
        await supabase.from("tblTribeTargets").insert(targetRecords);

        setLoading(false);

        if (leaderError || newcomerAttError) {
            Swal.fire({ icon: "error", title: "Save Failed", text: (leaderError || newcomerAttError).message });
        } else {
            const newcomersPresent = Object.values(newcomerAttendanceMap).filter(s => s === "Present").length;
            const leadersPresent = Object.values(attendanceMap).filter(s => s === "Present").length;
            Swal.fire({
                icon: "success", title: "Attendance Saved",
                text: `${serviceType} — ${leadersPresent} leaders & ${newcomersPresent} newcomers present`,
                timer: 2200, showConfirmButton: false,
            });
        }
    };

    // ════════════════════════════════════════════════════════════════════════
    // SINGLE SHEET EXPORT: One sheet with all attendees mixed together
    // Uses default goals from tblTribeGoalDefaults as fallback
    // ════════════════════════════════════════════════════════════════════════
    const handleExport = async () => {
        if (!exportMonth && !exportDate) {
            Swal.fire({ icon: "warning", title: "Select Period", text: "Please select a month or date to export.", confirmButtonColor: "#c9a45c" });
            return;
        }

        const dateFilter = (query, col) => {
            if (exportDate) return query.eq(col, exportDate);
            const [year, month] = exportMonth.split("-");
            const lastDay = new Date(year, month, 0).getDate();
            return query.gte(col, `${exportMonth}-01`).lte(col, `${exportMonth}-${String(lastDay).padStart(2, "0")}`);
        };

        // Fetch attendance data
        const { data: attendanceData } = await dateFilter(
            supabase.from("tblAttendance").select("*").order("service_date", { ascending: true }), "service_date"
        );
        const { data: newcomerAttendanceData } = await dateFilter(
            supabase.from("tblNewcomerAttendance").select("*").order("service_date", { ascending: true }), "service_date"
        );
        const { data: targetsData } = await dateFilter(
            supabase.from("tblTribeTargets").select("*"), "service_date"
        );

        if (!attendanceData?.length && !newcomerAttendanceData?.length) {
            Swal.fire({ icon: "info", title: "No Records", text: "No attendance records found for the selected period." });
            return;
        }

        // Fetch names
        const leaderIds = [...new Set((attendanceData || []).map(a => a.leader_id))];
        const { data: leadersData } = await supabase
            .from("tblMonitoring").select("id, firstname, lastname, tribe, type, ministry")
            .in("id", leaderIds.length ? leaderIds : [0]);
        const leaderMap = {};
        leadersData?.forEach(l => { leaderMap[l.id] = l; });

        const newcomerIds = [...new Set((newcomerAttendanceData || []).map(a => a.newcomer_id))];
        const { data: newcomersData } = await supabase
            .from("tblNewMembers").select("id, firstname, lastname, tribe, remarks")
            .in("id", newcomerIds.length ? newcomerIds : [0]);
        const newcomerMap = {};
        newcomersData?.forEach(n => { newcomerMap[n.id] = n; });

        // Fetch default goals as fallback
        const defaultGoals = await fetchDefaultTribeGoals();

        exportToExcel(attendanceData || [], newcomerAttendanceData || [], leaderMap, newcomerMap, targetsData || [], defaultGoals, exportDate, exportMonth);
    };

    const exportToExcel = (attendanceData, newcomerAttendanceData, leaderMap, newcomerMap, targetsData, defaultGoals, exportDateVal, exportMonthVal) => {
        const wb = XLSX.utils.book_new();

        // ── Styles ──
        const goldHeader = {
            fill: { fgColor: { rgb: "C9A45C" }, patternType: "solid" },
            font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
            alignment: { horizontal: "center", vertical: "center" },
            border: { top: { style: "thin", color: { rgb: "B8934A" } }, bottom: { style: "thin", color: { rgb: "B8934A" } }, left: { style: "thin", color: { rgb: "B8934A" } }, right: { style: "thin", color: { rgb: "B8934A" } } }
        };
        const dataCell = {
            font: { sz: 11, color: { rgb: "374151" } },
            border: { top: { style: "thin", color: { rgb: "E5E7EB" } }, bottom: { style: "thin", color: { rgb: "E5E7EB" } }, left: { style: "thin", color: { rgb: "E5E7EB" } }, right: { style: "thin", color: { rgb: "E5E7EB" } } }
        };
        const altRow = { fill: { fgColor: { rgb: "F9FAFB" }, patternType: "solid" }, ...dataCell };
        const presentStyle = { font: { sz: 11, color: { rgb: "16A34A" }, bold: true }, alignment: { horizontal: "center" }, border: dataCell.border };
        const absentStyle = { font: { sz: 11, color: { rgb: "DC2626" }, bold: true }, alignment: { horizontal: "center" }, border: dataCell.border };
        const metStyle = {
            font: { sz: 11, color: { rgb: "16A34A" }, bold: true }, alignment: { horizontal: "center" },
            border: dataCell.border, fill: { fgColor: { rgb: "ECFDF5" }, patternType: "solid" }
        };
        const notMetStyle = {
            font: { sz: 11, color: { rgb: "DC2626" }, bold: true }, alignment: { horizontal: "center" },
            border: dataCell.border, fill: { fgColor: { rgb: "FEF2F2" }, patternType: "solid" }
        };
        const titleStyle = { font: { bold: true, color: { rgb: "B8934A" }, sz: 18 }, alignment: { horizontal: "center" } };
        const totalStyle = { font: { bold: true, color: { rgb: "374151" }, sz: 12 }, fill: { fgColor: { rgb: "F3F4F6" }, patternType: "solid" }, border: dataCell.border };

        // ── Calculate tribe totals (leaders + newcomers combined) ──
        const tribeCounts = {};
        tribes.forEach(t => { tribeCounts[t] = 0; });

        attendanceData.forEach(rec => {
            if (rec.status !== "Present") return;
            const leader = leaderMap[rec.leader_id];
            if (leader?.tribe && tribeCounts[leader.tribe] !== undefined) tribeCounts[leader.tribe]++;
        });
        newcomerAttendanceData.forEach(rec => {
            if (rec.status !== "Present") return;
            const newcomer = newcomerMap[rec.newcomer_id];
            if (newcomer?.tribe && tribeCounts[newcomer.tribe] !== undefined) tribeCounts[newcomer.tribe]++;
        });

        // ═══════════════════════════════════════════════════════════════════
        // FIX: Get goals using per-service first, then default fallback
        // ═══════════════════════════════════════════════════════════════════
        const targetByTribe = {};
        tribes.forEach(t => {
            // Try per-service goals first (average if multiple services in period)
            const serviceEntries = targetsData.filter(tg => tg.tribe === t);
            if (serviceEntries.length > 0) {
                targetByTribe[t] = Math.round(serviceEntries.reduce((s, e) => s + (e.target_number || 0), 0) / serviceEntries.length);
            } else {
                // Fall back to default goals from tblTribeGoalDefaults
                targetByTribe[t] = defaultGoals[t] || 0;
            }
        });

        // ── Build unified records list (leaders + newcomers mixed) ──
        const allRecords = [];

        // Add leader records
        attendanceData.forEach(rec => {
            const leader = leaderMap[rec.leader_id];
            if (!leader) return;
            allRecords.push({
                date: rec.service_date,
                service: rec.remarks,
                name: `${leader.firstname || ""} ${leader.lastname || ""}`.trim(),
                tribe: leader.tribe || "",
                status: rec.status,
                type: "Leader",
                displayStatus: "Regular",
                isLeader: true,
            });
        });

        // Add newcomer records
        newcomerAttendanceData.forEach(rec => {
            const nc = newcomerMap[rec.newcomer_id];
            if (!nc) return;
            allRecords.push({
                date: rec.service_date,
                service: rec.remarks,
                name: `${nc.firstname || ""} ${nc.lastname || ""}`.trim(),
                tribe: nc.tribe || "",
                status: rec.status,
                type: "Newcomer",
                displayStatus: getDisplayStatus(false, nc.remarks),
                isLeader: false,
            });
        });

        // Sort by tribe, then name
        allRecords.sort((a, b) => {
            if (a.tribe !== b.tribe) return a.tribe.localeCompare(b.tribe);
            return a.name.localeCompare(b.name);
        });

        // ── Build single sheet data ──
        const sheetData = [
            ["MAC TLDA CHURCH"],
            ["Combined Attendance Record"],
            [`Period: ${exportDateVal || exportMonthVal || "All"}`],
            [`Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`],
            [],
            ["No.", "Date", "Service", "Name", "Tribe", "Member Type", "Status", "Goal", "Goal Status"]
        ];

        let grandPresent = 0;
        let grandAbsent = 0;

        allRecords.forEach((rec, i) => {
            const goal = targetByTribe[rec.tribe] || 0;
            const tribeTotal = tribeCounts[rec.tribe] || 0;
            const achieved = goal > 0 && tribeTotal >= goal;

            sheetData.push([
                i + 1,
                rec.date,
                rec.service,
                rec.name,
                rec.tribe,
                rec.displayStatus,   // 1st Timer / 2nd Timer / 3rd Timer / Regular
                rec.status,
                goal,
                goal === 0 ? "NO GOAL SET" : (achieved ? "ACHIEVED GOAL" : "GOAL NOT ACHIEVED")
            ]);

            if (rec.status === "Present") grandPresent++;
            else grandAbsent++;
        });

        // Totals at bottom
        sheetData.push(
            [],
            ["", "", "", "", "", "", "TOTAL PRESENT", grandPresent, ""],
            ["", "", "", "", "", "", "TOTAL ABSENT", grandAbsent, ""],
            ["", "", "", "", "", "", "GRAND TOTAL", grandPresent + grandAbsent, ""]
        );

        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        ws["!cols"] = [
            { wch: 6 },   // No.
            { wch: 14 },  // Date
            { wch: 32 },  // Service
            { wch: 26 },  // Name
            { wch: 14 },  // Tribe
            { wch: 14 },  // Member Type (Status column)
            { wch: 12 },  // Status (Present/Absent)
            { wch: 10 },  // Goal
            { wch: 20 }   // Goal Status
        ];

        // Title rows merge
        for (let r = 0; r <= 3; r++) {
            const cell = XLSX.utils.encode_cell({ r, c: 0 });
            if (ws[cell]) {
                ws[cell].s = titleStyle;
                ws["!merges"] = ws["!merges"] || [];
                ws["!merges"].push({ s: { r, c: 0 }, e: { r, c: 8 } });
            }
        }

        // Header row
        for (let c = 0; c <= 8; c++) {
            const cell = XLSX.utils.encode_cell({ r: 5, c });
            if (ws[cell]) ws[cell].s = goldHeader;
        }

        // Data rows styling
        allRecords.forEach((rec, i) => {
            const r = 6 + i;
            for (let c = 0; c <= 8; c++) {
                const cell = XLSX.utils.encode_cell({ r, c });
                if (!ws[cell]) return;

                if (c === 6) { // Status column (Present/Absent)
                    ws[cell].s = rec.status === "Present" ? presentStyle : absentStyle;
                } else if (c === 8) { // Goal Status
                    const goal = targetByTribe[rec.tribe] || 0;
                    const tribeTotal = tribeCounts[rec.tribe] || 0;
                    const achieved = goal > 0 && tribeTotal >= goal;
                    ws[cell].s = goal === 0 ? dataCell : (achieved ? metStyle : notMetStyle);
                } else {
                    ws[cell].s = i % 2 === 1 ? altRow : dataCell;
                }
            }
        });

        // Total rows styling
        const totalStartRow = 6 + allRecords.length + 1;
        for (let r = totalStartRow; r <= totalStartRow + 2; r++) {
            for (let c = 0; c <= 8; c++) {
                const cell = XLSX.utils.encode_cell({ r, c });
                if (ws[cell]) ws[cell].s = totalStyle;
            }
        }

        XLSX.utils.book_append_sheet(wb, ws, "Attendance Record");

        const filename = exportDateVal ? `Attendance_${exportDateVal}.xlsx` : `Attendance_${exportMonthVal}.xlsx`;
        XLSX.writeFile(wb, filename);

        Swal.fire({ icon: "success", title: "Excel Exported", confirmButtonColor: "#c9a45c" })
            .then(() => {
                setShowModal(true);
                setIsRecording(false);
                setExportMonth("");
                setExportDate("");
                setAttendanceMap({});
                setNewcomerAttendanceMap({});
                setTribeTargets({});
            });
    };

    const handleCloseModal = () => navigate("/dashboard");
    const handleBackToModal = () => {
        setIsRecording(false);
        setAttendanceMap({});
        setNewcomerAttendanceMap({});
        setShowModal(true);
    };

    const filtered = leaders.filter(l => selectedTribe ? l.tribe === selectedTribe : true);
    const sorted = [...filtered].sort((a, b) =>
        sortOrder === "asc" ? a.firstname.localeCompare(b.firstname) : b.firstname.localeCompare(a.firstname)
    );

    const filteredNewcomers = newcomers.filter(n => {
        if (!newcomerSearch) return true;
        const fullName = `${n.firstname} ${n.lastname}`.toLowerCase();
        return fullName.includes(newcomerSearch.toLowerCase());
    });

    // ── Not recording: show modal ──
    if (!isRecording) {
        return (
            <div className="attendance-layout">
                <Sidebar />
                <div className="attendance-content" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
                    <AttendanceModal
                        showModal={showModal}
                        modalTab={modalTab}
                        setModalTab={setModalTab}
                        date={date}
                        serviceType={serviceType}
                        exportMonth={exportMonth}
                        exportDate={exportDate}
                        tribeTargets={tribeTargets}
                        onDateChange={handleDateChange}
                        onServiceTypeChange={handleServiceTypeChange}
                        onServicePreset={handleServicePreset}
                        onTargetChange={handleTargetChange}
                        onStartRecording={startRecording}
                        onExport={handleExport}
                        onExportMonthChange={e => { setExportMonth(e.target.value); setExportDate(""); }}
                        onExportDateChange={e => { setExportDate(e.target.value); setExportMonth(""); }}
                        onClose={handleCloseModal}
                        defaultGoalsLoaded={defaultGoalsLoaded}
                    />
                </div>
            </div>
        );
    }

    // ── Recording view ──
    return (
        <div className="attendance-layout">
            <Sidebar />
            <div className="attendance-content">
                {/* Recording Header */}
                <div className="attendance-topbar">
                    <div>
                        <h1 className="attendance-heading">Attendance</h1>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
                            <span className="attendance-service">{serviceType}</span>
                            <span style={{ padding: "3px 10px", borderRadius: "8px", background: "#dbeafe", color: "#1e40af", fontSize: "12px", fontWeight: 600 }}>
                                {date}
                            </span>
                        </div>
                    </div>
                    <div className="attendance-stats">
                        <div className="stat-pill"><span className="stat-num">{stats.present}</span> Present</div>
                        <div className="stat-pill"><span className="stat-num">{stats.absent}</span> Absent</div>
                        <div className="stat-pill"><span className="stat-num">{stats.total}</span> Total</div>
                    </div>
                </div>

                {/* Leaders / Newcomers tab switch */}
                <div style={{ display: "flex", gap: "4px", marginBottom: "12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "4px", width: "fit-content" }}>
                    <button onClick={() => setRecordTab("leaders")} style={{
                        padding: "8px 18px", borderRadius: "6px", border: "none", fontSize: "13px", fontWeight: 700, cursor: "pointer",
                        background: recordTab === "leaders" ? "#c9a45c" : "transparent",
                        color: recordTab === "leaders" ? "#fff" : "#6b7280",
                        transition: "all 0.2s"
                    }}>Leaders</button>
                    <button onClick={() => setRecordTab("newcomers")} style={{
                        padding: "8px 18px", borderRadius: "6px", border: "none", fontSize: "13px", fontWeight: 700, cursor: "pointer",
                        background: recordTab === "newcomers" ? "#c9a45c" : "transparent",
                        color: recordTab === "newcomers" ? "#fff" : "#6b7280",
                        transition: "all 0.2s"
                    }}>Newcomers</button>
                </div>

                {/* ══ LEADERS TAB ══ */}
                {recordTab === "leaders" && (
                    <>
                        <div className="attendance-toolbar">
                            <div className="toolbar-group">
                                <select className="input-sm" value={selectedTribe} onChange={e => setSelectedTribe(e.target.value)}>
                                    <option value="">All Tribes</option>
                                    {tribes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <button className="btn-sm btn-outline" onClick={() => setSortOrder(o => o === "asc" ? "desc" : "asc")}>
                                    {sortOrder === "asc" ? "A–Z" : "Z–A"}
                                </button>
                            </div>
                            <div className="toolbar-group">
                                <button className="btn-sm btn-outline" onClick={handleBackToModal}>Change Service</button>
                                <button className="btn-sm btn-primary" onClick={handleSave} disabled={loading}>
                                    {loading ? "Saving..." : "Save Attendance"}
                                </button>
                            </div>
                        </div>

                        <div className="attendance-table-container">
                            <div className="flex-table-header">
                                <div className="flex-col flex-col-name">Name</div>
                                <div className="flex-col flex-col-tribe">Tribe</div>
                                <div className="flex-col flex-col-type">Type</div>
                                <div className="flex-col flex-col-status">Status</div>
                                <div className="flex-col flex-col-action">Action</div>
                            </div>
                            <div className="flex-table-body">
                                {sorted.map(leader => {
                                    const status = attendanceMap[leader.id] || "Absent";
                                    return (
                                        <div className="flex-row" key={leader.id}>
                                            <div className="flex-col flex-col-name">
                                                <img src={leader.image_url || "https://placehold.co/32"} alt="" className="avatar-sm" />
                                                <span className="name-text">{leader.firstname} {leader.lastname}</span>
                                            </div>
                                            <div className="flex-col flex-col-tribe">{leader.tribe}</div>
                                            <div className="flex-col flex-col-type">
                                                <span className="badge-sm">{leader.type}</span>
                                            </div>
                                            <div className="flex-col flex-col-status">
                                                <span className={`dot ${status === "Present" ? "dot-present" : "dot-absent"}`}></span>
                                                <span className="status-text">{status}</span>
                                            </div>
                                            <div className="flex-col flex-col-action">
                                                <button className={`toggle-sm ${status === "Present" ? "is-present" : "is-absent"}`}
                                                    onClick={() => toggleAttendance(leader.id)}>
                                                    {status === "Present" ? "Absent" : "Present"}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}

                {/* ══ NEWCOMERS TAB ══ */}
                {recordTab === "newcomers" && (
                    <>
                        <div className="attendance-toolbar">
                            <div className="toolbar-group" style={{ flex: 1 }}>
                                <input type="text" className="input-sm" placeholder="Search newcomer..."
                                    value={newcomerSearch} onChange={e => setNewcomerSearch(e.target.value)}
                                    style={{ minWidth: "200px" }} />
                                <button className="btn-sm btn-primary" onClick={() => setShowAddNewcomer(true)}>
                                    + Add Newcomer
                                </button>
                            </div>
                            <div className="toolbar-group">
                                <button className="btn-sm btn-outline" onClick={handleBackToModal}>Change Service</button>
                                <button className="btn-sm btn-primary" onClick={handleSave} disabled={loading}>
                                    {loading ? "Saving..." : "Save Attendance"}
                                </button>
                            </div>
                        </div>

                        <div className="attendance-table-container">
                            <div className="flex-table-header">
                                <div className="flex-col flex-col-name">Name</div>
                                <div className="flex-col flex-col-tribe">Tribe</div>
                                <div className="flex-col" style={{ flex: "1 1 20%", minWidth: "105px" }}>Stage</div>
                                <div className="flex-col" style={{ flex: "1 1 14%", minWidth: "90px" }}>Status</div>
                                <div className="flex-col flex-col-status">Attendance</div>
                                <div className="flex-col flex-col-action" style={{ flex: "0 0 100px", minWidth: "90px" }}>Action</div>
                            </div>
                            <div className="flex-table-body">
                                {newcomersLoading ? (
                                    <div style={{ padding: "30px", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>Loading newcomers...</div>
                                ) : filteredNewcomers.length === 0 ? (
                                    <div style={{ padding: "30px", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>No newcomers found.</div>
                                ) : (
                                    filteredNewcomers.map(member => {
                                        const ncStatus = member.status || "ACTIVE";
                                        const ncStyle = getNewcomerStatusStyle(ncStatus);
                                        const present = newcomerAttendanceMap[member.id] === "Present";
                                        const willAdvance = present && getConsoAutoAdvance(member.remarks);

                                        return (
                                            <div className="flex-row" key={member.id}>
                                                <div className="flex-col flex-col-name">
                                                    <div style={{
                                                        width: "28px", height: "28px", borderRadius: "50%",
                                                        background: getStageColor(member.remarks),
                                                        color: getStageTextColor(member.remarks),
                                                        display: "flex", alignItems: "center", justifyContent: "center",
                                                        fontSize: "10px", fontWeight: 700, flexShrink: 0
                                                    }}>
                                                        {getInitials(member.firstname, member.lastname)}
                                                    </div>
                                                    <span className="name-text">{member.firstname} {member.lastname}</span>
                                                </div>
                                                <div className="flex-col flex-col-tribe">{member.tribe}</div>
                                                <div className="flex-col" style={{ flex: "1 1 20%", minWidth: "105px" }}>
                                                    <span style={{
                                                        padding: "3px 9px", borderRadius: "10px",
                                                        background: getStageColor(member.remarks),
                                                        color: getStageTextColor(member.remarks),
                                                        fontSize: "10px", fontWeight: 700, whiteSpace: "nowrap"
                                                    }}>
                                                        {member.remarks}
                                                    </span>
                                                    {willAdvance && (
                                                        <div style={{ fontSize: "9px", color: "#16a34a", marginTop: "2px", fontWeight: 600 }}>
                                                            → {willAdvance} on save
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-col" style={{ flex: "1 1 14%", minWidth: "90px" }}>
                                                    <span style={{
                                                        padding: "3px 9px", borderRadius: "10px",
                                                        background: ncStyle.bg, color: ncStyle.color,
                                                        border: `1px solid ${ncStyle.border}`,
                                                        fontSize: "10px", fontWeight: 700, whiteSpace: "nowrap"
                                                    }} title={`Present streak: ${member.visit_number || 0} | Absent streak: ${member.consecutive_absences || 0}`}>
                                                        {ncStatus}
                                                    </span>
                                                </div>
                                                <div className="flex-col flex-col-status">
                                                    <span className={`dot ${present ? "dot-present" : "dot-absent"}`}></span>
                                                    <span className="status-text">{present ? "Present" : "Absent"}</span>
                                                </div>
                                                <div className="flex-col flex-col-action" style={{ flex: "0 0 100px", minWidth: "90px" }}>
                                                    <button className={`toggle-sm ${present ? "is-present" : "is-absent"}`}
                                                        onClick={() => toggleNewcomerAttendance(member.id)}>
                                                        {present ? "Absent" : "Present"}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <AddNewcomerModal
                show={showAddNewcomer}
                onClose={() => setShowAddNewcomer(false)}
                onAdd={handleAddWalkInNewcomer}
                tribesList={tribes}
            />
        </div>
    );
}

export default Attendance;