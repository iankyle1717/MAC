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
                <h1>Life Group Recording</h1>
                <p style={{ opacity: 0.7, marginBottom: "20px" }}>
                    Welcome, <strong>{user.firstname} {user.lastname}</strong> • {user.tribe}
                </p>

                {/* MONTHLY CONSISTENCY STATS */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
                        gap: "15px",
                        marginBottom: "25px"
                    }}
                >
                    {/* Current Month Card */}
                    <div
                        className="record-card"
                        style={{
                            border: currentMonth ? `2px solid ${currentMonth.statusColor}` : "2px solid #e5e7eb"
                        }}
                    >
                        <h3>This Month ({now.toLocaleDateString("en-US", { month: "long" })})</h3>
                        <h1 style={{ color: currentMonth ? currentMonth.statusColor : "#6b7280" }}>
                            {currentMonth ? currentMonth.count : 0}
                        </h1>
                        <p style={{ fontSize: "13px", marginTop: "4px" }}>
                            Target: 3 per month
                        </p>
                        {currentMonth && (
                            <span
                                style={{
                                    display: "inline-block",
                                    marginTop: "8px",
                                    padding: "4px 12px",
                                    borderRadius: "20px",
                                    background: currentMonth.statusBg,
                                    color: currentMonth.statusColor,
                                    fontSize: "12px",
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
                                    marginTop: "8px",
                                    padding: "4px 12px",
                                    borderRadius: "20px",
                                    background: "#f3f4f6",
                                    color: "#6b7280",
                                    fontSize: "12px",
                                    fontWeight: "700"
                                }}
                            >
                                NO RECORDS
                            </span>
                        )}
                    </div>

                    {/* Total Records */}
                    <div className="record-card">
                        <h3>Total Records</h3>
                        <h1>{records.length}</h1>
                    </div>

                    {/* Consistent Months */}
                    <div className="record-card" style={{ background: "#ecfdf5" }}>
                        <h3>Consistent Months</h3>
                        <h1 style={{ color: "#16a34a" }}>
                            {monthlyStats.filter(m => m.status === "CONSISTENT").length}
                        </h1>
                    </div>

                    {/* Inconsistent Months */}
                    <div className="record-card" style={{ background: "#fef2f2" }}>
                        <h3>Inconsistent Months</h3>
                        <h1 style={{ color: "#dc2626" }}>
                            {monthlyStats.filter(m => m.status === "INCONSISTENT").length}
                        </h1>
                    </div>
                </div>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "30px"
                    }}
                >
                    {/* LEFT: FORM */}
                    <div>
                        <h2 style={{ marginBottom: "15px" }}>Record New Life Group</h2>
                        <form className="leader-form" onSubmit={handleSubmit}>
                            <input
                                type="text"
                                placeholder="Topic"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                            />

                            <input
                                type="text"
                                placeholder="Place"
                                value={place}
                                onChange={(e) => setPlace(e.target.value)}
                            />

                            <input
                                type="text"
                                placeholder="Type (e.g., 1on1, Community etc.)"
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                            />

                            <input
                                type="text"
                                placeholder="Exhorter (Who shared/spoke)"
                                value={exhorter}
                                onChange={(e) => setExhorter(e.target.value)}
                            />

                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />

                            <button type="submit">
                                {loading ? "Recording..." : "Record Life Group"}
                            </button>
                        </form>
                    </div>

                    {/* RIGHT: RECORDS */}
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                            <h2 style={{ margin: 0 }}>
                                My Life Group Records
                                <span
                                    style={{
                                        marginLeft: "10px",
                                        padding: "4px 10px",
                                        borderRadius: "12px",
                                        background: "#dbeafe",
                                        color: "#1e40af",
                                        fontSize: "14px"
                                    }}
                                >
                                    {filteredRecords.length} total
                                </span>
                            </h2>
                            
                            {/* MONTH FILTER */}
                            <select
                                value={filterMonth}
                                onChange={(e) => setFilterMonth(e.target.value)}
                                style={{
                                    padding: "8px 12px",
                                    borderRadius: "10px",
                                    border: "1px solid #e5e7eb",
                                    fontSize: "14px",
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
                            <p>Loading records...</p>
                        ) : filteredRecords.length === 0 ? (
                            <p style={{ color: "#6b7280" }}>No life group records yet.</p>
                        ) : (
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "12px"
                                }}
                            >
                                {filteredRecords.map((record) => (
                                    <div
                                        key={record.id}
                                        style={{
                                            padding: "16px 20px",
                                            borderRadius: "14px",
                                            background: "#f9fafb",
                                            border: "1px solid #e5e7eb"
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                marginBottom: "8px"
                                            }}
                                        >
                                            <h3 style={{ margin: 0, fontSize: "16px" }}>
                                                {record.topic}
                                            </h3>
                                            <span
                                                style={{
                                                    padding: "4px 10px",
                                                    borderRadius: "10px",
                                                    background: "#fef3c7",
                                                    color: "#92400e",
                                                    fontSize: "12px",
                                                    fontWeight: "600"
                                                }}
                                            >
                                                {record.type}
                                            </span>
                                        </div>
                                        <p style={{ margin: "0 0 4px 0", color: "#6b7280", fontSize: "14px" }}>
                                            📍 {record.place}
                                        </p>
                                        {record.exhorter && (
                                            <p style={{ margin: "0 0 4px 0", color: "#16a34a", fontSize: "14px", fontWeight: 600 }}>
                                                🎤 Exhorter: {record.exhorter}
                                            </p>
                                        )}
                                        <p style={{ margin: 0, color: "#9ca3af", fontSize: "13px" }}>
                                            📅 {new Date(record.date).toLocaleDateString("en-US", {
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric"
                                            })}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* MONTHLY BREAKDOWN TABLE */}
                {monthlyStats.length > 0 && (
                    <div className="excel-card" style={{ marginTop: "30px" }}>
                        <div className="excel-header">
                            <h2>Monthly Consistency Report</h2>
                        </div>
                        <div className="excel-wrapper">
                            <table className="excel-table">
                                <thead>
                                    <tr>
                                        <th>Month</th>
                                        <th>Records</th>
                                        <th>Target</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monthlyStats.map((month) => (
                                        <tr key={month.key}>
                                            <td style={{ fontWeight: 600 }}>{month.monthName}</td>
                                            <td>{month.count}</td>
                                            <td>3</td>
                                            <td>
                                                <span
                                                    style={{
                                                        padding: "6px 14px",
                                                        borderRadius: "20px",
                                                        background: month.statusBg,
                                                        color: month.statusColor,
                                                        fontSize: "13px",
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
        </div>
    );
}

export default LifeGroup;