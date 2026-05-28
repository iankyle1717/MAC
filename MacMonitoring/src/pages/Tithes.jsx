import { useEffect, useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";

function Tithes() {
    const [leaders, setLeaders] = useState([]);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    // Form states
    const [searchName, setSearchName] = useState("");
    const [selectedLeader, setSelectedLeader] = useState(null);
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Filter states
    const [filterTribe, setFilterTribe] = useState("ALL");
    const [filterMonth, setFilterMonth] = useState("ALL");

    // Tab state: "records" | "monthly"
    const [activeTab, setActiveTab] = useState("records");

    // Gross goal modal
    const [showGrossModal, setShowGrossModal] = useState(false);
    const [grossLeader, setGrossLeader] = useState(null);
    const [grossAmount, setGrossAmount] = useState("");

    const searchRef = useRef(null);

    useEffect(() => {
        fetchLeaders();
        fetchRecords();
    }, []);

    const fetchLeaders = async () => {
        const { data, error } = await supabase
            .from("tblMonitoring")
            .select("id, firstname, lastname, type, tribe, gross_goal, ministry")
            .order("firstname", { ascending: true });

        if (error) {
            console.error("Error fetching leaders:", error);
            return;
        }
        setLeaders(data || []);
    };

    const fetchRecords = async () => {
        setFetching(true);
        const { data, error } = await supabase
            .from("tblTithes")
            .select("*")
            .order("date", { ascending: false });

        if (error) {
            console.error("Error fetching records:", error);
            setFetching(false);
            return;
        }

        const recordsWithLeaders = await Promise.all(
            (data || []).map(async (record) => {
                const { data: leader } = await supabase
                    .from("tblMonitoring")
                    .select("firstname, lastname, type, tribe, gross_goal, ministry")
                    .eq("id", record.leader_id)
                    .single();
                return { ...record, leader };
            })
        );

        setRecords(recordsWithLeaders);
        setFetching(false);
    };

    // Smart search with suggestions
    const getSuggestions = () => {
        if (!searchName.trim()) return [];
        const term = searchName.toLowerCase();
        return leaders
            .filter(l => 
                l.firstname.toLowerCase().includes(term) || 
                l.lastname.toLowerCase().includes(term) ||
                `${l.firstname} ${l.lastname}`.toLowerCase().includes(term)
            )
            .filter(l => filterTribe === "ALL" || l.tribe === filterTribe)
            .slice(0, 5);
    };

    const suggestions = getSuggestions();

    const handleSelectLeader = (leader) => {
        setSelectedLeader(leader);
        setSearchName(`${leader.firstname} ${leader.lastname}`);
        setShowSuggestions(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedLeader || !amount) {
            alert("Please select a person and enter the amount.");
            return;
        }

        setLoading(true);
        const { error } = await supabase
            .from("tblTithes")
            .insert([{
                leader_id: selectedLeader.id,
                amount: parseFloat(amount),
                date
            }]);

        if (error) {
            alert("Failed to record tithe. Please try again.");
            console.error(error);
        } else {
            alert("Tithe recorded successfully!");
            setAmount("");
            setSearchName("");
            setSelectedLeader(null);
            fetchRecords();
        }
        setLoading(false);
    };

    // Calculate stats for the selected date (today by default)
    const getTodayTotal = () => {
        return records
            .filter(r => r.date === date)
            .reduce((sum, r) => sum + Number(r.amount), 0);
    };

    const getTodayCount = () => {
        return new Set(records.filter(r => r.date === date).map(r => r.leader_id)).size;
    };

    const getTodayTithersRatio = () => {
        const todayGivers = getTodayCount();
        const totalLeaders = leaders.length;
        return { todayGivers, totalLeaders };
    };

    const getLeaderYearlyProgress = (leaderId) => {
        const now = new Date();
        const yearRecords = records.filter(r => 
            r.leader_id === leaderId && 
            r.date.startsWith(`${now.getFullYear()}-`)
        );
        const totalGiven = yearRecords.reduce((sum, r) => sum + Number(r.amount), 0);
        const leader = leaders.find(l => l.id === leaderId);
        const goal = leader?.gross_goal || 0;
        const percentage = goal > 0 ? Math.round((totalGiven / goal) * 100) : 0;
        return { totalGiven, goal, percentage };
    };

    // FIXED: Handle setting gross goal - using correct column name
    const handleSetGross = async () => {
        if (!grossLeader || !grossAmount) {
            alert("Please enter an amount.");
            return;
        }

        const parsedAmount = parseFloat(grossAmount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            alert("Please enter a valid amount.");
            return;
        }

        console.log("Updating gross_goal for leader:", grossLeader.id, "Amount:", parsedAmount);

        const { data, error } = await supabase
            .from("tblMonitoring")
            .update({ gross_goal: parsedAmount })
            .eq("id", grossLeader.id)
            .select();

        if (error) {
            console.error("Error setting gross:", error);
            alert("Failed to set gross goal. Error: " + error.message);
        } else {
            console.log("Success:", data);
            alert(`Gross goal set for ${grossLeader.firstname}!`);
            setShowGrossModal(false);
            setGrossAmount("");
            setGrossLeader(null);
            fetchLeaders();
            fetchRecords();
        }
    };

    // Filter displayed records
    const filteredRecords = records.filter(r => {
        const matchesTribe = filterTribe === "ALL" || r.leader?.tribe === filterTribe;
        const matchesMonth = filterMonth === "ALL" || r.date.startsWith(filterMonth);
        return matchesTribe && matchesMonth;
    });

    // Get unique months for filter
    const getMonthOptions = () => {
        const months = new Set();
        records.forEach(r => {
            const key = r.date.substring(0, 7);
            const label = new Date(r.date + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" });
            months.add(JSON.stringify({ key, label }));
        });
        return Array.from(months).map(m => JSON.parse(m)).sort((a, b) => b.key.localeCompare(a.key));
    };

    // MONTHLY SUMMARY DATA
    const getMonthlySummary = () => {
        const summary = {};

        // Filter records by selected month (or all if "ALL")
        const monthRecords = filterMonth === "ALL" 
            ? records 
            : records.filter(r => r.date.startsWith(filterMonth));

        // Also filter by tribe if needed
        const tribeFiltered = filterTribe === "ALL"
            ? monthRecords
            : monthRecords.filter(r => r.leader?.tribe === filterTribe);

        tribeFiltered.forEach(r => {
            const key = r.leader_id;
            if (!summary[key]) {
                summary[key] = {
                    leader: r.leader,
                    total: 0,
                    count: 0,
                    dates: []
                };
            }
            summary[key].total += Number(r.amount);
            summary[key].count += 1;
            summary[key].dates.push(r.date);
        });

        return Object.values(summary).sort((a, b) => b.total - a.total);
    };

    const monthOptions = getMonthOptions();
    const tribes = [...new Set(leaders.map(l => l.tribe))].sort();
    const todayRatio = getTodayTithersRatio();
    const monthlySummary = getMonthlySummary();

    // EXPORT TO EXCEL
    const exportToExcel = () => {
        const dataToExport = activeTab === "monthly" ? monthlySummary : filteredRecords;

        let csvContent = "";

        if (activeTab === "monthly") {
            // Monthly Summary Export
            csvContent = "ACTS Church Cabangan - Tithes Monthly Summary\n";
            csvContent += `Generated: ${new Date().toLocaleDateString()}\n`;
            csvContent += `Filter: ${filterMonth === "ALL" ? "All Months" : filterMonth}, ${filterTribe === "ALL" ? "All Tribes" : filterTribe}\n\n`;
            csvContent += "Name,Tribe,Type,Ministry,Total Amount,Number of Tithes,Dates\n";

            dataToExport.forEach(item => {
                const dates = item.dates.join("; ");
                csvContent += `"${item.leader?.firstname} ${item.leader?.lastname}","${item.leader?.tribe || ''}","${item.leader?.type || ''}","${item.leader?.ministry || ''}",${item.total},${item.count},"${dates}"\n`;
            });

            csvContent += `\nTOTAL,,,,${dataToExport.reduce((s, i) => s + i.total, 0)},${dataToExport.reduce((s, i) => s + i.count, 0)},\n`;
        } else {
            // Detailed Records Export
            csvContent = "ACTS Church Cabangan - Tithes Records\n";
            csvContent += `Generated: ${new Date().toLocaleDateString()}\n`;
            csvContent += `Filter: ${filterMonth === "ALL" ? "All Months" : filterMonth}, ${filterTribe === "ALL" ? "All Tribes" : filterTribe}\n\n`;
            csvContent += "Date,Name,Tribe,Type,Ministry,Amount,Gross Goal,Yearly Progress\n";

            dataToExport.forEach(r => {
                const progress = getLeaderYearlyProgress(r.leader_id);
                csvContent += `"${r.date}","${r.leader?.firstname} ${r.leader?.lastname}","${r.leader?.tribe || ''}","${r.leader?.type || ''}","${r.leader?.ministry || ''}",${r.amount},${progress.goal},${progress.percentage}%\n`;
            });

            csvContent += `\nTOTAL,,,,,${dataToExport.reduce((s, r) => s + Number(r.amount), 0)},,\n`;
        }

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);

        const filename = activeTab === "monthly" 
            ? `ACTS_Tithes_Monthly_${filterMonth === "ALL" ? "All" : filterMonth}.csv`
            : `ACTS_Tithes_Records_${filterMonth === "ALL" ? "All" : filterMonth}.csv`;

        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="layout">
            <Sidebar />
            <div className="content">
                <h1>Tithes Recording</h1>
                <p style={{ opacity: 0.7, marginBottom: "20px" }}>
                    Welcome! Record tithes, track participation, and monitor yearly goals.
                </p>

                {/* STATS CARDS */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
                    gap: "15px",
                    marginBottom: "25px"
                }}>
                    <div className="record-card" style={{ background: "linear-gradient(135deg, #c9a45c 0%, #b8934a 100%)", color: "#fff" }}>
                        <h3 style={{ color: "rgba(255,255,255,0.9)" }}>Today's Collection</h3>
                        <h1 style={{ fontSize: "32px" }}>P{getTodayTotal().toLocaleString()}</h1>
                        <p style={{ fontSize: "13px", opacity: 0.9 }}>
                            {getTodayCount()} people gave today
                        </p>
                    </div>

                    <div className="record-card">
                        <h3>Today's Tithers</h3>
                        <h1>{todayRatio.todayGivers} <span style={{ fontSize: "18px", color: "#9ca3af" }}>/ {todayRatio.totalLeaders}</span></h1>
                        <div style={{ marginTop: "8px", background: "#e5e7eb", borderRadius: "8px", height: "8px", overflow: "hidden" }}>
                            <div style={{
                                width: `${todayRatio.totalLeaders > 0 ? (todayRatio.todayGivers / todayRatio.totalLeaders) * 100 : 0}%`,
                                height: "100%",
                                background: todayRatio.todayGivers >= todayRatio.totalLeaders * 0.8 ? "#16a34a" : "#f59e0b",
                                borderRadius: "8px",
                                transition: "width 0.5s"
                            }} />
                        </div>
                        <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "6px" }}>
                            {todayRatio.totalLeaders > 0 ? Math.round((todayRatio.todayGivers / todayRatio.totalLeaders) * 100) : 0}% of leaders gave today
                        </p>
                    </div>

                    <div className="record-card" style={{ background: "#ecfdf5" }}>
                        <h3>Total Records</h3>
                        <h1 style={{ color: "#16a34a" }}>{records.length}</h1>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}>
                    {/* LEFT: FORM */}
                    <div>
                        <h2 style={{ marginBottom: "15px" }}>Record New Tithe</h2>
                        <form className="leader-form" onSubmit={handleSubmit}>
                            <div style={{ position: "relative" }} ref={searchRef}>
                                <input
                                    type="text"
                                    placeholder="Type a name..."
                                    value={searchName}
                                    onChange={(e) => {
                                        setSearchName(e.target.value);
                                        setShowSuggestions(true);
                                        setSelectedLeader(null);
                                    }}
                                    onFocus={() => setShowSuggestions(true)}
                                    style={{
                                        width: "100%",
                                        padding: "14px 16px",
                                        borderRadius: "12px",
                                        border: "2px solid #e5e7eb",
                                        fontSize: "15px",
                                        outline: "none",
                                        boxSizing: "border-box"
                                    }}
                                />

                                {showSuggestions && suggestions.length > 0 && (
                                    <div style={{
                                        position: "absolute",
                                        top: "100%",
                                        left: 0,
                                        right: 0,
                                        background: "#fff",
                                        borderRadius: "12px",
                                        boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
                                        marginTop: "6px",
                                        zIndex: 100,
                                        overflow: "hidden",
                                        border: "1px solid #e5e7eb"
                                    }}>
                                        {suggestions.map((leader) => (
                                            <div
                                                key={leader.id}
                                                onClick={() => handleSelectLeader(leader)}
                                                style={{
                                                    padding: "12px 16px",
                                                    cursor: "pointer",
                                                    borderBottom: "1px solid #f3f4f6",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "10px",
                                                    transition: "background 0.2s"
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                                                onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
                                            >
                                                <div style={{
                                                    width: "36px",
                                                    height: "36px",
                                                    borderRadius: "50%",
                                                    background: "linear-gradient(135deg, #c9a45c 0%, #b8934a 100%)",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    color: "#fff",
                                                    fontSize: "14px",
                                                    fontWeight: "700"
                                                }}>
                                                    {leader.firstname.charAt(0)}{leader.lastname.charAt(0)}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: "600", fontSize: "14px" }}>
                                                        {leader.firstname} {leader.lastname}
                                                    </div>
                                                    <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                                                        {leader.type} - {leader.tribe}
                                                    </div>
                                                </div>
                                                {leader.gross_goal && (
                                                    <span style={{
                                                        marginLeft: "auto",
                                                        padding: "2px 8px",
                                                        borderRadius: "10px",
                                                        background: "#dcfce7",
                                                        color: "#16a34a",
                                                        fontSize: "10px",
                                                        fontWeight: "600"
                                                    }}>
                                                        Gross: P{leader.gross_goal.toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {selectedLeader && (
                                <div style={{
                                    padding: "12px 16px",
                                    borderRadius: "12px",
                                    background: "#f0fdf4",
                                    border: "1px solid #86efac",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px"
                                }}>
                                    <span style={{ fontSize: "20px" }}>OK</span>
                                    <div>
                                        <div style={{ fontWeight: "600", color: "#166534" }}>
                                            {selectedLeader.firstname} {selectedLeader.lastname}
                                        </div>
                                        <div style={{ fontSize: "12px", color: "#16a34a" }}>
                                            Ready to record tithe
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedLeader(null);
                                            setSearchName("");
                                        }}
                                        style={{
                                            marginLeft: "auto",
                                            background: "none",
                                            border: "none",
                                            color: "#16a34a",
                                            cursor: "pointer",
                                            fontSize: "18px"
                                        }}
                                    >
                                        x
                                    </button>
                                </div>
                            )}

                            <input
                                type="number"
                                placeholder="Amount (P)"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                min="0"
                                step="0.01"
                            />

                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />

                            <button type="submit" disabled={loading || !selectedLeader}>
                                {loading ? "Recording..." : "Record Tithe"}
                            </button>
                        </form>

                    </div>

                    {/* RIGHT: RECORDS CARDS */}
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                            <h2 style={{ margin: 0 }}>
                                Recent Records
                                <span style={{
                                    marginLeft: "10px",
                                    padding: "4px 10px",
                                    borderRadius: "12px",
                                    background: "#dbeafe",
                                    color: "#1e40af",
                                    fontSize: "8px"
                                }}>
                                    {filteredRecords.length}
                                </span>
                            </h2>
                        </div>

                        <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
                            <select
                                value={filterTribe}
                                onChange={(e) => setFilterTribe(e.target.value)}
                                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "13px" }}
                            >
                                <option value="ALL">All Tribes</option>
                                {tribes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <select
                                value={filterMonth}
                                onChange={(e) => setFilterMonth(e.target.value)}
                                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "13px" }}
                            >
                                <option value="ALL">All Months</option>
                                {monthOptions.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                            </select>
                        </div>

                        {fetching ? (
                            <p>Loading records...</p>
                        ) : filteredRecords.length === 0 ? (
                            <p style={{ color: "#6b7280" }}>No tithes records yet.</p>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "400px", overflowY: "auto" }}>
                                {filteredRecords.slice(0, 10).map((record) => {
                                    const progress = getLeaderYearlyProgress(record.leader_id);
                                    return (
                                        <div
                                            key={record.id}
                                            style={{
                                                padding: "14px 16px",
                                                borderRadius: "12px",
                                                background: "#f9fafb",
                                                border: "1px solid #e5e7eb",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "12px"
                                            }}
                                        >
                                            <div style={{
                                                width: "40px",
                                                height: "40px",
                                                borderRadius: "50%",
                                                background: "linear-gradient(135deg, #c9a45c 0%, #b8934a 100%)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                color: "#fff",
                                                fontSize: "14px",
                                                fontWeight: "700",
                                                flexShrink: 0
                                            }}>
                                                {record.leader?.firstname?.charAt(0)}{record.leader?.lastname?.charAt(0)}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                                                    <span style={{ fontWeight: "600", fontSize: "14px" }}>
                                                        {record.leader?.firstname} {record.leader?.lastname}
                                                    </span>
                                                    <span style={{
                                                        padding: "2px 6px",
                                                        borderRadius: "6px",
                                                        background: "#dbeafe",
                                                        color: "#1e40af",
                                                        fontSize: "10px",
                                                        fontWeight: "600"
                                                    }}>
                                                        {record.leader?.tribe}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                                                    {record.date} - {record.leader?.type}
                                                </div>
                                                {progress.goal > 0 && (
                                                    <div style={{ marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                                                        <div style={{ flex: 1, background: "#e5e7eb", borderRadius: "4px", height: "4px" }}>
                                                            <div style={{
                                                                width: `${Math.min(progress.percentage, 100)}%`,
                                                                height: "100%",
                                                                background: progress.percentage >= 100 ? "#16a34a" : "#f59e0b",
                                                                borderRadius: "4px"
                                                            }} />
                                                        </div>
                                                        <span style={{ fontSize: "10px", color: "#6b7280", fontWeight: "600" }}>
                                                            {progress.percentage}%
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                                                <div style={{ fontSize: "18px", fontWeight: "700", color: "#16a34a" }}>
                                                    P{Number(record.amount).toLocaleString()}
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setGrossLeader(record.leader);
                                                        setGrossAmount(record.leader?.gross_goal || "");
                                                        setShowGrossModal(true);
                                                    }}
                                                    style={{
                                                        marginTop: "4px",
                                                        padding: "2px 8px",
                                                        borderRadius: "6px",
                                                        border: "none",
                                                        background: "#f3f4f6",
                                                        color: "#6b7280",
                                                        fontSize: "10px",
                                                        cursor: "pointer"
                                                    }}
                                                >
                                                    Add Gross
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* TABS */}
                <div style={{ marginTop: "40px", marginBottom: "20px" }}>
                    <div style={{ display: "flex", gap: "4px", borderBottom: "2px solid #e5e7eb" }}>
                        <button
                            onClick={() => setActiveTab("records")}
                            style={{
                                padding: "12px 24px",
                                border: "none",
                                background: "none",
                                fontSize: "15px",
                                fontWeight: "600",
                                cursor: "pointer",
                                color: activeTab === "records" ? "#b8934a" : "#6b7280",
                                borderBottom: activeTab === "records" ? "3px solid #b8934a" : "3px solid transparent",
                                marginBottom: "-2px",
                                transition: "all 0.2s"
                            }}
                        >
                            All Records Table
                        </button>
                        <button
                            onClick={() => setActiveTab("monthly")}
                            style={{
                                padding: "12px 24px",
                                border: "none",
                                background: "none",
                                fontSize: "15px",
                                fontWeight: "600",
                                cursor: "pointer",
                                color: activeTab === "monthly" ? "#b8934a" : "#6b7280",
                                borderBottom: activeTab === "monthly" ? "3px solid #b8934a" : "3px solid transparent",
                                marginBottom: "-2px",
                                transition: "all 0.2s"
                            }}
                        >
                            Monthly Summary
                        </button>
                    </div>
                </div>

                {/* EXPORT BUTTON */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                    <h2 style={{ margin: 0 }}>
                        {activeTab === "records" ? "All Records" : "Monthly Summary"}
                        <span style={{
                            marginLeft: "10px",
                            padding: "4px 10px",
                            borderRadius: "12px",
                            background: "#dbeafe",
                            color: "#1e40af",
                            fontSize: "14px"
                        }}>
                            {activeTab === "records" ? filteredRecords.length : monthlySummary.length}
                        </span>
                    </h2>
                    <button
                        onClick={exportToExcel}
                        style={{
                            padding: "10px 20px",
                            borderRadius: "10px",
                            border: "none",
                            background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                            color: "#fff",
                            fontWeight: "700",
                            fontSize: "14px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                        }}
                    >
                        Export to Excel
                    </button>
                </div>

                {/* FILTERS FOR TABLE */}
                <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
                    <select
                        value={filterTribe}
                        onChange={(e) => setFilterTribe(e.target.value)}
                        style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "13px" }}
                    >
                        <option value="ALL">All Tribes</option>
                        {tribes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "13px" }}
                    >
                        <option value="ALL">All Months</option>
                        {monthOptions.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                    </select>
                </div>

                {/* TABLE CONTENT */}
                <div style={{
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                    overflow: "hidden",
                    background: "#fff",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                }}>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "14px"
                        }}>
                            <thead>
                                <tr style={{
                                    background: "linear-gradient(135deg, #c9a45c 0%, #b8934a 100%)",
                                    color: "#fff"
                                }}>
                                    {activeTab === "records" ? (
                                        <>
                                            <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: "600", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Date</th>
                                            <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: "600", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Name</th>
                                            <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: "600", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Tribe</th>
                                            <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: "600", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Type</th>
                                            <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: "600", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Ministry</th>
                                            <th style={{ padding: "14px 16px", textAlign: "right", fontWeight: "600", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Amount</th>
                                            <th style={{ padding: "14px 16px", textAlign: "center", fontWeight: "600", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Gross Goal</th>
                                            <th style={{ padding: "14px 16px", textAlign: "center", fontWeight: "600", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Progress</th>
                                        </>
                                    ) : (
                                        <>
                                            <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: "600", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Name</th>
                                            <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: "600", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Tribe</th>
                                            <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: "600", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Type</th>
                                            <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: "600", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Ministry</th>
                                            <th style={{ padding: "14px 16px", textAlign: "right", fontWeight: "600", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Amount</th>
                                            <th style={{ padding: "14px 16px", textAlign: "center", fontWeight: "600", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Tithes Count</th>
                                            <th style={{ padding: "14px 16px", textAlign: "center", fontWeight: "600", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Gross Goal</th>
                                            <th style={{ padding: "14px 16px", textAlign: "center", fontWeight: "600", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Progress</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {fetching ? (
                                    <tr>
                                        <td colSpan={activeTab === "records" ? 8 : 8} style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
                                            Loading records...
                                        </td>
                                    </tr>
                                ) : activeTab === "records" ? (
                                    filteredRecords.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
                                                No tithes records found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRecords.map((record, index) => {
                                            const progress = getLeaderYearlyProgress(record.leader_id);
                                            const isEven = index % 2 === 0;
                                            return (
                                                <tr
                                                    key={record.id}
                                                    style={{
                                                        background: isEven ? "#fff" : "#f9fafb",
                                                        transition: "background 0.15s",
                                                        borderBottom: "1px solid #f3f4f6"
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = "#f3f4f6"}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = isEven ? "#fff" : "#f9fafb"}
                                                >
                                                    <td style={{ padding: "12px 16px", color: "#374151", fontWeight: "500" }}>
                                                        {record.date}
                                                    </td>
                                                    <td style={{ padding: "12px 16px" }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                            <div style={{
                                                                width: "32px",
                                                                height: "32px",
                                                                borderRadius: "50%",
                                                                background: "linear-gradient(135deg, #c9a45c 0%, #b8934a 100%)",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                color: "#fff",
                                                                fontSize: "12px",
                                                                fontWeight: "700"
                                                            }}>
                                                                {record.leader?.firstname?.charAt(0)}{record.leader?.lastname?.charAt(0)}
                                                            </div>
                                                            <span style={{ fontWeight: "600", color: "#111827" }}>
                                                                {record.leader?.firstname} {record.leader?.lastname}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: "12px 16px" }}>
                                                        <span style={{
                                                            padding: "4px 10px",
                                                            borderRadius: "8px",
                                                            background: "#dbeafe",
                                                            color: "#1e40af",
                                                            fontSize: "12px",
                                                            fontWeight: "600"
                                                        }}>
                                                            {record.leader?.tribe}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: "12px 16px", color: "#6b7280", fontSize: "13px" }}>
                                                        {record.leader?.type}
                                                    </td>
                                                    <td style={{ padding: "12px 16px", color: "#6b7280", fontSize: "13px" }}>
                                                        {record.leader?.ministry}
                                                    </td>
                                                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: "700", color: "#16a34a", fontSize: "15px" }}>
                                                        P{Number(record.amount).toLocaleString()}
                                                    </td>
                                                    <td style={{ padding: "12px 16px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
                                                        {record.leader?.gross_goal ? `P${Number(record.leader.gross_goal).toLocaleString()}` : "-"}
                                                    </td>
                                                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                                                        {record.leader?.gross_goal ? (
                                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                                                                <div style={{ width: "60px", background: "#e5e7eb", borderRadius: "4px", height: "6px" }}>
                                                                    <div style={{
                                                                        width: `${Math.min(progress.percentage, 100)}%`,
                                                                        height: "100%",
                                                                        background: progress.percentage >= 100 ? "#16a34a" : "#f59e0b",
                                                                        borderRadius: "4px"
                                                                    }} />
                                                                </div>
                                                                <span style={{ fontSize: "11px", color: "#6b7280", fontWeight: "600", minWidth: "32px" }}>
                                                                    {progress.percentage}%
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span style={{ fontSize: "12px", color: "#9ca3af" }}>-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )
                                ) : (
                                    monthlySummary.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
                                                No records found for this period.
                                            </td>
                                        </tr>
                                    ) : (
                                        monthlySummary.map((item, index) => {
                                            const progress = getLeaderYearlyProgress(item.leader?.id);
                                            const isEven = index % 2 === 0;
                                            return (
                                                <tr
                                                    key={item.leader?.id}
                                                    style={{
                                                        background: isEven ? "#fff" : "#f9fafb",
                                                        transition: "background 0.15s",
                                                        borderBottom: "1px solid #f3f4f6"
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = "#f3f4f6"}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = isEven ? "#fff" : "#f9fafb"}
                                                >
                                                    <td style={{ padding: "12px 16px" }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                            <div style={{
                                                                width: "32px",
                                                                height: "32px",
                                                                borderRadius: "50%",
                                                                background: "linear-gradient(135deg, #c9a45c 0%, #b8934a 100%)",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                color: "#fff",
                                                                fontSize: "12px",
                                                                fontWeight: "700"
                                                            }}>
                                                                {item.leader?.firstname?.charAt(0)}{item.leader?.lastname?.charAt(0)}
                                                            </div>
                                                            <span style={{ fontWeight: "600", color: "#111827" }}>
                                                                {item.leader?.firstname} {item.leader?.lastname}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: "12px 16px" }}>
                                                        <span style={{
                                                            padding: "4px 10px",
                                                            borderRadius: "8px",
                                                            background: "#dbeafe",
                                                            color: "#1e40af",
                                                            fontSize: "12px",
                                                            fontWeight: "600"
                                                        }}>
                                                            {item.leader?.tribe}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: "12px 16px", color: "#6b7280", fontSize: "13px" }}>
                                                        {item.leader?.type}
                                                    </td>
                                                    <td style={{ padding: "12px 16px", color: "#6b7280", fontSize: "13px" }}>
                                                        {item.leader?.ministry}
                                                    </td>
                                                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: "700", color: "#16a34a", fontSize: "15px" }}>
                                                        P{item.total.toLocaleString()}
                                                    </td>
                                                    <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: "600", color: "#374151" }}>
                                                        {item.count}
                                                    </td>
                                                    <td style={{ padding: "12px 16px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
                                                        {item.leader?.gross_goal ? `P${Number(item.leader.gross_goal).toLocaleString()}` : "-"}
                                                    </td>
                                                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                                                        {item.leader?.gross_goal ? (
                                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                                                                <div style={{ width: "60px", background: "#e5e7eb", borderRadius: "4px", height: "6px" }}>
                                                                    <div style={{
                                                                        width: `${Math.min(progress.percentage, 100)}%`,
                                                                        height: "100%",
                                                                        background: progress.percentage >= 100 ? "#16a34a" : "#f59e0b",
                                                                        borderRadius: "4px"
                                                                    }} />
                                                                </div>
                                                                <span style={{ fontSize: "11px", color: "#6b7280", fontWeight: "600", minWidth: "32px" }}>
                                                                    {progress.percentage}%
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span style={{ fontSize: "12px", color: "#9ca3af" }}>-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ADD GROSS MODAL */}
            {showGrossModal && grossLeader && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(0,0,0,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1000
                }}>
                    <div style={{
                        background: "#fff",
                        borderRadius: "20px",
                        padding: "30px",
                        width: "90%",
                        maxWidth: "400px",
                        boxShadow: "0 25px 50px rgba(0,0,0,0.2)"
                    }}>
                        <h3 style={{ margin: "0 0 8px 0" }}>Add Gross Goal</h3>
                        <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "20px" }}>
                            For {grossLeader.firstname} {grossLeader.lastname}
                        </p>

                        <input
                            type="number"
                            placeholder="Enter gross goal amount"
                            value={grossAmount}
                            onChange={(e) => setGrossAmount(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "14px",
                                borderRadius: "12px",
                                border: "2px solid #e5e7eb",
                                fontSize: "16px",
                                marginBottom: "20px",
                                boxSizing: "border-box"
                            }}
                        />

                        <div style={{ display: "flex", gap: "10px" }}>
                            <button
                                onClick={() => {
                                    setShowGrossModal(false);
                                    setGrossLeader(null);
                                    setGrossAmount("");
                                }}
                                style={{
                                    flex: 1,
                                    padding: "14px",
                                    borderRadius: "12px",
                                    border: "1px solid #e5e7eb",
                                    background: "#f9fafb",
                                    cursor: "pointer",
                                    fontWeight: "600"
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSetGross}
                                style={{
                                    flex: 1,
                                    padding: "14px",
                                    borderRadius: "12px",
                                    border: "none",
                                    background: "linear-gradient(135deg, #c9a45c 0%, #b8934a 100%)",
                                    color: "#fff",
                                    fontWeight: "700",
                                    cursor: "pointer"
                                }}
                            >
                                Save Gross
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Tithes;
