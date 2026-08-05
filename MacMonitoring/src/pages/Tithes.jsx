import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";
import { getCurrentUser, isAdmin, isFinance } from "../utils/auth";
import { tribes } from "../constants/options";
import Swal from "sweetalert2";
import * as XLSX from "xlsx-js-style";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ── Excel-style table tokens ─────────────────────────────────────────────────
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

const EIN = {
    width: "100%",
    padding: "4px 2px",
    fontSize: "11px",
    textAlign: "center",
    border: "none",
    outline: "none",
    background: "transparent",
    color: "#000",
    fontFamily: "inherit",
};

const onCellFocus = (e) => { e.target.style.background = "#fef9c3"; };
const onCellBlur = (e) => { e.target.style.background = "transparent"; };

// ── Controlled, per-slot input. Re-keyed by month in the parent so React
//    always mounts a FRESH input when the month changes. ─────────────────────
function WeekSlotInput({ tithe, leaderId, monthKey, weekIndex, onCommit }) {
    const [value, setValue] = useState(tithe?.amount ?? "");

    useEffect(() => {
        setValue(tithe?.amount ?? "");
    }, [tithe?.id, tithe?.amount]);

    const commit = () => {
        if (tithe) {
            if (String(value) !== String(tithe.amount)) onCommit(leaderId, monthKey, value, tithe.id, weekIndex);
        } else if (value) {
            onCommit(leaderId, monthKey, value, null, weekIndex);
        }
    };

    return (
        <input
            type="number"
            value={value}
            placeholder=""
            onChange={e => setValue(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }}
            style={{
                ...EIN,
                fontWeight: tithe ? 600 : 400,
                color: tithe ? "#000" : "#9ca3af",
            }}
            onFocus={onCellFocus}
            onBlurCapture={onCellBlur}
        />
    );
}

// ── Monthly Gross Input for the Gross Manager tab ─────────────────────
function GrossInput({ leaderId, monthKey, defaultGross, monthlyGrossMap, onCommit }) {
    const override = monthlyGrossMap[`${leaderId}-${monthKey}`];
    const [value, setValue] = useState(override ?? "");
    const [hasOverride, setHasOverride] = useState(override !== undefined && override !== null);

    useEffect(() => {
        const ov = monthlyGrossMap[`${leaderId}-${monthKey}`];
        setValue(ov ?? "");
        setHasOverride(ov !== undefined && ov !== null);
    }, [monthKey, monthlyGrossMap, leaderId]);

    const commit = () => {
        const num = value === "" ? null : parseFloat(value);
        onCommit(leaderId, monthKey, num);
        setHasOverride(num !== null);
    };

    return (
        <div style={{ display: "flex", alignItems: "center", gap: "4px", justifyContent: "center", padding: "0 4px" }}>
            <input
                type="number"
                value={value}
                placeholder={defaultGross ? String(defaultGross) : "—"}
                onChange={e => setValue(e.target.value)}
                onBlur={commit}
                onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }}
                style={{
                    ...EIN,
                    textAlign: "right",
                    fontWeight: hasOverride ? 700 : 500,
                    background: hasOverride ? "#fef3c7" : "transparent",
                }}
                onFocus={onCellFocus}
                onBlurCapture={e => { onCellBlur(e); e.target.style.background = hasOverride ? "#fef3c7" : "transparent"; }}
            />
            {hasOverride && (
                <span title="Override active — click to clear"
                    onClick={() => { onCommit(leaderId, monthKey, null); setValue(""); setHasOverride(false); }}
                    style={{ cursor: "pointer", fontSize: "11px", color: "#b45309", fontWeight: 700 }}>
                    ✕
                </span>
            )}
        </div>
    );
}

