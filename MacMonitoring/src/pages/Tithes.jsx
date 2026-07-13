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

// ── shared table cell style ──────────────────────────────────────────────────
const th = (extra = {}) => ({
    padding: "11px 14px",
    fontWeight: 700,
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.6px",
    color: "#6b7280",
    background: "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
    whiteSpace: "nowrap",
    ...extra,
});

// ── Controlled, per-slot input. Re-keyed by month in the parent so React
//    always mounts a FRESH input when the month changes. ─────────────────────
function WeekSlotInput({ tithe, leaderId, monthKey, onCommit }) {
    const [value, setValue] = useState(tithe?.amount ?? "");

    useEffect(() => {
        setValue(tithe?.amount ?? "");
    }, [tithe?.id, tithe?.amount]);

    const commit = () => {
        if (tithe) {
            if (String(value) !== String(tithe.amount)) onCommit(leaderId, monthKey, value, tithe.id);
        } else if (value) {
            onCommit(leaderId, monthKey, value, null);
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
                width: "80px",
                padding: "8px 6px",
                fontSize: "13px",
                fontWeight: 500,
                borderRadius: "7px",
                border: tithe ? "1.5px solid #d1d5db" : "1.5px dashed #e5e7eb",
                textAlign: "center",
                background: tithe ? "#fff" : "#fafafa",
                outline: "none",
                color: "#111827",
                boxSizing: "border-box",
                transition: "border-color 0.15s"
            }}
            onFocus={e => e.target.style.borderColor = "#b8934a"}
            onBlurCapture={e => e.target.style.borderColor = tithe ? "#d1d5db" : "#e5e7eb"}
        />
    );
}

