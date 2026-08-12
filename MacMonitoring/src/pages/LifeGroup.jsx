import { useEffect, useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";
import { getCurrentUser, isAdmin } from "../utils/auth";
import { tribes as allTribes } from "../constants/options";
import * as XLSX from "xlsx-js-style";

// ── Excel-style table tokens (from Tithes) ─────────────────────────────────
const ETH = (extra = {}) => ({
    padding: "5px 4px",
    fontWeight: 700,
    fontSize: "11px",
    textAlign: "center",
    color: "#000",
    background: "#f3f4f6",
    border: "1px solid #000",
    whiteSpace: "nowrap",
    ...extra,
});

const ETD = (extra = {}) => ({
    padding: "0",
    fontSize: "11px",
    textAlign: "center",
    border: "1px solid #000",
    background: "#fff",
    ...extra,
});

const ALL_MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// ═══════════════════════════════════════════════════════════════════════════
// TRIBE REPORT — per-month classification + overall status rules
//
// Per month, a member's Life Group participation is classified by how many
// sessions they attended that month:
//   CONSISTENT   — sessionCount >= 3 (target met)
//   OCCASIONAL   — sessionCount is 1 or 2 (some participation, but short)
//   INCONSISTENT — sessionCount is 0 (no record that month)
//
// Overall status across the selected month range:
//   NEEDS GUIDANCE — every selected month is OCCASIONAL
//   INACTIVE       — every selected month is INCONSISTENT
//   ACTIVE         — anything else (includes any CONSISTENT month, or a mix)
// ═══════════════════════════════════════════════════════════════════════════
const CONSISTENT_TARGET = 3;

const classifyLifeGroupMonth = (count) => {
    if (count >= CONSISTENT_TARGET) return "CONSISTENT";
    if (count >= 1) return "OCCASIONAL";
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

function LifeGroup() {
    const user = getCurrentUser();
    const userRef = useRef(user);
    const admin = isAdmin();

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

    const [isLifeGroupChecker, setIsLifeGroupChecker] = useState(false);
    const [assignedTribe, setAssignedTribe] = useState("");
    const [tribeLeaders, setTribeLeaders] = useState([]);
    const [selectedLeaderId, setSelectedLeaderId] = useState("");
    const [selectedLeaderName, setSelectedLeaderName] = useState("");
    const [recordMode, setRecordMode] = useState("self");

    const [wholeTribeRecords, setWholeTribeRecords] = useState([]);
    const [wholeTribeStats, setWholeTribeStats] = useState([]);

    const [cardPage, setCardPage] = useState(1);
    const CARDS_PER_PAGE = 5;

    const [activeTab, setActiveTab] = useState("records"); // "records" | "monthly"

    // ── Tribe / Month-Range Report (Print + Excel export) ─────────────────
    const currentYear = new Date().getFullYear();
    const reportYearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
    const canRunTribeReport = admin || isLifeGroupChecker;
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
            checkLifeGroupCheckerRole();
            fetchRecords();
        }
    }, []);

    useEffect(() => {
        setCardPage(1);
    }, [filterMonth, records.length, recordMode, selectedLeaderId]);

    // Default the report tribe once we know the user's context
    useEffect(() => {
        if (!reportTribe) {
            if (isLifeGroupChecker && assignedTribe) setReportTribe(assignedTribe);
            else if (admin && allTribes.length) setReportTribe(allTribes[0]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLifeGroupChecker, assignedTribe, admin]);

    const checkLifeGroupCheckerRole = () => {
        const currentUser = userRef.current;
        if (!currentUser) return;
        const hasDJMinistry = currentUser.ministries?.includes("DISCIPLESHIP JOURNEY") ||
            currentUser.ministry === "DISCIPLESHIP JOURNEY";
        const isLifeGroupCheckerType = currentUser.dj_type === "LifeGroup Checker";
        const hasAssignedTribe = currentUser.assigned_tribe && currentUser.assigned_tribe !== "";
        if (hasDJMinistry && isLifeGroupCheckerType && hasAssignedTribe) {
            setIsLifeGroupChecker(true);
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
            .from("tblLifeGroup")
            .select("*")
            .eq("leader_id", userRef.current.id)
            .order("date", { ascending: false });
        if (error) console.log("Fetch Error:", error);
        else setRecords(data || []);
        setFetching(false);
    };

    const fetchLeaderRecords = async (leaderId) => {
        setFetching(true);
        const { data, error } = await supabase
            .from("tblLifeGroup")
            .select("*")
            .eq("leader_id", leaderId)
            .order("date", { ascending: false });
        if (error) console.log("Fetch Error:", error);
        else setRecords(data || []);
        setFetching(false);
    };

    const fetchWholeTribeRecords = async () => {
        if (!assignedTribe || tribeLeaders.length === 0) return;
        setFetching(true);
        const leaderIds = tribeLeaders.map(l => l.id);
        const { data, error } = await supabase
            .from("tblLifeGroup")
            .select("*")
            .in("leader_id", leaderIds)
            .order("date", { ascending: false });
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
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const stats = tribeLeaders.map(leader => {
            const leaderRecords = allRecords.filter(r => r.leader_id === leader.id);
            const thisMonthRecords = leaderRecords.filter(r => {
                const d = new Date(r.date);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                return key === currentMonthKey;
            });
            const totalRecords = leaderRecords.length;
            const monthly = {};
            leaderRecords.forEach((record) => {
                const d = new Date(record.date);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                if (!monthly[key]) monthly[key] = 0;
                monthly[key]++;
            });
            const consistentMonths = Object.values(monthly).filter(c => c >= 3).length;
            const inconsistentMonths = Object.values(monthly).filter(c => c < 3).length;
            const monthCount = Object.keys(monthly).length;
            const isConsistent = thisMonthRecords.length >= 3;
            return {
                leaderId: leader.id,
                name: `${leader.firstname} ${leader.lastname}${leader.nickname ? ` (${leader.nickname})` : ""}`,
                firstname: leader.firstname,
                lastname: leader.lastname,
                nickname: leader.nickname,
                thisMonthCount: thisMonthRecords.length,
                totalRecords,
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
        if (!topic || !place || !type) {
            alert("Complete all fields.");
            return;
        }
        const targetLeaderId = recordMode === "tribe" && selectedLeaderId
            ? parseInt(selectedLeaderId)
            : userRef.current.id;
        setLoading(true);
        const insertData = {
            leader_id: targetLeaderId,
            topic,
            place,
            type,
            exhorter: exhorter || null,
            date
        };
        const { error } = await supabase.from("tblLifeGroup").insert([insertData]);
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
                id: Date.now(), leader_id: targetLeaderId, topic, place, type,
                exhorter: exhorter || null, date, created_at: new Date().toISOString()
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
                key, ...data,
                status: data.count >= 3 ? "CONSISTENT" : "INCONSISTENT",
                statusColor: data.count >= 3 ? "#16a34a" : "#dc2626",
                statusBg: data.count >= 3 ? "#dcfce7" : "#fee2e2"
            }));
    };

    const monthlyStats = getMonthlyStats();

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

    const filteredRecords = filterMonth === "ALL"
        ? records
        : records.filter((record) => {
            const d = new Date(record.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            return key === filterMonth;
        });

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const currentMonth = monthlyStats.find(m => m.key === currentMonthKey);

    const wholeTribeConsistentCount = wholeTribeStats.filter(s => s.isConsistent).length;
    const wholeTribeTotalCount = wholeTribeStats.length;

    const totalCardPages = Math.ceil(filteredRecords.length / CARDS_PER_PAGE) || 1;
    const displayedCards = filteredRecords.slice(
        (cardPage - 1) * CARDS_PER_PAGE,
        cardPage * CARDS_PER_PAGE
    );

    // ── Report: build the list of { key, label } months between start & end ──
    const getReportMonths = () => {
        const startIdx = ALL_MONTHS.indexOf(reportStartMonth);
        const endIdx = ALL_MONTHS.indexOf(reportEndMonth);
        if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) return [];
        const months = [];
        for (let i = startIdx; i <= endIdx; i++) {
            months.push({
                key: `${reportYear}-${String(i + 1).padStart(2, "0")}`,
                label: `${ALL_MONTHS[i]} ${reportYear}`
            });
        }
        return months;
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
        let lifeGroupRecords = [];
        if (memberIds.length > 0) {
            const startIdx = ALL_MONTHS.indexOf(reportStartMonth);
            const endIdx = ALL_MONTHS.indexOf(reportEndMonth);
            const startDate = `${reportYear}-${String(startIdx + 1).padStart(2, "0")}-01`;
            const endMonthLastDay = new Date(Number(reportYear), endIdx + 1, 0).getDate();
            const endDate = `${reportYear}-${String(endIdx + 1).padStart(2, "0")}-${String(endMonthLastDay).padStart(2, "0")}`;

            const { data, error } = await supabase
                .from("tblLifeGroup")
                .select("*")
                .in("leader_id", memberIds)
                .gte("date", startDate)
                .lte("date", endDate);
            if (error) {
                console.error("Report life group fetch error:", error);
            } else {
                lifeGroupRecords = data || [];
            }
        }

        const rows = (members || []).map(member => {
            const memberRecords = lifeGroupRecords.filter(r => r.leader_id === member.id);
            const monthCells = months.map(({ key, label }) => {
                const count = memberRecords.filter(r => {
                    const d = new Date(r.date);
                    const rKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                    return rKey === key;
                }).length;
                return { month: label, count, status: classifyLifeGroupMonth(count) };
            });
            const overall = classifyOverallStatus(monthCells.map(m => m.status));
            return {
                id: member.id,
                name: `${member.firstname} ${member.lastname}${member.nickname ? ` (${member.nickname})` : ""}`,
                monthCells,
                overall,
            };
        });

        setReportData({ tribe: reportTribe, months: months.map(m => m.label), rows });
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
                return `<td style="text-align:center;background:${s.bg};color:${s.color};font-weight:700;">${mc.status} (${mc.count})</td>`;
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
                <title>Life Group Report - ${tribe}</title>
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
                <h1>Life Group Consistency Report — ${tribe}</h1>
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
            [`Life Group Consistency Report — ${tribe}`],
            [`Period: ${months[0]} to ${months[months.length - 1]}`],
            [`Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`],
            [],
            header
        ];
        rows.forEach(row => {
            sheetData.push([row.name, ...row.monthCells.map(mc => `${mc.status} (${mc.count})`), row.overall]);
        });

        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        ws["!cols"] = [{ wch: 26 }, ...months.map(() => ({ wch: 18 })), { wch: 18 }];

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

        XLSX.utils.book_append_sheet(wb, ws, "Life Group Report");
        const safeStart = months[0].replace(" ", "_");
        const safeEnd = months[months.length - 1].replace(" ", "_");
        XLSX.writeFile(wb, `LifeGroup_Report_${tribe}_${safeStart}-${safeEnd}.xlsx`);
    };
    // ───────────────────────────────────────────────────────────────────────

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
            <div className="content" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
                {/* Header */}
                <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    marginBottom: "12px", padding: "12px 0", borderBottom: "1px solid #e5e7eb",
                    flexWrap: "wrap", gap: "10px"
                }}>
                    <div>
                        <h1 style={{ fontSize: "20px", margin: 0, fontWeight: 700 }}>
                            {isLifeGroupChecker && recordMode === "tribe" && selectedLeaderName
                                ? `Life Group: ${selectedLeaderName}`
                                : isLifeGroupChecker && recordMode === "whole_tribe"
                                    ? `Life Group: Whole ${assignedTribe}`
                                    : "Life Group Recording"}
                        </h1>
                        <p style={{ opacity: 0.7, margin: "2px 0 0 0", fontSize: "12px" }}>
                            Welcome, <strong>{user.firstname} {user.lastname}</strong> • {user.tribe}
                            {isLifeGroupChecker && (
                                <span style={{
                                    marginLeft: "8px", padding: "2px 8px", borderRadius: "10px",
                                    background: "#fef3c7", color: "#92400e", fontSize: "10px", fontWeight: 700
                                }}>
                                    LG Checker — {assignedTribe}
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
                                + Record Life Group
                            </button>
                        )}
                    </div>
                </div>

                {/* Mode Selector */}
                {isLifeGroupChecker && (
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
                                    const labels = { self: "Myself", tribe: `Someone in ${assignedTribe}`, whole_tribe: `Whole ${assignedTribe}` };
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

                        <div style={{ overflowX: "auto", border: "1px solid #000" }}>
                            <table style={{ width: "100%", fontSize: "11px", borderCollapse: "collapse", minWidth: "750px" }}>
                                <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                                    <tr>
                                        <th style={ETH({ textAlign: "left", width: "220px" })}>MEMBER</th>
                                        <th style={ETH({ width: "90px" })}>THIS MONTH</th>
                                        <th style={ETH({ width: "70px" })}>TARGET</th>
                                        <th style={ETH({ width: "110px" })}>STATUS</th>
                                        <th style={ETH({ width: "100px" })}>TOTAL RECORDS</th>
                                        <th style={ETH({ width: "120px" })}>CONSISTENT MONTHS</th>
                                        <th style={ETH({ width: "110px" })}>INCONSISTENT</th>
                                        <th style={ETH({ width: "110px" })}>ACTION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {wholeTribeStats.map((member) => (
                                        <tr key={member.leaderId}
                                            style={{ cursor: "pointer", transition: "background 0.15s" }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = "#fef9c3"}
                                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                                            <td style={ETD({ textAlign: "left", padding: "4px 6px", fontWeight: 600 })}>{member.name}</td>
                                            <td style={ETD({ fontWeight: 700, color: member.isConsistent ? "#16a34a" : "#dc2626" })}>{member.thisMonthCount}</td>
                                            <td style={ETD({ color: "#9ca3af" })}>3</td>
                                            <td style={ETD()}>
                                                <span style={{ padding: "2px 8px", borderRadius: "10px", background: member.statusBg, color: member.statusColor, fontSize: "10px", fontWeight: 700 }}>{member.status}</span>
                                            </td>
                                            <td style={ETD({ color: "#6b7280" })}>{member.totalRecords}</td>
                                            <td style={ETD({ color: "#16a34a", fontWeight: 600 })}>{member.consistentMonths}</td>
                                            <td style={ETD({ color: "#dc2626" })}>{member.inconsistentMonths}</td>
                                            <td style={ETD()}>
                                                <button onClick={() => handleSelectLeaderFromTable(member.leaderId)}
                                                    style={{ padding: "3px 10px", borderRadius: "6px", border: "1px solid #c9a45c", background: "#fff", color: "#92400e", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
                                                    View / Record
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
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
                                    This Month ({now.toLocaleDateString("en-US", { month: "long" })})
                                </h3>
                                <h1 style={{ color: currentMonth ? currentMonth.statusColor : "#6b7280", fontSize: "22px", margin: 0 }}>
                                    {currentMonth ? currentMonth.count : 0}
                                </h1>
                                <p style={{ fontSize: "10px", marginTop: "2px", margin: 0, color: "#9ca3af" }}>Target: 3 per month</p>
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
                                <h3 style={{ fontSize: "11px", margin: "0 0 4px 0", color: "#6b7280", fontWeight: 500 }}>Total Records</h3>
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
                        }} className="lifegroup-columns">

                            {/* LEFT: Monthly Table */}
                            <div style={{
                                flex: "1 1 0", minWidth: "0", overflowY: "auto",
                                maxHeight: "calc(100vh - 260px)"
                            }} className="column-left">
                                {monthlyStats.length > 0 && (
                                    <div style={{ overflowX: "auto", border: "1px solid #000" }}>
                                        <table style={{ width: "100%", fontSize: "11px", borderCollapse: "collapse", minWidth: "400px" }}>
                                            <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                                                <tr>
                                                    <th style={ETH({ textAlign: "left", width: "180px" })}>MONTH</th>
                                                    <th style={ETH({ width: "80px" })}>RECORDS</th>
                                                    <th style={ETH({ width: "70px" })}>TARGET</th>
                                                    <th style={ETH({ width: "110px" })}>STATUS</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {monthlyStats.map((month) => (
                                                    <tr key={month.key}>
                                                        <td style={ETD({ textAlign: "left", padding: "4px 6px", fontWeight: 600 })}>{month.monthName}</td>
                                                        <td style={ETD({ fontWeight: 700 })}>{month.count}</td>
                                                        <td style={ETD({ color: "#9ca3af" })}>3</td>
                                                        <td style={ETD()}>
                                                            <span style={{ padding: "2px 8px", borderRadius: "10px", background: month.statusBg, color: month.statusColor, fontSize: "10px", fontWeight: 700 }}>
                                                                {month.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
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
                                            {filteredRecords.length} total
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
                                            ? `No life group records for ${selectedLeaderName} yet.`
                                            : "No life group records yet."}
                                    </p>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                        <div style={{ overflowX: "auto", border: "1px solid #000" }}>
                                            <table style={{ width: "100%", fontSize: "11px", borderCollapse: "collapse", minWidth: "400px" }}>
                                                <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                                                    <tr>
                                                        <th style={ETH({ textAlign: "left", width: "160px" })}>TOPIC</th>
                                                        <th style={ETH({ width: "80px" })}>TYPE</th>
                                                        <th style={ETH({ textAlign: "left", width: "120px" })}>PLACE</th>
                                                        <th style={ETH({ textAlign: "left", width: "120px" })}>EXHORTER</th>
                                                        <th style={ETH({ width: "110px" })}>DATE</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {displayedCards.map((record) => (
                                                        <tr key={record.id}>
                                                            <td style={ETD({ textAlign: "left", padding: "4px 6px", fontWeight: 600 })}>{record.topic}</td>
                                                            <td style={ETD()}>
                                                                <span style={{ padding: "2px 8px", borderRadius: "8px", background: "#fef3c7", color: "#92400e", fontSize: "10px", fontWeight: 600 }}>
                                                                    {record.type}
                                                                </span>
                                                            </td>
                                                            <td style={ETD({ textAlign: "left", padding: "4px 6px", color: "#6b7280" })}>📍 {record.place}</td>
                                                            <td style={ETD({ textAlign: "left", padding: "4px 6px", color: "#16a34a", fontWeight: 600 })}>{record.exhorter ? `🎤 ${record.exhorter}` : "—"}</td>
                                                            <td style={ETD({ color: "#9ca3af", fontSize: "10px" })}>
                                                                {new Date(record.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {filteredRecords.length > CARDS_PER_PAGE && (
                                            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", padding: "8px 0", flexShrink: 0 }}>
                                                <button onClick={() => setCardPage(p => Math.max(1, p - 1))} disabled={cardPage === 1}
                                                    style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid #d1d5db", background: cardPage === 1 ? "#f3f4f6" : "#fff", color: cardPage === 1 ? "#9ca3af" : "#374151", fontSize: "11px", fontWeight: 600, cursor: cardPage === 1 ? "not-allowed" : "pointer" }}>
                                                    ← Prev
                                                </button>
                                                <span style={{ fontSize: "11px", color: "#6b7280", fontWeight: 500, minWidth: "60px", textAlign: "center" }}>
                                                    Page {cardPage} of {totalCardPages}
                                                </span>
                                                <button onClick={() => setCardPage(p => Math.min(totalCardPages, p + 1))} disabled={cardPage === totalCardPages}
                                                    style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid #d1d5db", background: cardPage === totalCardPages ? "#f3f4f6" : "#fff", color: cardPage === totalCardPages ? "#9ca3af" : "#374151", fontSize: "11px", fontWeight: 600, cursor: cardPage === totalCardPages ? "not-allowed" : "pointer" }}>
                                                    Next →
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}</div>
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
                                    ? `Record Life Group for ${selectedLeaderName}`
                                    : "Record New Life Group"}
                            </h2>
                            <button onClick={() => setShowForm(false)}
                                style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#6b7280", padding: "4px", lineHeight: 1 }}>✕</button>
                        </div>
                        <div style={{ padding: "14px 18px 18px" }}>
                            {isLifeGroupChecker && recordMode === "tribe" && selectedLeaderId && (
                                <div style={{ padding: "8px 12px", background: "#fef3c7", borderRadius: "8px", marginBottom: "12px", border: "1px solid #fcd34d" }}>
                                    <p style={{ margin: 0, fontSize: "12px", color: "#92400e", fontWeight: 600 }}>📝 Recording for: {selectedLeaderName}</p>
                                </div>
                            )}
                            {isLifeGroupChecker && recordMode === "tribe" && !selectedLeaderId && (
                                <div style={{ padding: "8px 12px", background: "#fee2e2", borderRadius: "8px", marginBottom: "12px", border: "1px solid #fecaca" }}>
                                    <p style={{ margin: 0, fontSize: "12px", color: "#dc2626", fontWeight: 600 }}>⚠️ Please select a tribe member above before recording.</p>
                                </div>
                            )}
                            <form className="leader-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                <input type="text" placeholder="Topic" value={topic} onChange={(e) => setTopic(e.target.value)}
                                    style={{ padding: "8px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d1d5db" }} />
                                <input type="text" placeholder="Place" value={place} onChange={(e) => setPlace(e.target.value)}
                                    style={{ padding: "8px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d1d5db" }} />
                                <input type="text" placeholder="Type (e.g., 1on1, Community etc.)" value={type} onChange={(e) => setType(e.target.value)}
                                    style={{ padding: "8px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d1d5db" }} />
                                <input type="text" placeholder="Exhorter (Who shared/spoke)" value={exhorter} onChange={(e) => setExhorter(e.target.value)}
                                    style={{ padding: "8px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d1d5db" }} />
                                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                                    style={{ padding: "8px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d1d5db" }} />
                                <button type="submit" disabled={isLifeGroupChecker && recordMode === "tribe" && !selectedLeaderId}
                                    style={{ marginTop: "4px", padding: "8px", fontSize: "13px", opacity: isLifeGroupChecker && recordMode === "tribe" && !selectedLeaderId ? 0.5 : 1, cursor: isLifeGroupChecker && recordMode === "tribe" && !selectedLeaderId ? "not-allowed" : "pointer" }}>
                                    {loading ? "Recording..." : "Record Life Group"}
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
                            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Tribe Life Group Report</h2>
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
                                        {reportYearOptions.map((yr) => (<option key={yr} value={yr}>{yr}</option>))}
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
                                Per month: <strong style={{ color: "#16a34a" }}>Consistent</strong> (≥{CONSISTENT_TARGET} sessions),{" "}
                                <strong style={{ color: "#b45309" }}>Occasional</strong> (1–{CONSISTENT_TARGET - 1} sessions),{" "}
                                <strong style={{ color: "#dc2626" }}>Inconsistent</strong> (0 sessions / no record).
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
                                                                            {mc.status} ({mc.count})
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
                    .lifegroup-columns {
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

export default LifeGroup;