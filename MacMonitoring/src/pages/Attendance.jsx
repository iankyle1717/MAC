import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";
import Swal from "sweetalert2";
import * as XLSX from "xlsx-js-style";

const tribes = [
    "DANALI", "REUBEN", "ASHER", "EPHRAIM",
    "MANASSEH", "JOSEPH", "GAD", "EZRA"
];

// ── Moved OUTSIDE Attendance to prevent remount on every render ──────────────
function AttendanceModal({
    showModal,
    modalTab,
    setModalTab,
    date,
    serviceType,
    exportMonth,
    exportDate,
    onDateChange,
    onServiceTypeChange,
    onStartRecording,
    onExport,
    onExportMonthChange,
    onExportDateChange,
    onClose,
}) {
    if (!showModal) return null;

    return (
        <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, backdropFilter: "blur(4px)"
        }}>
            <div style={{
                background: "#fff", borderRadius: "16px", width: "90%", maxWidth: "520px",
                boxShadow: "0 25px 50px rgba(0,0,0,0.25)", overflow: "hidden", position: "relative"
            }}>
                {/* Close */}
                <button
                    onClick={onClose}
                    style={{
                        position: "absolute", top: "16px", right: "16px",
                        width: "32px", height: "32px", borderRadius: "50%",
                        border: "none", background: "rgba(255,255,255,0.25)",
                        color: "#fff", fontSize: "18px", fontWeight: 700,
                        cursor: "pointer", display: "flex", alignItems: "center",
                        justifyContent: "center", zIndex: 10
                    }}
                >✕</button>

                {/* Header */}
                <div style={{
                    background: "linear-gradient(135deg, #c9a45c 0%, #b8934a 100%)",
                    padding: "24px 28px", color: "#fff"
                }}>
                    <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>Attendance</h2>
                    <p style={{ margin: "6px 0 0 0", opacity: 0.9, fontSize: "14px" }}>
                        Record attendance or export reports
                    </p>
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb" }}>
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

                {/* Body */}
                <div style={{ padding: "28px" }}>
                    {modalTab === "record" ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                                    Service Date *
                                </label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={onDateChange}
                                    style={modalInputStyle}
                                    onFocus={e => e.target.style.borderColor = "#c9a45c"}
                                    onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                                    Service Type / Remarks *
                                </label>
                                {/*
                                    FIX: The bug was caused by the Modal being defined INSIDE Attendance().
                                    React recreated the entire Modal component on every state change
                                    (including each keystroke), which unmounted/remounted the input
                                    and stole focus. Moving Modal outside fixes this completely.
                                    We use a plain onChange here — no issue now.
                                */}
                                <input
                                    type="text"
                                    value={serviceType}
                                    onChange={onServiceTypeChange}
                                    placeholder="e.g. SUNDAY June 4, 2026"
                                    style={modalInputStyle}
                                    onFocus={e => e.target.style.borderColor = "#c9a45c"}
                                    onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                                    autoComplete="off"
                                />
                                <p style={{ fontSize: "12px", color: "#9ca3af", margin: "4px 0 0 0" }}>
                                    Auto-filled based on date. Edit as needed.
                                </p>
                            </div>

                            <button
                                onClick={onStartRecording}
                                style={{
                                    width: "100%", padding: "14px", borderRadius: "10px",
                                    border: "none",
                                    background: "linear-gradient(135deg, #c9a45c 0%, #b8934a 100%)",
                                    color: "#fff", fontWeight: 700, fontSize: "15px",
                                    cursor: "pointer", marginTop: "8px"
                                }}
                            >
                                Start Recording
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                                    Export by Month
                                </label>
                                <input
                                    type="month"
                                    value={exportMonth}
                                    onChange={onExportMonthChange}
                                    style={modalInputStyle}
                                />
                            </div>

                            <div style={{ textAlign: "center", color: "#9ca3af", fontSize: "13px", fontWeight: 600 }}>— OR —</div>

                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                                    Export by Specific Date
                                </label>
                                <input
                                    type="date"
                                    value={exportDate}
                                    onChange={onExportDateChange}
                                    style={modalInputStyle}
                                />
                            </div>

                            <button
                                onClick={onExport}
                                style={{
                                    width: "100%", padding: "14px", borderRadius: "10px",
                                    border: "none",
                                    background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                                    color: "#fff", fontWeight: 700, fontSize: "15px",
                                    cursor: "pointer", marginTop: "8px",
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
                                }}
                            >
                                Export to Excel
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

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

// ── Main component ────────────────────────────────────────────────────────────
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

    useEffect(() => { fetchLeaders(); }, []);

    useEffect(() => {
        if (isRecording && date) fetchAttendance(date);
    }, [date, isRecording]);

    useEffect(() => {
        const present = Object.values(attendanceMap).filter(s => s === "Present").length;
        const total = sorted.length;
        setStats({ total, present, absent: total - present });
    }, [attendanceMap, selectedTribe, sortOrder]);

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

    const getAutoServiceType = (d) => {
        const day = new Date(d).getDay();
        const formatted = new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
        if (day === 0) return `SUNDAY ${formatted}`;
        if (day === 4) return `PRAYERWORKS ${formatted}`;
        if (day === 5) return `FRIDAY YG ${formatted}`;
        return `SERVICE ${formatted}`;
    };

    // useCallback prevents new function ref on every render
    const handleDateChange = useCallback((e) => {
        const newDate = e.target.value;
        setDate(newDate);
        setServiceType(getAutoServiceType(newDate));
    }, []);

    const handleServiceTypeChange = useCallback((e) => {
        setServiceType(e.target.value);
    }, []);

    const startRecording = () => {
        if (!date) {
            Swal.fire({ icon: "warning", title: "Date Required", text: "Please select a date.", confirmButtonColor: "#c9a45c" });
            return;
        }
        if (!serviceType.trim()) {
            Swal.fire({ icon: "warning", title: "Service Type Required", text: "Please enter the service type.", confirmButtonColor: "#c9a45c" });
            return;
        }
        setIsRecording(true);
        setShowModal(false);
    };

    const toggleAttendance = (leaderId) => {
        const current = attendanceMap[leaderId];
        setAttendanceMap(prev => ({ ...prev, [leaderId]: current === "Present" ? "Absent" : "Present" }));
    };

    const handleSave = async () => {
        if (!serviceType.trim() || !date) {
            Swal.fire({ icon: "warning", title: "Missing Info", text: "Date and service type are required.", confirmButtonColor: "#c9a45c" });
            return;
        }

        setLoading(true);
        await supabase.from("tblAttendance").delete().eq("service_date", date);

        const records = sorted.map(leader => ({
            leader_id: leader.id,
            service_date: date,
            status: attendanceMap[leader.id] || "Absent",
            remarks: serviceType,
        }));

        const { error } = await supabase.from("tblAttendance").insert(records);
        setLoading(false);

        if (error) {
            Swal.fire({ icon: "error", title: "Save Failed", text: error.message });
        } else {
            Swal.fire({
                icon: "success", title: "Attendance Saved",
                text: `${serviceType} — ${stats.present} Present, ${stats.absent} Absent`,
                timer: 2000, showConfirmButton: false,
            });
        }
    };

    const handleExport = async () => {
        if (!exportMonth && !exportDate) {
            Swal.fire({ icon: "warning", title: "Select Period", text: "Please select a month or date to export.", confirmButtonColor: "#c9a45c" });
            return;
        }

        let attendanceQuery = supabase.from("tblAttendance").select("*").order("service_date", { ascending: true });

        if (exportDate) {
            attendanceQuery = attendanceQuery.eq("service_date", exportDate);
        } else {
            const [year, month] = exportMonth.split("-");
            const lastDay = new Date(year, month, 0).getDate();
            attendanceQuery = attendanceQuery
                .gte("service_date", `${exportMonth}-01`)
                .lte("service_date", `${exportMonth}-${String(lastDay).padStart(2, "0")}`);
        }

        const { data: attendanceData, error } = await attendanceQuery;
        if (error || !attendanceData?.length) {
            Swal.fire({ icon: "info", title: "No Records", text: "No attendance records found for the selected period." });
            return;
        }

        const leaderIds = [...new Set(attendanceData.map(a => a.leader_id))];
        const { data: leadersData } = await supabase
            .from("tblMonitoring").select("id, firstname, lastname, tribe, type, ministry").in("id", leaderIds);

        const leaderMap = {};
        leadersData?.forEach(l => { leaderMap[l.id] = l; });

        const mergedData = attendanceData.map(record => ({
            ...record,
            tblMonitoring: leaderMap[record.leader_id] || null
        }));

        exportToExcel(mergedData, exportDate, exportMonth);
    };

    const exportToExcel = (data, exportDateVal, exportMonthVal) => {
        const wb = XLSX.utils.book_new();

        const goldHeader = {
            fill: { fgColor: { rgb: "C9A45C" }, patternType: "solid" },
            font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
            alignment: { horizontal: "center", vertical: "center" },
            border: { top: { style: "thin", color: { rgb: "B8934A" } }, bottom: { style: "thin", color: { rgb: "B8934A" } }, left: { style: "thin", color: { rgb: "B8934A" } }, right: { style: "thin", color: { rgb: "B8934A" } } }
        };
        const dataCell = { font: { sz: 11, color: { rgb: "374151" } }, border: { top: { style: "thin", color: { rgb: "E5E7EB" } }, bottom: { style: "thin", color: { rgb: "E5E7EB" } }, left: { style: "thin", color: { rgb: "E5E7EB" } }, right: { style: "thin", color: { rgb: "E5E7EB" } } } };
        const altRow  = { fill: { fgColor: { rgb: "F9FAFB" }, patternType: "solid" }, ...dataCell };
        const presentStyle = { font: { sz: 11, color: { rgb: "16A34A" }, bold: true }, alignment: { horizontal: "center" }, border: dataCell.border };
        const absentStyle  = { font: { sz: 11, color: { rgb: "DC2626" }, bold: true }, alignment: { horizontal: "center" }, border: dataCell.border };
        const totalStyle   = { fill: { fgColor: { rgb: "ECFDF5" }, patternType: "solid" }, font: { bold: true, color: { rgb: "16A34A" }, sz: 12 }, border: { top: { style: "medium", color: { rgb: "16A34A" } }, bottom: { style: "medium", color: { rgb: "16A34A" } }, left: { style: "thin", color: { rgb: "E5E7EB" } }, right: { style: "thin", color: { rgb: "E5E7EB" } } } };
        const titleStyle   = { font: { bold: true, color: { rgb: "B8934A" }, sz: 18 }, alignment: { horizontal: "center" } };

        const sortedData = [...data].sort((a, b) => {
            const tA = a.tblMonitoring?.tribe || "", tB = b.tblMonitoring?.tribe || "";
            if (tA !== tB) return tA.localeCompare(tB);
            return (a.tblMonitoring?.firstname || "").localeCompare(b.tblMonitoring?.firstname || "");
        });

        const wsData1 = [
            ["MAC TLDA CHURCH"], ["Attendance Monitoring Report"],
            [`Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`],
            [`Period: ${exportDateVal || exportMonthVal || "All"}`], [],
            ["No.", "Date", "Service", "Name", "Tribe", "Type", "Ministry", "Status"]
        ];

        let grandPresent = 0, grandAbsent = 0;
        sortedData.forEach((item, i) => {
            wsData1.push([
                i + 1, item.service_date, item.remarks,
                `${item.tblMonitoring?.firstname || ""} ${item.tblMonitoring?.lastname || ""}`,
                item.tblMonitoring?.tribe || "", item.tblMonitoring?.type || "",
                item.tblMonitoring?.ministry || "", item.status
            ]);
            if (item.status === "Present") grandPresent++; else grandAbsent++;
        });

        wsData1.push([], ["", "", "", "", "", "", "TOTAL PRESENT", grandPresent], ["", "", "", "", "", "", "TOTAL ABSENT", grandAbsent], ["", "", "", "", "", "", "GRAND TOTAL", grandPresent + grandAbsent]);

        const ws1 = XLSX.utils.aoa_to_sheet(wsData1);
        ws1["!cols"] = [{ wch: 6 }, { wch: 14 }, { wch: 30 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 12 }];

        for (let r = 0; r <= 3; r++) {
            const cell = XLSX.utils.encode_cell({ r, c: 0 });
            if (ws1[cell]) { ws1[cell].s = titleStyle; ws1["!merges"] = ws1["!merges"] || []; ws1["!merges"].push({ s: { r, c: 0 }, e: { r, c: 7 } }); }
        }
        for (let c = 0; c <= 7; c++) { const cell = XLSX.utils.encode_cell({ r: 5, c }); if (ws1[cell]) ws1[cell].s = goldHeader; }
        sortedData.forEach((_, i) => {
            const r = 6 + i;
            for (let c = 0; c <= 7; c++) {
                const cell = XLSX.utils.encode_cell({ r, c });
                if (ws1[cell]) ws1[cell].s = c === 7 ? (ws1[cell].v === "Present" ? presentStyle : absentStyle) : (i % 2 === 1 ? altRow : dataCell);
            }
        });

        XLSX.utils.book_append_sheet(wb, ws1, "Detailed Records");

        const filename = exportDateVal ? `Attendance_${exportDateVal}.xlsx` : `Attendance_${exportMonthVal}.xlsx`;
        XLSX.writeFile(wb, filename);

        Swal.fire({ icon: "success", title: "Excel Exported", text: `${data.length} records exported.`, timer: 1500, showConfirmButton: false })
            .then(() => { setShowModal(true); setIsRecording(false); setExportMonth(""); setExportDate(""); setAttendanceMap({}); });
    };

    const handleCloseModal = () => navigate("/dashboard");
    const handleBackToModal = () => { setIsRecording(false); setAttendanceMap({}); setShowModal(true); };

    const filtered = leaders.filter(l => selectedTribe ? l.tribe === selectedTribe : true);
    const sorted = [...filtered].sort((a, b) =>
        sortOrder === "asc" ? a.firstname.localeCompare(b.firstname) : b.firstname.localeCompare(a.firstname)
    );

    // ── Not recording: show modal ─────────────────────────────────────────────
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
                        onDateChange={handleDateChange}
                        onServiceTypeChange={handleServiceTypeChange}
                        onStartRecording={startRecording}
                        onExport={handleExport}
                        onExportMonthChange={e => { setExportMonth(e.target.value); setExportDate(""); }}
                        onExportDateChange={e => { setExportDate(e.target.value); setExportMonth(""); }}
                        onClose={handleCloseModal}
                    />
                </div>
            </div>
        );
    }

    // ── Recording view ────────────────────────────────────────────────────────
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

                {/* Toolbar */}
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

                {/* Table */}
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
                                        <button
                                            className={`toggle-sm ${status === "Present" ? "is-present" : "is-absent"}`}
                                            onClick={() => toggleAttendance(leader.id)}
                                        >
                                            {status === "Present" ? "Absent" : "Present"}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Attendance;