function Tithes() {
    const navigate = useNavigate();
    const user = getCurrentUser();
    const [leaders, setLeaders] = useState([]);
    const [tithes, setTithes] = useState([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [filterTribe, setFilterTribe] = useState("ALL");
    const [sortOrder, setSortOrder] = useState("asc");
    const [activeTab, setActiveTab] = useState("month");

    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    });
    const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString());

    const [rangeStart, setRangeStart] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-01`;
    });
    const [rangeEnd, setRangeEnd] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    });

    const [monthlyGrossMap, setMonthlyGrossMap] = useState({});

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: leadersData, error: leadersError } = await supabase
            .from("tblMonitoring")
            .select("id, firstname, lastname, tribe, type, gross_income, civil_status, tithing_type, combined_with");
        if (leadersError) { console.error(leadersError); setLoading(false); return; }

        const { data: tithesData, error: tithesError } = await supabase
            .from("tblTithes").select("*").order("date", { ascending: true });
        if (tithesError) { console.error(tithesError); setLoading(false); return; }

        setLeaders(leadersData || []);
        setTithes(tithesData || []);
        buildMonthlyGrossMap(tithesData || []);
        setLoading(false);
    };

    const buildMonthlyGrossMap = (tithesData) => {
        const map = {};
        tithesData.forEach(t => {
            if (t.gross_income != null && t.date) {
                const mk = t.date.substring(0, 7);
                map[`${t.leader_id}-${mk}`] = t.gross_income;
            }
        });
        setMonthlyGrossMap(map);
    };

    const getEffectiveGross = (leader, monthKey) => {
        const override = monthlyGrossMap[`${leader.id}-${monthKey}`];
        if (override !== undefined && override !== null) return override;
        return leader.gross_income || 0;
    };

    const getMonthlyTithes = (leaderId, monthKey) =>
        tithes.filter(t => t.leader_id === leaderId && t.date?.startsWith(monthKey));

    const getMonthlyTotal = (leaderId, monthKey) =>
        getMonthlyTithes(leaderId, monthKey).reduce((s, t) => s + (Number(t.amount) || 0), 0);

    const getYearlyData = (leaderId, year) =>
        Array.from({ length: 12 }, (_, i) => {
            const monthKey = `${year}-${String(i + 1).padStart(2, "0")}`;
            return { monthKey, total: getMonthlyTotal(leaderId, monthKey) };
        });

    const isConsistent = (leader, monthTotal, monthKey) => {
        const gross = getEffectiveGross(leader, monthKey);
        if (!gross || gross <= 0) return false;
        return monthTotal >= gross * 0.1;
    };

    const getCombinedPartner = (leader) => {
        if (leader.tithing_type !== "Combined" || !leader.combined_with) return null;
        return leaders.find(l => l.id === leader.combined_with);
    };

    const getDisplayName = (leader) => {
        const partner = getCombinedPartner(leader);
        if (partner) {
            return `${leader.firstname} ${leader.lastname} / ${partner.firstname} ${partner.lastname}`;
        }
        return `${leader.firstname} ${leader.lastname}`;
    };

    const formatMonthLabel = (monthKey) => {
        const [y, m] = monthKey.split("-");
        return `${MONTH_SHORT[parseInt(m, 10) - 1]} ${y}`;
    };

    const getMonthsInRange = (start, end) => {
        const [sy, sm] = start.split("-").map(Number);
        const [ey, em] = end.split("-").map(Number);
        if (ey < sy || (ey === sy && em < sm)) return [];
        const months = [];
        let y = sy, m = sm;
        while (y < ey || (y === ey && m <= em)) {
            months.push(`${y}-${String(m).padStart(2, "0")}`);
            m++;
            if (m > 12) { m = 1; y++; }
        }
        return months;
    };

    const getElapsedMonthKeysForYear = (year) => {
        const y = parseInt(year, 10);
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        let maxMonth = 12;
        if (y === currentYear) maxMonth = currentMonth;
        else if (y > currentYear) maxMonth = 0;
        return Array.from({ length: maxMonth }, (_, i) => `${y}-${String(i + 1).padStart(2, "0")}`);
    };

    const computeLeaderReport = (monthKeys) => {
        const rows = [];
        filteredLeaders.forEach(leader => {
            const partner = getCombinedPartner(leader);
            if (partner && leader.combined_with < leader.id) return;

            let consistentCount = 0;
            let total = 0;
            const monthTotals = monthKeys.map(mk => {
                const t = getMonthlyTotal(leader.id, mk) + (partner ? getMonthlyTotal(partner.id, mk) : 0);
                if (isConsistent(leader, t, mk)) consistentCount++;
                total += t;
                return t;
            });

            rows.push({ leader, partner, monthTotals, total, consistentCount, totalMonths: monthKeys.length });
        });
        return rows;
    };

    const handleTitheEntry = async (leaderId, monthKey, amount, existingId = null, weekIndex) => {
        if (!amount || isNaN(amount) || amount <= 0) {
            if (existingId) {
                await supabase.from("tblTithes").delete().eq("id", existingId);
                setTithes(prev => prev.filter(t => t.id !== existingId));
            }
            return;
        }
        const date = `${monthKey}-01`;
        if (existingId) {
            const { error } = await supabase.from("tblTithes")
                .update({ amount: parseFloat(amount) }).eq("id", existingId);
            if (!error) setTithes(prev => prev.map(t =>
                t.id === existingId ? { ...t, amount: parseFloat(amount) } : t));
        } else {
            const { data, error } = await supabase.from("tblTithes")
                .insert([{ leader_id: leaderId, amount: parseFloat(amount), date, week_number: weekIndex + 1 }])
                .select();
            if (!error && data) setTithes(prev => [...prev, data[0]]);
        }
    };

    const handleGrossOverride = async (leaderId, monthKey, grossValue) => {
        const date = `${monthKey}-01`;
        const { data: existing } = await supabase
            .from("tblTithes")
            .select("id, amount")
            .eq("leader_id", leaderId)
            .eq("date", date)
            .maybeSingle();

        if (existing) {
            const { error } = await supabase
                .from("tblTithes")
                .update({ gross_income: grossValue })
                .eq("id", existing.id);
            if (!error) {
                setTithes(prev => prev.map(t => t.id === existing.id ? { ...t, gross_income: grossValue } : t));
                setMonthlyGrossMap(prev => {
                    const next = { ...prev };
                    if (grossValue === null) delete next[`${leaderId}-${monthKey}`];
                    else next[`${leaderId}-${monthKey}`] = grossValue;
                    return next;
                });
            }
        } else if (grossValue !== null) {
            const { data, error } = await supabase
                .from("tblTithes")
                .insert([{ leader_id: leaderId, amount: 0, date, gross_income: grossValue }])
                .select();
            if (!error && data) {
                setTithes(prev => [...prev, data[0]]);
                setMonthlyGrossMap(prev => ({ ...prev, [`${leaderId}-${monthKey}`]: grossValue }));
            }
        }
    };

    const filteredLeaders = useMemo(() => {
        let result = [...leaders];
        if (filterTribe !== "ALL") result = result.filter(l => l.tribe === filterTribe);
        if (search) {
            const term = search.toLowerCase();
            result = result.filter(l => {
                const fullName = `${l.firstname} ${l.lastname}`.toLowerCase();
                const partner = getCombinedPartner(l);
                if (partner) {
                    const partnerName = `${partner.firstname} ${partner.lastname}`.toLowerCase();
                    const combinedName = `${l.firstname} / ${partner.firstname}`.toLowerCase();
                    return fullName.includes(term) || partnerName.includes(term) || combinedName.includes(term);
                }
                return fullName.includes(term);
            });
        }
        result.sort((a, b) => {
            const na = `${a.firstname} ${a.lastname}`.toLowerCase();
            const nb = `${b.firstname} ${b.lastname}`.toLowerCase();
            return sortOrder === "asc" ? na.localeCompare(nb) : nb.localeCompare(na);
        });
        return result;
    }, [leaders, filterTribe, search, sortOrder]);

    const stats = useMemo(() => {
        const consistent = [], inconsistent = [];
        filteredLeaders.forEach(leader => {
            const partner = getCombinedPartner(leader);
            if (partner && leader.combined_with < leader.id) return;
            let total = getMonthlyTotal(leader.id, selectedMonth);
            if (partner) total += getMonthlyTotal(partner.id, selectedMonth);
            (isConsistent(leader, total, selectedMonth) ? consistent : inconsistent).push({ ...leader, displayTotal: total });
        });
        return { consistent, inconsistent };
    }, [filteredLeaders, tithes, selectedMonth, monthlyGrossMap]);

    const rangeMonths = useMemo(() => getMonthsInRange(rangeStart, rangeEnd), [rangeStart, rangeEnd]);
    const rangeRows = useMemo(
        () => computeLeaderReport(rangeMonths),
        [filteredLeaders, tithes, rangeMonths, monthlyGrossMap]
    );

    const handleExport = () => {
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
        const dataCell = {
            font: { sz: 11, color: { rgb: "374151" } },
            border: {
                top: { style: "thin", color: { rgb: "E5E7EB" } },
                bottom: { style: "thin", color: { rgb: "E5E7EB" } },
                left: { style: "thin", color: { rgb: "E5E7EB" } },
                right: { style: "thin", color: { rgb: "E5E7EB" } }
            }
        };
        const dataCellCenter = { ...dataCell, alignment: { horizontal: "center" } };
        const altRowCenter = { fill: { fgColor: { rgb: "F9FAFB" }, patternType: "solid" }, ...dataCellCenter };
        const consistentStyle = {
            font: { sz: 11, color: { rgb: "16A34A" }, bold: true }, alignment: { horizontal: "center" },
            border: dataCell.border, fill: { fgColor: { rgb: "ECFDF5" }, patternType: "solid" }
        };
        const inconsistentStyle = {
            font: { sz: 11, color: { rgb: "DC2626" }, bold: true }, alignment: { horizontal: "center" },
            border: dataCell.border, fill: { fgColor: { rgb: "FEF2F2" }, patternType: "solid" }
        };
        const overrideStyle = {
            font: { sz: 11, color: { rgb: "92400E" }, bold: true }, alignment: { horizontal: "center" },
            border: dataCell.border, fill: { fgColor: { rgb: "FEF3C7" }, patternType: "solid" }
        };
        const titleStyle = { font: { bold: true, color: { rgb: "B8934A" }, sz: 18 }, alignment: { horizontal: "center" } };
        const subtitleStyle = { font: { sz: 10, color: { rgb: "6B7280" } }, alignment: { horizontal: "center" } };
        const totalStyle = {
            font: { bold: true, color: { rgb: "374151" }, sz: 12 },
            fill: { fgColor: { rgb: "F3F4F6" }, patternType: "solid" },
            border: dataCell.border
        };
        const goldRankStyle = {
            font: { sz: 12, color: { rgb: "92400E" }, bold: true }, alignment: { horizontal: "center" },
            border: dataCell.border, fill: { fgColor: { rgb: "FDF6E8" }, patternType: "solid" }
        };
        const silverRankStyle = {
            font: { sz: 12, color: { rgb: "374151" }, bold: true }, alignment: { horizontal: "center" },
            border: dataCell.border, fill: { fgColor: { rgb: "F3F4F6" }, patternType: "solid" }
        };
        const bronzeRankStyle = {
            font: { sz: 12, color: { rgb: "9A3412" }, bold: true }, alignment: { horizontal: "center" },
            border: dataCell.border, fill: { fgColor: { rgb: "FDF2E9" }, patternType: "solid" }
        };

        const styleDataRows = (ws, startRow, numRows, numCols, colResolvers = {}) => {
            for (let i = 0; i < numRows; i++) {
                const r = startRow + i;
                const isAlt = i % 2 === 1;
                for (let c = 0; c < numCols; c++) {
                    const cell = XLSX.utils.encode_cell({ r, c });
                    if (!ws[cell]) continue;
                    if (colResolvers[c]) {
                        ws[cell].s = colResolvers[c](ws[cell].v, i);
                    } else {
                        ws[cell].s = isAlt ? altRowCenter : dataCellCenter;
                    }
                }
            }
        };

        const styleHeaderRow = (ws, row, numCols) => {
            for (let c = 0; c < numCols; c++) {
                const cell = XLSX.utils.encode_cell({ r: row, c });
                if (ws[cell]) ws[cell].s = goldHeader;
            }
        };

        const styleTitleBlock = (ws, numCols) => {
            ws["!merges"] = ws["!merges"] || [];
            for (let r = 0; r < 4; r++) {
                const cell = XLSX.utils.encode_cell({ r, c: 0 });
                if (ws[cell]) {
                    ws[cell].s = r === 0 ? titleStyle : subtitleStyle;
                    ws["!merges"].push({ s: { r, c: 0 }, e: { r, c: numCols - 1 } });
                }
            }
        };

        const leftAlignNameColumn = (ws, startRow, numRows, col = 1) => {
            for (let i = 0; i < numRows; i++) {
                const cell = XLSX.utils.encode_cell({ r: startRow + i, c: col });
                if (ws[cell]) ws[cell].s = { ...ws[cell].s, alignment: { horizontal: "left" } };
            }
        };

        if (activeTab === "month") {
            const numCols = 12;
            const wsData = [
                ["MAC TLDA CHURCH"],
                ["Combined Tithes Record"],
                [`Period: ${selectedMonth}`],
                [`Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`],
                [],
                ["No.", "Full Name", "Gross Income", "Week 1", "Week 2", "Week 3", "Week 4", "Total Tithes", "Expected (10%)", "Variance", "Status", "Remarks"]
            ];

            let rowNum = 1;
            filteredLeaders.forEach(leader => {
                const partner = getCombinedPartner(leader);
                if (partner && leader.combined_with < leader.id) return;
                const monthlyTithes = getMonthlyTithes(leader.id, selectedMonth);
                let total = getMonthlyTotal(leader.id, selectedMonth);
                if (partner) total += getMonthlyTotal(partner.id, selectedMonth);
                const gross = getEffectiveGross(leader, selectedMonth);
                const expected = gross * 0.1;
                const variance = total - expected;
                const consistent = isConsistent(leader, total, selectedMonth);
                const slots = Array.from({ length: 4 }, (_, i) => monthlyTithes[i]?.amount || 0);
                wsData.push([
                    rowNum++, getDisplayName(leader), gross || "—",
                    slots[0] || "—", slots[1] || "—", slots[2] || "—", slots[3] || "—",
                    total || "—", expected ? expected.toFixed(2) : "—", variance ? variance.toFixed(2) : "—",
                    consistent ? "CONSISTENT" : "INCONSISTENT",
                    consistent ? "Faithful" : (gross > 0 ? "Below 10%" : "No gross set")
                ]);
            });
            const dataRowCount = rowNum - 1;
            wsData.push([]);
            wsData.push(["", "", "", "", "", "", "", "TOTAL CONSISTENT", stats.consistent.length, "", "", ""]);
            wsData.push(["", "", "", "", "", "", "", "TOTAL INCONSISTENT", stats.inconsistent.length, "", "", ""]);
            wsData.push(["", "", "", "", "", "", "", "GRAND TOTAL", dataRowCount, "", "", ""]);
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            ws["!cols"] = [{ wch: 6 }, { wch: 35 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 20 }];
            styleTitleBlock(ws, numCols);
            styleHeaderRow(ws, 5, numCols);
            styleDataRows(ws, 6, dataRowCount, numCols, { 10: (val) => val === "CONSISTENT" ? consistentStyle : inconsistentStyle });
            leftAlignNameColumn(ws, 6, dataRowCount);
            const summaryStart = 6 + dataRowCount + 1;
            for (let r = summaryStart; r <= summaryStart + 2; r++) {
                for (let c = 0; c < numCols; c++) {
                    const cell = XLSX.utils.encode_cell({ r, c });
                    if (ws[cell]) ws[cell].s = totalStyle;
                }
            }
            XLSX.utils.book_append_sheet(wb, ws, "Monthly Report");

        } else if (activeTab === "range") {
            const numCols = rangeMonths.length + 4;
            const wsData = [
                ["MAC TLDA CHURCH"],
                ["Custom Range Tithes Report"],
                [`Period: ${rangeMonths.length ? `${formatMonthLabel(rangeMonths[0])} – ${formatMonthLabel(rangeMonths[rangeMonths.length - 1])}` : "Invalid range"}`],
                [`Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`],
                [],
                ["No.", "Full Name", ...rangeMonths.map(formatMonthLabel), "Total", "Consistent Months", "Rate"]
            ];
            let rowNum = 1;
            rangeRows.forEach(({ leader, monthTotals, total, consistentCount, totalMonths }) => {
                wsData.push([
                    rowNum++, getDisplayName(leader),
                    ...monthTotals.map(t => t > 0 ? t : "—"),
                    total > 0 ? total : "—",
                    `${consistentCount}/${totalMonths}`,
                    totalMonths > 0 ? `${((consistentCount / totalMonths) * 100).toFixed(0)}%` : "—"
                ]);
            });
            const dataRowCount = rowNum - 1;
            const consistentCol = 2 + rangeMonths.length + 1;
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            ws["!cols"] = [{ wch: 6 }, { wch: 30 }, ...rangeMonths.map(() => ({ wch: 11 })), { wch: 12 }, { wch: 16 }, { wch: 10 }];
            styleTitleBlock(ws, numCols);
            styleHeaderRow(ws, 5, numCols);
            styleDataRows(ws, 6, dataRowCount, numCols, {
                [consistentCol]: (val) => {
                    const [hit, of] = String(val).split("/").map(Number);
                    if (of === 0) return dataCellCenter;
                    if (hit === of) return consistentStyle;
                    if (hit >= of / 2) return { ...dataCellCenter, font: { ...dataCellCenter.font, color: { rgb: "92400E" } } };
                    return inconsistentStyle;
                }
            });
            leftAlignNameColumn(ws, 6, dataRowCount);
            XLSX.utils.book_append_sheet(wb, ws, "Custom Range Report");

        } else if (activeTab === "year") {
            const numCols = 17;
            const wsData = [
                ["MAC TLDA CHURCH"],
                ["Combined Tithes Record"],
                [`Period: ${selectedYear}`],
                [`Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`],
                [],
                ["No.", "Full Name", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Total", "Consistent", "Status"]
            ];
            let rowNum = 1;
            const monthlyTotals = Array(12).fill(0);
            filteredLeaders.forEach(leader => {
                const partner = getCombinedPartner(leader);
                if (partner && leader.combined_with < leader.id) return;
                const yearly = getYearlyData(leader.id, selectedYear);
                let consistentMonths = 0;
                const monthTotals = yearly.map((y, i) => {
                    const mk = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
                    const t = y.total + (partner ? getMonthlyTotal(partner.id, mk) : 0);
                    if (isConsistent(leader, t, mk)) consistentMonths++;
                    monthlyTotals[i] += t;
                    return t;
                });
                const yearTotal = monthTotals.reduce((a, b) => a + b, 0);
                const status = consistentMonths >= 10 ? "EXCELLENT" : consistentMonths >= 7 ? "GOOD" : consistentMonths >= 4 ? "FAIR" : "NEEDS ATTENTION";
                wsData.push([rowNum++, getDisplayName(leader), ...monthTotals.map(t => t > 0 ? t : "—"), yearTotal > 0 ? yearTotal : "—", `${consistentMonths}/12`, status]);
            });
            const dataRowCount = rowNum - 1;
            const grandTotal = monthlyTotals.reduce((a, b) => a + b, 0);
            wsData.push([]);
            wsData.push(["", "TOTAL", ...monthlyTotals.map(t => t > 0 ? t : "—"), grandTotal > 0 ? grandTotal : "—", "", ""]);
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            ws["!cols"] = [{ wch: 6 }, { wch: 30 }, ...Array(12).fill({ wch: 10 }), { wch: 12 }, { wch: 12 }, { wch: 16 }];
            const statusColorMap = { EXCELLENT: consistentStyle, GOOD: consistentStyle, FAIR: inconsistentStyle, "NEEDS ATTENTION": inconsistentStyle };
            styleTitleBlock(ws, numCols);
            styleHeaderRow(ws, 5, numCols);
            styleDataRows(ws, 6, dataRowCount, numCols, { 16: (val) => statusColorMap[val] || dataCellCenter });
            leftAlignNameColumn(ws, 6, dataRowCount);
            const summaryRow = 6 + dataRowCount + 1;
            for (let c = 0; c < numCols; c++) {
                const cell = XLSX.utils.encode_cell({ r: summaryRow, c });
                if (ws[cell]) ws[cell].s = totalStyle;
            }
            XLSX.utils.book_append_sheet(wb, ws, "Annual Report");

            const elapsedMonths = getElapsedMonthKeysForYear(selectedYear);
            if (elapsedMonths.length > 0) {
                const boardRows = computeLeaderReport(elapsedMonths)
                    .map(r => ({ ...r, percent: r.totalMonths > 0 ? (r.consistentCount / r.totalMonths) * 100 : 0 }))
                    .sort((a, b) => {
                        if (b.consistentCount !== a.consistentCount) return b.consistentCount - a.consistentCount;
                        if (b.percent !== a.percent) return b.percent - a.percent;
                        if (b.total !== a.total) return b.total - a.total;
                        return getDisplayName(a.leader).localeCompare(getDisplayName(b.leader));
                    });
                const lbNumCols = 6;
                const lbData = [
                    ["MAC TLDA CHURCH"],
                    ["Consistency Leaderboard"],
                    [`Period: ${formatMonthLabel(elapsedMonths[0])} – ${formatMonthLabel(elapsedMonths[elapsedMonths.length - 1])} (${elapsedMonths.length} of 12 months)`],
                    [`Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`],
                    [],
                    ["Rank", "Full Name", "Tribe", "Months Consistent", "Consistency Rate", "Total Given"]
                ];
                boardRows.forEach((row, i) => {
                    lbData.push([i + 1, getDisplayName(row.leader), row.leader.tribe || "—", `${row.consistentCount}/${row.totalMonths}`, `${row.percent.toFixed(0)}%`, row.total > 0 ? row.total : "—"]);
                });
                const lbDataRowCount = boardRows.length;
                const lbWs = XLSX.utils.aoa_to_sheet(lbData);
                lbWs["!cols"] = [{ wch: 8 }, { wch: 32 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 14 }];
                styleTitleBlock(lbWs, lbNumCols);
                styleHeaderRow(lbWs, 5, lbNumCols);
                styleDataRows(lbWs, 6, lbDataRowCount, lbNumCols, {
                    0: (val) => val === 1 ? goldRankStyle : val === 2 ? silverRankStyle : val === 3 ? bronzeRankStyle : dataCellCenter
                });
                leftAlignNameColumn(lbWs, 6, lbDataRowCount);
                XLSX.utils.book_append_sheet(wb, lbWs, "Leaderboard");
            }

        } else {
            const numCols = 7;
            const [year, month] = selectedMonth.split("-");
            const monthName = MONTH_NAMES[parseInt(month) - 1];
            const wsData = [
                ["MAC TLDA CHURCH"],
                ["Monthly Gross Income Record"],
                [`Period: ${monthName} ${year}`],
                [`Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`],
                [],
                ["No.", "Full Name", "Default Gross", "Monthly Override", "Effective Gross", "Source", "Notes"]
            ];
            let rowNum = 1;
            filteredLeaders.forEach(leader => {
                const partner = getCombinedPartner(leader);
                if (partner && leader.combined_with < leader.id) return;
                const defaultGross = leader.gross_income || 0;
                const effectiveGross = getEffectiveGross(leader, selectedMonth);
                const hasOv = monthlyGrossMap[`${leader.id}-${selectedMonth}`] !== undefined;
                wsData.push([rowNum++, getDisplayName(leader), defaultGross || "—", hasOv ? (monthlyGrossMap[`${leader.id}-${selectedMonth}`] || 0) : "—", effectiveGross || "—", hasOv ? "OVERRIDE" : "DEFAULT", partner ? "Combined tithing partner" : "Individual"]);
            });
            const dataRowCount = rowNum - 1;
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            ws["!cols"] = [{ wch: 6 }, { wch: 35 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 25 }];
            styleTitleBlock(ws, numCols);
            styleHeaderRow(ws, 5, numCols);
            styleDataRows(ws, 6, dataRowCount, numCols, { 5: (val) => val === "OVERRIDE" ? overrideStyle : dataCellCenter });
            leftAlignNameColumn(ws, 6, dataRowCount);
            XLSX.utils.book_append_sheet(wb, ws, "Gross Record");
        }

        const filename = activeTab === "month" ? `MAC_Tithes_Monthly_${selectedMonth}.xlsx` : activeTab === "range" ? `MAC_Tithes_Range_${rangeStart}_to_${rangeEnd}.xlsx` : activeTab === "year" ? `MAC_Tithes_Annual_${selectedYear}.xlsx` : `MAC_Gross_${selectedMonth}.xlsx`;
        XLSX.writeFile(wb, filename);
        Swal.fire({ icon: "success", title: "Report Exported", text: activeTab === "year" ? "Church report downloaded, including the Leaderboard sheet." : "Church report downloaded successfully.", timer: 2200, showConfirmButton: false });
    };

    const [year, month] = selectedMonth.split("-");
    const monthLabel = MONTH_NAMES[parseInt(month, 10) - 1]?.toUpperCase() ?? "";
    const SLOT_COUNT = 4;

    if (!user) return (
        <div className="layout">
            <div className="content" style={{ textAlign: "center", paddingTop: "100px" }}>
                <h2>Please login to access Tithes.</h2>
            </div>
        </div>
    );

    return (
        <div className="layout">
            <Sidebar />
            <div className="content">

                {/* ── STATS ROW ─────────────────────────────── */}
                <div style={{ display: "flex", gap: "12px", marginBottom: "20px", alignItems: "stretch", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: "160px", padding: "16px 20px", borderRadius: "10px", background: "#ecfdf5", border: "2px solid #bbf7d0" }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Consistent</div>
                        <div style={{ fontSize: "30px", fontWeight: 800, color: "#16a34a" }}>{stats.consistent.length}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: "160px", padding: "16px 20px", borderRadius: "10px", background: "#fef2f2", border: "2px solid #fecaca" }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Inconsistent</div>
                        <div style={{ fontSize: "30px", fontWeight: 800, color: "#dc2626" }}>{stats.inconsistent.length}</div>
                    </div>
                </div>

                {/* ── TABS ─────────────────────────────────────────────────── */}
                <div style={{ display: "flex", gap: "4px", marginBottom: "16px", background: "#f3f4f6", borderRadius: "10px", padding: "4px", width: "fit-content", flexWrap: "wrap" }}>
                    {["month", "range", "year", "gross"].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} style={{
                            padding: "8px 22px", borderRadius: "8px", border: "none", fontSize: "13px", cursor: "pointer",
                            fontWeight: activeTab === tab ? 700 : 500,
                            background: activeTab === tab ? "#fff" : "transparent",
                            color: activeTab === tab ? "#b8934a" : "#6b7280",
                            boxShadow: activeTab === tab ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                            transition: "all 0.2s"
                        }}>
                            {tab === "month" ? "Whole Month" : tab === "range" ? "Custom Range" : tab === "year" ? "Whole Year" : "Monthly Gross"}
                        </button>
                    ))}
                </div>

                {/* ── FILTERS ──────────────────────────────────────────────── */}
                <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
                    <input type="text" placeholder="Search name…" value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ flex: 1, minWidth: "150px", padding: "8px 12px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d1d5db", outline: "none" }} />
                    <select value={filterTribe} onChange={e => setFilterTribe(e.target.value)}
                        style={{ width: "130px", padding: "8px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #d1d5db" }}>
                        <option value="ALL">All Tribes</option>
                        {tribes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button onClick={() => setSortOrder(o => o === "asc" ? "desc" : "asc")}
                        style={{ padding: "8px 14px", borderRadius: "6px", border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
                        {sortOrder === "asc" ? "A–Z" : "Z–A"}
                    </button>
                    <button onClick={handleExport}
                        style={{ padding: "8px 14px", borderRadius: "6px", border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
                        📥 Export Report
                    </button>
                </div>

                {/* ════════════════════════════════════════════════════════════
                    WHOLE MONTH TAB  —  EXCEL-STYLE TABLE
                ════════════════════════════════════════════════════════════ */}
                {activeTab === "month" && (
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: "16px", color: "#111827" }}>WHOLE MONTH — {monthLabel} {year}</div>
                                <div style={{ fontSize: "11px", color: "#6b7280" }}>Record weekly tithes for the selected month.</div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", borderRadius: "6px", border: "1px solid #d1d5db", background: "#fff" }}>
                                <span style={{ fontSize: "14px" }}>📅</span>
                                <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                                    style={{ border: "none", outline: "none", fontSize: "13px", fontWeight: 600, color: "#111827", background: "transparent", cursor: "pointer" }} />
                            </div>
                        </div>

                        <div style={{ overflowX: "auto", border: "1px solid #000" }}>
                            <table style={{ width: "100%", fontSize: "11px", borderCollapse: "collapse", minWidth: "900px" }}>
                                <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                                    <tr>
                                        <th rowSpan={2} style={ETH({ width: "32px", verticalAlign: "middle" })}>NO.</th>
                                        <th rowSpan={2} style={ETH({ textAlign: "left", width: "220px", verticalAlign: "middle" })}>FULL NAME</th>
                                        <th colSpan={SLOT_COUNT} style={ETH({ borderBottom: "none" })}>{monthLabel}</th>
                                        <th rowSpan={2} style={ETH({ width: "90px", verticalAlign: "middle" })}>TOTAL</th>
                                        <th rowSpan={2} style={ETH({ width: "110px", verticalAlign: "middle" })}>GROSS INCOME</th>
                                        <th rowSpan={2} style={ETH({ width: "110px", verticalAlign: "middle" })}>STATUS</th>
                                    </tr>
                                    <tr>
                                        {Array.from({ length: SLOT_COUNT }).map((_, i) => (
                                            <th key={i} style={ETH({ paddingTop: "2px", minWidth: "80px" })}>WEEK {i + 1}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={SLOT_COUNT + 5} style={{ padding: "30px", textAlign: "center", color: "#9ca3af", border: "1px solid #000" }}>Loading…</td></tr>
                                    ) : filteredLeaders.length === 0 ? (
                                        <tr><td colSpan={SLOT_COUNT + 5} style={{ padding: "30px", textAlign: "center", color: "#9ca3af", border: "1px solid #000" }}>No members found.</td></tr>
                                    ) : filteredLeaders.map((leader, idx) => {
                                        const partner = getCombinedPartner(leader);
                                        if (partner && leader.combined_with < leader.id) return null;
                                        const monthlyTithes = getMonthlyTithes(leader.id, selectedMonth);
                                        let displayTotal = getMonthlyTotal(leader.id, selectedMonth);
                                        if (partner) displayTotal += getMonthlyTotal(partner.id, selectedMonth);
                                        const effectiveGross = getEffectiveGross(leader, selectedMonth);
                                        const consistent = isConsistent(leader, displayTotal, selectedMonth);
                                        const slots = Array.from({ length: SLOT_COUNT }, (_, i) => monthlyTithes.find(t => t.week_number === i + 1) ?? null);
                                        return (
                                            <tr key={leader.id}>
                                                <td style={ETD({ fontWeight: 700 })}>{idx + 1}</td>
                                                <td style={ETD({ textAlign: "left", padding: "4px 6px", fontWeight: 600 })}>
                                                    {getDisplayName(leader)}
                                                    {partner && <span style={{ display: "block", fontSize: "9px", color: "#6b7280", fontWeight: 400 }}>Combined tithing</span>}
                                                </td>
                                                {slots.map((tithe, i) => (
                                                    <td key={`${selectedMonth}-${i}`} style={ETD()}>
                                                        <WeekSlotInput
                                                            key={`${selectedMonth}-${leader.id}-${i}-${tithe?.id ?? "empty"}`}
                                                            tithe={tithe} leaderId={leader.id} monthKey={selectedMonth} weekIndex={i} onCommit={handleTitheEntry}
                                                        />
                                                    </td>
                                                ))}
                                                <td style={ETD({ fontWeight: 800, fontSize: "12px" })}>{displayTotal > 0 ? displayTotal.toLocaleString() : "—"}</td>
                                                <td style={ETD({ fontWeight: 600 })} title={effectiveGross ? `10% minimum: ${(effectiveGross * 0.1).toLocaleString()}` : ""}>
                                                    {effectiveGross ? Number(effectiveGross).toLocaleString() : "—"}
                                                    {monthlyGrossMap[`${leader.id}-${selectedMonth}`] !== undefined && (
                                                        <span style={{ display: "block", fontSize: "9px", color: "#b45309", fontWeight: 700 }}>OVERRIDE</span>
                                                    )}
                                                </td>
                                                <td style={ETD({ background: consistent ? "#dcfce7" : "#fee2e2", color: consistent ? "#16a34a" : "#dc2626", fontWeight: 700 })}>
                                                    {consistent ? "Consistent" : "Inconsistent"}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ════════════════════════════════════════════════════════════
                    CUSTOM RANGE TAB  —  EXCEL-STYLE TABLE
                ════════════════════════════════════════════════════════════ */}
                {activeTab === "range" && (
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "12px" }}>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: "16px", color: "#111827" }}>CUSTOM RANGE</div>
                                <div style={{ fontSize: "11px", color: "#6b7280" }}>Pick any span of months.</div>
                            </div>
                            <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                    <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "#6b7280" }}>From</span>
                                    <input type="month" value={rangeStart} onChange={e => setRangeStart(e.target.value)}
                                        style={{ padding: "6px 10px", fontSize: "13px", fontWeight: 600, borderRadius: "6px", border: "1px solid #d1d5db", color: "#111827" }} />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                    <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "#6b7280" }}>To</span>
                                    <input type="month" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)}
                                        style={{ padding: "6px 10px", fontSize: "13px", fontWeight: 600, borderRadius: "6px", border: "1px solid #d1d5db", color: "#111827" }} />
                                </div>
                            </div>
                        </div>

                        {rangeMonths.length === 0 ? (
                            <div style={{ padding: "30px", textAlign: "center", color: "#dc2626", fontSize: "13px", fontWeight: 600, border: "1px solid #000" }}>
                                "To" month must be the same as or after "From" month.
                            </div>
                        ) : (
                            <div style={{ overflowX: "auto", border: "1px solid #000" }}>
                                <table style={{ width: "100%", fontSize: "11px", borderCollapse: "collapse", minWidth: `${400 + rangeMonths.length * 80}px` }}>
                                    <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                                        <tr>
                                            <th style={ETH({ textAlign: "left", width: "40px" })}>NO.</th>
                                            <th style={ETH({ textAlign: "left", width: "220px" })}>FULL NAME</th>
                                            {rangeMonths.map((mk) => (
                                                <th key={mk} style={ETH({ minWidth: "80px" })}>{formatMonthLabel(mk)}</th>
                                            ))}
                                            <th style={ETH({ width: "90px" })}>TOTAL</th>
                                            <th style={ETH({ width: "110px" })}>CONSISTENT</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan={rangeMonths.length + 4} style={{ padding: "30px", textAlign: "center", color: "#9ca3af", border: "1px solid #000" }}>Loading…</td></tr>
                                        ) : rangeRows.length === 0 ? (
                                            <tr><td colSpan={rangeMonths.length + 4} style={{ padding: "30px", textAlign: "center", color: "#9ca3af", border: "1px solid #000" }}>No members found.</td></tr>
                                        ) : rangeRows.map(({ leader, monthTotals, total, consistentCount, totalMonths }, idx) => (
                                            <tr key={leader.id}>
                                                <td style={ETD({ fontWeight: 700 })}>{idx + 1}</td>
                                                <td style={ETD({ textAlign: "left", padding: "4px 6px", fontWeight: 600 })}>{getDisplayName(leader)}</td>
                                                {monthTotals.map((amt, i) => {
                                                    const mc = isConsistent(leader, amt, rangeMonths[i]);
                                                    return (
                                                        <td key={i} style={ETD({
                                                            fontWeight: amt > 0 ? 700 : 400,
                                                            color: amt > 0 ? "#000" : "#9ca3af",
                                                            background: amt > 0 && !mc ? "#fee2e2" : "#fff"
                                                        })}>{amt > 0 ? amt.toLocaleString() : "—"}</td>
                                                    );
                                                })}
                                                <td style={ETD({ fontWeight: 800, fontSize: "12px" })}>{total > 0 ? total.toLocaleString() : "—"}</td>
                                                <td style={ETD({
                                                    background: consistentCount === totalMonths ? "#dcfce7" : consistentCount >= totalMonths / 2 ? "#fef3c7" : "#fee2e2",
                                                    color: consistentCount === totalMonths ? "#16a34a" : consistentCount >= totalMonths / 2 ? "#92400e" : "#dc2626",
                                                    fontWeight: 700
                                                })}>{consistentCount}/{totalMonths}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ════════════════════════════════════════════════════════════
                    WHOLE YEAR TAB  —  EXCEL-STYLE TABLE
                ════════════════════════════════════════════════════════════ */}
                {activeTab === "year" && (
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: "16px", color: "#111827" }}>WHOLE YEAR — {selectedYear}</div>
                                <div style={{ fontSize: "11px", color: "#6b7280" }}>Monthly tithe totals for the selected year. Export includes a Leaderboard sheet.</div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
                                <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "#6b7280" }}>Year Picker</span>
                                <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
                                    style={{ padding: "6px 12px", fontSize: "13px", fontWeight: 600, borderRadius: "6px", border: "1px solid #d1d5db", color: "#111827", background: "#fff", cursor: "pointer" }}>
                                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        </div>

                        <div style={{ overflowX: "auto", border: "1px solid #000" }}>
                            <table style={{ width: "100%", fontSize: "11px", borderCollapse: "collapse", minWidth: "1000px" }}>
                                <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                                    <tr>
                                        <th style={ETH({ textAlign: "left", width: "40px" })}>NO.</th>
                                        <th style={ETH({ textAlign: "left", width: "220px" })}>FULL NAME</th>
                                        {MONTH_SHORT.map((m) => (
                                            <th key={m} style={ETH({ minWidth: "70px" })}>{m}</th>
                                        ))}
                                        <th style={ETH({ width: "90px" })}>TOTAL</th>
                                        <th style={ETH({ width: "100px" })}>STATUS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={16} style={{ padding: "30px", textAlign: "center", color: "#9ca3af", border: "1px solid #000" }}>Loading…</td></tr>
                                    ) : filteredLeaders.length === 0 ? (
                                        <tr><td colSpan={16} style={{ padding: "30px", textAlign: "center", color: "#9ca3af", border: "1px solid #000" }}>No members found.</td></tr>
                                    ) : (() => {
                                        const monthlyTotals = Array(12).fill(0);
                                        let grandYearTotal = 0;
                                        const rows = filteredLeaders.map((leader, idx) => {
                                            const partner = getCombinedPartner(leader);
                                            if (partner && leader.combined_with < leader.id) return null;
                                            const yearly = getYearlyData(leader.id, selectedYear);
                                            let consistentMonths = 0;
                                            const monthTotals = yearly.map((y, i) => {
                                                const mk = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
                                                const t = y.total + (partner ? getMonthlyTotal(partner.id, mk) : 0);
                                                if (isConsistent(leader, t, mk)) consistentMonths++;
                                                monthlyTotals[i] += t;
                                                return t;
                                            });
                                            const yearTotal = monthTotals.reduce((a, b) => a + b, 0);
                                            grandYearTotal += yearTotal;
                                            return { leader, monthTotals, yearTotal, consistentMonths, idx };
                                        }).filter(Boolean);

                                        return (
                                            <>
                                                {rows.map(({ leader, monthTotals, yearTotal, consistentMonths, idx }) => (
                                                    <tr key={leader.id}>
                                                        <td style={ETD({ fontWeight: 700 })}>{idx + 1}</td>
                                                        <td style={ETD({ textAlign: "left", padding: "4px 6px", fontWeight: 600 })}>{getDisplayName(leader)}</td>
                                                        {monthTotals.map((total, i) => {
                                                            const mk = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
                                                            const mc = isConsistent(leader, total, mk);
                                                            return (
                                                                <td key={i} style={ETD({
                                                                    fontWeight: total > 0 ? 700 : 400,
                                                                    color: total > 0 ? "#000" : "#9ca3af",
                                                                    background: total > 0 && !mc ? "#fee2e2" : "#fff"
                                                                })}>{total > 0 ? total.toLocaleString() : "—"}</td>
                                                            );
                                                        })}
                                                        <td style={ETD({ fontWeight: 800, fontSize: "12px" })}>{yearTotal > 0 ? yearTotal.toLocaleString() : "—"}</td>
                                                        <td style={ETD({
                                                            background: consistentMonths >= 6 ? "#dcfce7" : consistentMonths >= 3 ? "#fef3c7" : "#fee2e2",
                                                            color: consistentMonths >= 6 ? "#16a34a" : consistentMonths >= 3 ? "#92400e" : "#dc2626",
                                                            fontWeight: 700
                                                        })}>{consistentMonths}/12</td>
                                                    </tr>
                                                ))}
                                                <tr style={{ background: "#f3f4f6", fontWeight: 700 }}>
                                                    <td style={ETD({ fontWeight: 700 })}></td>
                                                    <td style={ETD({ textAlign: "left", padding: "4px 6px" })}>TOTAL</td>
                                                    {monthlyTotals.map((total, i) => (
                                                        <td key={i} style={ETD({ color: total > 0 ? "#000" : "#9ca3af" })}>{total > 0 ? total.toLocaleString() : "—"}</td>
                                                    ))}
                                                    <td style={ETD({ fontWeight: 800, fontSize: "12px" })}>{grandYearTotal > 0 ? grandYearTotal.toLocaleString() : "—"}</td>
                                                    <td style={ETD()}></td>
                                                </tr>
                                            </>
                                        );
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ════════════════════════════════════════════════════════════
                    MONTHLY GROSS TAB  —  EXCEL-STYLE TABLE
                ════════════════════════════════════════════════════════════ */}
                {activeTab === "gross" && (
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: "16px", color: "#111827" }}>MONTHLY GROSS INCOME — {monthLabel} {year}</div>
                                <div style={{ fontSize: "11px", color: "#6b7280" }}>Set or override gross income per month. Blank = uses default from profile.</div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", borderRadius: "6px", border: "1px solid #d1d5db", background: "#fff" }}>
                                <span style={{ fontSize: "14px" }}>📅</span>
                                <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                                    style={{ border: "none", outline: "none", fontSize: "13px", fontWeight: 600, color: "#111827", background: "transparent", cursor: "pointer" }} />
                            </div>
                        </div>

                        <div style={{ overflowX: "auto", border: "1px solid #000" }}>
                            <table style={{ width: "100%", fontSize: "11px", borderCollapse: "collapse", minWidth: "700px" }}>
                                <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                                    <tr>
                                        <th style={ETH({ width: "40px" })}>NO.</th>
                                        <th style={ETH({ textAlign: "left", width: "250px" })}>FULL NAME</th>
                                        <th style={ETH({ width: "140px" })}>DEFAULT GROSS</th>
                                        <th style={ETH({ width: "160px" })}>{monthLabel} OVERRIDE</th>
                                        <th style={ETH({ width: "140px" })}>EFFECTIVE GROSS</th>
                                        <th style={ETH({ width: "100px" })}>SOURCE</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={6} style={{ padding: "30px", textAlign: "center", color: "#9ca3af", border: "1px solid #000" }}>Loading…</td></tr>
                                    ) : filteredLeaders.length === 0 ? (
                                        <tr><td colSpan={6} style={{ padding: "30px", textAlign: "center", color: "#9ca3af", border: "1px solid #000" }}>No members found.</td></tr>
                                    ) : filteredLeaders.map((leader, idx) => {
                                        const partner = getCombinedPartner(leader);
                                        if (partner && leader.combined_with < leader.id) return null;
                                        const defaultGross = leader.gross_income || 0;
                                        const effectiveGross = getEffectiveGross(leader, selectedMonth);
                                        const hasOverride = monthlyGrossMap[`${leader.id}-${selectedMonth}`] !== undefined;
                                        return (
                                            <tr key={leader.id}>
                                                <td style={ETD({ fontWeight: 700 })}>{idx + 1}</td>
                                                <td style={ETD({ textAlign: "left", padding: "4px 6px", fontWeight: 600 })}>
                                                    {getDisplayName(leader)}
                                                    {partner && <span style={{ display: "block", fontSize: "9px", color: "#6b7280", fontWeight: 400 }}>Combined tithing</span>}
                                                </td>
                                                <td style={ETD({ fontWeight: 600, color: "#6b7280" })}>{defaultGross ? defaultGross.toLocaleString() : "—"}</td>
                                                <td style={ETD()}>
                                                    <GrossInput leaderId={leader.id} monthKey={selectedMonth} defaultGross={defaultGross} monthlyGrossMap={monthlyGrossMap} onCommit={handleGrossOverride} />
                                                </td>
                                                <td style={ETD({ fontWeight: 800, fontSize: "12px", color: hasOverride ? "#b45309" : "#374151" })}>{effectiveGross ? effectiveGross.toLocaleString() : "—"}</td>
                                                <td style={ETD({
                                                    background: hasOverride ? "#fef3c7" : "#f3f4f6",
                                                    color: hasOverride ? "#92400e" : "#6b7280",
                                                    fontWeight: 700
                                                })}>{hasOverride ? "Override" : "Default"}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ padding: "10px 12px", background: "#f9fafb", border: "1px solid #000", borderTop: "none", fontSize: "11px", color: "#6b7280" }}>
                            <strong style={{ color: "#374151" }}>How it works:</strong> The "Default Gross" comes from the leader's profile.
                            If their salary changes for a specific month, enter the new amount in the override column.
                            The system will use the override for consistency checks and reports.
                            Leave blank or click ✕ to revert to the default.
                            <strong style={{ color: "#b8934a" }}> Combined tithing partners share the same gross.</strong>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

export default Tithes;