// ── NEW: Monthly Gross Input for the Gross Manager tab ─────────────────────
function GrossInput({ leaderId, monthKey, defaultGross, monthlyGrossMap, onCommit }) {
    const override = monthlyGrossMap[`${leaderId}-${monthKey}`];
    const [value, setValue] = useState(override ?? "");
    const [hasOverride, setHasOverride] = useState(override !== undefined && override !== null);

    // Sync when month changes
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
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <input
                type="number"
                value={value}
                placeholder={defaultGross ? String(defaultGross) : "—"}
                onChange={e => setValue(e.target.value)}
                onBlur={commit}
                onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }}
                style={{
                    width: "110px",
                    padding: "8px 10px",
                    fontSize: "13px",
                    fontWeight: hasOverride ? 700 : 500,
                    borderRadius: "7px",
                    border: hasOverride ? "1.5px solid #b8934a" : "1.5px solid #d1d5db",
                    textAlign: "right",
                    background: hasOverride ? "#fffbeb" : "#fff",
                    outline: "none",
                    color: "#111827",
                    transition: "all 0.15s"
                }}
            />
            {hasOverride && (
                <span title="Override active — click to clear" 
                    onClick={() => { onCommit(leaderId, monthKey, null); setValue(""); setHasOverride(false); }}
                    style={{ cursor: "pointer", fontSize: "12px", color: "#b8934a", fontWeight: 700 }}>
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

    // ── NEW: Map for quick gross lookup ─────────────────────────────────────
    // Key: "leaderId-monthKey" → gross_income value (or undefined if using default)
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

    // ── NEW: Build map of monthly gross overrides ───────────────────────────
    const buildMonthlyGrossMap = (tithesData) => {
        const map = {};
        tithesData.forEach(t => {
            if (t.gross_income != null && t.date) {
                const mk = t.date.substring(0, 7); // "2026-06"
                map[`${t.leader_id}-${mk}`] = t.gross_income;
            }
        });
        setMonthlyGrossMap(map);
    };

    // ── NEW: Get effective gross for a leader+month ─────────────────────────
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

    // ── UPDATED: Consistency now uses effective gross ───────────────────────
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
            return `${leader.firstname} / ${partner.firstname}`;
        }
        return `${leader.firstname} ${leader.lastname}`;
    };

    const handleTitheEntry = async (leaderId, monthKey, amount, existingId = null) => {
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
                .insert([{ leader_id: leaderId, amount: parseFloat(amount), date }]).select();
            if (!error && data) setTithes(prev => [...prev, data[0]]);
        }
    };

    // ── NEW: Handle monthly gross override save ─────────────────────────────
    const handleGrossOverride = async (leaderId, monthKey, grossValue) => {
        const date = `${monthKey}-01`;
        const { data: existing } = await supabase
            .from("tblTithes")
            .select("id, amount")
            .eq("leader_id", leaderId)
            .eq("date", date)
            .maybeSingle();

        if (existing) {
            // Update existing row's gross_income
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
            // Insert a gross-only row (amount 0, will be hidden from week slots)
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
            const na = `${a.firstname} ${b.lastname}`.toLowerCase();
            const nb = `${b.firstname} ${b.lastname}`.toLowerCase();
            return sortOrder === "asc" ? na.localeCompare(nb) : nb.localeCompare(na);
        });
        return result;
    }, [leaders, filterTribe, search, sortOrder]);

    // ── UPDATED: Stats now use effective gross ──────────────────────────────
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

    const handleExport = () => {
        const wb = XLSX.utils.book_new();
        if (activeTab === "month") {
            const wsData = [
                ["MAC TLDA CHURCH - Tithes Report"],
                [`Period: ${selectedMonth}`],
                [`Generated: ${new Date().toLocaleDateString()}`],
                [],
                ["Name", "Gross Income", "Tithe Entries", "Total", "Status"]
            ];
            filteredLeaders.forEach(leader => {
                const partner = getCombinedPartner(leader);
                if (partner && leader.combined_with < leader.id) return;
                const monthlyTithes = getMonthlyTithes(leader.id, selectedMonth);
                let total = getMonthlyTotal(leader.id, selectedMonth);
                if (partner) total += getMonthlyTotal(partner.id, selectedMonth);
                const gross = getEffectiveGross(leader, selectedMonth);
                wsData.push([getDisplayName(leader), gross || 0,
                    monthlyTithes.filter(t => t.amount > 0).map(t => t.amount).join(", "), total,
                    isConsistent(leader, total, selectedMonth) ? "Consistent" : "Inconsistent"]);
            });
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            ws["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 18 }, { wch: 10 }, { wch: 12 }];
            XLSX.utils.book_append_sheet(wb, ws, "Monthly Tithes");
        } else if (activeTab === "year") {
            const wsData = [
                ["MAC TLDA CHURCH - Yearly Tithes Report"],
                [`Year: ${selectedYear}`], [],
                ["Name", ...MONTH_SHORT, "Total", "Consistent Months"]
            ];
            filteredLeaders.forEach(leader => {
                const partner = getCombinedPartner(leader);
                if (partner && leader.combined_with < leader.id) return;
                const yearly = getYearlyData(leader.id, selectedYear);
                const monthTotals = yearly.map((y, i) => {
                    const mk = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
                    return y.total + (partner ? getMonthlyTotal(partner.id, mk) : 0);
                });
                const total = monthTotals.reduce((a, b) => a + b, 0);
                const cm = monthTotals.filter((t, i) => {
                    const mk = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
                    return isConsistent(leader, t, mk);
                }).length;
                wsData.push([getDisplayName(leader), ...monthTotals, total, `${cm}/12`]);
            });
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            ws["!cols"] = [{ wch: 18 }, ...Array(12).fill({ wch: 7 }), { wch: 9 }, { wch: 12 }];
            XLSX.utils.book_append_sheet(wb, ws, "Yearly Tithes");
        } else {
            // Export for Gross tab
            const wsData = [
                ["MAC TLDA CHURCH - Monthly Gross Income"],
                [`Period: ${selectedMonth}`],
                [`Generated: ${new Date().toLocaleDateString()}`],
                [],
                ["Name", "Default Gross", "Monthly Override", "Effective Gross", "Source"]
            ];
            filteredLeaders.forEach(leader => {
                const partner = getCombinedPartner(leader);
                if (partner && leader.combined_with < leader.id) return;
                const def = leader.gross_income || 0;
                const eff = getEffectiveGross(leader, selectedMonth);
                const hasOv = monthlyGrossMap[`${leader.id}-${selectedMonth}`] !== undefined;
                wsData.push([
                    getDisplayName(leader),
                    def || "—",
                    hasOv ? (monthlyGrossMap[`${leader.id}-${selectedMonth}`] || 0) : "—",
                    eff || "—",
                    hasOv ? "Override" : "Default"
                ]);
            });
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            ws["!cols"] = [{ wch: 20 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 12 }];
            XLSX.utils.book_append_sheet(wb, ws, "Monthly Gross");
        }
        XLSX.writeFile(wb, activeTab === "month"
            ? `Tithes_Monthly_${selectedMonth}.xlsx`
            : activeTab === "year"
                ? `Tithes_Yearly_${selectedYear}.xlsx`
                : `Tithes_Gross_${selectedMonth}.xlsx`);
        Swal.fire({ icon: "success", title: "Exported", text: "Excel file downloaded successfully", timer: 1500, showConfirmButton: false });
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

                {/* ── STATS + MONTH PICKER row ─────────────────────────────── */}
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
                <div style={{ display: "flex", gap: "4px", marginBottom: "16px", background: "#f3f4f6", borderRadius: "10px", padding: "4px", width: "fit-content" }}>
                    {["month", "year", "gross"].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} style={{
                            padding: "8px 22px", borderRadius: "8px", border: "none", fontSize: "13px", cursor: "pointer",
                            fontWeight: activeTab === tab ? 700 : 500,
                            background: activeTab === tab ? "#fff" : "transparent",
                            color: activeTab === tab ? "#b8934a" : "#6b7280",
                            boxShadow: activeTab === tab ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                            transition: "all 0.2s"
                        }}>
                            {tab === "month" ? "Whole Month" : tab === "year" ? "Whole Year" : "Monthly Gross"}
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
                        📥 Export
                    </button>
                </div>

                {/* ════════════════════════════════════════════════════════════
                    WHOLE MONTH TAB
                ════════════════════════════════════════════════════════════ */}
                {activeTab === "month" && (
                    <div style={{ borderRadius: "12px", border: "1px solid #e5e7eb", overflow: "hidden", background: "#fff" }}>

                        {/* Month picker header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #e5e7eb", background: "#fff" }}>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: "18px", letterSpacing: "-0.3px", color: "#111827" }}>
                                    WHOLE MONTH
                                </div>
                                <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>
                                    Record weekly tithes for the selected month.
                                </div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                                <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "#9ca3af" }}>Month Picker</span>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", borderRadius: "8px", border: "1px solid #d1d5db", background: "#fff" }}>
                                    <span style={{ fontSize: "15px" }}>📅</span>
                                    <input
                                        type="month"
                                        value={selectedMonth}
                                        onChange={e => setSelectedMonth(e.target.value)}
                                        style={{ border: "none", outline: "none", fontSize: "14px", fontWeight: 600, color: "#111827", background: "transparent", cursor: "pointer" }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse", minWidth: "780px" }}>
                                <thead>
                                    <tr>
                                        <th rowSpan={2} style={{ ...th({ textAlign: "left", width: "160px", borderRight: "1px solid #e5e7eb", verticalAlign: "middle" }) }}>
                                            NAME
                                        </th>
                                        <th colSpan={SLOT_COUNT} style={{ ...th({ textAlign: "center", borderRight: "1px solid #e5e7eb", borderBottom: "none", paddingBottom: "6px" }) }}>
                                            {monthLabel}
                                        </th>
                                        <th rowSpan={2} style={{ ...th({ textAlign: "center", width: "100px", borderRight: "1px solid #e5e7eb", verticalAlign: "middle" }) }}>
                                            TOTAL
                                        </th>
                                        <th rowSpan={2} style={{ ...th({ textAlign: "center", width: "110px", borderRight: "1px solid #e5e7eb", verticalAlign: "middle" }) }}>
                                            GROSS INCOME
                                        </th>
                                        <th rowSpan={2} style={{ ...th({ textAlign: "center", width: "120px", verticalAlign: "middle" }) }}>
                                            STATUS
                                        </th>
                                    </tr>
                                    <tr>
                                        {Array.from({ length: SLOT_COUNT }).map((_, i) => (
                                            <th key={i} style={{
                                                ...th({ textAlign: "center", paddingTop: "4px" }),
                                                ...(i === SLOT_COUNT - 1 ? { borderRight: "1px solid #e5e7eb" } : {}),
                                                minWidth: "90px"
                                            }}>
                                                WEEK {i + 1}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={SLOT_COUNT + 4} style={{ padding: "30px", textAlign: "center", color: "#9ca3af" }}>Loading…</td></tr>
                                    ) : filteredLeaders.length === 0 ? (
                                        <tr><td colSpan={SLOT_COUNT + 4} style={{ padding: "30px", textAlign: "center", color: "#9ca3af" }}>No members found.</td></tr>
                                    ) : filteredLeaders.map(leader => {
                                        const partner = getCombinedPartner(leader);
                                        if (partner && leader.combined_with < leader.id) return null;

                                        const monthlyTithes = getMonthlyTithes(leader.id, selectedMonth);
                                        let displayTotal = getMonthlyTotal(leader.id, selectedMonth);
                                        if (partner) displayTotal += getMonthlyTotal(partner.id, selectedMonth);
                                        const effectiveGross = getEffectiveGross(leader, selectedMonth);
                                        const consistent = isConsistent(leader, displayTotal, selectedMonth);

                                        const slots = Array.from({ length: SLOT_COUNT }, (_, i) => monthlyTithes[i] ?? null);

                                        return (
                                            <tr key={leader.id}
                                                style={{ borderBottom: "1px solid #f3f4f6", transition: "background 0.15s" }}
                                                onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

                                                <td style={{ padding: "16px 16px", fontWeight: 600, color: "#111827", borderRight: "1px solid #f3f4f6" }}>
                                                    {getDisplayName(leader)}
                                                    {partner && (
                                                        <span style={{ display: "block", fontSize: "10px", color: "#9ca3af", fontWeight: 400, marginTop: "2px" }}>
                                                            Combined tithing
                                                        </span>
                                                    )}
                                                </td>

                                                {slots.map((tithe, i) => (
                                                    <td key={`${selectedMonth}-${i}`} style={{ padding: "12px 10px", textAlign: "center", ...(i === SLOT_COUNT - 1 ? { borderRight: "1px solid #f3f4f6" } : {}) }}>
                                                        <WeekSlotInput
                                                            key={`${selectedMonth}-${leader.id}-${i}-${tithe?.id ?? "empty"}`}
                                                            tithe={tithe}
                                                            leaderId={leader.id}
                                                            monthKey={selectedMonth}
                                                            onCommit={handleTitheEntry}
                                                        />
                                                    </td>
                                                ))}

                                                <td style={{ padding: "16px 14px", textAlign: "center", fontWeight: 800, color: "#111827", fontSize: "14px", borderRight: "1px solid #f3f4f6" }}>
                                                    {displayTotal > 0 ? displayTotal.toLocaleString() : "—"}
                                                </td>

                                                <td style={{ padding: "16px 14px", textAlign: "center", borderRight: "1px solid #f3f4f6" }}
                                                    title={effectiveGross ? `10% minimum: ${(effectiveGross * 0.1).toLocaleString()}` : ""}>
                                                    <span style={{ fontWeight: 600, color: "#374151", fontSize: "13px" }}>
                                                        {effectiveGross ? Number(effectiveGross).toLocaleString() : "—"}
                                                    </span>
                                                    {monthlyGrossMap[`${leader.id}-${selectedMonth}`] !== undefined && (
                                                        <span style={{ display: "block", fontSize: "9px", color: "#b8934a", fontWeight: 700, marginTop: "2px" }}>OVERRIDE</span>
                                                    )}
                                                </td>

                                                <td style={{ padding: "16px 14px", textAlign: "center" }}>
                                                    <span style={{
                                                        display: "inline-block",
                                                        padding: "5px 14px",
                                                        borderRadius: "20px",
                                                        fontSize: "12px",
                                                        fontWeight: 700,
                                                        letterSpacing: "0.3px",
                                                        background: consistent ? "#dcfce7" : "#fee2e2",
                                                        color: consistent ? "#16a34a" : "#dc2626"
                                                    }}>
                                                        {consistent ? "Consistent" : "Inconsistent"}
                                                    </span>
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
                    WHOLE YEAR TAB
                ════════════════════════════════════════════════════════════ */}
                {activeTab === "year" && (
                    <div style={{ borderRadius: "12px", border: "1px solid #e5e7eb", overflow: "hidden", background: "#fff" }}>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #e5e7eb" }}>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: "18px", letterSpacing: "-0.3px", color: "#111827" }}>WHOLE YEAR</div>
                                <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>Monthly tithe totals for the selected year.</div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                                <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "#9ca3af" }}>Year Picker</span>
                                <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
                                    style={{ padding: "8px 14px", fontSize: "14px", fontWeight: 600, borderRadius: "8px", border: "1px solid #d1d5db", color: "#111827", background: "#fff", cursor: "pointer" }}>
                                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        </div>

                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse", minWidth: "1000px" }}>
                                <thead>
                                    <tr>
                                        <th style={{ ...th({ textAlign: "left", width: "180px", borderRight: "1px solid #e5e7eb" }) }}>NAME</th>
                                        {MONTH_SHORT.map((m, i) => (
                                            <th key={m} style={{ ...th({ textAlign: "center", minWidth: "62px", ...(i === 11 ? { borderRight: "1px solid #e5e7eb" } : {}) }) }}>{m}</th>
                                        ))}
                                        <th style={{ ...th({ textAlign: "center", width: "90px", borderRight: "1px solid #e5e7eb" }) }}>TOTAL</th>
                                        <th style={{ ...th({ textAlign: "center", width: "100px" }) }}>STATUS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={16} style={{ padding: "30px", textAlign: "center", color: "#9ca3af" }}>Loading…</td></tr>
                                    ) : filteredLeaders.length === 0 ? (
                                        <tr><td colSpan={16} style={{ padding: "30px", textAlign: "center", color: "#9ca3af" }}>No members found.</td></tr>
                                    ) : filteredLeaders.map(leader => {
                                        const partner = getCombinedPartner(leader);
                                        if (partner && leader.combined_with < leader.id) return null;

                                        const yearly = getYearlyData(leader.id, selectedYear);
                                        let consistentMonths = 0;
                                        const monthTotals = yearly.map((y, i) => {
                                            const mk = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
                                            const t = y.total + (partner ? getMonthlyTotal(partner.id, mk) : 0);
                                            if (isConsistent(leader, t, mk)) consistentMonths++;
                                            return t;
                                        });
                                        const yearTotal = monthTotals.reduce((a, b) => a + b, 0);

                                        return (
                                            <tr key={leader.id}
                                                style={{ borderBottom: "1px solid #f3f4f6", transition: "background 0.15s" }}
                                                onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

                                                <td style={{ padding: "13px 16px", fontWeight: 600, color: "#111827", borderRight: "1px solid #f3f4f6", fontSize: "13px" }}>
                                                    {getDisplayName(leader)}
                                                </td>

                                                {monthTotals.map((total, i) => {
                                                    const mk = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
                                                    const mc = isConsistent(leader, total, mk);
                                                    return (
                                                        <td key={i} style={{
                                                            padding: "13px 8px",
                                                            textAlign: "center",
                                                            fontWeight: total > 0 ? 700 : 400,
                                                            color: total > 0 ? "#111827" : "#d1d5db",
                                                            background: total > 0 && !mc ? "#fff5f5" : "transparent",
                                                            fontSize: "12px",
                                                            ...(i === 11 ? { borderRight: "1px solid #f3f4f6" } : {})
                                                        }}>
                                                            {total > 0 ? total.toLocaleString() : "—"}
                                                        </td>
                                                    );
                                                })}

                                                <td style={{ padding: "13px 12px", textAlign: "center", fontWeight: 800, color: "#111827", borderRight: "1px solid #f3f4f6", fontSize: "13px" }}>
                                                    {yearTotal > 0 ? yearTotal.toLocaleString() : "—"}
                                                </td>

                                                <td style={{ padding: "13px 12px", textAlign: "center" }}>
                                                    <span style={{
                                                        display: "inline-block",
                                                        padding: "4px 12px",
                                                        borderRadius: "20px",
                                                        fontSize: "11px",
                                                        fontWeight: 700,
                                                        background: consistentMonths >= 6 ? "#dcfce7" : consistentMonths >= 3 ? "#fef3c7" : "#fee2e2",
                                                        color: consistentMonths >= 6 ? "#16a34a" : consistentMonths >= 3 ? "#92400e" : "#dc2626"
                                                    }}>
                                                        {consistentMonths}/12
                                                    </span>
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
                    MONTHLY GROSS TAB  ← NEW!
                ════════════════════════════════════════════════════════════ */}
                {activeTab === "gross" && (
                    <div style={{ borderRadius: "12px", border: "1px solid #e5e7eb", overflow: "hidden", background: "#fff" }}>

                        {/* Month picker header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #e5e7eb", background: "#fff" }}>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: "18px", letterSpacing: "-0.3px", color: "#111827" }}>
                                    MONTHLY GROSS INCOME
                                </div>
                                <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>
                                    Set or override gross income for each leader per month. Blank = uses default from profile.
                                </div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                                <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "#9ca3af" }}>Month Picker</span>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", borderRadius: "8px", border: "1px solid #d1d5db", background: "#fff" }}>
                                    <span style={{ fontSize: "15px" }}>📅</span>
                                    <input
                                        type="month"
                                        value={selectedMonth}
                                        onChange={e => setSelectedMonth(e.target.value)}
                                        style={{ border: "none", outline: "none", fontSize: "14px", fontWeight: 600, color: "#111827", background: "transparent", cursor: "pointer" }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse", minWidth: "700px" }}>
                                <thead>
                                    <tr>
                                        <th style={{ ...th({ textAlign: "left", width: "200px", borderRight: "1px solid #e5e7eb" }) }}>NAME</th>
                                        <th style={{ ...th({ textAlign: "center", width: "140px", borderRight: "1px solid #e5e7eb" }) }}>DEFAULT GROSS</th>
                                        <th style={{ ...th({ textAlign: "center", width: "160px", borderRight: "1px solid #e5e7eb" }) }}>
                                            {monthLabel} OVERRIDE
                                        </th>
                                        <th style={{ ...th({ textAlign: "center", width: "140px", borderRight: "1px solid #e5e7eb" }) }}>EFFECTIVE GROSS</th>
                                        <th style={{ ...th({ textAlign: "center", width: "100px" }) }}>SOURCE</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "#9ca3af" }}>Loading…</td></tr>
                                    ) : filteredLeaders.length === 0 ? (
                                        <tr><td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "#9ca3af" }}>No members found.</td></tr>
                                    ) : filteredLeaders.map(leader => {
                                        const partner = getCombinedPartner(leader);
                                        if (partner && leader.combined_with < leader.id) return null;

                                        const defaultGross = leader.gross_income || 0;
                                        const effectiveGross = getEffectiveGross(leader, selectedMonth);
                                        const hasOverride = monthlyGrossMap[`${leader.id}-${selectedMonth}`] !== undefined;

                                        return (
                                            <tr key={leader.id}
                                                style={{ borderBottom: "1px solid #f3f4f6", transition: "background 0.15s" }}
                                                onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

                                                <td style={{ padding: "14px 16px", fontWeight: 600, color: "#111827", borderRight: "1px solid #f3f4f6" }}>
                                                    {getDisplayName(leader)}
                                                    {partner && (
                                                        <span style={{ display: "block", fontSize: "10px", color: "#9ca3af", fontWeight: 400, marginTop: "2px" }}>
                                                            Combined tithing
                                                        </span>
                                                    )}
                                                </td>

                                                <td style={{ padding: "14px 16px", textAlign: "center", borderRight: "1px solid #f3f4f6" }}>
                                                    <span style={{ fontWeight: 600, color: "#6b7280", fontSize: "13px" }}>
                                                        {defaultGross ? defaultGross.toLocaleString() : "—"}
                                                    </span>
                                                </td>

                                                <td style={{ padding: "10px 14px", textAlign: "center", borderRight: "1px solid #f3f4f6" }}>
                                                    <GrossInput
                                                        leaderId={leader.id}
                                                        monthKey={selectedMonth}
                                                        defaultGross={defaultGross}
                                                        monthlyGrossMap={monthlyGrossMap}
                                                        onCommit={handleGrossOverride}
                                                    />
                                                </td>

                                                <td style={{ padding: "14px 16px", textAlign: "center", borderRight: "1px solid #f3f4f6" }}>
                                                    <span style={{ 
                                                        fontWeight: 800, 
                                                        fontSize: "14px", 
                                                        color: hasOverride ? "#b8934a" : "#374151" 
                                                    }}>
                                                        {effectiveGross ? effectiveGross.toLocaleString() : "—"}
                                                    </span>
                                                </td>

                                                <td style={{ padding: "14px 16px", textAlign: "center" }}>
                                                    <span style={{
                                                        display: "inline-block",
                                                        padding: "4px 12px",
                                                        borderRadius: "20px",
                                                        fontSize: "11px",
                                                        fontWeight: 700,
                                                        background: hasOverride ? "#fef3c7" : "#f3f4f6",
                                                        color: hasOverride ? "#92400e" : "#6b7280"
                                                    }}>
                                                        {hasOverride ? "Override" : "Default"}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Legend */}
                        <div style={{ padding: "12px 20px", background: "#f9fafb", borderTop: "1px solid #e5e7eb", fontSize: "11px", color: "#6b7280" }}>
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