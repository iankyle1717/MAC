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

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!month || !year || !completedDays || !totalDays) {
            alert("Complete all fields.");
            return;
        }

        const monthYear = `${month} ${year}`;

        setLoading(true);

        const insertData = {
            leader_id: userRef.current.id,
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
            const newRecord = {
                id: Date.now(),
                leader_id: userRef.current.id,
                month: monthYear,
                completed_days: parseInt(completedDays),
                total_days: parseInt(totalDays),
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
                <h1>Devotion Recording</h1>
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
                        <h3>This Month ({currentMonthName})</h3>
                        <h1 style={{ color: currentMonth ? currentMonth.statusColor : "#6b7280" }}>
                            {currentMonth ? currentMonth.totalCompleted : 0}
                        </h1>
                        <p style={{ fontSize: "13px", marginTop: "4px" }}>
                            Target: 25 days
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
                        <h3>Total Entries</h3>
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
                        <h2 style={{ marginBottom: "15px" }}>Record New Devotion</h2>
                        <form className="leader-form" onSubmit={handleSubmit}>
                            <div style={{ display: "flex", gap: "10px" }}>
                                <select
                                    value={month}
                                    onChange={(e) => setMonth(e.target.value)}
                                    style={{ flex: 2 }}
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
                                    style={{ flex: 1 }}
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
                            />

                            <input
                                type="number"
                                placeholder="Total Days in Month"
                                value={totalDays}
                                onChange={(e) => setTotalDays(e.target.value)}
                                min="1"
                                max="31"
                            />

                            <button type="submit">
                                {loading ? "Recording..." : "Record Devotion"}
                            </button>
                        </form>
                    </div>

                    {/* RIGHT: RECORDS */}
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                            <h2 style={{ margin: 0 }}>
                                My Devotion Records
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
                                    {filteredRecords.length} entries
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
                            <p style={{ color: "#6b7280" }}>No devotion records yet.</p>
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
                                                {record.month}
                                            </h3>
                                            <span
                                                style={{
                                                    padding: "4px 10px",
                                                    borderRadius: "10px",
                                                    background: record.completed_days >= 25 ? "#dcfce7" : "#fee2e2",
                                                    color: record.completed_days >= 25 ? "#16a34a" : "#dc2626",
                                                    fontSize: "12px",
                                                    fontWeight: "600"
                                                }}
                                            >
                                                {record.completed_days >= 25 ? "Consistent" : "Inconsistent"}
                                            </span>
                                        </div>
                                        <div style={{ display: "flex", gap: "20px", marginTop: "8px" }}>
                                            <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
                                                ✅ <strong>{record.completed_days}</strong> days completed
                                            </p>
                                            <p style={{ margin: 0, color: "#9ca3af", fontSize: "14px" }}>
                                                📅 {record.total_days} total days
                                            </p>
                                        </div>
                                        <div style={{ marginTop: "8px", background: "#e5e7eb", borderRadius: "8px", height: "8px", overflow: "hidden" }}>
                                            <div
                                                style={{
                                                    width: `${(record.completed_days / record.total_days) * 100}%`,
                                                    height: "100%",
                                                    background: record.completed_days >= 25 ? "#16a34a" : "#f59e0b",
                                                    borderRadius: "8px",
                                                    transition: "width 0.3s"
                                                }}
                                            />
                                        </div>
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
                            <h2>Monthly Devotion Consistency Report</h2>
                        </div>
                        <div className="excel-wrapper">
                            <table className="excel-table">
                                <thead>
                                    <tr>
                                        <th>Month</th>
                                        <th>Entries</th>
                                        <th>Total Completed</th>
                                        <th>Avg / Entry</th>
                                        <th>Target</th>
                                        <th>Status</th>
                                        <th>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monthlyStats.map((month) => (
                                        <tr key={month.key}>
                                            <td style={{ fontWeight: 600 }}>{month.monthName}</td>
                                            <td>{month.count}</td>
                                            <td>{month.totalCompleted} days</td>
                                            <td>{month.avgCompleted} days</td>
                                            <td>25</td>
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
                                            <td>
                                                {month.totalCompleted >= 25
                                                    ? "✅ Keep it up!"
                                                    : `❌ ${25 - month.totalCompleted} Days is Missing`}
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

export default Devotion;