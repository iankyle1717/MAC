import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";
import Swal from "sweetalert2";
import * as XLSX from "xlsx-js-style";

const tribes = [
    "DANALI",
    "REUBEN",
    "ASHER",
    "EPHRAIM",
    "MANASSEH",
    "JOSEPH",
    "GAD",
    "EZRA"
];

function Tithes() {
    const navigate = useNavigate();
    const [leaders, setLeaders] = useState([]);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    // Modal states
    const [showRecordModal, setShowRecordModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);

    // Form states
    const [searchName, setSearchName] = useState("");
    const [selectedLeader, setSelectedLeader] = useState(null);
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Filter states
    const [filterTribe, setFilterTribe] = useState("ALL");
    const [filterMonth, setFilterMonth] = useState("ALL");

    // Tab state: "records" | "monthly" — DEFAULT TO "monthly"
    const [activeTab, setActiveTab] = useState("monthly");

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

    const handleSelectLeader = (leader) => {
        setSelectedLeader(leader);
        setSearchName(`${leader.firstname} ${leader.lastname}`);
        setShowSuggestions(false);
    };

    // FIXED: Accept submitData as an object directly, not from state
    const handleSubmit = async (e, submitData = null) => {
        e.preventDefault();

        const dataToSubmit = submitData || {
            selectedLeader,
            amount,
            date
        };

        if (!dataToSubmit.selectedLeader || !dataToSubmit.amount) {
            Swal.fire({ icon: "warning", title: "Incomplete", text: "Please select a person and enter the amount." });
            return;
        }

        setLoading(true);
        const { error } = await supabase
            .from("tblTithes")
            .insert([{
                leader_id: dataToSubmit.selectedLeader.id,
                amount: parseFloat(dataToSubmit.amount),
                date: dataToSubmit.date
            }]);

        if (error) {
            Swal.fire({ icon: "error", title: "Failed", text: "Failed to record tithe. Please try again." });
            console.error(error);
        } else {
            Swal.fire({ icon: "success", title: "Success", text: "Tithe recorded successfully!", timer: 1500, showConfirmButton: false });
            setAmount("");
            setSearchName("");
            setSelectedLeader(null);
            setShowRecordModal(false);
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
    const uniqueTribes = [...new Set(leaders.map(l => l.tribe))].sort();
    const todayRatio = getTodayTithersRatio();
    const monthlySummary = getMonthlySummary();

    // Format date nicely for display
    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        const d = new Date(dateStr + "T00:00:00");
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
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
            const wsData = [];
            wsData.push(["ACTS CHURCH CABANGAN"]);
            wsData.push(["Tithes Monthly Summary Report"]);
            wsData.push([`Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`]);
            wsData.push([`Period: ${getDisplayMonth()} | Tribe: ${filterTribe === "ALL" ? "All Tribes" : filterTribe}`]);
            wsData.push([]);
            wsData.push(["No.", "Name", "Tribe", "Type", "Ministry", "Total Amount", "Tithes Count"]);

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

            wsData.push([]);
            wsData.push(["", "", "", "", "GRAND TOTAL", grandTotal, grandCount]);

            const ws = XLSX.utils.aoa_to_sheet(wsData);
            ws["!cols"] = [
                { wch: 6 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 14 }
            ];

            for (let r = 0; r <= 3; r++) {
                const cell = XLSX.utils.encode_cell({ r, c: 0 });
                if (ws[cell]) {
                    ws[cell].s = r === 0 ? titleStyle : (r === 1 ? churchInfoStyle : subtitleStyle);
                    ws["!merges"] = ws["!merges"] || [];
                    ws["!merges"].push({ s: { r, c: 0 }, e: { r, c: 6 } });
                }
            }

            for (let c = 0; c <= 6; c++) {
                const cell = XLSX.utils.encode_cell({ r: 5, c });
                if (ws[cell]) ws[cell].s = goldHeader;
            }

            monthlySummary.forEach((_, index) => {
                const rowNum = 6 + index;
                const isAlt = index % 2 === 1;
                for (let c = 0; c <= 6; c++) {
                    const cell = XLSX.utils.encode_cell({ r: rowNum, c });
                    if (ws[cell]) {
                        if (c === 5) {
                            ws[cell].s = isAlt ? amountAltStyle : amountStyle;
                            ws[cell].z = '"P"#,##0.00';
                        } else {
                            ws[cell].s = isAlt ? altRow : dataCell;
                        }
                    }
                }
            });

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
            const wsData = [];
            wsData.push(["ACTS CHURCH CABANGAN"]);
            wsData.push(["Tithes Records Report"]);
            wsData.push([`Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`]);
            wsData.push([`Period: ${filterMonth === "ALL" ? "All Months" : getDisplayMonth()} | Tribe: ${filterTribe === "ALL" ? "All Tribes" : filterTribe}`]);
            wsData.push([]);
            wsData.push(["No.", "Date", "Name", "Tribe", "Type", "Ministry", "Amount"]);

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

            wsData.push([]);
            wsData.push(["", "", "", "", "", "GRAND TOTAL", grandTotal]);

            const ws = XLSX.utils.aoa_to_sheet(wsData);
            ws["!cols"] = [
                { wch: 6 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 15 }
            ];

            for (let r = 0; r <= 3; r++) {
                const cell = XLSX.utils.encode_cell({ r, c: 0 });
                if (ws[cell]) {
                    ws[cell].s = r === 0 ? titleStyle : (r === 1 ? churchInfoStyle : subtitleStyle);
                    ws["!merges"] = ws["!merges"] || [];
                    ws["!merges"].push({ s: { r, c: 0 }, e: { r, c: 6 } });
                }
            }

            for (let c = 0; c <= 6; c++) {
                const cell = XLSX.utils.encode_cell({ r: 5, c });
                if (ws[cell]) ws[cell].s = goldHeader;
            }

            filteredRecords.forEach((_, index) => {
                const rowNum = 6 + index;
                const isAlt = index % 2 === 1;
                for (let c = 0; c <= 6; c++) {
                    const cell = XLSX.utils.encode_cell({ r: rowNum, c });
                    if (ws[cell]) {
                        if (c === 6) {
                            ws[cell].s = isAlt ? amountAltStyle : amountStyle;
                            ws[cell].z = '"P"#,##0.00';
                        } else {
                            ws[cell].s = isAlt ? altRow : dataCell;
                        }
                    }
                }
            });

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

        const filename = activeTab === "monthly" 
            ? `ACTS_Tithes_Monthly_${filterMonth === "ALL" ? "All" : filterMonth}.xlsx`
            : `ACTS_Tithes_Records_${filterMonth === "ALL" ? "All" : filterMonth}.xlsx`;

        XLSX.writeFile(wb, filename);
        setShowExportModal(false);
    };

    // Move suggestions to useMemo so it doesn't recreate on every render
    const suggestions = useMemo(() => {
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
    }, [searchName, leaders, filterTribe]);

    // Handle clicks outside dropdown
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Record Modal Component - FIXED
    const RecordModal = () => {
        // Local state for modal to prevent parent re-renders from clearing input
        const [localSearch, setLocalSearch] = useState(searchName);
        const [localAmount, setLocalAmount] = useState(amount);
        const [localDate, setLocalDate] = useState(date);
        const [localSelected, setLocalSelected] = useState(selectedLeader);
        const [localShowSuggestions, setLocalShowSuggestions] = useState(false);
        const modalSearchRef = useRef(null);

        // Sync with parent when modal opens
        useEffect(() => {
            setLocalSearch(searchName);
            setLocalAmount(amount);
            setLocalDate(date);
            setLocalSelected(selectedLeader);
        }, [showRecordModal]);

        // Local suggestions
        const localSuggestions = useMemo(() => {
            if (!localSearch.trim()) return [];
            const term = localSearch.toLowerCase();
            return leaders
                .filter(l => 
                    l.firstname.toLowerCase().includes(term) || 
                    l.lastname.toLowerCase().includes(term) ||
                    `${l.firstname} ${l.lastname}`.toLowerCase().includes(term)
                )
                .filter(l => filterTribe === "ALL" || l.tribe === filterTribe)
                .slice(0, 5);
        }, [localSearch, leaders, filterTribe]);

        const handleLocalSelect = (leader) => {
            setLocalSelected(leader);
            setLocalSearch(`${leader.firstname} ${leader.lastname}`);
            setLocalShowSuggestions(false);
        };

        // FIXED: Pass local data directly to handleSubmit instead of relying on setState + setTimeout
        const handleLocalSubmit = (e) => {
            e.preventDefault();
            if (!localSelected || !localAmount) {
                Swal.fire({ icon: "warning", title: "Incomplete", text: "Please select a person and enter the amount." });
                return;
            }

            // Pass the local values directly — no setState + setTimeout hack needed
            handleSubmit(e, {
                selectedLeader: localSelected,
                amount: localAmount,
                date: localDate
            });
        };

        // Handle click outside for local dropdown
        useEffect(() => {
            const handleClickOutside = (e) => {
                if (modalSearchRef.current && !modalSearchRef.current.contains(e.target)) {
                    setLocalShowSuggestions(false);
                }
            };
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, []);

        return (
            <div className="modal-overlay" onClick={(e) => {
                if (e.target === e.currentTarget) setShowRecordModal(false);
            }}>
                <div className="modal-box">
                    <button className="modal-close" onClick={() => setShowRecordModal(false)}>✕</button>
                    <div className="modal-header">
                        <h2>Record New Tithe</h2>
                        <p>Enter tithe details below</p>
                    </div>
                    <div className="modal-body">
                        <form onSubmit={handleLocalSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                            <div style={{ position: "relative" }} ref={modalSearchRef}>
                                <label className="modal-label">Search Person *</label>
                                <input
                                    type="text"
                                    placeholder="Type a name..."
                                    value={localSearch}
                                    onChange={(e) => {
                                        setLocalSearch(e.target.value);
                                        setLocalShowSuggestions(true);
                                        setLocalSelected(null);
                                    }}
                                    onFocus={() => setLocalShowSuggestions(true)}
                                    className="modal-input"
                                    autoComplete="off"
                                />
                                {localShowSuggestions && localSuggestions.length > 0 && (
                                    <div className="suggestions-dropdown">
                                        {localSuggestions.map((leader) => (
                                            <div
                                                key={leader.id}
                                                onClick={() => handleLocalSelect(leader)}
                                                className="suggestion-item"
                                            >
                                                <div className="avatar-xs">
                                                    {leader.firstname.charAt(0)}{leader.lastname.charAt(0)}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: "600", fontSize: "13px" }}>
                                                        {leader.firstname} {leader.lastname}
                                                    </div>
                                                    <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                                                        {leader.type} - {leader.tribe}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {localSelected && (
                                <div className="selected-leader-pill">
                                    <span style={{ fontSize: "16px" }}>✓</span>
                                    <div>
                                        <div style={{ fontWeight: "600", color: "#166534", fontSize: "13px" }}>
                                            {localSelected.firstname} {localSelected.lastname}
                                        </div>
                                        <div style={{ fontSize: "11px", color: "#16a34a" }}>
                                            Ready to record tithe
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setLocalSelected(null); setLocalSearch(""); }}
                                        className="clear-btn"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}

                            <div>
                                <label className="modal-label">Amount (P) *</label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={localAmount}
                                    onChange={(e) => setLocalAmount(e.target.value)}
                                    min="0"
                                    step="0.01"
                                    className="modal-input"
                                />
                            </div>

                            <div>
                                <label className="modal-label">Date *</label>
                                <input
                                    type="date"
                                    value={localDate}
                                    onChange={(e) => setLocalDate(e.target.value)}
                                    className="modal-input"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !localSelected}
                                className="modal-btn-record"
                                style={{ marginTop: "4px" }}
                            >
                                {loading ? "Recording..." : "Record Tithe"}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    };

    // Export Modal Component
    const ExportModal = () => (
        <div className="modal-overlay">
            <div className="modal-box">
                <button className="modal-close" onClick={() => setShowExportModal(false)}>✕</button>
                <div className="modal-header">
                    <h2>Export Report</h2>
                    <p>Download tithes data as Excel</p>
                </div>
                <div className="modal-body">
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div>
                            <label className="modal-label">Export Tab</label>
                            <div style={{ padding: "10px 14px", background: "#f3f4f6", borderRadius: "8px", fontSize: "13px", fontWeight: "600", color: "#374151" }}>
                                {activeTab === "monthly" ? "Monthly Summary" : "Detailed Records"}
                            </div>
                        </div>
                        <div>
                            <label className="modal-label">Period</label>
                            <div style={{ padding: "10px 14px", background: "#f3f4f6", borderRadius: "8px", fontSize: "13px", fontWeight: "600", color: "#374151" }}>
                                {filterMonth === "ALL" ? "All Months" : getDisplayMonth()} | {filterTribe === "ALL" ? "All Tribes" : filterTribe}
                            </div>
                        </div>
                        <button
                            onClick={exportToExcel}
                            className="modal-btn-export"
                            style={{ marginTop: "8px" }}
                        >
                            <span>Export to Excel</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="tithes-layout">
            <Sidebar />
            <div className="tithes-content">
                {/* Header */}
                <div className="tithes-topbar">
                    <div>
                        <h1 className="tithes-heading">Tithes Recording</h1>
                        <span className="tithes-subtitle">Welcome! Record tithes and track participation.</span>
                    </div>
                </div>

                {/* Stats */}
                <div className="stats-grid">
                    <div className="stat-card stat-card-gold">
                        <h3>Today\'s Collection</h3>
                        <h1>P{getTodayTotal().toLocaleString()}</h1>
                        <p>{getTodayCount()} people gave today</p>
                    </div>
                    <div className="stat-card">
                        <h3>Today\'s Tithers</h3>
                        <h1>{todayRatio.todayGivers} <span>/ {todayRatio.totalLeaders}</span></h1>
                        <div className="progress-bar">
                            <div className="progress-fill" style={{
                                width: `${todayRatio.totalLeaders > 0 ? (todayRatio.todayGivers / todayRatio.totalLeaders) * 100 : 0}%`
                            }} />
                        </div>
                        <p>{todayRatio.totalLeaders > 0 ? Math.round((todayRatio.todayGivers / todayRatio.totalLeaders) * 100) : 0}% of leaders gave today</p>
                    </div>
                    <div className="stat-card stat-card-green">
                        <h3>Total Records</h3>
                        <h1>{records.length}</h1>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="tithes-toolbar">
                    <div className="toolbar-group">
                        <select className="input-sm" value={filterTribe} onChange={(e) => setFilterTribe(e.target.value)}>
                            <option value="ALL">All Tribes</option>
                            {uniqueTribes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select className="input-sm" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
                            <option value="ALL">All Months</option>
                            {monthOptions.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                        </select>
                    </div>
                    <div className="toolbar-group">
                        <button className="btn-sm btn-outline" onClick={() => setShowExportModal(true)}>
                            Export
                        </button>
                        <button className="btn-sm btn-primary" onClick={() => setShowRecordModal(true)}>
                            Record Tithe
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="tithes-tabs">
                       <button className={activeTab === "monthly" ? "tab active" : "tab"} onClick={() => setActiveTab("monthly")}>
                        Monthly Summary
                    </button>
                    <button className={activeTab === "records" ? "tab active" : "tab"} onClick={() => setActiveTab("records")}>
                        All Records
                    </button>
                </div>

                {/* Table */}
                <div className="tithes-table-container">
                    <div className="flex-table-header">
                        {activeTab === "records" ? (
                            <>
                                <div className="flex-col flex-col-date">Date</div>
                                <div className="flex-col flex-col-name">Name</div>
                                <div className="flex-col flex-col-tribe">Tribe</div>
                                <div className="flex-col flex-col-type">Type</div>
                                <div className="flex-col flex-col-ministry">Ministry</div>
                                <div className="flex-col flex-col-amount">Amount</div>
                            </>
                        ) : (
                            <>
                                <div className="flex-col flex-col-name">Name</div>
                                <div className="flex-col flex-col-tribe">Tribe</div>
                                <div className="flex-col flex-col-type">Type</div>
                                <div className="flex-col flex-col-ministry">Ministry</div>
                                <div className="flex-col flex-col-amount">Total</div>
                                <div className="flex-col flex-col-count">Count</div>
                            </>
                        )}
                    </div>

                    <div className="flex-table-body">
                        {fetching ? (
                            <div className="flex-row empty-row">Loading records...</div>
                        ) : activeTab === "records" ? (
                            filteredRecords.length === 0 ? (
                                <div className="flex-row empty-row">No tithes records found.</div>
                            ) : (
                                filteredRecords.map((record) => (
                                    <div className="flex-row" key={record.id}>
                                        <div className="flex-col flex-col-date">{formatDate(record.date)}</div>
                                        <div className="flex-col flex-col-name">
                                            <div className="avatar-xs">{record.leader?.firstname?.charAt(0)}{record.leader?.lastname?.charAt(0)}</div>
                                            <span className="name-text">{record.leader?.firstname} {record.leader?.lastname}</span>
                                        </div>
                                        <div className="flex-col flex-col-tribe">
                                            <span className="badge-sm">{record.leader?.tribe}</span>
                                        </div>
                                        <div className="flex-col flex-col-type">{record.leader?.type}</div>
                                        <div className="flex-col flex-col-ministry">{record.leader?.ministry}</div>
                                        <div className="flex-col flex-col-amount">P{Number(record.amount).toLocaleString()}</div>
                                    </div>
                                ))
                            )
                        ) : (
                            monthlySummary.length === 0 ? (
                                <div className="flex-row empty-row">No records found for this period.</div>
                            ) : (
                                monthlySummary.map((item) => (
                                    <div className="flex-row" key={item.leader?.id}>
                                        <div className="flex-col flex-col-name">
                                            <div className="avatar-xs">{item.leader?.firstname?.charAt(0)}{item.leader?.lastname?.charAt(0)}</div>
                                            <span className="name-text">{item.leader?.firstname} {item.leader?.lastname}</span>
                                        </div>
                                        <div className="flex-col flex-col-tribe">
                                            <span className="badge-sm">{item.leader?.tribe}</span>
                                        </div>
                                        <div className="flex-col flex-col-type">{item.leader?.type}</div>
                                        <div className="flex-col flex-col-ministry">{item.leader?.ministry}</div>
                                        <div className="flex-col flex-col-amount">P{item.total.toLocaleString()}</div>
                                        <div className="flex-col flex-col-count">{item.count}</div>
                                    </div>
                                ))
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showRecordModal && <RecordModal />}
            {showExportModal && <ExportModal />}
        </div>
    );
}

export default Tithes;