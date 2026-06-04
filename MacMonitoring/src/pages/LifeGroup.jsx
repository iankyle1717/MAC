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

    useEffect(() => {
        if (userRef.current) {
            fetchRecords();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!topic || !place || !type) {
            alert("Complete all fields.");
            return;
        }

        setLoading(true);

        const insertData = {
            leader_id: userRef.current.id,
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
                leader_id: userRef.current.id,
                topic,
                place,
                type,
                exhorter: exhorter || null,
                date,
                created_at: new Date().toISOString()
            };
            setRecords(prev => [newRecord, ...prev]);
        }

        setLoading(false);
    };

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
                        <h1 style={{ fontSize: "20px", margin: 0, fontWeight: 700 }}>Life Group Recording</h1>
                        <p style={{ opacity: 0.7, margin: "2px 0 0 0", fontSize: "12px" }}>
                            Welcome, <strong>{user.firstname} {user.lastname}</strong> • {user.tribe}
                        </p>
                    </div>
                    <button
                        className="btn-sm btn-primary"
                        onClick={() => setShowForm(true)}
                        style={{ padding: "6px 14px", fontSize: "13px" }}
                    >
                        + Record Life Group
                    </button>
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

                {/* COMPACT RECORDS SECTION */}
                <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>
                            My Life Group Records
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
                        <p style={{ fontSize: "13px", color: "#6b7280" }}>No life group records yet.</p>
                    ) : (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
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
                        </div>
                    )}
                </div>

                {/* COMPACT MONTHLY BREAKDOWN TABLE */}
                {monthlyStats.length > 0 && (
                    <div className="excel-card" style={{ marginTop: "20px", borderRadius: "8px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
                        <div className="excel-header" style={{ padding: "10px 14px" }}>
                            <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>Monthly Consistency Report</h2>
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
                            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Record New Life Group</h2>
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

                                <button type="submit" style={{ marginTop: "4px", padding: "8px", fontSize: "13px" }}>
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