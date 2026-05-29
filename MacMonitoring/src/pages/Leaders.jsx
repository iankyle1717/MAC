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
        // When filtering by type, the cards should show counts within the OTHER active filters (tribe, ministry, search)
        // But NOT filter by type itself, so you can see all type counts
        return leaders.filter((leader) => {
            const fullName = `${leader.firstname} ${leader.lastname}`.toLowerCase();
            const matchesSearch = fullName.includes(search.toLowerCase());
            const matchesTribe = filterTribe === "ALL" ? true : leader.tribe === filterTribe;
            const matchesMinistry = filterMinistry === "ALL" ? true : leader.ministry === filterMinistry;
            // Note: we do NOT filter by type here, so cards show all types
            return matchesSearch && matchesTribe && matchesMinistry;
        });
    };

    const statsPool = getStatsPool();

    // Count helpers for stats cards - based on statsPool (filtered by tribe/ministry/search but NOT type)
    const countByType = (type) => statsPool.filter((l) => l.type === type).length;
    const countByMinistry = (ministry) => statsPool.filter((l) => l.ministry === ministry).length;

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
                {/* PAGE HEADER */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "20px"
                    }}
                >
                    <div>
                        <h1>Leaders</h1>
                        <p style={{ color: "var(--secondary)" }}>
                            Monitor TLDA performance records
                        </p>
                    </div>
                </div>

                {/* STATS CARDS - Dynamic based on tribe/ministry/search filters */}
                <div
                    className="stats-grid"
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
                        gap: "15px",
                        marginBottom: "25px"
                    }}
                >
                    <div
                        className="record-card"
                        onClick={() => handleQuickFilter("ALL")}
                        style={{
                            cursor: "pointer",
                            border: filterType === "ALL" ? "2px solid #c9a45c" : "none"
                        }}
                    >
                        <h3>All {hasActiveFilters ? "Filtered" : "Leaders"}</h3>
                        <h1>{statsPool.length}</h1>
                        {hasActiveFilters && (
                            <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>
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
                            border: filterType === "TRIBE LEADER" ? "2px solid #3b82f6" : "none"
                        }}
                    >
                        <h3>Tribe Leaders</h3>
                        <h1>{countByType("TRIBE LEADER")}</h1>
                    </div>

                    <div
                        className="record-card"
                        onClick={() => handleQuickFilter("ANDREW")}
                        style={{
                            cursor: "pointer",
                            border: filterType === "ANDREW" ? "2px solid #16a34a" : "none"
                        }}
                    >
                        <h3>Andrews</h3>
                        <h1>{countByType("ANDREW")}</h1>
                    </div>

                    <div
                        className="record-card"
                        onClick={() => handleQuickFilter("PETER")}
                        style={{
                            cursor: "pointer",
                            border: filterType === "PETER" ? "2px solid #dc2626" : "none"
                        }}
                    >
                        <h3>Peters</h3>
                        <h1>{countByType("PETER")}</h1>
                    </div>

                    <div
                        className="record-card"
                        onClick={() => handleQuickFilter("MEMBER")}
                        style={{
                            cursor: "pointer",
                            border: filterType === "MEMBER" ? "2px solid #6b7280" : "none"
                        }}
                    >
                        <h3>Members</h3>
                        <h1>{countByType("MEMBER")}</h1>
                    </div>
                </div>

                {/* TOGGLE LEADER FORM - ONLY FOR ADMIN & DISCIPLESHIP */}
                {canAdd && (
                    <div className="leader-action-bar">
                        <div>
                            <h2 className="leader-action-title">
                                Leader Registration
                            </h2>
                        </div>
                        <button
                            className="leader-toggle-btn"
                            onClick={() => setShowForm(!showForm)}
                        >
                            {showForm ? "Close Form" : "Add Leader"}
                        </button>
                    </div>
                )}

                {/* FORM - ONLY WHEN SHOWING AND HAS PERMISSION */}
                {canAdd && showForm && (
                    <div className="leader-form-wrapper">
                        <LeaderForm refreshLeaders={fetchLeaders} />
                    </div>
                )}

                {/* SEARCH & FILTER BAR */}
                <div
                    style={{
                        display: "flex",
                        gap: "15px",
                        marginTop: canAdd ? "20px" : "0",
                        marginBottom: "20px",
                        flexWrap: "wrap",
                        alignItems: "center"
                    }}
                >
                    <input
                        type="text"
                        placeholder="Search leader..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ flex: 1, minWidth: "200px" }}
                    />

                    <select
                        value={filterTribe}
                        onChange={(e) => setFilterTribe(e.target.value)}
                        style={{ width: "150px" }}
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
                        style={{ width: "180px" }}
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
                        style={{ width: "160px" }}
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
                                padding: "8px 16px",
                                borderRadius: "8px",
                                border: "1px solid #d1d5db",
                                background: "#f3f4f6",
                                cursor: "pointer",
                                fontSize: "13px"
                            }}
                        >
                            Clear All
                        </button>
                    )}
                </div>

                {/* ACTIVE FILTER INDICATOR */}
                {(filterTribe !== "ALL" || filterMinistry !== "ALL" || filterType !== "ALL") && (
                    <div style={{ marginBottom: "15px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "14px", color: "#6b7280" }}>Showing:</span>
                        {filterTribe !== "ALL" && (
                            <span style={{ padding: "4px 12px", borderRadius: "20px", background: "#dbeafe", color: "#1e40af", fontSize: "13px", fontWeight: "600" }}>
                                Tribe: {filterTribe}
                            </span>
                        )}
                        {filterMinistry !== "ALL" && (
                            <span style={{ padding: "4px 12px", borderRadius: "20px", background: "#fce7f3", color: "#9d174d", fontSize: "13px", fontWeight: "600" }}>
                                Ministry: {filterMinistry}
                            </span>
                        )}
                        {filterType !== "ALL" && (
                            <span style={{ padding: "4px 12px", borderRadius: "20px", background: "#fef3c7", color: "#92400e", fontSize: "13px", fontWeight: "600" }}>
                                Type: {filterType}
                            </span>
                        )}
                        <span style={{ fontSize: "14px", color: "#6b7280" }}>
                            ({filteredLeaders.length} results)
                        </span>
                    </div>
                )}

                {/* LOADING */}
                {loading ? (
                    <p>Loading leaders...</p>
                ) : filteredLeaders.length === 0 ? (
                    <p>No leaders found.</p>
                ) : (
                    /* LEADERS GRID */
                    <div className="leaders-grid">
                        {filteredLeaders.map((leader) => (
                            <Link
                                key={leader.id}
                                to={`/leader/${leader.id}`}
                                className="leader-card"
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "15px",
                                        marginBottom: "15px"
                                    }}
                                >
                                    <img
                                        src={leader.image_url || "https://placehold.co/100x100"}
                                        alt="Leader"
                                        style={{
                                            width: "60px",
                                            height: "60px",
                                            borderRadius: "50%",
                                            objectFit: "cover",
                                            border: "2px solid var(--primary)"
                                        }}
                                    />
                                    <div>
                                        <h3>
                                            {leader.firstname} {leader.lastname}
                                        </h3>
                                        <p>{leader.tribe}</p>
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                    <span
                                        style={{
                                            padding: "4px 10px",
                                            borderRadius: "12px",
                                            background: "#dbeafe",
                                            color: "#1e40af",
                                            fontSize: "12px",
                                            fontWeight: "600"
                                        }}
                                    >
                                        {leader.type}
                                    </span>
                                    {leader.ministry && leader.ministry !== "NONE" && (
                                        <span
                                            style={{
                                                padding: "4px 10px",
                                                borderRadius: "12px",
                                                background: "#fce7f3",
                                                color: "#9d174d",
                                                fontSize: "12px",
                                                fontWeight: "600"
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
        </div>
    );
}

export default Leaders;
