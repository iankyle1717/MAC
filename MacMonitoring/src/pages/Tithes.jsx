
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";
import { getCurrentUser, isAdmin, isFinance, canEditGrossIncome } from "../utils/auth";
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
        setLoading(false);
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

    const isConsistent = (leader, monthTotal) => {
        if (!leader.gross_income || leader.gross_income <= 0) return false;
        return monthTotal >= leader.gross_income * 0.1;
    };

    const getCombinedPartner = (leader) => {
        if (leader.tithing_type !== "Combined" || !leader.combined_with) return null;
        return leaders.find(l => l.id === leader.combined_with);
    };

    // ── COMBINED NAME FORMAT: FIRSTNAME1 / FIRSTNAME2 (preserves original order) ──
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
            (isConsistent(leader, total) ? consistent : inconsistent).push({ ...leader, displayTotal: total });
        });
        return { consistent, inconsistent };
    }, [filteredLeaders, tithes, selectedMonth]);

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
                wsData.push([getDisplayName(leader), leader.gross_income || 0,
                    monthlyTithes.map(t => t.amount).join(", "), total,
                    isConsistent(leader, total) ? "Consistent" : "Inconsistent"]);
            });
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            ws["!cols"] = [{ wch: 20 }, { wch: 10 }, { wch: 18 }, { wch: 10 }, { wch: 12 }];
            XLSX.utils.book_append_sheet(wb, ws, "Monthly Tithes");
        } else {
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
                    return isConsistent(leader, t);
                }).length;
                wsData.push([getDisplayName(leader), ...monthTotals, total, `${cm}/12`]);
            });
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            ws["!cols"] = [{ wch: 18 }, ...Array(12).fill({ wch: 7 }), { wch: 9 }, { wch: 12 }];
            XLSX.utils.book_append_sheet(wb, ws, "Yearly Tithes");
        }
        XLSX.writeFile(wb, activeTab === "month"
            ? `Tithes_Monthly_${selectedMonth}.xlsx`
            : `Tithes_Yearly_${selectedYear}.xlsx`);
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
                    {["month", "year"].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} style={{
                            padding: "8px 22px", borderRadius: "8px", border: "none", fontSize: "13px", cursor: "pointer",
                            fontWeight: activeTab === tab ? 700 : 500,
                            background: activeTab === tab ? "#fff" : "transparent",
                            color: activeTab === tab ? "#b8934a" : "#6b7280",
                            boxShadow: activeTab === tab ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                            transition: "all 0.2s"
                        }}>
                            {tab === "month" ? "Whole Month" : "Whole Year"}
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
                                    {/* Row 1: NAME | JANUARY (colspan weeks) | TOTAL | GROSS | STATUS */}
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
                                    {/* Row 2: WEEK 1 … WEEK 4 */}
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
                                        const consistent = isConsistent(leader, displayTotal);

                                        // Pad or trim to exactly SLOT_COUNT entries
                                        const slots = Array.from({ length: SLOT_COUNT }, (_, i) => monthlyTithes[i] ?? null);

                                        return (
                                            <tr key={leader.id}
                                                style={{ borderBottom: "1px solid #f3f4f6", transition: "background 0.15s" }}
                                                onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

                                                {/* NAME */}
                                                <td style={{ padding: "16px 16px", fontWeight: 600, color: "#111827", borderRight: "1px solid #f3f4f6" }}>
                                                    {getDisplayName(leader)}
                                                    {partner && (
                                                        <span style={{ display: "block", fontSize: "10px", color: "#9ca3af", fontWeight: 400, marginTop: "2px" }}>
                                                            Combined tithing
                                                        </span>
                                                    )}
                                                </td>

                                                {/* WEEK SLOTS — editable inputs */}
                                                {slots.map((tithe, i) => (
                                                    <td key={i} style={{ padding: "12px 10px", textAlign: "center", ...(i === SLOT_COUNT - 1 ? { borderRight: "1px solid #f3f4f6" } : {}) }}>
                                                        <input
                                                            type="number"
                                                            defaultValue={tithe?.amount ?? ""}
                                                            placeholder=""
                                                            onBlur={e => {
                                                                const val = e.target.value;
                                                                if (tithe) {
                                                                    if (val !== String(tithe.amount)) handleTitheEntry(leader.id, selectedMonth, val, tithe.id);
                                                                } else if (val) {
                                                                    handleTitheEntry(leader.id, selectedMonth, val, null);
                                                                }
                                                            }}
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
                                                    </td>
                                                ))}

                                                {/* TOTAL */}
                                                <td style={{ padding: "16px 14px", textAlign: "center", fontWeight: 800, color: "#111827", fontSize: "14px", borderRight: "1px solid #f3f4f6" }}>
                                                    {displayTotal > 0 ? displayTotal.toLocaleString() : "—"}
                                                </td>

                                                {/* GROSS */}
                                                <td style={{ padding: "16px 14px", textAlign: "center", borderRight: "1px solid #f3f4f6" }}
                                                    title={leader.gross_income ? `10% minimum: ${(Number(leader.gross_income) * 0.1).toLocaleString()}` : ""}>
                                                    <span style={{ fontWeight: 600, color: "#374151", fontSize: "13px" }}>
                                                        {leader.gross_income ? Number(leader.gross_income).toLocaleString() : "—"}
                                                    </span>
                                                </td>

                                                {/* STATUS */}
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
                    WHOLE YEAR TAB  (read-only, same design language)
                ════════════════════════════════════════════════════════════ */}
                {activeTab === "year" && (
                    <div style={{ borderRadius: "12px", border: "1px solid #e5e7eb", overflow: "hidden", background: "#fff" }}>

                        {/* Year picker header */}
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
                                            if (isConsistent(leader, t)) consistentMonths++;
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
                                                    const mc = isConsistent(leader, total);
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

            </div>
        </div>
    );
}

export default Tithes;