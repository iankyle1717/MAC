import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import LeaderForm from "../components/LeaderForm";
import { supabase } from "../lib/supabase";
import { tribes, ministries, leaderTypes } from "../constants/options";
import { canAddMember } from "../utils/auth";

function Leaders() {
    const [leaders, setLeaders] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [filterTribe, setFilterTribe] = useState("ALL");
    const [filterMinistry, setFilterMinistry] = useState("ALL");
    const [filterType, setFilterType] = useState("ALL");
    const [search, setSearch] = useState("");

    // Permission flag
    const canAdd = canAddMember();

    useEffect(() => {
        fetchLeaders();
    }, []);

    const fetchLeaders = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("tblMonitoring")
            .select("*")
            .order("id", { ascending: false });

        if (error) {
            console.log("Fetch Error:", error);
        } else {
            setLeaders(data);
        }
        setLoading(false);
    };

    // Apply all filters to get filtered leaders
    const filteredLeaders = leaders.filter((leader) => {
        const fullName = `${leader.firstname} ${leader.lastname}`.toLowerCase();
        const matchesSearch = fullName.includes(search.toLowerCase());
        const matchesTribe = filterTribe === "ALL" ? true : leader.tribe === filterTribe;
        const matchesMinistry = filterMinistry === "ALL" ? true : leader.ministry === filterMinistry;
        const matchesType = filterType === "ALL" ? true : leader.type === filterType;

        return matchesSearch && matchesTribe && matchesMinistry && matchesType;
    });

    // Base pool for stats cards: if type is filtered, use filteredLeaders; else use all leaders filtered by tribe/ministry/search
    const getStatsPool = () => {
        return leaders.filter((leader) => {
            const fullName = `${leader.firstname} ${leader.lastname}`.toLowerCase();
            const matchesSearch = fullName.includes(search.toLowerCase());
            const matchesTribe = filterTribe === "ALL" ? true : leader.tribe === filterTribe;
            const matchesMinistry = filterMinistry === "ALL" ? true : leader.ministry === filterMinistry;
            return matchesSearch && matchesTribe && matchesMinistry;
        });
    };

    const statsPool = getStatsPool();

    // Count helpers for stats cards
    const countByType = (type) => statsPool.filter((l) => l.type === type).length;

    // Quick filter by clicking stats
    const handleQuickFilter = (type) => {
        setFilterType(type);
    };

    // Check if any filter is active
    const hasActiveFilters = filterTribe !== "ALL" || filterMinistry !== "ALL" || search;

    return (
        <div className="layout">
            <Sidebar />
            <div className="content">
                {/* COMPACT PAGE HEADER */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "12px",
                        padding: "12px 0",
                        borderBottom: "1px solid #e5e7eb"
                    }}
                >
                    <div>
                        <h1 style={{ fontSize: "20px", margin: 0, fontWeight: 700 }}>Leaders</h1>
                        <p style={{ color: "var(--secondary)", fontSize: "12px", margin: "2px 0 0 0" }}>
                            Monitor TLDA performance records
                        </p>
                    </div>
                    {canAdd && (
                        <button
                            className="btn-sm btn-primary"
                            onClick={() => setShowForm(true)}
                            style={{ padding: "6px 14px", fontSize: "13px" }}
                        >
                            + Add Leader
                        </button>
                    )}
                </div>

                {/* COMPACT STATS CARDS */}
                <div
                    className="stats-grid"
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
                        gap: "8px",
                        marginBottom: "15px"
                    }}
                >
                    <div
                        className="record-card"
                        onClick={() => handleQuickFilter("ALL")}
                        style={{
                            cursor: "pointer",
                            border: filterType === "ALL" ? "2px solid #c9a45c" : "1px solid #e5e7eb",
                            padding: "10px 12px",
                            borderRadius: "8px",
                            background: "#fff"
                        }}
                    >
                        <h3 style={{ fontSize: "11px", margin: "0 0 4px 0", color: "#6b7280", fontWeight: 500 }}>All {hasActiveFilters ? "Filtered" : "Leaders"}</h3>
                        <h1 style={{ fontSize: "22px", margin: 0, color: "#111827", fontWeight: 700 }}>{statsPool.length}</h1>
                        {hasActiveFilters && (
                            <p style={{ fontSize: "10px", color: "#9ca3af", marginTop: "2px", margin: 0 }}>
                                {filterTribe !== "ALL" && `Tribe: ${filterTribe}`}
                                {filterMinistry !== "ALL" && ` Ministry: ${filterMinistry}`}
                                {search && ` Search: "${search}"`}
                            </p>
                        )}
                    </div>

                    <div
                        className="record-card"
                        onClick={() => handleQuickFilter("TRIBE LEADER")}
                        style={{
                            cursor: "pointer",
                            border: filterType === "TRIBE LEADER" ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                            padding: "10px 12px",
                            borderRadius: "8px",
                            background: "#fff"
                        }}
                    >
                        <h3 style={{ fontSize: "11px", margin: "0 0 4px 0", color: "#6b7280", fontWeight: 500 }}>Tribe Leaders</h3>
                        <h1 style={{ fontSize: "22px", margin: 0, color: "#2563eb", fontWeight: 700 }}>{countByType("TRIBE LEADER")}</h1>
                    </div>

                    <div
                        className="record-card"
                        onClick={() => handleQuickFilter("ANDREW")}
                        style={{
                            cursor: "pointer",
                            border: filterType === "ANDREW" ? "2px solid #16a34a" : "1px solid #e5e7eb",
                            padding: "10px 12px",
                            borderRadius: "8px",
                            background: "#fff"
                        }}
                    >
                        <h3 style={{ fontSize: "11px", margin: "0 0 4px 0", color: "#6b7280", fontWeight: 500 }}>Andrews</h3>
                        <h1 style={{ fontSize: "22px", margin: 0, color: "#16a34a", fontWeight: 700 }}>{countByType("ANDREW")}</h1>
                    </div>

                    <div
                        className="record-card"
                        onClick={() => handleQuickFilter("PETER")}
                        style={{
                            cursor: "pointer",
                            border: filterType === "PETER" ? "2px solid #dc2626" : "1px solid #e5e7eb",
                            padding: "10px 12px",
                            borderRadius: "8px",
                            background: "#fff"
                        }}
                    >
                        <h3 style={{ fontSize: "11px", margin: "0 0 4px 0", color: "#6b7280", fontWeight: 500 }}>Peters</h3>
                        <h1 style={{ fontSize: "22px", margin: 0, color: "#dc2626", fontWeight: 700 }}>{countByType("PETER")}</h1>
                    </div>

                    <div
                        className="record-card"
                        onClick={() => handleQuickFilter("MEMBER")}
                        style={{
                            cursor: "pointer",
                            border: filterType === "MEMBER" ? "2px solid #6b7280" : "1px solid #e5e7eb",
                            padding: "10px 12px",
                            borderRadius: "8px",
                            background: "#fff"
                        }}
                    >
                        <h3 style={{ fontSize: "11px", margin: "0 0 4px 0", color: "#6b7280", fontWeight: 500 }}>Members</h3>
                        <h1 style={{ fontSize: "22px", margin: 0, color: "#4b5563", fontWeight: 700 }}>{countByType("MEMBER")}</h1>
                    </div>
                </div>

                {/* COMPACT SEARCH & FILTER BAR */}
                <div
                    style={{
                        display: "flex",
                        gap: "8px",
                        marginBottom: "12px",
                        flexWrap: "wrap",
                        alignItems: "center",
                        padding: "10px",
                        background: "#f9fafb",
                        borderRadius: "8px"
                    }}
                >
                    <input
                        type="text"
                        placeholder="Search leader..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ flex: 1, minWidth: "150px", padding: "6px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                    />

                    <select
                        value={filterTribe}
                        onChange={(e) => setFilterTribe(e.target.value)}
                        style={{ width: "130px", padding: "6px 8px", fontSize: "12px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                    >
                        <option value="ALL">All Tribes</option>
                        {tribes.map((tribe) => (
                            <option key={tribe} value={tribe}>
                                {tribe}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filterMinistry}
                        onChange={(e) => setFilterMinistry(e.target.value)}
                        style={{ width: "150px", padding: "6px 8px", fontSize: "12px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                    >
                        <option value="ALL">All Ministries</option>
                        <optgroup label="Active Ministries">
                            {ministries.map((ministry) => (
                                <option key={ministry} value={ministry}>
                                    {ministry}
                                </option>
                            ))}
                        </optgroup>
                    </select>

                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        style={{ width: "130px", padding: "6px 8px", fontSize: "12px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                    >
                        <option value="ALL">All Types</option>
                        {leaderTypes.map((type) => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>

                    {(filterTribe !== "ALL" || filterMinistry !== "ALL" || filterType !== "ALL" || search) && (
                        <button
                            onClick={() => {
                                setFilterTribe("ALL");
                                setFilterMinistry("ALL");
                                setFilterType("ALL");
                                setSearch("");
                            }}
                            style={{
                                padding: "6px 12px",
                                borderRadius: "6px",
                                border: "1px solid #d1d5db",
                                background: "#fff",
                                cursor: "pointer",
                                fontSize: "12px",
                                color: "#6b7280"
                            }}
                        >
                            Clear
                        </button>
                    )}
                </div>

                {/* COMPACT ACTIVE FILTER INDICATOR */}
                {(filterTribe !== "ALL" || filterMinistry !== "ALL" || filterType !== "ALL") && (
                    <div style={{ marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "12px", color: "#6b7280" }}>Showing:</span>
                        {filterTribe !== "ALL" && (
                            <span style={{ padding: "2px 8px", borderRadius: "12px", background: "#dbeafe", color: "#1e40af", fontSize: "11px", fontWeight: 600 }}>
                                Tribe: {filterTribe}
                            </span>
                        )}
                        {filterMinistry !== "ALL" && (
                            <span style={{ padding: "2px 8px", borderRadius: "12px", background: "#fce7f3", color: "#9d174d", fontSize: "11px", fontWeight: 600 }}>
                                Ministry: {filterMinistry}
                            </span>
                        )}
                        {filterType !== "ALL" && (
                            <span style={{ padding: "2px 8px", borderRadius: "12px", background: "#fef3c7", color: "#92400e", fontSize: "11px", fontWeight: 600 }}>
                                Type: {filterType}
                            </span>
                        )}
                        <span style={{ fontSize: "12px", color: "#6b7280" }}>
                            ({filteredLeaders.length} results)
                        </span>
                    </div>
                )}

                {/* LOADING */}
                {loading ? (
                    <p style={{ fontSize: "13px", color: "#6b7280" }}>Loading leaders...</p>
                ) : filteredLeaders.length === 0 ? (
                    <p style={{ fontSize: "13px", color: "#6b7280" }}>No leaders found.</p>
                ) : (
                    /* COMPACT LEADERS GRID */
                    <div 
                        className="leaders-grid"
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                            gap: "10px"
                        }}
                    >
                        {filteredLeaders.map((leader) => (
                            <Link
                                key={leader.id}
                                to={`/leader/${leader.id}`}
                                className="leader-card"
                                style={{
                                    textDecoration: "none",
                                    color: "inherit",
                                    display: "block",
                                    padding: "10px",
                                    borderRadius: "8px",
                                    border: "1px solid #e5e7eb",
                                    background: "#fff",
                                    transition: "box-shadow 0.2s, transform 0.2s"
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        marginBottom: "8px"
                                    }}
                                >
                                    <img
                                        src={leader.image_url || "https://placehold.co/100x100"}
                                        alt="Leader"
                                        style={{
                                            width: "36px",
                                            height: "36px",
                                            borderRadius: "50%",
                                            objectFit: "cover",
                                            border: "2px solid var(--primary)"
                                        }}
                                    />
                                    <div style={{ minWidth: 0 }}>
                                        <h3 style={{ fontSize: "13px", margin: 0, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {leader.firstname} {leader.lastname}
                                        </h3>
                                        <p style={{ fontSize: "11px", margin: "2px 0 0 0", color: "#9ca3af" }}>{leader.tribe}</p>
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                    <span
                                        style={{
                                            padding: "2px 8px",
                                            borderRadius: "10px",
                                            background: "#dbeafe",
                                            color: "#1e40af",
                                            fontSize: "10px",
                                            fontWeight: 600
                                        }}
                                    >
                                        {leader.type}
                                    </span>
                                    {leader.ministry && leader.ministry !== "NONE" && (
                                        <span
                                            style={{
                                                padding: "2px 8px",
                                                borderRadius: "10px",
                                                background: "#fce7f3",
                                                color: "#9d174d",
                                                fontSize: "10px",
                                                fontWeight: 600
                                            }}
                                        >
                                            {leader.ministry}
                                        </span>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* ADD LEADER MODAL */}
            {showForm && (
                <div 
                    className="modal-overlay"
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(0,0,0,0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1000,
                        padding: "20px"
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowForm(false);
                    }}
                >
                    <div 
                        style={{
                            background: "#fff",
                            borderRadius: "12px",
                            width: "100%",
                            maxWidth: "500px",
                            maxHeight: "90vh",
                            overflow: "auto",
                            position: "relative"
                        }}
                    >
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "16px 20px",
                            borderBottom: "1px solid #e5e7eb",
                            position: "sticky",
                            top: 0,
                            background: "#fff",
                            zIndex: 10,
                            borderRadius: "12px 12px 0 0"
                        }}>
                            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Add New Leader</h2>
                            <button
                                onClick={() => setShowForm(false)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    fontSize: "18px",
                                    cursor: "pointer",
                                    color: "#6b7280",
                                    padding: "4px",
                                    lineHeight: 1
                                }}
                            >
                                ✕
                            </button>
                        </div>
                        <div style={{ padding: "16px 20px 20px" }}>
                            <LeaderForm 
                                refreshLeaders={() => {
                                    fetchLeaders();
                                    setShowForm(false);
                                }} 
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Leaders;