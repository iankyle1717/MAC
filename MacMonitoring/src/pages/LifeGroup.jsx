import { useEffect, useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";
import { getCurrentUser } from "../utils/auth";

function LifeGroup() {
    const user = getCurrentUser();
    const userRef = useRef(user);

    useEffect(() => {
        userRef.current = user;
    }, [user?.id]);

    const [records, setRecords] = useState([]);
    const [topic, setTopic] = useState("");
    const [place, setPlace] = useState("");
    const [type, setType] = useState("");
    const [exhorter, setExhorter] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [filterMonth, setFilterMonth] = useState("ALL");
    const [showForm, setShowForm] = useState(false);

    // ── NEW: LifeGroup Checker features ─────────────────────────────────────
    const [isLifeGroupChecker, setIsLifeGroupChecker] = useState(false);
    const [assignedTribe, setAssignedTribe] = useState("");
    const [tribeLeaders, setTribeLeaders] = useState([]);
    const [selectedLeaderId, setSelectedLeaderId] = useState("");
    const [selectedLeaderName, setSelectedLeaderName] = useState("");
    const [recordMode, setRecordMode] = useState("self"); // "self", "tribe", or "whole_tribe"

    // ── NEW: Whole Tribe summary data ───────────────────────────────────────
    const [wholeTribeRecords, setWholeTribeRecords] = useState([]);
    const [wholeTribeStats, setWholeTribeStats] = useState([]);
    // ───────────────────────────────────────────────────────────────────────

    // ── NEW: Pagination for record cards ────────────────────────────────────
    const [cardPage, setCardPage] = useState(1);
    const CARDS_PER_PAGE = 5;
    // ───────────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (userRef.current) {
            checkLifeGroupCheckerRole();
            fetchRecords();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reset page when records or filter change
    useEffect(() => {
        setCardPage(1);
    }, [filterMonth, records.length, recordMode, selectedLeaderId]);

    // Check if current user is a LifeGroup Checker
    const checkLifeGroupCheckerRole = () => {
        const currentUser = userRef.current;
        if (!currentUser) return;

        const hasDJMinistry = currentUser.ministries?.includes("DISCIPLESHIP JOURNEY") ||
            currentUser.ministry === "DISCIPLESHIP JOURNEY";
        const isLifeGroupCheckerType = currentUser.dj_type === "LifeGroup Checker";
        const hasAssignedTribe = currentUser.assigned_tribe && currentUser.assigned_tribe !== "";

        if (hasDJMinistry && isLifeGroupCheckerType && hasAssignedTribe) {
            setIsLifeGroupChecker(true);
            setAssignedTribe(currentUser.assigned_tribe);
            fetchTribeLeaders(currentUser.assigned_tribe);
        }
    };

    // Fetch all leaders in the assigned tribe
    const fetchTribeLeaders = async (tribe) => {
        const { data, error } = await supabase
            .from("tblMonitoring")
            .select("id, firstname, lastname, nickname")
            .eq("tribe", tribe)
            .order("firstname", { ascending: true });

        if (error) {
            console.error("Error fetching tribe leaders:", error);
        } else {
            setTribeLeaders(data || []);
        }
    };

    const fetchRecords = async () => {
        if (!userRef.current) return;

        setFetching(true);
        const { data, error } = await supabase
            .from("tblLifeGroup")
            .select("*")
            .eq("leader_id", userRef.current.id)
            .order("date", { ascending: false });

        if (error) {
            console.log("Fetch Error:", error);
        } else {
            setRecords(data || []);
        }
        setFetching(false);
    };

    // Fetch records for a specific leader (for LifeGroup Checker view)
    const fetchLeaderRecords = async (leaderId) => {
        setFetching(true);
        const { data, error } = await supabase
            .from("tblLifeGroup")
            .select("*")
            .eq("leader_id", leaderId)
            .order("date", { ascending: false });

        if (error) {
            console.log("Fetch Error:", error);
        } else {
            setRecords(data || []);
        }
        setFetching(false);
    };

    // ── NEW: Fetch all records for the whole tribe (one query) ──────────────
    const fetchWholeTribeRecords = async () => {
        if (!assignedTribe || tribeLeaders.length === 0) return;

        setFetching(true);
        const leaderIds = tribeLeaders.map(l => l.id);

        const { data, error } = await supabase
            .from("tblLifeGroup")
            .select("*")
            .in("leader_id", leaderIds)
            .order("date", { ascending: false });

        if (error) {
            console.error("Whole Tribe Fetch Error:", error);
            setWholeTribeRecords([]);
            setWholeTribeStats([]);
        } else {
            setWholeTribeRecords(data || []);
            computeWholeTribeStats(data || []);
        }
        setFetching(false);
    };

    // ── NEW: Compute per-member stats for the whole tribe view ──────────────
    const computeWholeTribeStats = (allRecords) => {
        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

        const stats = tribeLeaders.map(leader => {
            const leaderRecords = allRecords.filter(r => r.leader_id === leader.id);

            // Count this month's records
            const thisMonthRecords = leaderRecords.filter(r => {
                const d = new Date(r.date);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                return key === currentMonthKey;
            });

            // Count total records
            const totalRecords = leaderRecords.length;

            // Compute consistent months (>=3 records per month)
            const monthly = {};
            leaderRecords.forEach((record) => {
                const d = new Date(record.date);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                if (!monthly[key]) monthly[key] = 0;
                monthly[key]++;
            });

            const consistentMonths = Object.values(monthly).filter(c => c >= 3).length;
            const inconsistentMonths = Object.values(monthly).filter(c => c < 3).length;
            const monthCount = Object.keys(monthly).length;

            const isConsistent = thisMonthRecords.length >= 3;

            return {
                leaderId: leader.id,
                name: `${leader.firstname} ${leader.lastname}${leader.nickname ? ` (${leader.nickname})` : ""}`,
                firstname: leader.firstname,
                lastname: leader.lastname,
                nickname: leader.nickname,
                thisMonthCount: thisMonthRecords.length,
                totalRecords,
                consistentMonths,
                inconsistentMonths,
                monthCount,
                isConsistent,
                status: isConsistent ? "CONSISTENT" : "INCONSISTENT",
                statusColor: isConsistent ? "#16a34a" : "#dc2626",
                statusBg: isConsistent ? "#dcfce7" : "#fee2e2"
            };
        });

        // Sort by name
        stats.sort((a, b) => a.name.localeCompare(b.name));
        setWholeTribeStats(stats);
    };
    // ───────────────────────────────────────────────────────────────────────

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!topic || !place || !type) {
            alert("Complete all fields.");
            return;
        }

        // Determine whose record we're saving
        const targetLeaderId = recordMode === "tribe" && selectedLeaderId
            ? parseInt(selectedLeaderId)
            : userRef.current.id;

        setLoading(true);

        const insertData = {
            leader_id: targetLeaderId,
            topic,
            place,
            type,
            exhorter: exhorter || null,
            date
        };

        const { error } = await supabase
            .from("tblLifeGroup")
            .insert([insertData]);

        if (error) {
            console.error("Insert Error:", error);
            alert(`Failed to record life group.\n\nError: ${error.message}`);
        } else {
            alert("Life Group recorded successfully!");
            setTopic("");
            setPlace("");
            setType("");
            setExhorter("");
            setShowForm(false);

            const newRecord = {
                id: Date.now(),
                leader_id: targetLeaderId,
                topic,
                place,
                type,
                exhorter: exhorter || null,
                date,
                created_at: new Date().toISOString()
            };
            setRecords(prev => [newRecord, ...prev]);

            // ── NEW: Refresh whole tribe stats if in whole_tribe mode ─────
            if (recordMode === "whole_tribe") {
                fetchWholeTribeRecords();
            }
            // ───────────────────────────────────────────────────────────────
        }

        setLoading(false);
    };

    // Handle leader selection change
    const handleLeaderChange = (e) => {
        const leaderId = e.target.value;
        setSelectedLeaderId(leaderId);
        if (leaderId) {
            const leader = tribeLeaders.find(l => String(l.id) === leaderId);
            setSelectedLeaderName(leader ? `${leader.firstname} ${leader.lastname}` : "");
            fetchLeaderRecords(parseInt(leaderId));
        } else {
            setSelectedLeaderName("");
            fetchRecords(); // Back to self
        }
    };

    // Handle record mode change
    const handleModeChange = (mode) => {
        setRecordMode(mode);
        if (mode === "self") {
            setSelectedLeaderId("");
            setSelectedLeaderName("");
            fetchRecords();
        } else if (mode === "whole_tribe") {
            setSelectedLeaderId("");
            setSelectedLeaderName("");
            fetchWholeTribeRecords();
        }
        // If mode === "tribe", keep current selection or let user pick from dropdown
    };

    // ── NEW: Handle clicking a row in the whole tribe table ─────────────────
    const handleSelectLeaderFromTable = (leaderId) => {
        const leader = tribeLeaders.find(l => l.id === leaderId);
        if (leader) {
            setSelectedLeaderId(String(leaderId));
            setSelectedLeaderName(`${leader.firstname} ${leader.lastname}`);
            setRecordMode("tribe");
            fetchLeaderRecords(leaderId);
        }
    };
    // ───────────────────────────────────────────────────────────────────────

    // Group records by month and check consistency
    const getMonthlyStats = () => {
        const monthly = {};

        records.forEach((record) => {
            const d = new Date(record.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            const monthName = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });

            if (!monthly[key]) {
                monthly[key] = { monthName, count: 0, records: [] };
            }
            monthly[key].count++;
            monthly[key].records.push(record);
        });

        return Object.entries(monthly)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([key, data]) => ({
                key,
                ...data,
                status: data.count >= 3 ? "CONSISTENT" : "INCONSISTENT",
                statusColor: data.count >= 3 ? "#16a34a" : "#dc2626",
                statusBg: data.count >= 3 ? "#dcfce7" : "#fee2e2"
            }));
    };

    const monthlyStats = getMonthlyStats();

    // Get all unique months for filter dropdown
    const getMonthOptions = () => {
        const months = new Set();
        records.forEach((record) => {
            const d = new Date(record.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
            months.add(JSON.stringify({ key, label }));
        });
        return Array.from(months).map(m => JSON.parse(m)).sort((a, b) => b.key.localeCompare(a.key));
    };

    const monthOptions = getMonthOptions();

    // Filter records by selected month
    const filteredRecords = filterMonth === "ALL"
        ? records
        : records.filter((record) => {
            const d = new Date(record.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            return key === filterMonth;
        });

    // Get current month stats for quick view
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const currentMonth = monthlyStats.find(m => m.key === currentMonthKey);

    // ── NEW: Compute whole tribe summary numbers ──────────────────────────
    const wholeTribeConsistentCount = wholeTribeStats.filter(s => s.isConsistent).length;
    const wholeTribeTotalCount = wholeTribeStats.length;
    // ───────────────────────────────────────────────────────────────────────

    // ── NEW: Paginated record cards ────────────────────────────────────────
    const totalCardPages = Math.ceil(filteredRecords.length / CARDS_PER_PAGE) || 1;
    const displayedCards = filteredRecords.slice(
        (cardPage - 1) * CARDS_PER_PAGE,
        cardPage * CARDS_PER_PAGE
    );
    // ───────────────────────────────────────────────────────────────────────

    if (!user) {
        return (
            <div className="layout">
                <Sidebar />
                <div className="content" style={{ textAlign: "center", paddingTop: "100px" }}>
                    <h2>Please login to record your Life Group.</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="layout">
            <Sidebar />
            <div className="content" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
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
                        <h1 style={{ fontSize: "20px", margin: 0, fontWeight: 700 }}>
                            {isLifeGroupChecker && recordMode === "tribe" && selectedLeaderName
                                ? `Life Group: ${selectedLeaderName}`
                                : isLifeGroupChecker && recordMode === "whole_tribe"
                                    ? `Life Group: Whole ${assignedTribe}`
                                    : "Life Group Recording"}
                        </h1>
                        <p style={{ opacity: 0.7, margin: "2px 0 0 0", fontSize: "12px" }}>
                            Welcome, <strong>{user.firstname} {user.lastname}</strong> • {user.tribe}
                            {isLifeGroupChecker && (
                                <span style={{ marginLeft: "8px", padding: "2px 8px", borderRadius: "10px", background: "#fef3c7", color: "#92400e", fontSize: "10px", fontWeight: 700 }}>
                                    LG Checker — {assignedTribe}
                                </span>
                            )}
                        </p>
                    </div>
                    {recordMode !== "whole_tribe" && (
                        <button
                            className="btn-sm btn-primary"
                            onClick={() => setShowForm(true)}
                            style={{ padding: "6px 14px", fontSize: "13px" }}
                        >
                            + Record Life Group
                        </button>
                    )}
                </div>

                {/* ── MODIFIED: LifeGroup Checker Mode Selector (3 buttons) ─────────── */}
                {isLifeGroupChecker && (
                    <div style={{
                        marginBottom: "15px",
                        padding: "12px 14px",
                        background: "#fffbeb",
                        border: "1px solid #fcd34d",
                        borderRadius: "10px"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: "#92400e" }}>
                                📋 Record For:
                            </span>
                            <div style={{ display: "flex", gap: "6px" }}>
                                <button
                                    onClick={() => handleModeChange("self")}
                                    style={{
                                        padding: "5px 14px",
                                        borderRadius: "8px",
                                        border: "1px solid",
                                        borderColor: recordMode === "self" ? "#c9a45c" : "#d1d5db",
                                        background: recordMode === "self" ? "#c9a45c" : "#fff",
                                        color: recordMode === "self" ? "#fff" : "#374151",
                                        fontSize: "12px",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        transition: "all 0.2s"
                                    }}
                                >
                                    Myself
                                </button>
                                <button
                                    onClick={() => handleModeChange("tribe")}
                                    style={{
                                        padding: "5px 14px",
                                        borderRadius: "8px",
                                        border: "1px solid",
                                        borderColor: recordMode === "tribe" ? "#c9a45c" : "#d1d5db",
                                        background: recordMode === "tribe" ? "#c9a45c" : "#fff",
                                        color: recordMode === "tribe" ? "#fff" : "#374151",
                                        fontSize: "12px",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        transition: "all 0.2s"
                                    }}
                                >
                                    Someone in {assignedTribe}
                                </button>
                                <button
                                    onClick={() => handleModeChange("whole_tribe")}
                                    style={{
                                        padding: "5px 14px",
                                        borderRadius: "8px",
                                        border: "1px solid",
                                        borderColor: recordMode === "whole_tribe" ? "#c9a45c" : "#d1d5db",
                                        background: recordMode === "whole_tribe" ? "#c9a45c" : "#fff",
                                        color: recordMode === "whole_tribe" ? "#fff" : "#374151",
                                        fontSize: "12px",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        transition: "all 0.2s"
                                    }}
                                >
                                    Whole {assignedTribe}
                                </button>
                            </div>

                            {recordMode === "tribe" && (
                                <select
                                    value={selectedLeaderId}
                                    onChange={handleLeaderChange}
                                    style={{
                                        padding: "6px 10px",
                                        fontSize: "13px",
                                        borderRadius: "6px",
                                        border: "1px solid #d1d5db",
                                        minWidth: "200px",
                                        background: "#fff"
                                    }}
                                >
                                    <option value="">— Select Tribe Member —</option>
                                    {tribeLeaders.map((leader) => (
                                        <option key={leader.id} value={String(leader.id)}>
                                            {leader.firstname} {leader.lastname}
                                            {leader.nickname ? ` (${leader.nickname})` : ""}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>
                )}
                {/* ───────────────────────────────────────────────────────────────────── */}

                {/* ── NEW: WHOLE TRIBE SUMMARY TABLE ──────────────────────────────────── */}
                {recordMode === "whole_tribe" && (
                    <div style={{ marginBottom: "20px" }}>
                        {/* Whole Tribe Summary Stats */}
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                            gap: "8px",
                            marginBottom: "15px"
                        }}>
                            <div style={{
                                padding: "10px 12px",
                                borderRadius: "8px",
                                background: "#fff",
                                border: "1px solid #e5e7eb"
                            }}>
                                <h3 style={{ fontSize: "11px", margin: "0 0 4px 0", color: "#6b7280", fontWeight: 500 }}>
                                    Tribe Members
                                </h3>
                                <h1 style={{ fontSize: "22px", margin: 0, color: "#111827" }}>
                                    {wholeTribeTotalCount}
                                </h1>
                            </div>
                            <div style={{
                                padding: "10px 12px",
                                borderRadius: "8px",
                                background: "#ecfdf5",
                                border: "1px solid #bbf7d0"
                            }}>
                                <h3 style={{ fontSize: "11px", margin: "0 0 4px 0", color: "#16a34a", fontWeight: 500 }}>
                                    Consistent This Month
                                </h3>
                                <h1 style={{ fontSize: "22px", margin: 0, color: "#16a34a" }}>
                                    {wholeTribeConsistentCount}
                                </h1>
                            </div>
                            <div style={{
                                padding: "10px 12px",
                                borderRadius: "8px",
                                background: "#fef2f2",
                                border: "1px solid #fecaca"
                            }}>
                                <h3 style={{ fontSize: "11px", margin: "0 0 4px 0", color: "#dc2626", fontWeight: 500 }}>
                                    Inconsistent This Month
                                </h3>
                                <h1 style={{ fontSize: "22px", margin: 0, color: "#dc2626" }}>
                                    {wholeTribeTotalCount - wholeTribeConsistentCount}
                                </h1>
                            </div>
                        </div>

                        {/* Whole Tribe Members Table */}
                        <div className="excel-card" style={{ borderRadius: "8px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
                            <div className="excel-header" style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>
                                    {assignedTribe} Members — This Month Overview
                                </h2>
                                <span style={{ fontSize: "11px", color: "#6b7280" }}>
                                    Click a row to view / record for that member
                                </span>
                            </div>
                            <div className="excel-wrapper">
                                <table className="excel-table" style={{ fontSize: "12px" }}>
                                    <thead>
                                        <tr>
                                            <th style={{ padding: "8px 10px", textAlign: "left" }}>Member</th>
                                            <th style={{ padding: "8px 10px", textAlign: "center" }}>This Month</th>
                                            <th style={{ padding: "8px 10px", textAlign: "center" }}>Target</th>
                                            <th style={{ padding: "8px 10px", textAlign: "center" }}>Status</th>
                                            <th style={{ padding: "8px 10px", textAlign: "center" }}>Total Records</th>
                                            <th style={{ padding: "8px 10px", textAlign: "center" }}>Consistent Months</th>
                                            <th style={{ padding: "8px 10px", textAlign: "center" }}>Inconsistent</th>
                                            <th style={{ padding: "8px 10px", textAlign: "center" }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {wholeTribeStats.map((member) => (
                                            <tr 
                                                key={member.leaderId}
                                                style={{ cursor: "pointer", transition: "background 0.15s" }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                                                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                            >
                                                <td style={{ padding: "6px 10px", fontWeight: 600 }}>
                                                    {member.name}
                                                </td>
                                                <td style={{ padding: "6px 10px", textAlign: "center", fontWeight: 700, color: member.isConsistent ? "#16a34a" : "#dc2626" }}>
                                                    {member.thisMonthCount}
                                                </td>
                                                <td style={{ padding: "6px 10px", textAlign: "center", color: "#9ca3af" }}>
                                                    3
                                                </td>
                                                <td style={{ padding: "6px 10px", textAlign: "center" }}>
                                                    <span style={{
                                                        padding: "2px 8px",
                                                        borderRadius: "10px",
                                                        background: member.statusBg,
                                                        color: member.statusColor,
                                                        fontSize: "10px",
                                                        fontWeight: "700"
                                                    }}>
                                                        {member.status}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "6px 10px", textAlign: "center", color: "#6b7280" }}>
                                                    {member.totalRecords}
                                                </td>
                                                <td style={{ padding: "6px 10px", textAlign: "center", color: "#16a34a", fontWeight: 600 }}>
                                                    {member.consistentMonths}
                                                </td>
                                                <td style={{ padding: "6px 10px", textAlign: "center", color: "#dc2626" }}>
                                                    {member.inconsistentMonths}
                                                </td>
                                                <td style={{ padding: "6px 10px", textAlign: "center" }}>
                                                    <button
                                                        onClick={() => handleSelectLeaderFromTable(member.leaderId)}
                                                        style={{
                                                            padding: "3px 10px",
                                                            borderRadius: "6px",
                                                            border: "1px solid #c9a45c",
                                                            background: "#fff",
                                                            color: "#92400e",
                                                            fontSize: "11px",
                                                            fontWeight: 600,
                                                            cursor: "pointer"
                                                        }}
                                                    >
                                                        View / Record
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
                {/* ───────────────────────────────────────────────────────────────────── */}

                {/* ── MODIFIED: Stats cards + Two-column layout for records & table ───── */}
                {recordMode !== "whole_tribe" && (
                    <>
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
                                style={{
                                    border: currentMonth ? `2px solid ${currentMonth.statusColor}` : "2px solid #e5e7eb",
                                    padding: "10px 12px",
                                    borderRadius: "8px",
                                    background: "#fff"
                                }}
                            >
                                <h3 style={{ fontSize: "11px", margin: "0 0 4px 0", color: "#6b7280", fontWeight: 500 }}>
                                    This Month ({now.toLocaleDateString("en-US", { month: "long" })})
                                </h3>
                                <h1 style={{ color: currentMonth ? currentMonth.statusColor : "#6b7280", fontSize: "22px", margin: 0 }}>
                                    {currentMonth ? currentMonth.count : 0}
                                </h1>
                                <p style={{ fontSize: "10px", marginTop: "2px", margin: 0, color: "#9ca3af" }}>Target: 3 per month</p>
                                {currentMonth && (
                                    <span
                                        style={{
                                            display: "inline-block",
                                            marginTop: "4px",
                                            padding: "2px 8px",
                                            borderRadius: "10px",
                                            background: currentMonth.statusBg,
                                            color: currentMonth.statusColor,
                                            fontSize: "10px",
                                            fontWeight: "700"
                                        }}
                                    >
                                        {currentMonth.status}
                                    </span>
                                )}
                                {!currentMonth && (
                                    <span
                                        style={{
                                            display: "inline-block",
                                            marginTop: "4px",
                                            padding: "2px 8px",
                                            borderRadius: "10px",
                                            background: "#f3f4f6",
                                            color: "#6b7280",
                                            fontSize: "10px",
                                            fontWeight: "700"
                                        }}
                                    >
                                        NO RECORDS
                                    </span>
                                )}
                            </div>

                            <div className="record-card" style={{ padding: "10px 12px", borderRadius: "8px", background: "#fff", border: "1px solid #e5e7eb" }}>
                                <h3 style={{ fontSize: "11px", margin: "0 0 4px 0", color: "#6b7280", fontWeight: 500 }}>Total Records</h3>
                                <h1 style={{ fontSize: "22px", margin: 0, color: "#111827" }}>{records.length}</h1>
                            </div>

                            <div className="record-card" style={{ padding: "10px 12px", borderRadius: "8px", background: "#ecfdf5", border: "1px solid #bbf7d0" }}>
                                <h3 style={{ fontSize: "11px", margin: "0 0 4px 0", color: "#16a34a", fontWeight: 500 }}>Consistent Months</h3>
                                <h1 style={{ fontSize: "22px", margin: 0, color: "#16a34a" }}>
                                    {monthlyStats.filter(m => m.status === "CONSISTENT").length}
                                </h1>
                            </div>

                            <div className="record-card" style={{ padding: "10px 12px", borderRadius: "8px", background: "#fef2f2", border: "1px solid #fecaca" }}>
                                <h3 style={{ fontSize: "11px", margin: "0 0 4px 0", color: "#dc2626", fontWeight: 500 }}>Inconsistent Months</h3>
                                <h1 style={{ fontSize: "22px", margin: 0, color: "#dc2626" }}>
                                    {monthlyStats.filter(m => m.status === "INCONSISTENT").length}
                                </h1>
                            </div>
                        </div>

                        {/* ── NEW: Two-column layout ─────────────────────────────────────── */}
                        <div style={{ 
                            display: "flex", 
                            gap: "16px", 
                            alignItems: "flex-start", 
                            overflow: "hidden",
                            flex: 1,
                            minHeight: 0
                        }}>

                            {/* LEFT COLUMN: Monthly Breakdown Table */}
                            <div style={{ 
                                flex: "1 1 0", 
                                minWidth: "0",
                                overflowY: "auto",
                                maxHeight: "calc(100vh - 260px)"
                            }}>
                                {/* COMPACT MONTHLY BREAKDOWN TABLE */}
                                {monthlyStats.length > 0 && (
                                    <div className="excel-card" style={{ borderRadius: "8px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
                                        <div className="excel-header" style={{ padding: "10px 14px" }}>
                                            <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>
                                                {recordMode === "tribe" && selectedLeaderName
                                                    ? `${selectedLeaderName}'s Monthly Consistency Report`
                                                    : "Monthly Consistency Report"}
                                            </h2>
                                        </div>
                                        <div className="excel-wrapper">
                                            <table className="excel-table" style={{ fontSize: "12px" }}>
                                                <thead>
                                                    <tr>
                                                        <th style={{ padding: "8px 10px" }}>Month</th>
                                                        <th style={{ padding: "8px 10px" }}>Records</th>
                                                        <th style={{ padding: "8px 10px" }}>Target</th>
                                                        <th style={{ padding: "8px 10px" }}>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {monthlyStats.map((month) => (
                                                        <tr key={month.key}>
                                                            <td style={{ fontWeight: 600, padding: "6px 10px" }}>{month.monthName}</td>
                                                            <td style={{ padding: "6px 10px" }}>{month.count}</td>
                                                            <td style={{ padding: "6px 10px" }}>3</td>
                                                            <td style={{ padding: "6px 10px" }}>
                                                                <span
                                                                    style={{
                                                                        padding: "2px 8px",
                                                                        borderRadius: "10px",
                                                                        background: month.statusBg,
                                                                        color: month.statusColor,
                                                                        fontSize: "10px",
                                                                        fontWeight: "700"
                                                                    }}
                                                                >
                                                                    {month.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* RIGHT COLUMN: Record Cards (vertical, scrollable) */}
                            <div style={{ 
                                flex: "0 0 320px", 
                                maxWidth: "320px",
                                overflowY: "auto",
                                maxHeight: "calc(100vh - 260px)",
                                display: "flex",
                                flexDirection: "column"
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                                    <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>
                                        {recordMode === "tribe" && selectedLeaderName
                                            ? `${selectedLeaderName}'s Records`
                                            : "My Records"}
                                        <span
                                            style={{
                                                marginLeft: "8px",
                                                padding: "2px 8px",
                                                borderRadius: "10px",
                                                background: "#dbeafe",
                                                color: "#1e40af",
                                                fontSize: "11px",
                                                fontWeight: 600
                                            }}
                                        >
                                            {filteredRecords.length} total
                                        </span>
                                    </h2>

                                    <select
                                        value={filterMonth}
                                        onChange={(e) => setFilterMonth(e.target.value)}
                                        style={{
                                            padding: "4px 8px",
                                            borderRadius: "6px",
                                            border: "1px solid #e5e7eb",
                                            fontSize: "12px",
                                            cursor: "pointer"
                                        }}
                                    >
                                        <option value="ALL">All Months</option>
                                        {monthOptions.map((month) => (
                                            <option key={month.key} value={month.key}>
                                                {month.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {fetching ? (
                                    <p style={{ fontSize: "13px", color: "#6b7280" }}>Loading records...</p>
                                ) : filteredRecords.length === 0 ? (
                                    <p style={{ fontSize: "13px", color: "#6b7280" }}>
                                        {recordMode === "tribe" && selectedLeaderName
                                            ? `No life group records for ${selectedLeaderName} yet.`
                                            : "No life group records yet."}
                                    </p>
                                ) : (
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "8px",
                                            paddingRight: "6px"
                                        }}
                                    >
                                        {displayedCards.map((record) => (
                                            <div
                                                key={record.id}
                                                style={{
                                                    padding: "10px 12px",
                                                    borderRadius: "8px",
                                                    background: "#f9fafb",
                                                    border: "1px solid #e5e7eb",
                                                    flexShrink: 0
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                        marginBottom: "4px"
                                                    }}
                                                >
                                                    <h3 style={{ margin: 0, fontSize: "13px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                                                        {record.topic}
                                                    </h3>
                                                    <span
                                                        style={{
                                                            padding: "2px 8px",
                                                            borderRadius: "8px",
                                                            background: "#fef3c7",
                                                            color: "#92400e",
                                                            fontSize: "10px",
                                                            fontWeight: "600",
                                                            marginLeft: "6px",
                                                            flexShrink: 0
                                                        }}
                                                    >
                                                        {record.type}
                                                    </span>
                                                </div>
                                                <p style={{ margin: "0 0 2px 0", color: "#6b7280", fontSize: "11px" }}>
                                                    📍 {record.place}
                                                </p>
                                                {record.exhorter && (
                                                    <p style={{ margin: "0 0 2px 0", color: "#16a34a", fontSize: "11px", fontWeight: 600 }}>
                                                        🎤 {record.exhorter}
                                                    </p>
                                                )}
                                                <p style={{ margin: 0, color: "#9ca3af", fontSize: "10px" }}>
                                                    📅 {new Date(record.date).toLocaleDateString("en-US", {
                                                        year: "numeric",
                                                        month: "short",
                                                        day: "numeric"
                                                    })}
                                                </p>
                                            </div>
                                        ))}

                                        {/* ── NEW: Pagination controls ─────────────────────────── */}
                                        {filteredRecords.length > CARDS_PER_PAGE && (
                                            <div style={{
                                                display: "flex",
                                                justifyContent: "center",
                                                alignItems: "center",
                                                gap: "6px",
                                                padding: "8px 0",
                                                flexShrink: 0
                                            }}>
                                                <button
                                                    onClick={() => setCardPage(p => Math.max(1, p - 1))}
                                                    disabled={cardPage === 1}
                                                    style={{
                                                        padding: "4px 10px",
                                                        borderRadius: "6px",
                                                        border: "1px solid #d1d5db",
                                                        background: cardPage === 1 ? "#f3f4f6" : "#fff",
                                                        color: cardPage === 1 ? "#9ca3af" : "#374151",
                                                        fontSize: "11px",
                                                        fontWeight: 600,
                                                        cursor: cardPage === 1 ? "not-allowed" : "pointer",
                                                        transition: "all 0.2s"
                                                    }}
                                                >
                                                    ← Prev
                                                </button>
                                                <span style={{
                                                    fontSize: "11px",
                                                    color: "#6b7280",
                                                    fontWeight: 500,
                                                    minWidth: "60px",
                                                    textAlign: "center"
                                                }}>
                                                    Page {cardPage} of {totalCardPages}
                                                </span>
                                                <button
                                                    onClick={() => setCardPage(p => Math.min(totalCardPages, p + 1))}
                                                    disabled={cardPage === totalCardPages}
                                                    style={{
                                                        padding: "4px 10px",
                                                        borderRadius: "6px",
                                                        border: "1px solid #d1d5db",
                                                        background: cardPage === totalCardPages ? "#f3f4f6" : "#fff",
                                                        color: cardPage === totalCardPages ? "#9ca3af" : "#374151",
                                                        fontSize: "11px",
                                                        fontWeight: 600,
                                                        cursor: cardPage === totalCardPages ? "not-allowed" : "pointer",
                                                        transition: "all 0.2s"
                                                    }}
                                                >
                                                    Next →
                                                </button>
                                            </div>
                                        )}
                                        {/* ─────────────────────────────────────────────────── */}
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* ───────────────────────────────────────────────────────────────────── */}
                    </>
                )}
                {/* ───────────────────────────────────────────────────────────────────── */}
            </div>

            {/* RECORD LIFE GROUP MODAL */}
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
                            maxWidth: "480px",
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
                            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
                                {recordMode === "tribe" && selectedLeaderName
                                    ? `Record Life Group for ${selectedLeaderName}`
                                    : "Record New Life Group"}
                            </h2>
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
                            {/* ── Show who we're recording for ─────────────────── */}
                            {isLifeGroupChecker && recordMode === "tribe" && selectedLeaderId && (
                                <div style={{
                                    padding: "8px 12px",
                                    background: "#fef3c7",
                                    borderRadius: "8px",
                                    marginBottom: "12px",
                                    border: "1px solid #fcd34d"
                                }}>
                                    <p style={{ margin: 0, fontSize: "12px", color: "#92400e", fontWeight: 600 }}>
                                        📝 Recording for: {selectedLeaderName}
                                    </p>
                                </div>
                            )}

                            {isLifeGroupChecker && recordMode === "tribe" && !selectedLeaderId && (
                                <div style={{
                                    padding: "8px 12px",
                                    background: "#fee2e2",
                                    borderRadius: "8px",
                                    marginBottom: "12px",
                                    border: "1px solid #fecaca"
                                }}>
                                    <p style={{ margin: 0, fontSize: "12px", color: "#dc2626", fontWeight: 600 }}>
                                        ⚠️ Please select a tribe member above before recording.
                                    </p>
                                </div>
                            )}
                            {/* ─────────────────────────────────────────────────── */}

                            <form className="leader-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                <input
                                    type="text"
                                    placeholder="Topic"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    style={{ padding: "8px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                                />

                                <input
                                    type="text"
                                    placeholder="Place"
                                    value={place}
                                    onChange={(e) => setPlace(e.target.value)}
                                    style={{ padding: "8px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                                />

                                <input
                                    type="text"
                                    placeholder="Type (e.g., 1on1, Community etc.)"
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    style={{ padding: "8px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                                />

                                <input
                                    type="text"
                                    placeholder="Exhorter (Who shared/spoke)"
                                    value={exhorter}
                                    onChange={(e) => setExhorter(e.target.value)}
                                    style={{ padding: "8px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                                />

                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    style={{ padding: "8px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                                />

                                <button
                                    type="submit"
                                    disabled={isLifeGroupChecker && recordMode === "tribe" && !selectedLeaderId}
                                    style={{
                                        marginTop: "4px",
                                        padding: "8px",
                                        fontSize: "13px",
                                        opacity: isLifeGroupChecker && recordMode === "tribe" && !selectedLeaderId ? 0.5 : 1,
                                        cursor: isLifeGroupChecker && recordMode === "tribe" && !selectedLeaderId ? "not-allowed" : "pointer"
                                    }}
                                >
                                    {loading ? "Recording..." : "Record Life Group"}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LifeGroup;
