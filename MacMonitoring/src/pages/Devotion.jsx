import { useEffect, useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";
import { getCurrentUser } from "../utils/auth";

// Generate year options outside component
const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

function Devotion() {
    const user = getCurrentUser();
    const userRef = useRef(user);

    useEffect(() => {
        userRef.current = user;
    }, [user?.id]);

    const [records, setRecords] = useState([]);
    const [year, setYear] = useState(currentYear.toString());
    const [month, setMonth] = useState("");
    const [completedDays, setCompletedDays] = useState("");
    const [totalDays, setTotalDays] = useState("");
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [filterMonth, setFilterMonth] = useState("ALL");
    const [showForm, setShowForm] = useState(false);

    // ── NEW: Devotion Checker features ──────────────────────────────────────
    const [isDevotionChecker, setIsDevotionChecker] = useState(false);
    const [assignedTribe, setAssignedTribe] = useState("");
    const [tribeLeaders, setTribeLeaders] = useState([]);
    const [selectedLeaderId, setSelectedLeaderId] = useState("");
    const [selectedLeaderName, setSelectedLeaderName] = useState("");
    const [recordMode, setRecordMode] = useState("self"); // "self" or "tribe"
    // ───────────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (userRef.current) {
            checkDevotionCheckerRole();
            fetchRecords();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Check if current user is a Devotion Checker
    const checkDevotionCheckerRole = () => {
        const currentUser = userRef.current;
        if (!currentUser) return;

        const hasDJMinistry = currentUser.ministries?.includes("DISCIPLESHIP JOURNEY") ||
            currentUser.ministry === "DISCIPLESHIP JOURNEY";
        const isDevotionCheckerType = currentUser.dj_type === "Devotion Checker";
        const hasAssignedTribe = currentUser.assigned_tribe && currentUser.assigned_tribe !== "";

        if (hasDJMinistry && isDevotionCheckerType && hasAssignedTribe) {
            setIsDevotionChecker(true);
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
            .from("tblDevotion")
            .select("*")
            .eq("leader_id", userRef.current.id)
            .order("month", { ascending: false });

        if (error) {
            console.log("Fetch Error:", error);
        } else {
            setRecords(data || []);
        }
        setFetching(false);
    };

    // Fetch records for a specific leader (for Devotion Checker view)
    const fetchLeaderRecords = async (leaderId) => {
        setFetching(true);
        const { data, error } = await supabase
            .from("tblDevotion")
            .select("*")
            .eq("leader_id", leaderId)
            .order("month", { ascending: false });

        if (error) {
            console.log("Fetch Error:", error);
        } else {
            setRecords(data || []);
        }
        setFetching(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!month || !year || !completedDays || !totalDays) {
            alert("Complete all fields.");
            return;
        }

        // Determine whose record we're saving
        const targetLeaderId = recordMode === "tribe" && selectedLeaderId
            ? parseInt(selectedLeaderId)
            : userRef.current.id;

        const monthYear = `${month} ${year}`;

        setLoading(true);

        const insertData = {
            leader_id: targetLeaderId,
            month: monthYear,
            completed_days: parseInt(completedDays),
            total_days: parseInt(totalDays)
        };

        const { error } = await supabase
            .from("tblDevotion")
            .insert([insertData]);

        if (error) {
            console.error("Insert Error:", error);
            alert(`Failed to record devotion.\n\nError: ${error.message}`);
        } else {
            alert("Devotion recorded successfully!");
            setMonth("");
            setCompletedDays("");
            setTotalDays("");
            setSelectedLeaderId("");
            setSelectedLeaderName("");
            setShowForm(false);

            const newRecord = {
                id: Date.now(),
                leader_id: targetLeaderId,
                month: monthYear,
                completed_days: parseInt(completedDays),
                total_days: parseInt(totalDays),
                created_at: new Date().toISOString()
            };
            setRecords(prev => [newRecord, ...prev]);
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
        }
    };

    // Group records by month and check consistency
    const getMonthlyStats = () => {
        const monthly = {};

        records.forEach((record) => {
            const key = record.month;

            if (!monthly[key]) {
                monthly[key] = { monthName: key, count: 0, totalCompleted: 0, totalDays: 0, records: [] };
            }
            monthly[key].count++;
            monthly[key].totalCompleted += record.completed_days;
            monthly[key].totalDays += record.total_days;
            monthly[key].records.push(record);
        });

        return Object.entries(monthly)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([key, data]) => ({
                key,
                ...data,
                avgCompleted: Math.round(data.totalCompleted / data.count),
                status: data.totalCompleted >= 25 ? "CONSISTENT" : "INCONSISTENT",
                statusColor: data.totalCompleted >= 25 ? "#16a34a" : "#dc2626",
                statusBg: data.totalCompleted >= 25 ? "#dcfce7" : "#fee2e2"
            }));
    };

    const monthlyStats = getMonthlyStats();

    // Get all unique months for filter dropdown
    const getMonthOptions = () => {
        const months = new Set();
        records.forEach((record) => {
            months.add(JSON.stringify({ key: record.month, label: record.month }));
        });
        return Array.from(months).map(m => JSON.parse(m)).sort((a, b) => b.key.localeCompare(a.key));
    };

    const monthOptions = getMonthOptions();

    // Filter records by selected month
    const filteredRecords = filterMonth === "ALL"
        ? records
        : records.filter((record) => record.month === filterMonth);

    // Get current month stats
    const now = new Date();
    const currentMonthName = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const currentMonth = monthlyStats.find(m => m.monthName === currentMonthName);

    if (!user) {
        return (
            <div className="layout">
                <Sidebar />
                <div className="content" style={{ textAlign: "center", paddingTop: "100px" }}>
                    <h2>Please login to record your Devotion.</h2>
                </div>
            </div>
        );
    }

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
                        <h1 style={{ fontSize: "20px", margin: 0, fontWeight: 700 }}>
                            {isDevotionChecker && recordMode === "tribe" && selectedLeaderName
                                ? `Devotion: ${selectedLeaderName}`
                                : "Devotion Recording"}
                        </h1>
                        <p style={{ opacity: 0.7, margin: "2px 0 0 0", fontSize: "12px" }}>
                            Welcome, <strong>{user.firstname} {user.lastname}</strong> • {user.tribe}
                            {isDevotionChecker && (
                                <span style={{ marginLeft: "8px", padding: "2px 8px", borderRadius: "10px", background: "#fef3c7", color: "#92400e", fontSize: "10px", fontWeight: 700 }}>
                                    DJ Checker — {assignedTribe}
                                </span>
                            )}
                        </p>
                    </div>
                    <button
                        className="btn-sm btn-primary"
                        onClick={() => setShowForm(true)}
                        style={{ padding: "6px 14px", fontSize: "13px" }}
                    >
                        + Record Devotion
                    </button>
                </div>

                {/* ── NEW: Devotion Checker Mode Selector ───────────────────── */}
                {isDevotionChecker && (
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
                                    Tribe Member
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
                {/* ───────────────────────────────────────────────────────────── */}

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
                            This Month ({currentMonthName})
                        </h3>
                        <h1 style={{ color: currentMonth ? currentMonth.statusColor : "#6b7280", fontSize: "22px", margin: 0 }}>
                            {currentMonth ? currentMonth.totalCompleted : 0}
                        </h1>
                        <p style={{ fontSize: "10px", marginTop: "2px", margin: 0, color: "#9ca3af" }}>Target: 25 days</p>
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
                        <h3 style={{ fontSize: "11px", margin: "0 0 4px 0", color: "#6b7280", fontWeight: 500 }}>Total Entries</h3>
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

                {/* COMPACT RECORDS SECTION */}
                <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>
                            {recordMode === "tribe" && selectedLeaderName
                                ? `${selectedLeaderName}'s Devotion Records`
                                : "My Devotion Records"}
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
                                {filteredRecords.length} entries
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
                                ? `No devotion records for ${selectedLeaderName} yet.`
                                : "No devotion records yet."}
                        </p>
                    ) : (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                                gap: "8px"
                            }}
                        >
                            {filteredRecords.map((record) => (
                                <div
                                    key={record.id}
                                    style={{
                                        padding: "10px 12px",
                                        borderRadius: "8px",
                                        background: "#f9fafb",
                                        border: "1px solid #e5e7eb"
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            marginBottom: "6px"
                                        }}
                                    >
                                        <h3 style={{ margin: 0, fontSize: "13px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                                            {record.month}
                                        </h3>
                                        <span
                                            style={{
                                                padding: "2px 8px",
                                                borderRadius: "8px",
                                                background: record.completed_days >= 25 ? "#dcfce7" : "#fee2e2",
                                                color: record.completed_days >= 25 ? "#16a34a" : "#dc2626",
                                                fontSize: "10px",
                                                fontWeight: "600",
                                                marginLeft: "6px",
                                                flexShrink: 0
                                            }}
                                        >
                                            {record.completed_days >= 25 ? "Consistent" : "Inconsistent"}
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", gap: "12px", marginBottom: "6px" }}>
                                        <p style={{ margin: 0, color: "#6b7280", fontSize: "11px" }}>
                                            ✅ <strong>{record.completed_days}</strong> done
                                        </p>
                                        <p style={{ margin: 0, color: "#9ca3af", fontSize: "11px" }}>
                                            📅 {record.total_days} total
                                        </p>
                                    </div>
                                    <div style={{ background: "#e5e7eb", borderRadius: "6px", height: "6px", overflow: "hidden" }}>
                                        <div
                                            style={{
                                                width: `${(record.completed_days / record.total_days) * 100}%`,
                                                height: "100%",
                                                background: record.completed_days >= 25 ? "#16a34a" : "#f59e0b",
                                                borderRadius: "6px",
                                                transition: "width 0.3s"
                                            }}
                                        />
                                    </div>
                                    <p style={{ margin: "4px 0 0 0", color: "#9ca3af", fontSize: "10px", textAlign: "right" }}>
                                        {Math.round((record.completed_days / record.total_days) * 100)}%
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* COMPACT MONTHLY BREAKDOWN TABLE */}
                {monthlyStats.length > 0 && (
                    <div className="excel-card" style={{ marginTop: "20px", borderRadius: "8px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
                        <div className="excel-header" style={{ padding: "10px 14px" }}>
                            <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>
                                {recordMode === "tribe" && selectedLeaderName
                                    ? `${selectedLeaderName}'s Monthly Consistency Report`
                                    : "Monthly Devotion Consistency Report"}
                            </h2>
                        </div>
                        <div className="excel-wrapper">
                            <table className="excel-table" style={{ fontSize: "12px" }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: "8px 10px" }}>Month</th>
                                        <th style={{ padding: "8px 10px" }}>Entries</th>
                                        <th style={{ padding: "8px 10px" }}>Total Done</th>
                                        <th style={{ padding: "8px 10px" }}>Avg</th>
                                        <th style={{ padding: "8px 10px" }}>Target</th>
                                        <th style={{ padding: "8px 10px" }}>Status</th>
                                        <th style={{ padding: "8px 10px" }}>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monthlyStats.map((month) => (
                                        <tr key={month.key}>
                                            <td style={{ fontWeight: 600, padding: "6px 10px" }}>{month.monthName}</td>
                                            <td style={{ padding: "6px 10px" }}>{month.count}</td>
                                            <td style={{ padding: "6px 10px" }}>{month.totalCompleted} days</td>
                                            <td style={{ padding: "6px 10px" }}>{month.avgCompleted} days</td>
                                            <td style={{ padding: "6px 10px" }}>25</td>
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
                                            <td style={{ padding: "6px 10px", fontSize: "11px", color: "#6b7280" }}>
                                                {month.totalCompleted >= 25
                                                    ? "✅ Keep it up!"
                                                    : `❌ ${25 - month.totalCompleted} days missing`}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* RECORD DEVOTION MODAL */}
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
                                    ? `Record Devotion for ${selectedLeaderName}`
                                    : "Record New Devotion"}
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
                            {/* ── NEW: Show who we're recording for ───────────────── */}
                            {isDevotionChecker && recordMode === "tribe" && selectedLeaderId && (
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

                            {isDevotionChecker && recordMode === "tribe" && !selectedLeaderId && (
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
                            {/* ─────────────────────────────────────────────────────── */}

                            <form className="leader-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                <div style={{ display: "flex", gap: "8px" }}>
                                    <select
                                        value={month}
                                        onChange={(e) => setMonth(e.target.value)}
                                        style={{ flex: 2, padding: "8px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                                    >
                                        <option value="">Select Month</option>
                                        <option value="January">January</option>
                                        <option value="February">February</option>
                                        <option value="March">March</option>
                                        <option value="April">April</option>
                                        <option value="May">May</option>
                                        <option value="June">June</option>
                                        <option value="July">July</option>
                                        <option value="August">August</option>
                                        <option value="September">September</option>
                                        <option value="October">October</option>
                                        <option value="November">November</option>
                                        <option value="December">December</option>
                                    </select>

                                    <select
                                        value={year}
                                        onChange={(e) => setYear(e.target.value)}
                                        style={{ flex: 1, padding: "8px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                                    >
                                        <option value="">Year</option>
                                        {yearOptions.map((yr) => (
                                            <option key={yr} value={yr}>
                                                {yr}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <input
                                    type="number"
                                    placeholder="Completed Days"
                                    value={completedDays}
                                    onChange={(e) => setCompletedDays(e.target.value)}
                                    min="0"
                                    max="31"
                                    style={{ padding: "8px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                                />

                                <input
                                    type="number"
                                    placeholder="Total Days in Month"
                                    value={totalDays}
                                    onChange={(e) => setTotalDays(e.target.value)}
                                    min="1"
                                    max="31"
                                    style={{ padding: "8px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                                />

                                <button
                                    type="submit"
                                    disabled={recordMode === "tribe" && !selectedLeaderId}
                                    style={{
                                        marginTop: "4px",
                                        padding: "8px",
                                        fontSize: "13px",
                                        opacity: recordMode === "tribe" && !selectedLeaderId ? 0.5 : 1,
                                        cursor: recordMode === "tribe" && !selectedLeaderId ? "not-allowed" : "pointer"
                                    }}
                                >
                                    {loading ? "Recording..." : "Record Devotion"}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Devotion;