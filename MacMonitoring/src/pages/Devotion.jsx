import { useEffect, useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";
import { getCurrentUser, isAdmin } from "../utils/auth";
import { tribes as allTribes } from "../constants/options";
import * as XLSX from "xlsx-js-style";

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

const ALL_MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// ── Pagination Bar (shared by all tables on this page) ─────────────────────
const pagBtnStyle = (disabled) => ({
    padding: "5px 9px",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
    background: disabled ? "#f3f4f6" : "#fff",
    color: disabled ? "#d1d5db" : "#374151",
    fontSize: "12px",
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
});

function PaginationBar({ page, totalPages, pageSize, onPageChange, onPageSizeChange, totalItems }) {
    return (
        <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 4px", flexWrap: "wrap", gap: "8px"
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#6b7280" }}>
                <span>Show</span>
                <select
                    value={pageSize}
                    onChange={e => onPageSizeChange(Number(e.target.value))}
                    style={{
                        padding: "3px 6px", borderRadius: "6px", border: "1px solid #d1d5db",
                        fontSize: "11px", fontWeight: 600, cursor: "pointer"
                    }}
                >
                    {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <span>per page · {totalItems} total</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                    onClick={() => onPageChange(1)}
                    disabled={page === 1}
                    style={pagBtnStyle(page === 1)}
                >«</button>
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 1}
                    style={pagBtnStyle(page === 1)}
                >‹</button>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#374151", padding: "0 6px" }}>
                    Page {page} of {totalPages}
                </span>
                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page === totalPages}
                    style={pagBtnStyle(page === totalPages)}
                >›</button>
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={page === totalPages}
                    style={pagBtnStyle(page === totalPages)}
                >»</button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// TRIBE REPORT — per-month classification + overall status rules
//
// Per month, a member's devotion record is classified as one of:
//   CONSISTENT   — completed_days >= 25 (met target)
//   OCCASIONAL   — completed_days >= 15 and < 25 (some effort, but short)
//   INCONSISTENT — completed_days < 15, OR no record submitted that month
//
// Overall status across the selected month range:
//   NEEDS GUIDANCE — every selected month is OCCASIONAL
//   INACTIVE       — every selected month is INCONSISTENT
//   ACTIVE         — anything else (includes any CONSISTENT month, or a mix)
// ═══════════════════════════════════════════════════════════════════════════
const CONSISTENT_THRESHOLD = 25;
const OCCASIONAL_THRESHOLD = 15;

const classifyDevotionMonth = (record) => {
    if (!record) return "INCONSISTENT";
    if (record.completed_days >= CONSISTENT_THRESHOLD) return "CONSISTENT";
    if (record.completed_days >= OCCASIONAL_THRESHOLD) return "OCCASIONAL";
    return "INCONSISTENT";
};

const classifyOverallStatus = (monthStatuses) => {
    if (!monthStatuses || monthStatuses.length === 0) return "NO DATA";
    const allOccasional = monthStatuses.every(s => s === "OCCASIONAL");
    const allInconsistent = monthStatuses.every(s => s === "INCONSISTENT");
    if (allOccasional) return "NEEDS GUIDANCE";
    if (allInconsistent) return "INACTIVE";
    return "ACTIVE";
};

const monthStatusStyle = (status) => {
    switch (status) {
        case "CONSISTENT": return { bg: "#dcfce7", color: "#16a34a" };
        case "OCCASIONAL": return { bg: "#fef3c7", color: "#b45309" };
        default: return { bg: "#fee2e2", color: "#dc2626" }; // INCONSISTENT
    }
};

const overallStatusStyle = (status) => {
    switch (status) {
        case "ACTIVE": return { bg: "#dcfce7", color: "#16a34a" };
        case "NEEDS GUIDANCE": return { bg: "#fef3c7", color: "#b45309" };
        case "INACTIVE": return { bg: "#fee2e2", color: "#dc2626" };
        default: return { bg: "#f3f4f6", color: "#6b7280" };
    }
};

function Devotion() {
    const user = getCurrentUser();
    const userRef = useRef(user);
    const admin = isAdmin();

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

    const [isDevotionChecker, setIsDevotionChecker] = useState(false);
    const [assignedTribe, setAssignedTribe] = useState("");
    const [tribeLeaders, setTribeLeaders] = useState([]);
    const [selectedLeaderId, setSelectedLeaderId] = useState("");
    const [selectedLeaderName, setSelectedLeaderName] = useState("");
    const [recordMode, setRecordMode] = useState("self");

    const [wholeTribeRecords, setWholeTribeRecords] = useState([]);
    const [wholeTribeStats, setWholeTribeStats] = useState([]);

    // ── Pagination state — one pageSize per table so switching one table's
    // page size doesn't jolt the others, but all default/step through the
    // same 5/10/15/20 options. ──────────────────────────────────────────────
    const [cardPage, setCardPage] = useState(1);
    const [cardPageSize, setCardPageSize] = useState(10);

    const [monthlyPage, setMonthlyPage] = useState(1);
    const [monthlyPageSize, setMonthlyPageSize] = useState(5);

    const [tribePage, setTribePage] = useState(1);
    const [tribePageSize, setTribePageSize] = useState(10);

    const [activeTab, setActiveTab] = useState("records"); // "records" | "monthly"

    // ── Tribe / Month-Range Report (Print + Excel export) ─────────────────
    const canRunTribeReport = admin || isDevotionChecker;
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportTribe, setReportTribe] = useState("");
    const [reportYear, setReportYear] = useState(currentYear.toString());
    const [reportStartMonth, setReportStartMonth] = useState("January");
    const [reportEndMonth, setReportEndMonth] = useState("December");
    const [reportLoading, setReportLoading] = useState(false);
    const [reportData, setReportData] = useState(null); // { tribe, months, rows }
    // ───────────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (userRef.current) {
            checkDevotionCheckerRole();
            fetchRecords();
        }
    }, []);

    useEffect(() => {
        setCardPage(1);
    }, [filterMonth, records.length, recordMode, selectedLeaderId, cardPageSize]);

    useEffect(() => {
        setMonthlyPage(1);
    }, [records.length, recordMode, selectedLeaderId, monthlyPageSize]);

    useEffect(() => {
        setTribePage(1);
    }, [wholeTribeStats.length, tribePageSize]);

    // Default the report tribe once we know the user's context
    useEffect(() => {
        if (!reportTribe) {
            if (isDevotionChecker && assignedTribe) setReportTribe(assignedTribe);
            else if (admin && allTribes.length) setReportTribe(allTribes[0]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDevotionChecker, assignedTribe, admin]);

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

    const fetchTribeLeaders = async (tribe) => {
        const { data, error } = await supabase
            .from("tblMonitoring")
            .select("id, firstname, lastname, nickname")
            .eq("tribe", tribe)
            .order("firstname", { ascending: true });
        if (error) console.error("Error fetching tribe leaders:", error);
        else setTribeLeaders(data || []);
    };

    const fetchRecords = async () => {
        if (!userRef.current) return;
        setFetching(true);
        const { data, error } = await supabase
            .from("tblDevotion")
            .select("*")
            .eq("leader_id", userRef.current.id)
            .order("month", { ascending: false });
        if (error) console.log("Fetch Error:", error);
        else setRecords(data || []);
        setFetching(false);
    };

    const fetchLeaderRecords = async (leaderId) => {
        setFetching(true);
        const { data, error } = await supabase
            .from("tblDevotion")
            .select("*")
            .eq("leader_id", leaderId)
            .order("month", { ascending: false });
        if (error) console.log("Fetch Error:", error);
        else setRecords(data || []);
        setFetching(false);
    };

    const fetchWholeTribeRecords = async () => {
        if (!assignedTribe || tribeLeaders.length === 0) return;
        setFetching(true);
        const leaderIds = tribeLeaders.map(l => l.id);
        const { data, error } = await supabase
            .from("tblDevotion")
            .select("*")
            .in("leader_id", leaderIds)
            .order("month", { ascending: false });
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

    const computeWholeTribeStats = (allRecords) => {
        const now = new Date();
        const currentMonthName = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        const stats = tribeLeaders.map(leader => {
            const leaderRecords = allRecords.filter(r => r.leader_id === leader.id);
            const thisMonthRecords = leaderRecords.filter(r => r.month === currentMonthName);
            const thisMonthTotal = thisMonthRecords.reduce((sum, r) => sum + (r.completed_days || 0), 0);
            const totalEntries = leaderRecords.length;
            const monthly = {};
            leaderRecords.forEach((record) => {
                const key = record.month;
                if (!monthly[key]) monthly[key] = { totalCompleted: 0, count: 0 };
                monthly[key].totalCompleted += record.completed_days;
                monthly[key].count++;
            });
            const consistentMonths = Object.values(monthly).filter(m => m.totalCompleted >= 25).length;
            const inconsistentMonths = Object.values(monthly).filter(m => m.totalCompleted < 25).length;
            const monthCount = Object.keys(monthly).length;
            const isConsistent = thisMonthTotal >= 25;
            return {
                leaderId: leader.id,
                name: `${leader.firstname} ${leader.lastname}${leader.nickname ? ` (${leader.nickname})` : ""}`,
                firstname: leader.firstname,
                lastname: leader.lastname,
                nickname: leader.nickname,
                thisMonthTotal,
                thisMonthEntries: thisMonthRecords.length,
                totalEntries,
                consistentMonths,
                inconsistentMonths,
                monthCount,
                isConsistent,
                status: isConsistent ? "CONSISTENT" : "INCONSISTENT",
                statusColor: isConsistent ? "#16a34a" : "#dc2626",
                statusBg: isConsistent ? "#dcfce7" : "#fee2e2"
            };
        });
        stats.sort((a, b) => a.name.localeCompare(b.name));
        setWholeTribeStats(stats);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!month || !year || !completedDays || !totalDays) {
            alert("Complete all fields.");
            return;
        }
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
        const { error } = await supabase.from("tblDevotion").insert([insertData]);
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
            if (recordMode === "whole_tribe") fetchWholeTribeRecords();
        }
        setLoading(false);
    };

    const handleLeaderChange = (e) => {
        const leaderId = e.target.value;
        setSelectedLeaderId(leaderId);
        if (leaderId) {
            const leader = tribeLeaders.find(l => String(l.id) === leaderId);
            setSelectedLeaderName(leader ? `${leader.firstname} ${leader.lastname}` : "");
            fetchLeaderRecords(parseInt(leaderId));
        } else {
            setSelectedLeaderName("");
            fetchRecords();
        }
    };

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
    };

    const handleSelectLeaderFromTable = (leaderId) => {
        const leader = tribeLeaders.find(l => l.id === leaderId);
        if (leader) {
            setSelectedLeaderId(String(leaderId));
            setSelectedLeaderName(`${leader.firstname} ${leader.lastname}`);
            setRecordMode("tribe");
            fetchLeaderRecords(leaderId);
        }
    };

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

    const getMonthOptions = () => {
        const months = new Set();
        records.forEach((record) => {
            months.add(JSON.stringify({ key: record.month, label: record.month }));
        });
        return Array.from(months).map(m => JSON.parse(m)).sort((a, b) => b.key.localeCompare(a.key));
    };

    const monthOptions = getMonthOptions();

    const filteredRecords = filterMonth === "ALL"
        ? records
        : records.filter((record) => record.month === filterMonth);

    const now = new Date();
    const currentMonthName = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const currentMonth = monthlyStats.find(m => m.monthName === currentMonthName);

    const wholeTribeConsistentCount = wholeTribeStats.filter(s => s.isConsistent).length;
    const wholeTribeTotalCount = wholeTribeStats.length;

    // ── Paginated slices for each of the three tables ──────────────────────
    const totalCardPages = Math.max(1, Math.ceil(filteredRecords.length / cardPageSize));
    const displayedCards = filteredRecords.slice(
        (cardPage - 1) * cardPageSize,
        cardPage * cardPageSize
    );

    const totalMonthlyPages = Math.max(1, Math.ceil(monthlyStats.length / monthlyPageSize));
    const displayedMonthlyStats = monthlyStats.slice(
        (monthlyPage - 1) * monthlyPageSize,
        monthlyPage * monthlyPageSize
    );

    const totalTribePages = Math.max(1, Math.ceil(wholeTribeStats.length / tribePageSize));
    const displayedTribeStats = wholeTribeStats.slice(
        (tribePage - 1) * tribePageSize,
        tribePage * tribePageSize
    );

    // ── Report: build the list of "Month Year" keys between start & end ───
    const getReportMonths = () => {
        const startIdx = ALL_MONTHS.indexOf(reportStartMonth);
        const endIdx = ALL_MONTHS.indexOf(reportEndMonth);
        if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) return [];
        return ALL_MONTHS.slice(startIdx, endIdx + 1).map(m => `${m} ${reportYear}`);
    };

    const generateTribeReport = async () => {
        if (!reportTribe) {
            alert("Please select a tribe.");
            return;
        }
        const months = getReportMonths();
        if (months.length === 0) {
            alert("Invalid month range — start month must be before or equal to end month.");
            return;
        }

        setReportLoading(true);

        const { data: members, error: memberError } = await supabase
            .from("tblMonitoring")
            .select("id, firstname, lastname, nickname")
            .eq("tribe", reportTribe)
            .order("firstname", { ascending: true });

        if (memberError) {
            console.error("Report member fetch error:", memberError);
            alert("Failed to fetch tribe members.");
            setReportLoading(false);
            return;
        }

        const memberIds = (members || []).map(m => m.id);
        let devotionRecords = [];
        if (memberIds.length > 0) {
            const { data, error } = await supabase
                .from("tblDevotion")
                .select("*")
                .in("leader_id", memberIds)
                .in("month", months);
            if (error) {
                console.error("Report devotion fetch error:", error);
            } else {
                devotionRecords = data || [];
            }
        }

        const rows = (members || []).map(member => {
            const monthCells = months.map(monthKey => {
                const record = devotionRecords.find(r => r.leader_id === member.id && r.month === monthKey);
                return { month: monthKey, record, status: classifyDevotionMonth(record) };
            });
            const overall = classifyOverallStatus(monthCells.map(m => m.status));
            return {
                id: member.id,
                name: `${member.firstname} ${member.lastname}${member.nickname ? ` (${member.nickname})` : ""}`,
                monthCells,
                overall,
            };
        });

        setReportData({ tribe: reportTribe, months, rows });
        setReportLoading(false);
    };

    const handlePrintReport = () => {
        if (!reportData) return;
        const { tribe, months, rows } = reportData;

        const printWindow = window.open("", "_blank", "width=1000,height=700");
        if (!printWindow) {
            alert("Please allow popups to print the report.");
            return;
        }

        const monthHeaders = months.map(m => `<th>${m}</th>`).join("");
        const bodyRows = rows.map(row => {
            const cells = row.monthCells.map(mc => {
                const s = monthStatusStyle(mc.status);
                return `<td style="text-align:center;background:${s.bg};color:${s.color};font-weight:700;">${mc.status}</td>`;
            }).join("");
            const os = overallStatusStyle(row.overall);
            return `<tr>
                <td style="font-weight:600;">${row.name}</td>
                ${cells}
                <td style="text-align:center;background:${os.bg};color:${os.color};font-weight:700;">${row.overall}</td>
            </tr>`;
        }).join("");

        printWindow.document.write(`
            <html>
            <head>
                <title>Devotion Report - ${tribe}</title>
                <style>
                    body { font-family: Arial, Helvetica, sans-serif; padding: 24px; color: #111827; }
                    h1 { font-size: 18px; margin: 0 0 2px 0; }
                    p.sub { color: #6b7280; font-size: 12px; margin: 0 0 16px 0; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    th, td { border: 1px solid #000; padding: 6px 8px; }
                    th { background: #f3f4f6; text-align: center; font-weight: 700; }
                    td:first-child { text-align: left; }
                    @media print {
                        body { padding: 10px; }
                    }
                </style>
            </head>
            <body>
                <h1>Devotion Consistency Report — ${tribe}</h1>
                <p class="sub">Period: ${months[0]} to ${months[months.length - 1]} &bull; Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                <table>
                    <thead>
                        <tr><th style="text-align:left;">Member</th>${monthHeaders}<th>Overall Status</th></tr>
                    </thead>
                    <tbody>${bodyRows}</tbody>
                </table>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 250);
    };

    const handleExportReportExcel = () => {
        if (!reportData) return;
        const { tribe, months, rows } = reportData;

        const wb = XLSX.utils.book_new();

        const goldHeader = {
            fill: { fgColor: { rgb: "C9A45C" }, patternType: "solid" },
            font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
            alignment: { horizontal: "center", vertical: "center" },
            border: { top: { style: "thin", color: { rgb: "B8934A" } }, bottom: { style: "thin", color: { rgb: "B8934A" } }, left: { style: "thin", color: { rgb: "B8934A" } }, right: { style: "thin", color: { rgb: "B8934A" } } }
        };
        const dataCell = {
            font: { sz: 11, color: { rgb: "374151" } },
            border: { top: { style: "thin", color: { rgb: "E5E7EB" } }, bottom: { style: "thin", color: { rgb: "E5E7EB" } }, left: { style: "thin", color: { rgb: "E5E7EB" } }, right: { style: "thin", color: { rgb: "E5E7EB" } } }
        };
        const nameCell = { ...dataCell, font: { sz: 11, color: { rgb: "111827" }, bold: true }, alignment: { horizontal: "left" } };
        const titleStyle = { font: { bold: true, color: { rgb: "B8934A" }, sz: 16 }, alignment: { horizontal: "center" } };

        const consistentStyle = { font: { sz: 11, color: { rgb: "16A34A" }, bold: true }, alignment: { horizontal: "center" }, border: dataCell.border, fill: { fgColor: { rgb: "DCFCE7" }, patternType: "solid" } };
        const occasionalStyle = { font: { sz: 11, color: { rgb: "B45309" }, bold: true }, alignment: { horizontal: "center" }, border: dataCell.border, fill: { fgColor: { rgb: "FEF3C7" }, patternType: "solid" } };
        const inconsistentStyle = { font: { sz: 11, color: { rgb: "DC2626" }, bold: true }, alignment: { horizontal: "center" }, border: dataCell.border, fill: { fgColor: { rgb: "FEE2E2" }, patternType: "solid" } };

        const styleForMonthStatus = (status) => {
            if (status === "CONSISTENT") return consistentStyle;
            if (status === "OCCASIONAL") return occasionalStyle;
            return inconsistentStyle;
        };
        const styleForOverall = (status) => {
            if (status === "ACTIVE") return consistentStyle;
            if (status === "NEEDS GUIDANCE") return occasionalStyle;
            if (status === "INACTIVE") return inconsistentStyle;
            return dataCell;
        };

        const header = ["Member", ...months, "Overall Status"];
        const lastCol = header.length - 1;

        const sheetData = [
            ["MAC TLDA CHURCH"],
            [`Devotion Consistency Report — ${tribe}`],
            [`Period: ${months[0]} to ${months[months.length - 1]}`],
            [`Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`],
            [],
            header
        ];
        rows.forEach(row => {
            sheetData.push([row.name, ...row.monthCells.map(mc => mc.status), row.overall]);
        });

        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        ws["!cols"] = [{ wch: 26 }, ...months.map(() => ({ wch: 16 })), { wch: 18 }];

        for (let r = 0; r <= 3; r++) {
            const cell = XLSX.utils.encode_cell({ r, c: 0 });
            if (ws[cell]) { ws[cell].s = titleStyle; ws["!merges"] = ws["!merges"] || []; ws["!merges"].push({ s: { r, c: 0 }, e: { r, c: lastCol } }); }
        }
        for (let c = 0; c <= lastCol; c++) { const cell = XLSX.utils.encode_cell({ r: 5, c }); if (ws[cell]) ws[cell].s = goldHeader; }

        rows.forEach((row, i) => {
            const r = 6 + i;
            for (let c = 0; c <= lastCol; c++) {
                const cell = XLSX.utils.encode_cell({ r, c });
                if (!ws[cell]) return;
                if (c === 0) ws[cell].s = nameCell;
                else if (c === lastCol) ws[cell].s = styleForOverall(row.overall);
                else ws[cell].s = styleForMonthStatus(row.monthCells[c - 1].status);
            }
        });

        XLSX.utils.book_append_sheet(wb, ws, "Devotion Report");
        const safeStart = months[0].replace(" ", "_");
        const safeEnd = months[months.length - 1].replace(" ", "_");
        XLSX.writeFile(wb, `Devotion_Report_${tribe}_${safeStart}-${safeEnd}.xlsx`);
    };
    // ───────────────────────────────────────────────────────────────────────

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
            <div className="content" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
                {/* Header */}
                <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    marginBottom: "12px", padding: "12px 0", borderBottom: "1px solid #e5e7eb",
                    flexWrap: "wrap", gap: "10px"
                }}>
                    <div>
                        <h1 style={{ fontSize: "20px", margin: 0, fontWeight: 700 }}>
                            {isDevotionChecker && recordMode === "tribe" && selectedLeaderName
                                ? `Devotion: ${selectedLeaderName}`
                                : isDevotionChecker && recordMode === "whole_tribe"
                                    ? `Devotion: Whole ${assignedTribe}`
                                    : "Devotion Recording"}
                        </h1>
                        <p style={{ opacity: 0.7, margin: "2px 0 0 0", fontSize: "12px" }}>
                            Welcome, <strong>{user.firstname} {user.lastname}</strong> • {user.tribe}
                            {isDevotionChecker && (
                                <span style={{
                                    marginLeft: "8px", padding: "2px 8px", borderRadius: "10px",
                                    background: "#fef3c7", color: "#92400e", fontSize: "10px", fontWeight: 700
                                }}>
                                    DJ Checker — {assignedTribe}
                                </span>
                            )}
                        </p>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {canRunTribeReport && (
                            <button className="btn-sm btn-outline" onClick={() => setShowReportModal(true)}
                                style={{ padding: "6px 14px", fontSize: "13px" }}>
                                🖨️ Print / Export Report
                            </button>
                        )}
                        {recordMode !== "whole_tribe" && (
                            <button className="btn-sm btn-primary" onClick={() => setShowForm(true)}
                                style={{ padding: "6px 14px", fontSize: "13px" }}>
                                + Record Devotion
                            </button>
                        )}
                    </div>
                </div>

                {/* Mode Selector */}
                {isDevotionChecker && (
                    <div style={{
                        marginBottom: "15px", padding: "12px 14px",
                        background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "10px"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: "#92400e" }}>
                                📋 Record For:
                            </span>
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                {["self", "tribe", "whole_tribe"].map((mode) => {
                                    const labels = { self: "Myself", tribe: "Tribe Member", whole_tribe: `Whole ${assignedTribe}` };
                                    return (
                                        <button key={mode} onClick={() => handleModeChange(mode)}
                                            style={{
                                                padding: "5px 14px", borderRadius: "8px", border: "1px solid",
                                                borderColor: recordMode === mode ? "#c9a45c" : "#d1d5db",
                                                background: recordMode === mode ? "#c9a45c" : "#fff",
                                                color: recordMode === mode ? "#fff" : "#374151",
                                                fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
                                            }}>
                                            {labels[mode]}
                                        </button>
                                    );
                                })}
                            </div>
                            {recordMode === "tribe" && (
                                <select value={selectedLeaderId} onChange={handleLeaderChange}
                                    style={{
                                        padding: "6px 10px", fontSize: "13px", borderRadius: "6px",
                                        border: "1px solid #d1d5db", minWidth: "200px", background: "#fff"
                                    }}>
                                    <option value="">— Select Tribe Member —</option>
                                    {tribeLeaders.map((leader) => (
                                        <option key={leader.id} value={String(leader.id)}>
                                            {leader.firstname} {leader.lastname}{leader.nickname ? ` (${leader.nickname})` : ""}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>
                )}

                {/* Whole Tribe View */}
                {recordMode === "whole_tribe" && (
                    <div style={{ marginBottom: "20px" }}>
                        <div style={{
                            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                            gap: "8px", marginBottom: "15px"
                        }}>
                            <div style={{ padding: "10px 12px", borderRadius: "8px", background: "#fff", border: "1px solid #e5e7eb" }}>
                                <h3 style={{ fontSize: "11px", margin: "0 0 4px 0", color: "#6b7280", fontWeight: 500 }}>Tribe Members</h3>
                                <h1 style={{ fontSize: "22px", margin: 0, color: "#111827" }}>{wholeTribeTotalCount}</h1>
                            </div>
                            <div style={{ padding: "10px 12px", borderRadius: "8px", background: "#ecfdf5", border: "1px solid #bbf7d0" }}>
                                <h3 style={{ fontSize: "11px", margin: "0 0 4px 0", color: "#16a34a", fontWeight: 500 }}>Consistent This Month</h3>
                                <h1 style={{ fontSize: "22px", margin: 0, color: "#16a34a" }}>{wholeTribeConsistentCount}</h1>
                            </div>
                            <div style={{ padding: "10px 12px", borderRadius: "8px", background: "#fef2f2", border: "1px solid #fecaca" }}>
                                <h3 style={{ fontSize: "11px", margin: "0 0 4px 0", color: "#dc2626", fontWeight: 500 }}>Inconsistent This Month</h3>
                                <h1 style={{ fontSize: "22px", margin: 0, color: "#dc2626" }}>{wholeTribeTotalCount - wholeTribeConsistentCount}</h1>
                            </div>
                        </div>

                        <div className="excel-card" style={{ borderRadius: "8px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
                            <div className="excel-header" style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                                <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>{assignedTribe} Members — This Month Overview</h2>
                                <span style={{ fontSize: "11px", color: "#6b7280" }}>Click a row to view / record for that member</span>
                            </div>
                            <div className="excel-wrapper" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                                <table className="excel-table" style={{ fontSize: "12px", minWidth: "700px" }}>
                                    <thead>
                                        <tr>
                                            <th style={{ padding: "8px 10px", textAlign: "left" }}>Member</th>
                                            <th style={{ padding: "8px 10px", textAlign: "center" }}>This Month</th>
                                            <th style={{ padding: "8px 10px", textAlign: "center" }}>Entries</th>
                                            <th style={{ padding: "8px 10px", textAlign: "center" }}>Target</th>
                                            <th style={{ padding: "8px 10px", textAlign: "center" }}>Status</th>
                                            <th style={{ padding: "8px 10px", textAlign: "center" }}>Total Entries</th>
                                            <th style={{ padding: "8px 10px", textAlign: "center" }}>Consistent Months</th>
                                            <th style={{ padding: "8px 10px", textAlign: "center" }}>Inconsistent</th>
                                            <th style={{ padding: "8px 10px", textAlign: "center" }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {wholeTribeStats.length === 0 ? (
                                            <tr><td colSpan={9} style={{ padding: "30px", textAlign: "center", color: "#9ca3af" }}>No tribe members found.</td></tr>
                                        ) : (
                                            displayedTribeStats.map((member) => (
                                                <tr key={member.leaderId}
                                                    style={{ cursor: "pointer", transition: "background 0.15s" }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                                                    <td style={{ padding: "6px 10px", fontWeight: 600 }}>{member.name}</td>
                                                    <td style={{ padding: "6px 10px", textAlign: "center", fontWeight: 700, color: member.isConsistent ? "#16a34a" : "#dc2626" }}>{member.thisMonthTotal}</td>
                                                    <td style={{ padding: "6px 10px", textAlign: "center", color: "#6b7280" }}>{member.thisMonthEntries}</td>
                                                    <td style={{ padding: "6px 10px", textAlign: "center", color: "#9ca3af" }}>25</td>
                                                    <td style={{ padding: "6px 10px", textAlign: "center" }}>
                                                        <span style={{ padding: "2px 8px", borderRadius: "10px", background: member.statusBg, color: member.statusColor, fontSize: "10px", fontWeight: "700" }}>{member.status}</span>
                                                    </td>
                                                    <td style={{ padding: "6px 10px", textAlign: "center", color: "#6b7280" }}>{member.totalEntries}</td>
                                                    <td style={{ padding: "6px 10px", textAlign: "center", color: "#16a34a", fontWeight: 600 }}>{member.consistentMonths}</td>
                                                    <td style={{ padding: "6px 10px", textAlign: "center", color: "#dc2626" }}>{member.inconsistentMonths}</td>
                                                    <td style={{ padding: "6px 10px", textAlign: "center" }}>
                                                        <button onClick={() => handleSelectLeaderFromTable(member.leaderId)}
                                                            style={{ padding: "3px 10px", borderRadius: "6px", border: "1px solid #c9a45c", background: "#fff", color: "#92400e", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
                                                            View / Record
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {wholeTribeStats.length > 0 && (
                            <PaginationBar
                                page={tribePage}
                                totalPages={totalTribePages}
                                pageSize={tribePageSize}
                                totalItems={wholeTribeStats.length}
                                onPageChange={setTribePage}
                                onPageSizeChange={setTribePageSize}
                            />
                        )}
                    </div>
                )}

                {/* Self / Tribe Member View */}
                {recordMode !== "whole_tribe" && (
                    <>
                        {/* Stats Cards */}
                        <div style={{
                            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                            gap: "8px", marginBottom: "15px"
                        }}>
                            <div className="record-card" style={{
                                border: currentMonth ? `2px solid ${currentMonth.statusColor}` : "2px solid #e5e7eb",
                                padding: "10px 12px", borderRadius: "8px", background: "#fff"
                            }}>
                                <h3 style={{ fontSize: "11px", margin: "0 0 4px 0", color: "#6b7280", fontWeight: 500 }}>
                                    This Month ({currentMonthName})
                                </h3>
                                <h1 style={{ color: currentMonth ? currentMonth.statusColor : "#6b7280", fontSize: "22px", margin: 0 }}>
                                    {currentMonth ? currentMonth.totalCompleted : 0}
                                </h1>
                                <p style={{ fontSize: "10px", marginTop: "2px", margin: 0, color: "#9ca3af" }}>Target: 25 days</p>
                                {currentMonth && (
                                    <span style={{ display: "inline-block", marginTop: "4px", padding: "2px 8px", borderRadius: "10px", background: currentMonth.statusBg, color: currentMonth.statusColor, fontSize: "10px", fontWeight: "700" }}>
                                        {currentMonth.status}
                                    </span>
                                )}
                                {!currentMonth && (
                                    <span style={{ display: "inline-block", marginTop: "4px", padding: "2px 8px", borderRadius: "10px", background: "#f3f4f6", color: "#6b7280", fontSize: "10px", fontWeight: "700" }}>NO RECORDS</span>
                                )}
                            </div>
                            <div className="record-card" style={{ padding: "10px 12px", borderRadius: "8px", background: "#fff", border: "1px solid #e5e7eb" }}>
                                <h3 style={{ fontSize: "11px", margin: "0 0 4px 0", color: "#6b7280", fontWeight: 500 }}>Total Entries</h3>
                                <h1 style={{ fontSize: "22px", margin: 0, color: "#111827" }}>{records.length}</h1>
                            </div>
                            <div className="record-card" style={{ padding: "10px 12px", borderRadius: "8px", background: "#ecfdf5", border: "1px solid #bbf7d0" }}>
                                <h3 style={{ fontSize: "11px", margin: "0 0 4px 0", color: "#16a34a", fontWeight: 500 }}>Consistent Months</h3>
                                <h1 style={{ fontSize: "22px", margin: 0, color: "#16a34a" }}>{monthlyStats.filter(m => m.status === "CONSISTENT").length}</h1>
                            </div>
                            <div className="record-card" style={{ padding: "10px 12px", borderRadius: "8px", background: "#fef2f2", border: "1px solid #fecaca" }}>
                                <h3 style={{ fontSize: "11px", margin: "0 0 4px 0", color: "#dc2626", fontWeight: 500 }}>Inconsistent Months</h3>
                                <h1 style={{ fontSize: "22px", margin: 0, color: "#dc2626" }}>{monthlyStats.filter(m => m.status === "INCONSISTENT").length}</h1>
                            </div>
                        </div>

                        {/* Mobile Tab Switcher */}
                        <div style={{
                            display: "none",
                            marginBottom: "12px",
                            borderBottom: "1px solid #e5e7eb"
                        }} className="mobile-tabs">
                            <button onClick={() => setActiveTab("records")}
                                style={{
                                    padding: "10px 16px", border: "none", background: "none",
                                    borderBottom: `2px solid ${activeTab === "records" ? "#c9a45c" : "transparent"}`,
                                    color: activeTab === "records" ? "#c9a45c" : "#6b7280",
                                    fontWeight: 600, fontSize: "13px", cursor: "pointer"
                                }}>
                                📋 Records
                            </button>
                            <button onClick={() => setActiveTab("monthly")}
                                style={{
                                    padding: "10px 16px", border: "none", background: "none",
                                    borderBottom: `2px solid ${activeTab === "monthly" ? "#c9a45c" : "transparent"}`,
                                    color: activeTab === "monthly" ? "#c9a45c" : "#6b7280",
                                    fontWeight: 600, fontSize: "13px", cursor: "pointer"
                                }}>
                                📊 Monthly Report
                            </button>
                        </div>

                        {/* Two Column Layout - Stacks on Mobile */}
                        <div style={{
                            display: "flex", gap: "16px", alignItems: "flex-start",
                            overflow: "hidden", flex: 1, minHeight: 0
                        }} className="devotion-columns">

                            {/* LEFT: Monthly Table */}
                            <div style={{
                                flex: "1 1 0", minWidth: "0", overflowY: "auto",
                                maxHeight: "calc(100vh - 260px)"
                            }} className="column-left">
                                {monthlyStats.length > 0 && (
                                    <>
                                        <div className="excel-card" style={{ borderRadius: "8px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
                                            <div className="excel-header" style={{ padding: "10px 14px" }}>
                                                <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>
                                                    {recordMode === "tribe" && selectedLeaderName
                                                        ? `${selectedLeaderName}'s Monthly Consistency Report`
                                                        : "Monthly Devotion Consistency Report"}
                                                </h2>
                                            </div>
                                            <div className="excel-wrapper" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                                                <table className="excel-table" style={{ fontSize: "12px", minWidth: "600px" }}>
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
                                                        {displayedMonthlyStats.map((month) => (
                                                            <tr key={month.key}>
                                                                <td style={{ fontWeight: 600, padding: "6px 10px" }}>{month.monthName}</td>
                                                                <td style={{ padding: "6px 10px" }}>{month.count}</td>
                                                                <td style={{ padding: "6px 10px" }}>{month.totalCompleted} days</td>
                                                                <td style={{ padding: "6px 10px" }}>{month.avgCompleted} days</td>
                                                                <td style={{ padding: "6px 10px" }}>25</td>
                                                                <td style={{ padding: "6px 10px" }}>
                                                                    <span style={{ padding: "2px 8px", borderRadius: "10px", background: month.statusBg, color: month.statusColor, fontSize: "10px", fontWeight: "700" }}>
                                                                        {month.status}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: "6px 10px", fontSize: "11px", color: "#6b7280" }}>
                                                                    {month.totalCompleted >= 25 ? "✅ Keep it up!" : `❌ ${25 - month.totalCompleted} days missing`}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                        <PaginationBar
                                            page={monthlyPage}
                                            totalPages={totalMonthlyPages}
                                            pageSize={monthlyPageSize}
                                            totalItems={monthlyStats.length}
                                            onPageChange={setMonthlyPage}
                                            onPageSizeChange={setMonthlyPageSize}
                                        />
                                    </>
                                )}
                            </div>

                            {/* RIGHT: Record Cards */}
                            <div style={{
                                flex: "0 0 320px", maxWidth: "320px", overflowY: "auto",
                                maxHeight: "calc(100vh - 260px)", display: "flex", flexDirection: "column"
                            }} className="column-right">
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                                    <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>
                                        {recordMode === "tribe" && selectedLeaderName
                                            ? `${selectedLeaderName}'s Records`
                                            : "My Records"}
                                        <span style={{ marginLeft: "8px", padding: "2px 8px", borderRadius: "10px", background: "#dbeafe", color: "#1e40af", fontSize: "11px", fontWeight: 600 }}>
                                            {filteredRecords.length} entries
                                        </span>
                                    </h2>
                                    <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
                                        style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #e5e7eb", fontSize: "12px", cursor: "pointer" }}>
                                        <option value="ALL">All Months</option>
                                        {monthOptions.map((month) => (
                                            <option key={month.key} value={month.key}>{month.label}</option>
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
                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingRight: "6px" }}>
                                        {displayedCards.map((record) => (
                                            <div key={record.id} style={{
                                                padding: "10px 12px", borderRadius: "8px",
                                                background: "#f9fafb", border: "1px solid #e5e7eb", flexShrink: 0
                                            }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                                    <h3 style={{ margin: 0, fontSize: "13px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                                                        {record.month}
                                                    </h3>
                                                    <span style={{
                                                        padding: "2px 8px", borderRadius: "8px",
                                                        background: record.completed_days >= 25 ? "#dcfce7" : "#fee2e2",
                                                        color: record.completed_days >= 25 ? "#16a34a" : "#dc2626",
                                                        fontSize: "10px", fontWeight: "600", marginLeft: "6px", flexShrink: 0
                                                    }}>
                                                        {record.completed_days >= 25 ? "Consistent" : "Inconsistent"}
                                                    </span>
                                                </div>
                                                <div style={{ display: "flex", gap: "12px", marginBottom: "6px" }}>
                                                    <p style={{ margin: 0, color: "#6b7280", fontSize: "11px" }}>✅ <strong>{record.completed_days}</strong> done</p>
                                                    <p style={{ margin: 0, color: "#9ca3af", fontSize: "11px" }}>📅 {record.total_days} total</p>
                                                </div>
                                                <div style={{ background: "#e5e7eb", borderRadius: "6px", height: "6px", overflow: "hidden" }}>
                                                    <div style={{
                                                        width: `${(record.completed_days / record.total_days) * 100}%`,
                                                        height: "100%", background: record.completed_days >= 25 ? "#16a34a" : "#f59e0b",
                                                        borderRadius: "6px", transition: "width 0.3s"
                                                    }} />
                                                </div>
                                                <p style={{ margin: "4px 0 0 0", color: "#9ca3af", fontSize: "10px", textAlign: "right" }}>
                                                    {Math.round((record.completed_days / record.total_days) * 100)}%
                                                </p>
                                            </div>
                                        ))}

                                        <PaginationBar
                                            page={cardPage}
                                            totalPages={totalCardPages}
                                            pageSize={cardPageSize}
                                            totalItems={filteredRecords.length}
                                            onPageChange={setCardPage}
                                            onPageSizeChange={setCardPageSize}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Modal */}
            {showForm && (
                <div className="modal-overlay" style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center",
                    justifyContent: "center", zIndex: 1000, padding: "20px"
                }} onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
                    <div style={{
                        background: "#fff", borderRadius: "12px", width: "100%",
                        maxWidth: "480px", maxHeight: "90vh", overflow: "auto", position: "relative"
                    }}>
                        <div style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            padding: "14px 18px", borderBottom: "1px solid #e5e7eb",
                            position: "sticky", top: 0, background: "#fff", zIndex: 10,
                            borderRadius: "12px 12px 0 0"
                        }}>
                            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
                                {recordMode === "tribe" && selectedLeaderName
                                    ? `Record Devotion for ${selectedLeaderName}`
                                    : "Record New Devotion"}
                            </h2>
                            <button onClick={() => setShowForm(false)}
                                style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#6b7280", padding: "4px", lineHeight: 1 }}>✕</button>
                        </div>
                        <div style={{ padding: "14px 18px 18px" }}>
                            {isDevotionChecker && recordMode === "tribe" && selectedLeaderId && (
                                <div style={{ padding: "8px 12px", background: "#fef3c7", borderRadius: "8px", marginBottom: "12px", border: "1px solid #fcd34d" }}>
                                    <p style={{ margin: 0, fontSize: "12px", color: "#92400e", fontWeight: 600 }}>📝 Recording for: {selectedLeaderName}</p>
                                </div>
                            )}
                            {isDevotionChecker && recordMode === "tribe" && !selectedLeaderId && (
                                <div style={{ padding: "8px 12px", background: "#fee2e2", borderRadius: "8px", marginBottom: "12px", border: "1px solid #fecaca" }}>
                                    <p style={{ margin: 0, fontSize: "12px", color: "#dc2626", fontWeight: 600 }}>⚠️ Please select a tribe member above before recording.</p>
                                </div>
                            )}
                            <form className="leader-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                    <select value={month} onChange={(e) => setMonth(e.target.value)}
                                        style={{ flex: 2, minWidth: "140px", padding: "8px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d1d5db" }}>
                                        <option value="">Select Month</option>
                                        {ALL_MONTHS.map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                    <select value={year} onChange={(e) => setYear(e.target.value)}
                                        style={{ flex: 1, minWidth: "80px", padding: "8px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d1d5db" }}>
                                        <option value="">Year</option>
                                        {yearOptions.map((yr) => (<option key={yr} value={yr}>{yr}</option>))}
                                    </select>
                                </div>
                                <input type="number" placeholder="Completed Days" value={completedDays} onChange={(e) => setCompletedDays(e.target.value)} min="0" max="31"
                                    style={{ padding: "8px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d1d5db" }} />
                                <input type="number" placeholder="Total Days in Month" value={totalDays} onChange={(e) => setTotalDays(e.target.value)} min="1" max="31"
                                    style={{ padding: "8px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d1d5db" }} />
                                <button type="submit" disabled={recordMode === "tribe" && !selectedLeaderId}
                                    style={{ marginTop: "4px", padding: "8px", fontSize: "13px", opacity: recordMode === "tribe" && !selectedLeaderId ? 0.5 : 1, cursor: recordMode === "tribe" && !selectedLeaderId ? "not-allowed" : "pointer" }}>
                                    {loading ? "Recording..." : "Record Devotion"}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Tribe / Month-Range Report Modal (Print + Excel export) */}
            {showReportModal && (
                <div className="modal-overlay" style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center",
                    justifyContent: "center", zIndex: 1000, padding: "20px"
                }} onClick={(e) => { if (e.target === e.currentTarget) setShowReportModal(false); }}>
                    <div style={{
                        background: "#fff", borderRadius: "12px", width: "100%",
                        maxWidth: "900px", maxHeight: "90vh", overflow: "auto", position: "relative"
                    }}>
                        <div style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            padding: "14px 18px", borderBottom: "1px solid #e5e7eb",
                            position: "sticky", top: 0, background: "#fff", zIndex: 10,
                            borderRadius: "12px 12px 0 0"
                        }}>
                            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Tribe Devotion Report</h2>
                            <button onClick={() => { setShowReportModal(false); setReportData(null); }}
                                style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#6b7280", padding: "4px", lineHeight: 1 }}>✕</button>
                        </div>

                        <div style={{ padding: "16px 18px 20px" }}>
                            {/* Controls */}
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "flex-end", marginBottom: "14px" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                    <label style={{ fontSize: "11px", fontWeight: 600, color: "#374151" }}>Tribe</label>
                                    <select value={reportTribe} onChange={(e) => setReportTribe(e.target.value)}
                                        style={{ padding: "7px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d1d5db", minWidth: "150px" }}>
                                        <option value="">Select Tribe</option>
                                        {allTribes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                    <label style={{ fontSize: "11px", fontWeight: 600, color: "#374151" }}>Year</label>
                                    <select value={reportYear} onChange={(e) => setReportYear(e.target.value)}
                                        style={{ padding: "7px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d1d5db", minWidth: "90px" }}>
                                        {yearOptions.map((yr) => (<option key={yr} value={yr}>{yr}</option>))}
                                    </select>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                    <label style={{ fontSize: "11px", fontWeight: 600, color: "#374151" }}>From Month</label>
                                    <select value={reportStartMonth} onChange={(e) => setReportStartMonth(e.target.value)}
                                        style={{ padding: "7px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d1d5db", minWidth: "130px" }}>
                                        {ALL_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                    <label style={{ fontSize: "11px", fontWeight: 600, color: "#374151" }}>To Month</label>
                                    <select value={reportEndMonth} onChange={(e) => setReportEndMonth(e.target.value)}
                                        style={{ padding: "7px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d1d5db", minWidth: "130px" }}>
                                        {ALL_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <button onClick={generateTribeReport} disabled={reportLoading}
                                    style={{
                                        padding: "8px 16px", borderRadius: "6px", border: "none",
                                        background: "#c9a45c", color: "#fff", fontSize: "13px", fontWeight: 700,
                                        cursor: reportLoading ? "not-allowed" : "pointer", opacity: reportLoading ? 0.7 : 1
                                    }}>
                                    {reportLoading ? "Generating..." : "Generate Report"}
                                </button>
                            </div>

                            <p style={{ fontSize: "11px", color: "#9ca3af", margin: "0 0 14px 0" }}>
                                Per month: <strong style={{ color: "#16a34a" }}>Consistent</strong> (≥{CONSISTENT_THRESHOLD} days),{" "}
                                <strong style={{ color: "#b45309" }}>Occasional</strong> ({OCCASIONAL_THRESHOLD}–{CONSISTENT_THRESHOLD - 1} days),{" "}
                                <strong style={{ color: "#dc2626" }}>Inconsistent</strong> (below {OCCASIONAL_THRESHOLD} days or no record).
                                Overall: all Occasional → <strong style={{ color: "#b45309" }}>Needs Guidance</strong>, all Inconsistent → <strong style={{ color: "#dc2626" }}>Inactive</strong>, otherwise → <strong style={{ color: "#16a34a" }}>Active</strong>.
                            </p>

                            {/* Report Preview */}
                            {reportData && (
                                <>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                                        <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>
                                            {reportData.tribe} — {reportData.months[0]} to {reportData.months[reportData.months.length - 1]}
                                        </h3>
                                        <div style={{ display: "flex", gap: "8px" }}>
                                            <button onClick={handlePrintReport}
                                                style={{ padding: "6px 14px", borderRadius: "6px", border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                                                🖨️ Print
                                            </button>
                                            <button onClick={handleExportReportExcel}
                                                style={{ padding: "6px 14px", borderRadius: "6px", border: "1px solid #16a34a", background: "#dcfce7", color: "#166534", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                                                📊 Export to Excel
                                            </button>
                                        </div>
                                    </div>

                                    {reportData.rows.length === 0 ? (
                                        <p style={{ fontSize: "13px", color: "#6b7280" }}>No members found for this tribe.</p>
                                    ) : (
                                        <div style={{ overflowX: "auto", border: "1px solid #000" }}>
                                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", minWidth: "600px" }}>
                                                <thead>
                                                    <tr>
                                                        <th style={{ padding: "6px 8px", textAlign: "left", background: "#f3f4f6", border: "1px solid #000", fontWeight: 700 }}>Member</th>
                                                        {reportData.months.map(m => (
                                                            <th key={m} style={{ padding: "6px 8px", textAlign: "center", background: "#f3f4f6", border: "1px solid #000", fontWeight: 700, whiteSpace: "nowrap" }}>{m}</th>
                                                        ))}
                                                        <th style={{ padding: "6px 8px", textAlign: "center", background: "#f3f4f6", border: "1px solid #000", fontWeight: 700 }}>Overall Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {reportData.rows.map(row => (
                                                        <tr key={row.id}>
                                                            <td style={{ padding: "6px 8px", border: "1px solid #000", fontWeight: 600, background: "#fff" }}>{row.name}</td>
                                                            {row.monthCells.map(mc => {
                                                                const s = monthStatusStyle(mc.status);
                                                                return (
                                                                    <td key={mc.month} style={{ padding: "6px 8px", border: "1px solid #000", textAlign: "center" }}>
                                                                        <span style={{ padding: "2px 8px", borderRadius: "10px", background: s.bg, color: s.color, fontSize: "10px", fontWeight: 700 }}>
                                                                            {mc.status}
                                                                        </span>
                                                                    </td>
                                                                );
                                                            })}
                                                            <td style={{ padding: "6px 8px", border: "1px solid #000", textAlign: "center" }}>
                                                                {(() => {
                                                                    const s = overallStatusStyle(row.overall);
                                                                    return (
                                                                        <span style={{ padding: "2px 8px", borderRadius: "10px", background: s.bg, color: s.color, fontSize: "10px", fontWeight: 700 }}>
                                                                            {row.overall}
                                                                        </span>
                                                                    );
                                                                })()}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile CSS */}
            <style>{`
                @media (max-width: 768px) {
                    .devotion-columns {
                        flex-direction: column !important;
                        gap: 20px !important;
                    }
                    .column-left, .column-right {
                        flex: 1 1 100% !important;
                        max-width: 100% !important;
                        width: 100% !important;
                    }
                    .mobile-tabs {
                        display: flex !important;
                    }
                    .column-left {
                        display: none;
                    }
                    .column-left.active-tab-visible {
                        display: block !important;
                    }
                    .column-right {
                        display: none;
                    }
                    .column-right.active-tab-visible {
                        display: flex !important;
                    }
                }
            `}</style>
        </div>
    );
}

export default Devotion;