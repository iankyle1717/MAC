import { useEffect, useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";
import * as XLSX from "xlsx-js-style";

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

    const searchRef = useRef(null);

    useEffect(() => {
        fetchLeaders();
        fetchRecords();
    }, []);

    const fetchLeaders = async () => {
        const { data, error } = await supabase
            .from("tblMonitoring")
            .select("id, firstname, lastname, type, tribe, ministry")
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
                    .select("firstname, lastname, type, tribe, ministry")
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
            const [year, month] = key.split("-");
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            const label = `${monthNames[parseInt(month) - 1]} ${year}`;
            months.add(JSON.stringify({ key, label }));
        });
        return Array.from(months).map(m => JSON.parse(m)).sort((a, b) => b.key.localeCompare(a.key));
    };

    // MONTHLY SUMMARY DATA
    const getMonthlySummary = () => {
        const summary = {};

        const monthRecords = filterMonth === "ALL" 
            ? records 
            : records.filter(r => r.date.startsWith(filterMonth));

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

    // Format date nicely for display
    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        const d = new Date(dateStr + "T00:00:00");
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    };

    // Format month-year for monthly summary
    const formatMonthYear = (dateStr) => {
        if (!dateStr) return "";
        const d = new Date(dateStr + "T00:00:00");
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    };

    // Get display month for monthly summary header
    const getDisplayMonth = () => {
        if (filterMonth === "ALL") return "All Months";
        const [year, month] = filterMonth.split("-");
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        return `${monthNames[parseInt(month) - 1]} ${year}`;
    };

    // EXPORT TO EXCEL with TEMPLATE STYLING
    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();

        // Define styles
        const goldHeader = {
            fill: { fgColor: { rgb: "C9A45C" }, patternType: "solid" },
            font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
                top: { style: "thin", color: { rgb: "B8934A" } },
                bottom: { style: "thin", color: { rgb: "B8934A" } },
                left: { style: "thin", color: { rgb: "B8934A" } },
                right: { style: "thin", color: { rgb: "B8934A" } }
            }
        };

        const titleStyle = {
            font: { bold: true, color: { rgb: "B8934A" }, sz: 18 },
            alignment: { horizontal: "center", vertical: "center" }
        };

        const subtitleStyle = {
            font: { color: { rgb: "6B7280" }, sz: 11, italic: true },
            alignment: { horizontal: "center", vertical: "center" }
        };

        const churchInfoStyle = {
            font: { bold: true, color: { rgb: "374151" }, sz: 12 },
            alignment: { horizontal: "center", vertical: "center" }
        };

        const dataCell = {
            font: { sz: 11, color: { rgb: "374151" } },
            border: {
                top: { style: "thin", color: { rgb: "E5E7EB" } },
                bottom: { style: "thin", color: { rgb: "E5E7EB" } },
                left: { style: "thin", color: { rgb: "E5E7EB" } },
                right: { style: "thin", color: { rgb: "E5E7EB" } }
            }
        };

        const altRow = {
            fill: { fgColor: { rgb: "F9FAFB" }, patternType: "solid" },
            font: { sz: 11, color: { rgb: "374151" } },
            border: {
                top: { style: "thin", color: { rgb: "E5E7EB" } },
                bottom: { style: "thin", color: { rgb: "E5E7EB" } },
                left: { style: "thin", color: { rgb: "E5E7EB" } },
                right: { style: "thin", color: { rgb: "E5E7EB" } }
            }
        };

        const totalStyle = {
            fill: { fgColor: { rgb: "ECFDF5" }, patternType: "solid" },
            font: { bold: true, color: { rgb: "16A34A" }, sz: 12 },
            border: {
                top: { style: "medium", color: { rgb: "16A34A" } },
                bottom: { style: "medium", color: { rgb: "16A34A" } },
                left: { style: "thin", color: { rgb: "E5E7EB" } },
                right: { style: "thin", color: { rgb: "E5E7EB" } }
            }
        };

        const amountStyle = {
            font: { sz: 11, color: { rgb: "16A34A" }, bold: true },
            alignment: { horizontal: "right" },
            border: {
                top: { style: "thin", color: { rgb: "E5E7EB" } },
                bottom: { style: "thin", color: { rgb: "E5E7EB" } },
                left: { style: "thin", color: { rgb: "E5E7EB" } },
                right: { style: "thin", color: { rgb: "E5E7EB" } }
            }
        };

        const amountAltStyle = {
            fill: { fgColor: { rgb: "F9FAFB" }, patternType: "solid" },
            font: { sz: 11, color: { rgb: "16A34A" }, bold: true },
            alignment: { horizontal: "right" },
            border: {
                top: { style: "thin", color: { rgb: "E5E7EB" } },
                bottom: { style: "thin", color: { rgb: "E5E7EB" } },
                left: { style: "thin", color: { rgb: "E5E7EB" } },
                right: { style: "thin", color: { rgb: "E5E7EB" } }
            }
        };

        if (activeTab === "monthly") {
            // MONTHLY SUMMARY EXPORT
            const wsData = [];

            // Church Header
            wsData.push(["ACTS CHURCH CABANGAN"]);
            wsData.push(["Tithes Monthly Summary Report"]);
            wsData.push([`Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`]);
            wsData.push([`Period: ${getDisplayMonth()} | Tribe: ${filterTribe === "ALL" ? "All Tribes" : filterTribe}`]);
            wsData.push([]);

            // Column Headers
            wsData.push(["No.", "Name", "Tribe", "Type", "Ministry", "Total Amount", "Tithes Count"]);

            // Data rows
            let grandTotal = 0;
            let grandCount = 0;

            monthlySummary.forEach((item, index) => {
                wsData.push([
                    index + 1,
                    `${item.leader?.firstname} ${item.leader?.lastname}`,
                    item.leader?.tribe || "",
                    item.leader?.type || "",
                    item.leader?.ministry || "",
                    item.total,
                    item.count
                ]);
                grandTotal += item.total;
                grandCount += item.count;
            });

            // Total row
            wsData.push([]);
            wsData.push(["", "", "", "", "GRAND TOTAL", grandTotal, grandCount]);

            const ws = XLSX.utils.aoa_to_sheet(wsData);

            // Set column widths
            ws["!cols"] = [
                { wch: 6 },   // No.
                { wch: 25 },  // Name
                { wch: 15 },  // Tribe
                { wch: 15 },  // Type
                { wch: 18 },  // Ministry
                { wch: 15 },  // Total Amount
                { wch: 14 }   // Tithes Count
            ];

            // Apply styles
            // Title rows (0-3)
            for (let r = 0; r <= 3; r++) {
                const cell = XLSX.utils.encode_cell({ r, c: 0 });
                if (ws[cell]) {
                    ws[cell].s = r === 0 ? titleStyle : (r === 1 ? churchInfoStyle : subtitleStyle);
                    ws["!merges"] = ws["!merges"] || [];
                    ws["!merges"].push({ s: { r, c: 0 }, e: { r, c: 6 } });
                }
            }

            // Header row (5)
            for (let c = 0; c <= 6; c++) {
                const cell = XLSX.utils.encode_cell({ r: 5, c });
                if (ws[cell]) ws[cell].s = goldHeader;
            }

            // Data rows
            monthlySummary.forEach((_, index) => {
                const rowNum = 6 + index;
                const isAlt = index % 2 === 1;

                for (let c = 0; c <= 6; c++) {
                    const cell = XLSX.utils.encode_cell({ r: rowNum, c });
                    if (ws[cell]) {
                        if (c === 5) { // Amount column
                            ws[cell].s = isAlt ? amountAltStyle : amountStyle;
                            ws[cell].z = '"P"#,##0.00';
                        } else {
                            ws[cell].s = isAlt ? altRow : dataCell;
                        }
                    }
                }
            });

            // Total row
            const totalRow = 6 + monthlySummary.length + 1;
            for (let c = 0; c <= 6; c++) {
                const cell = XLSX.utils.encode_cell({ r: totalRow, c });
                if (ws[cell]) {
                    ws[cell].s = totalStyle;
                    if (c === 5) ws[cell].z = '"P"#,##0.00';
                }
            }

            XLSX.utils.book_append_sheet(wb, ws, "Monthly Summary");

        } else {
            // DETAILED RECORDS EXPORT
            const wsData = [];

            // Church Header
            wsData.push(["ACTS CHURCH CABANGAN"]);
            wsData.push(["Tithes Records Report"]);
            wsData.push([`Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`]);
            wsData.push([`Period: ${filterMonth === "ALL" ? "All Months" : getDisplayMonth()} | Tribe: ${filterTribe === "ALL" ? "All Tribes" : filterTribe}`]);
            wsData.push([]);

            // Column Headers
            wsData.push(["No.", "Date", "Name", "Tribe", "Type", "Ministry", "Amount"]);

            // Data rows
            let grandTotal = 0;

            filteredRecords.forEach((record, index) => {
                wsData.push([
                    index + 1,
                    formatDate(record.date),
                    `${record.leader?.firstname} ${record.leader?.lastname}`,
                    record.leader?.tribe || "",
                    record.leader?.type || "",
                    record.leader?.ministry || "",
                    Number(record.amount)
                ]);
                grandTotal += Number(record.amount);
            });

            // Total row
            wsData.push([]);
            wsData.push(["", "", "", "", "", "GRAND TOTAL", grandTotal]);

            const ws = XLSX.utils.aoa_to_sheet(wsData);

            // Set column widths
            ws["!cols"] = [
                { wch: 6 },   // No.
                { wch: 20 },  // Date
                { wch: 25 },  // Name
                { wch: 15 },  // Tribe
                { wch: 15 },  // Type
                { wch: 18 },  // Ministry
                { wch: 15 }   // Amount
            ];

            // Apply styles
            // Title rows (0-3)
            for (let r = 0; r <= 3; r++) {
                const cell = XLSX.utils.encode_cell({ r, c: 0 });
                if (ws[cell]) {
                    ws[cell].s = r === 0 ? titleStyle : (r === 1 ? churchInfoStyle : subtitleStyle);
                    ws["!merges"] = ws["!merges"] || [];
                    ws["!merges"].push({ s: { r, c: 0 }, e: { r, c: 6 } });
                }
            }

            // Header row (5)
            for (let c = 0; c <= 6; c++) {
                const cell = XLSX.utils.encode_cell({ r: 5, c });
                if (ws[cell]) ws[cell].s = goldHeader;
            }

            // Data rows
            filteredRecords.forEach((_, index) => {
                const rowNum = 6 + index;
                const isAlt = index % 2 === 1;

                for (let c = 0; c <= 6; c++) {
                    const cell = XLSX.utils.encode_cell({ r: rowNum, c });
                    if (ws[cell]) {
                        if (c === 6) { // Amount column
                            ws[cell].s = isAlt ? amountAltStyle : amountStyle;
                            ws[cell].z = '"P"#,##0.00';
                        } else {
                            ws[cell].s = isAlt ? altRow : dataCell;
                        }
                    }
                }
            });

            // Total row
            const totalRow = 6 + filteredRecords.length + 1;
            for (let c = 0; c <= 6; c++) {
                const cell = XLSX.utils.encode_cell({ r: totalRow, c });
                if (ws[cell]) {
                    ws[cell].s = totalStyle;
                    if (c === 6) ws[cell].z = '"P"#,##0.00';
                }
            }

            XLSX.utils.book_append_sheet(wb, ws, "Tithes Records");
        }

        // Save file
        const filename = activeTab === "monthly" 
            ? `ACTS_Tithes_Monthly_${filterMonth === "ALL" ? "All" : filterMonth}.xlsx`
            : `ACTS_Tithes_Records_${filterMonth === "ALL" ? "All" : filterMonth}.xlsx`;

        XLSX.writeFile(wb, filename);
    };

    return (
        <div className="layout">
            <Sidebar />
            <div className="content">
                <h1>Tithes Recording</h1>
                <p style={{ opacity: 0.7, marginBottom: "20px" }}>
                    Welcome! Record tithes and track participation.
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
                                    fontSize: "14px"
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
                                {filteredRecords.slice(0, 10).map((record) => (
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
                                                {formatDate(record.date)} - {record.leader?.type}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                                            <div style={{ fontSize: "18px", fontWeight: "700", color: "#16a34a" }}>
                                                P{Number(record.amount).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                ))}
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
                        {activeTab === "records" ? "All Records" : `Monthly Summary - ${getDisplayMonth()}`}
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
                                        </>
                                    ) : (
                                        <>
                                            <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: "600", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Name</th>
                                            <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: "600", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Tribe</th>
                                            <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: "600", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Type</th>
                                            <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: "600", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Ministry</th>
                                            <th style={{ padding: "14px 16px", textAlign: "right", fontWeight: "600", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Amount</th>
                                            <th style={{ padding: "14px 16px", textAlign: "center", fontWeight: "600", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Tithes Count</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {fetching ? (
                                    <tr>
                                        <td colSpan="6" style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
                                            Loading records...
                                        </td>
                                    </tr>
                                ) : activeTab === "records" ? (
                                    filteredRecords.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
                                                No tithes records found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRecords.map((record, index) => {
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
                                                    <td style={{ padding: "12px 16px", color: "#374151", fontWeight: "500", whiteSpace: "nowrap" }}>
                                                        {formatDate(record.date)}
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
                                                </tr>
                                            );
                                        })
                                    )
                                ) : (
                                    monthlySummary.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
                                                No records found for this period.
                                            </td>
                                        </tr>
                                    ) : (
                                        monthlySummary.map((item, index) => {
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
        </div>
    );
}

export default Tithes;
