import { useEffect, useState } from "react";
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

function Attendance() {
    const navigate = useNavigate();
    const [leaders, setLeaders] = useState([]);
    const [attendanceMap, setAttendanceMap] = useState({});
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [selectedTribe, setSelectedTribe] = useState("");
    const [sortOrder, setSortOrder] = useState("asc");
    const [loading, setLoading] = useState(false);
    const [exportMonth, setExportMonth] = useState("");
    const [exportDate, setExportDate] = useState("");  // <-- ADDED: was missing!
    const [serviceType, setServiceType] = useState("");

    // Modal states
    const [showModal, setShowModal] = useState(true);
    const [modalTab, setModalTab] = useState("record"); // "record" | "export"
    const [isRecording, setIsRecording] = useState(false);

    // Stats
    const [stats, setStats] = useState({ total: 0, present: 0, absent: 0 });

    useEffect(() => {
        fetchLeaders();
    }, []);

    useEffect(() => {
        if (isRecording && date) {
            fetchAttendance(date);
        }
    }, [date, isRecording]);

    useEffect(() => {
        const present = Object.values(attendanceMap).filter(s => s === "Present").length;
        const absent = Object.values(attendanceMap).filter(s => s === "Absent" || !s).length;
        setStats({
            total: sorted.length,
            present,
            absent
        });
    }, [attendanceMap, selectedTribe, sortOrder]);

    const fetchLeaders = async () => {
        const { data } = await supabase
            .from("tblMonitoring")
            .select("*")
            .order("firstname", { ascending: true });
        setLeaders(data || []);
    };

    const fetchAttendance = async (selectedDate) => {
        const { data } = await supabase
            .from("tblAttendance")
            .select("*")
            .eq("service_date", selectedDate);

        const map = {};
        data?.forEach((item) => {
            map[item.leader_id] = item.status;
        });
        setAttendanceMap(map);
    };

    // Auto-detect service type from date
    const getAutoServiceType = (d) => {
        const day = new Date(d).getDay();
        const formattedDate = new Date(d).toLocaleDateString("en-US", {
            month: "long", day: "numeric", year: "numeric",
        });
        if (day === 0) return `SUNDAY ${formattedDate}`;
        if (day === 4) return `PRAYERWORKS ${formattedDate}`;
        if (day === 5) return `FRIDAY YG ${formattedDate}`;
        return `SERVICE ${formattedDate}`;
    };

    const handleDateChange = (e) => {
        const newDate = e.target.value;
        setDate(newDate);
        setServiceType(getAutoServiceType(newDate));
    };

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
        const newStatus = current === "Present" ? "Absent" : "Present";
        setAttendanceMap((prev) => ({ ...prev, [leaderId]: newStatus }));
    };

    const handleSave = async () => {
        if (!serviceType.trim()) {
            Swal.fire({ icon: "warning", title: "Service Type Required", text: "Please enter the service type.", confirmButtonColor: "#c9a45c" });
            return;
        }
        if (!date) {
            Swal.fire({ icon: "warning", title: "Date Required", text: "Please select a date.", confirmButtonColor: "#c9a45c" });
            return;
        }

        setLoading(true);

        // Delete existing records for this date first
        const { error: deleteError } = await supabase
            .from("tblAttendance")
            .delete()
            .eq("service_date", date);

        if (deleteError) {
            setLoading(false);
            Swal.fire({ icon: "error", title: "Save Failed", text: deleteError.message });
            return;
        }

        // Insert fresh records
        const records = sorted.map((leader) => ({
            leader_id: leader.id,
            service_date: date,
            status: attendanceMap[leader.id] || "Absent",
            remarks: serviceType,
        }));

        const { error: insertError } = await supabase
            .from("tblAttendance")
            .insert(records);

        setLoading(false);

        if (insertError) {
            console.error("Save error:", insertError);
            Swal.fire({ icon: "error", title: "Save Failed", text: insertError.message || "Attendance could not be saved." });
        } else {
            Swal.fire({
                icon: "success",
                title: "Attendance Saved",
                text: `${serviceType} — ${stats.present} Present, ${stats.absent} Absent`,
                timer: 2000,
                showConfirmButton: false,
            });
        }
    };

   const handleExport = async () => {
    if (!exportMonth && !exportDate) {
        Swal.fire({ icon: "warning", title: "Select Period", text: "Please select a month or date to export.", confirmButtonColor: "#c9a45c" });
        return;
    }

    // Build base query for attendance
    let attendanceQuery = supabase
        .from("tblAttendance")
        .select("*")
        .order("service_date", { ascending: true });

    if (exportDate) {
        attendanceQuery = attendanceQuery.eq("service_date", exportDate);
    } else {
        const [year, month] = exportMonth.split("-");
        const lastDay = new Date(year, month, 0).getDate();
        const startDate = `${exportMonth}-01`;
        const endDate = `${exportMonth}-${String(lastDay).padStart(2, "0")}`;
        
        attendanceQuery = attendanceQuery.gte("service_date", startDate).lte("service_date", endDate);
    }

    const { data: attendanceData, error: attendanceError } = await attendanceQuery;

    if (attendanceError) {
        Swal.fire({ icon: "error", title: "Export Failed", text: attendanceError.message });
        return;
    }

    if (!attendanceData || attendanceData.length === 0) {
        Swal.fire({ icon: "info", title: "No Records", text: "No attendance records found for the selected period." });
        return;
    }

    // Fetch all leader data separately
    const leaderIds = [...new Set(attendanceData.map(a => a.leader_id))];
    const { data: leadersData, error: leadersError } = await supabase
        .from("tblMonitoring")
        .select("id, firstname, lastname, tribe, type, ministry")
        .in("id", leaderIds);

    if (leadersError) {
        Swal.fire({ icon: "error", title: "Export Failed", text: leadersError.message });
        return;
    }

    // Build leader lookup map
    const leaderMap = {};
    leadersData?.forEach(l => {
        leaderMap[l.id] = l;
    });

    // Merge data manually
    const mergedData = attendanceData.map(record => ({
        ...record,
        tblMonitoring: leaderMap[record.leader_id] || null
    }));

    // Pass the current export values explicitly
    exportToExcel(mergedData, exportDate, exportMonth);
};

    const exportToExcel = (data, exportDateVal, exportMonthVal) => {
        const wb = XLSX.utils.book_new();

        // Styles
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

        const churchInfoStyle = {
            font: { bold: true, color: { rgb: "374151" }, sz: 12 },
            alignment: { horizontal: "center", vertical: "center" }
        };

        const subtitleStyle = {
            font: { color: { rgb: "6B7280" }, sz: 11, italic: true },
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

        const presentStyle = {
            font: { sz: 11, color: { rgb: "16A34A" }, bold: true },
            alignment: { horizontal: "center" },
            border: {
                top: { style: "thin", color: { rgb: "E5E7EB" } },
                bottom: { style: "thin", color: { rgb: "E5E7EB" } },
                left: { style: "thin", color: { rgb: "E5E7EB" } },
                right: { style: "thin", color: { rgb: "E5E7EB" } }
            }
        };

        const absentStyle = {
            font: { sz: 11, color: { rgb: "DC2626" }, bold: true },
            alignment: { horizontal: "center" },
            border: {
                top: { style: "thin", color: { rgb: "E5E7EB" } },
                bottom: { style: "thin", color: { rgb: "E5E7EB" } },
                left: { style: "thin", color: { rgb: "E5E7EB" } },
                right: { style: "thin", color: { rgb: "E5E7EB" } }
            }
        };

        // Group by service date for summary
        const byDate = {};
        data.forEach(item => {
            const dateKey = item.service_date;
            if (!byDate[dateKey]) {
                byDate[dateKey] = { records: [], present: 0, absent: 0, remarks: item.remarks };
            }
            byDate[dateKey].records.push(item);
            if (item.status === "Present") byDate[dateKey].present++;
            else byDate[dateKey].absent++;
        });

        // --- SHEET 1: Detailed Records ---
        const wsData1 = [];
        wsData1.push(["MAC TLDA CHURCH"]);
        wsData1.push(["Attendance Monitoring Report"]);
        wsData1.push([`Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`]);
        wsData1.push([`Period: ${exportDateVal || exportMonthVal || "All"} | Sorted by: Tribe`]);
        wsData1.push([]);

        wsData1.push(["No.", "Date", "Service", "Name", "Tribe", "Type", "Ministry", "Status"]);

        let grandTotal = 0;
        let grandPresent = 0;
        let grandAbsent = 0;

        // Sort by tribe
        const sortedData = [...data].sort((a, b) => {
            const tribeA = a.tblMonitoring?.tribe || "";
            const tribeB = b.tblMonitoring?.tribe || "";
            if (tribeA !== tribeB) return tribeA.localeCompare(tribeB);
            return (a.tblMonitoring?.firstname || "").localeCompare(b.tblMonitoring?.firstname || "");
        });

        sortedData.forEach((item, index) => {
            wsData1.push([
                index + 1,
                item.service_date,
                item.remarks,
                `${item.tblMonitoring?.firstname || ""} ${item.tblMonitoring?.lastname || ""}`,
                item.tblMonitoring?.tribe || "",
                item.tblMonitoring?.type || "",
                item.tblMonitoring?.ministry || "",
                item.status
            ]);
            if (item.status === "Present") grandPresent++;
            else grandAbsent++;
            grandTotal++;
        });

        wsData1.push([]);
        wsData1.push(["", "", "", "", "", "", "TOTAL PRESENT", grandPresent]);
        wsData1.push(["", "", "", "", "", "", "TOTAL ABSENT", grandAbsent]);
        wsData1.push(["", "", "", "", "", "", "GRAND TOTAL", grandTotal]);

        const ws1 = XLSX.utils.aoa_to_sheet(wsData1);
        ws1["!cols"] = [
            { wch: 6 }, { wch: 14 }, { wch: 30 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 12 }
        ];

        // Styles for sheet 1
        for (let r = 0; r <= 3; r++) {
            const cell = XLSX.utils.encode_cell({ r, c: 0 });
            if (ws1[cell]) {
                ws1[cell].s = r === 0 ? titleStyle : (r === 1 ? churchInfoStyle : subtitleStyle);
                ws1["!merges"] = ws1["!merges"] || [];
                ws1["!merges"].push({ s: { r, c: 0 }, e: { r, c: 7 } });
            }
        }

        for (let c = 0; c <= 7; c++) {
            const cell = XLSX.utils.encode_cell({ r: 5, c });
            if (ws1[cell]) ws1[cell].s = goldHeader;
        }

        sortedData.forEach((_, index) => {
            const r = 6 + index;
            const isAlt = index % 2 === 1;
            for (let c = 0; c <= 7; c++) {
                const cell = XLSX.utils.encode_cell({ r, c });
                if (ws1[cell]) {
                    if (c === 7) {
                        ws1[cell].s = ws1[cell].v === "Present" ? presentStyle : absentStyle;
                    } else {
                        ws1[cell].s = isAlt ? altRow : dataCell;
                    }
                }
            }
        });

        // Total rows
        [grandPresent, grandAbsent, grandTotal].forEach((_, i) => {
            const r = 6 + sortedData.length + 1 + i;
            for (let c = 0; c <= 7; c++) {
                const cell = XLSX.utils.encode_cell({ r, c });
                if (ws1[cell]) ws1[cell].s = totalStyle;
            }
        });

        XLSX.utils.book_append_sheet(wb, ws1, "Detailed Records");

        // --- SHEET 2: By Service Date Summary ---
        const wsData2 = [];
        wsData2.push(["MAC TLDA CHURCH"]);
        wsData2.push(["Attendance Summary by Service Date"]);
        wsData2.push([`Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`]);
        wsData2.push([]);

        wsData2.push(["Date", "Service", "Present", "Absent", "Total", "Attendance Rate"]);

        Object.entries(byDate).sort((a, b) => a[0].localeCompare(b[0])).forEach(([svcDate, info]) => {
            const rate = info.records.length > 0 ? Math.round((info.present / info.records.length) * 100) : 0;
            wsData2.push([
                svcDate,
                info.remarks,
                info.present,
                info.absent,
                info.records.length,
                `${rate}%`
            ]);
        });

        const ws2 = XLSX.utils.aoa_to_sheet(wsData2);
        ws2["!cols"] = [{ wch: 14 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 }];

        for (let r = 0; r <= 2; r++) {
            const cell = XLSX.utils.encode_cell({ r, c: 0 });
            if (ws2[cell]) {
                ws2[cell].s = r === 0 ? titleStyle : (r === 1 ? churchInfoStyle : subtitleStyle);
                ws2["!merges"] = ws2["!merges"] || [];
                ws2["!merges"].push({ s: { r, c: 0 }, e: { r, c: 5 } });
            }
        }

        for (let c = 0; c <= 5; c++) {
            const cell = XLSX.utils.encode_cell({ r: 4, c });
            if (ws2[cell]) ws2[cell].s = goldHeader;
        }

        Object.keys(byDate).forEach((_, index) => {
            const r = 5 + index;
            const isAlt = index % 2 === 1;
            for (let c = 0; c <= 5; c++) {
                const cell = XLSX.utils.encode_cell({ r, c });
                if (ws2[cell]) ws2[cell].s = isAlt ? altRow : dataCell;
            }
        });

        XLSX.utils.book_append_sheet(wb, ws2, "By Service Date");

        // --- SHEET 3: By Tribe Summary ---
        const byTribe = {};
        data.forEach(item => {
            const tribe = item.tblMonitoring?.tribe || "Unknown";
            if (!byTribe[tribe]) byTribe[tribe] = { present: 0, absent: 0, total: 0 };
            byTribe[tribe].total++;
            if (item.status === "Present") byTribe[tribe].present++;
            else byTribe[tribe].absent++;
        });

        const tribeOrder = [...tribes, "Unknown"];
        const wsData3 = [];
        wsData3.push(["MAC TLDA CHURCH"]);
        wsData3.push(["Attendance Summary by Tribe"]);
        wsData3.push([`Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`]);
        wsData3.push([]);

        wsData3.push(["Tribe", "Present", "Absent", "Total", "Attendance Rate"]);

        let tribeGrandPresent = 0;
        let tribeGrandAbsent = 0;
        let tribeGrandTotal = 0;

        tribeOrder.forEach(tribe => {
            if (byTribe[tribe]) {
                const info = byTribe[tribe];
                const rate = info.total > 0 ? Math.round((info.present / info.total) * 100) : 0;
                wsData3.push([tribe, info.present, info.absent, info.total, `${rate}%`]);
                tribeGrandPresent += info.present;
                tribeGrandAbsent += info.absent;
                tribeGrandTotal += info.total;
            }
        });

        wsData3.push([]);
        wsData3.push(["GRAND TOTAL", tribeGrandPresent, tribeGrandAbsent, tribeGrandTotal, `${tribeGrandTotal > 0 ? Math.round((tribeGrandPresent / tribeGrandTotal) * 100) : 0}%`]);

        const ws3 = XLSX.utils.aoa_to_sheet(wsData3);
        ws3["!cols"] = [{ wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 }];

        for (let r = 0; r <= 2; r++) {
            const cell = XLSX.utils.encode_cell({ r, c: 0 });
            if (ws3[cell]) {
                ws3[cell].s = r === 0 ? titleStyle : (r === 1 ? churchInfoStyle : subtitleStyle);
                ws3["!merges"] = ws3["!merges"] || [];
                ws3["!merges"].push({ s: { r, c: 0 }, e: { r, c: 4 } });
            }
        }

        for (let c = 0; c <= 4; c++) {
            const cell = XLSX.utils.encode_cell({ r: 4, c });
            if (ws3[cell]) ws3[cell].s = goldHeader;
        }

        const tribeRows = tribeOrder.filter(t => byTribe[t]).length;
        for (let i = 0; i < tribeRows; i++) {
            const r = 5 + i;
            const isAlt = i % 2 === 1;
            for (let c = 0; c <= 4; c++) {
                const cell = XLSX.utils.encode_cell({ r, c });
                if (ws3[cell]) ws3[cell].s = isAlt ? altRow : dataCell;
            }
        }

        // Grand total row
        const totalRow = 5 + tribeRows + 1;
        for (let c = 0; c <= 4; c++) {
            const cell = XLSX.utils.encode_cell({ r: totalRow, c });
            if (ws3[cell]) ws3[cell].s = totalStyle;
        }

       XLSX.utils.book_append_sheet(wb, ws3, "By Tribe");

    const filename = exportDateVal
        ? `Attendance_${exportDateVal}.xlsx`
        : `Attendance_${exportMonthVal}.xlsx`;

    XLSX.writeFile(wb, filename);

    Swal.fire({
        icon: "success",
        title: "Excel Exported",
        text: `${data.length} records exported successfully.`,
        timer: 1500,
        showConfirmButton: false,
    }).then(() => {
        // Reset states and return to modal
        setShowModal(true);
        setIsRecording(false);
        setExportMonth("");
        setExportDate("");
        setAttendanceMap({});
    });
    };

    const handleCloseModal = () => {
        navigate("/dashboard");
    };

    const handleBackToModal = () => {
        setIsRecording(false);
        setAttendanceMap({});
        setShowModal(true);
    };

    const filtered = leaders.filter((leader) =>
        selectedTribe ? leader.tribe === selectedTribe : true
    );
    const sorted = [...filtered].sort((a, b) =>
        sortOrder === "asc"
            ? a.firstname.localeCompare(b.firstname)
            : b.firstname.localeCompare(a.firstname)
    );

    // Modal Component
    const Modal = () => (
        <div style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(4px)"
        }}>
            <div style={{
                background: "#fff",
                borderRadius: "16px",
                width: "90%",
                maxWidth: "520px",
                boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
                overflow: "hidden",
                position: "relative"
            }}>
                {/* Close Button */}
                <button
                    onClick={handleCloseModal}
                    style={{
                        position: "absolute",
                        top: "16px",
                        right: "16px",
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        border: "none",
                        background: "rgba(255,255,255,0.2)",
                        color: "#fff",
                        fontSize: "18px",
                        fontWeight: "700",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "background 0.2s",
                        zIndex: 10
                    }}
                    onMouseEnter={(e) => e.target.style.background = "rgba(255,255,255,0.35)"}
                    onMouseLeave={(e) => e.target.style.background = "rgba(255,255,255,0.2)"}
                    title="Close and go to Dashboard"
                >
                    ✕
                </button>

                {/* Modal Header */}
                <div style={{
                    background: "linear-gradient(135deg, #c9a45c 0%, #b8934a 100%)",
                    padding: "24px 28px",
                    color: "#fff",
                    position: "relative"
                }}>
                    <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "700" }}>Attendance</h2>
                    <p style={{ margin: "6px 0 0 0", opacity: 0.9, fontSize: "14px" }}>
                        Record attendance or export reports
                    </p>
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb" }}>
                    <button
                        onClick={() => setModalTab("record")}
                        style={{
                            flex: 1,
                            padding: "16px",
                            border: "none",
                            background: modalTab === "record" ? "#fff" : "#f9fafb",
                            color: modalTab === "record" ? "#b8934a" : "#6b7280",
                            fontWeight: "700",
                            fontSize: "14px",
                            cursor: "pointer",
                            borderBottom: modalTab === "record" ? "3px solid #b8934a" : "3px solid transparent",
                            transition: "all 0.2s"
                        }}
                    >
                        Record Attendance
                    </button>
                    <button
                        onClick={() => setModalTab("export")}
                        style={{
                            flex: 1,
                            padding: "16px",
                            border: "none",
                            background: modalTab === "export" ? "#fff" : "#f9fafb",
                            color: modalTab === "export" ? "#b8934a" : "#6b7280",
                            fontWeight: "700",
                            fontSize: "14px",
                            cursor: "pointer",
                            borderBottom: modalTab === "export" ? "3px solid #b8934a" : "3px solid transparent",
                            transition: "all 0.2s"
                        }}
                    >
                        Export Report
                    </button>
                </div>

                {/* Modal Body */}
                <div style={{ padding: "28px" }}>
                    {modalTab === "record" ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>
                                    Service Date *
                                </label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={handleDateChange}
                                    style={{
                                        width: "100%",
                                        padding: "12px 14px",
                                        borderRadius: "10px",
                                        border: "2px solid #e5e7eb",
                                        fontSize: "15px",
                                        outline: "none",
                                        boxSizing: "border-box",
                                        transition: "border-color 0.2s"
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = "#c9a45c"}
                                    onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>
                                    Service Type / Remarks *
                                </label>
                                <input
                                    type="text"
                                    value={serviceType}
                                    onChange={(e) => setServiceType(e.target.value)}
                                    placeholder="e.g. SUNDAY June 4, 2026"
                                    style={{
                                        width: "100%",
                                        padding: "12px 14px",
                                        borderRadius: "10px",
                                        border: "2px solid #e5e7eb",
                                        fontSize: "15px",
                                        outline: "none",
                                        boxSizing: "border-box",
                                        transition: "border-color 0.2s"
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = "#c9a45c"}
                                    onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                                />
                                <p style={{ fontSize: "12px", color: "#9ca3af", margin: "4px 0 0 0" }}>
                                    Auto-filled based on date. Edit as needed.
                                </p>
                            </div>

                            <button
                                onClick={startRecording}
                                style={{
                                    width: "100%",
                                    padding: "14px",
                                    borderRadius: "10px",
                                    border: "none",
                                    background: "linear-gradient(135deg, #c9a45c 0%, #b8934a 100%)",
                                    color: "#fff",
                                    fontWeight: "700",
                                    fontSize: "15px",
                                    cursor: "pointer",
                                    marginTop: "8px",
                                    transition: "transform 0.15s, box-shadow 0.15s"
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.transform = "translateY(-1px)";
                                    e.target.style.boxShadow = "0 8px 20px rgba(201,164,92,0.4)";
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = "translateY(0)";
                                    e.target.style.boxShadow = "none";
                                }}
                            >
                                Start Recording
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>
                                    Export by Month
                                </label>
                                <input
                                    type="month"
                                    value={exportMonth}
                                    onChange={(e) => {
                                        setExportMonth(e.target.value);
                                        setExportDate("");
                                    }}
                                    style={{
                                        width: "100%",
                                        padding: "12px 14px",
                                        borderRadius: "10px",
                                        border: "2px solid #e5e7eb",
                                        fontSize: "15px",
                                        outline: "none",
                                        boxSizing: "border-box"
                                    }}
                                />
                            </div>

                            <div style={{ textAlign: "center", color: "#9ca3af", fontSize: "13px", fontWeight: "600" }}>
                                — OR —
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>
                                    Export by Specific Date
                                </label>
                                <input
                                    type="date"
                                    value={exportDate}
                                    onChange={(e) => {
                                        setExportDate(e.target.value);
                                        setExportMonth("");
                                    }}
                                    style={{
                                        width: "100%",
                                        padding: "12px 14px",
                                        borderRadius: "10px",
                                        border: "2px solid #e5e7eb",
                                        fontSize: "15px",
                                        outline: "none",
                                        boxSizing: "border-box"
                                    }}
                                />
                            </div>

                            <button
                                onClick={handleExport}
                                style={{
                                    width: "100%",
                                    padding: "14px",
                                    borderRadius: "10px",
                                    border: "none",
                                    background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                                    color: "#fff",
                                    fontWeight: "700",
                                    fontSize: "15px",
                                    cursor: "pointer",
                                    marginTop: "8px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                    transition: "transform 0.15s, box-shadow 0.15s"
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.transform = "translateY(-1px)";
                                    e.target.style.boxShadow = "0 8px 20px rgba(22,163,74,0.4)";
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = "translateY(0)";
                                    e.target.style.boxShadow = "none";
                                }}
                            >
                                <span>Export to Excel</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    if (!isRecording) {
        return (
            <div className="attendance-layout">
                <Sidebar />
                <div className="attendance-content" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
                    {showModal && <Modal />}
                </div>
            </div>
        );
    }

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
                            <span style={{
                                padding: "3px 10px",
                                borderRadius: "8px",
                                background: "#dbeafe",
                                color: "#1e40af",
                                fontSize: "12px",
                                fontWeight: "600"
                            }}>
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
                        <select
                            className="input-sm"
                            value={selectedTribe}
                            onChange={(e) => setSelectedTribe(e.target.value)}
                        >
                            <option value="">All Tribes</option>
                            {tribes.map((tribe) => (
                                <option key={tribe} value={tribe}>{tribe}</option>
                            ))}
                        </select>
                        <button
                            className="btn-sm btn-outline"
                            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                        >
                            {sortOrder === "asc" ? "A-Z" : "Z-A"}
                        </button>
                    </div>
                    <div className="toolbar-group">
                        <button
                            className="btn-sm btn-outline"
                            onClick={handleBackToModal}
                        >
                            Change Service
                        </button>
                        <button
                            className="btn-sm btn-primary"
                            onClick={handleSave}
                            disabled={loading}
                        >
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
                        {sorted.map((leader) => {
                            const status = attendanceMap[leader.id] || "Absent";
                            return (
                                <div className="flex-row" key={leader.id}>
                                    <div className="flex-col flex-col-name">
                                        <img
                                            src={leader.image_url || "https://via.placeholder.com/32"}
                                            alt=""
                                            className="avatar-sm"
                                        />
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