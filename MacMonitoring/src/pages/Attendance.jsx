import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";

function Attendance() {
    const [leaders, setLeaders] = useState([]);
    const [newcomers, setNewcomers] = useState([]);
    const [attendanceMap, setAttendanceMap] = useState({});
    const [newcomerAttendanceMap, setNewcomerAttendanceMap] = useState({});
    const [activeTab, setActiveTab] = useState("members");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [selectedTribe, setSelectedTribe] = useState("");
    const [sortOrder, setSortOrder] = useState("asc");
    const [loading, setLoading] = useState(false);
    const [exportMonth, setExportMonth] = useState("");

    useEffect(() => {
        fetchLeaders();
        fetchNewcomers();
    }, []);

    useEffect(() => {
        if (date) fetchAttendance(date);
    }, [date]);

    /* ========================= FETCH LEADERS ========================= */
    const fetchLeaders = async () => {
        const { data } = await supabase
            .from("tblMonitoring")
            .select("*")
            .order("firstname", { ascending: true });
        setLeaders(data || []);
    };

    /* ========================= FETCH NEWCOMERS ========================= */
    const fetchNewcomers = async () => {
        const { data } = await supabase
            .from("tblNewMembers")
            .select("*")
            .order("firstname", { ascending: true });
        setNewcomers(data || []);
    };

    /* ========================= FETCH ATTENDANCE ========================= */
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

    /* ========================= TOGGLE MEMBER ========================= */
    const toggleAttendance = (leaderId) => {
        const current = attendanceMap[leaderId];
        const newStatus = current === "Present" ? "Absent" : "Present";
        setAttendanceMap((prev) => ({ ...prev, [leaderId]: newStatus }));
    };

    /* ========================= TOGGLE NEWCOMER ========================= */
    const toggleNewcomerAttendance = (memberId) => {
        const current = newcomerAttendanceMap[memberId];
        const newStatus = current === "Present" ? "Absent" : "Present";
        setNewcomerAttendanceMap((prev) => ({ ...prev, [memberId]: newStatus }));
    };

    /* ========================= SERVICE LABEL ========================= */
    const getServiceLabel = () => {
        const selectedDay = new Date(date).getDay();
        const formattedDate = new Date(date).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
        });
        if (selectedDay === 4) return `PRAYERWORKS ${formattedDate}`;
        if (selectedDay === 5) return `FRIDAY YG ${formattedDate}`;
        if (selectedDay === 0) return `SUNDAY ${formattedDate}`;
        return null;
    };

    /* ========================= SAVE ATTENDANCE ========================= */
    const handleSave = async () => {
        const day = new Date(date).getDay();
        if (day !== 0 && day !== 4 && day !== 5) {
            Swal.fire({
                icon: "warning",
                title: "No Service Day",
                text: "Today is not a church service schedule.",
                confirmButtonColor: "#c9a45c",
            });
            return;
        }
        setLoading(true);
        const remarks = getServiceLabel();
        const records = leaders.map((leader) => ({
            leader_id: leader.id,
            service_date: date,
            status: attendanceMap[leader.id] || "Absent",
            remarks,
        }));
        const { error } = await supabase.from("tblAttendance").upsert(records);
        setLoading(false);
        if (error) {
            Swal.fire({
                icon: "error",
                title: "Save Failed",
                text: "Attendance could not be saved.",
            });
        } else {
            Swal.fire({
                icon: "success",
                title: "Attendance Saved",
                text: remarks,
                timer: 1800,
                showConfirmButton: false,
            });
        }
    };

    /* ========================= EXPORT EXCEL ========================= */
    const exportExcel = async () => {
        if (!exportMonth) {
            Swal.fire({
                icon: "warning",
                title: "Select Month",
                text: "Please select a month first.",
            });
            return;
        }
        const startDate = `${exportMonth}-01`;
        const endDate = `${exportMonth}-31`;
        const { data } = await supabase
            .from("tblAttendance")
            .select(`*, tblMonitoring (firstname, lastname, tribe, type)`)
            .gte("service_date", startDate)
            .lte("service_date", endDate)
            .order("service_date", { ascending: true });

        if (!data || data.length === 0) {
            Swal.fire({
                icon: "info",
                title: "No Records",
                text: "No attendance records found.",
            });
            return;
        }

        const excelData = data.map((item) => ({
            Name: `${item.tblMonitoring?.firstname || ""} ${item.tblMonitoring?.lastname || ""}`,
            Tribe: item.tblMonitoring?.tribe,
            Type: item.tblMonitoring?.type,
            Status: item.status,
            Date: item.service_date,
            Remarks: item.remarks,
        }));

        const worksheet = XLSX.utils.json_to_sheet([]);
        XLSX.utils.sheet_add_aoa(
            worksheet,
            [
                ["MAC TLDA CHURCH"],
                ["Attendance Monitoring Report"],
                [],
                ["Generated:", new Date().toLocaleString()],
                [],
            ],
            { origin: "A1" }
        );
        XLSX.utils.sheet_add_json(worksheet, excelData, { origin: "A6" });
        worksheet["!cols"] = [
            { wch: 35 },
            { wch: 20 },
            { wch: 18 },
            { wch: 15 },
            { wch: 18 },
            { wch: 40 },
        ];
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
        XLSX.writeFile(workbook, `Attendance-${exportMonth}.xlsx`);
        Swal.fire({
            icon: "success",
            title: "Excel Exported",
            text: "Attendance report downloaded successfully.",
        });
    };

    /* ========================= HELPERS ========================= */
    const tribes = [...new Set(leaders.map((l) => l.tribe))];

    const filtered = leaders.filter((leader) =>
        selectedTribe ? leader.tribe === selectedTribe : true
    );

    const sorted = [...filtered].sort((a, b) =>
        sortOrder === "asc"
            ? a.firstname.localeCompare(b.firstname)
            : b.firstname.localeCompare(a.firstname)
    );

    // Profile card data (all leaders, not filtered, to show summary counts)
    const getProfileData = () => {
        return leaders.map((leader) => {
            const status = attendanceMap[leader.id] || "Absent";
            // Count how many times this person appears in attendance records for the selected date
            // For the card, we show their current status count (1/1 if present, 0/1 if absent)
            const presentCount = status === "Present" ? 1 : 0;
            return { ...leader, presentCount, totalCount: 1 };
        });
    };

    const profileData = getProfileData();

    // For the table, we use the filtered + sorted data
    const tableData = activeTab === "members" ? sorted : newcomers;

    /* ========================= STATUS STYLES ========================= */
    const getStatusBadgeClass = (status) => {
        if (status === "Present") return "status-present";
        if (status === "On Leave") return "status-onleave";
        return "status-absent";
    };

    return (
        <div className="layout">
            <Sidebar />
            <div className="content">
                {/* ===== HEADER ===== */}
                <div className="attendance-header">
                    <div className="attendance-title">
                        <h1>Attendance</h1>
                        <p>Church attendance monitoring</p>
                    </div>
                </div>

                {/* ===== CONTROLS ===== */}
                <div className="attendance-controls">
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                    />
                    <select
                        value={selectedTribe}
                        onChange={(e) => setSelectedTribe(e.target.value)}
                    >
                        <option value="">All Tribes</option>
                        {tribes.map((tribe) => (
                            <option key={tribe} value={tribe}>
                                {tribe}
                            </option>
                        ))}
                    </select>
                    <button onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
                        Sort {sortOrder === "asc" ? "A-Z" : "Z-A"}
                    </button>
                    <button className="save-attendance-btn" onClick={handleSave}>
                        {loading ? "Saving..." : "Save Attendance"}
                    </button>
                    <input
                        type="month"
                        value={exportMonth}
                        onChange={(e) => setExportMonth(e.target.value)}
                    />
                    <button className="export-btn" onClick={exportExcel}>
                        <span className="export-btn-icon">⬇</span> Export Excel
                    </button>
                </div>

                {/* ===== TABS ===== */}
                <div className="attendance-tabs">
                    <button
                        className={activeTab === "members" ? "tab-btn active-tab" : "tab-btn"}
                        onClick={() => setActiveTab("members")}
                    >
                        Members
                    </button>
                    <button
                        className={activeTab === "newcomers" ? "tab-btn active-tab" : "tab-btn"}
                        onClick={() => setActiveTab("newcomers")}
                    >
                        Newcomers
                    </button>
                </div>

                {/* ===== PROFILES CARD GRID (Members only) ===== */}
                {activeTab === "members" && (
                    <div className="profiles-section">
                        <div className="profiles-header">
                            <h2>
                                <span className="profiles-icon">👤</span> Profiles
                            </h2>
                            <button className="minimize-btn">⌃ Minimize</button>
                        </div>
                        <div className="profiles-grid">
                            {profileData.map((leader) => (
                                <div className="profile-card" key={leader.id}>
                                    <div className="profile-card-left">
                                        <div className="profile-avatar">
                                            {leader.image_url ? (
                                                <img src={leader.image_url} alt="" />
                                            ) : (
                                                <div className="avatar-placeholder">👤</div>
                                            )}
                                        </div>
                                        <div className="profile-info">
                                            <div className="profile-name">
                                                {leader.firstname} {leader.lastname}
                                            </div>
                                            <div className="profile-label">NAME</div>
                                        </div>
                                    </div>
                                    <div className="profile-card-right">
                                        <div
                                            className={`profile-count ${
                                                leader.presentCount > 0 ? "count-active" : "count-inactive"
                                            }`}
                                        >
                                            {leader.presentCount}/{leader.totalCount}
                                        </div>
                                        <div className="profile-label">TRIBE</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ===== ATTENDANCE LIST TABLE ===== */}
                <div className="attendance-list-section">
                    <div className="attendance-list-header">
                        <h2>
                            <span className="list-icon">☰</span> Attendance List
                        </h2>
                    </div>
                    <div className="attendance-table-wrapper">
                        <table className="attendance-table">
                            <thead>
                                <tr>
                                    <th>Full Name</th>
                                    <th>Tribe</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeTab === "members" &&
                                    sorted.map((leader) => {
                                        const status = attendanceMap[leader.id] || "Absent";
                                        return (
                                            <tr key={leader.id}>
                                                <td>{leader.firstname} {leader.lastname}</td>
                                                <td>
                                                    <span className="tribe-badge">{leader.tribe}</span>
                                                </td>
                                                <td>
                                                    <span className={`status-badge ${getStatusBadgeClass(status)}`}>
                                                        {status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <button
                                                            className="action-edit"
                                                            onClick={() => toggleAttendance(leader.id)}
                                                        >
                                                            {status === "Present" ? "Edit/Mark Absent" : "Edit/Mark Present"}
                                                        </button>
                                                        <button className="action-icon edit-icon">✏️</button>
                                                        <button className="action-icon delete-icon">🗑️</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                {activeTab === "newcomers" &&
                                    newcomers.map((member) => {
                                        const status = newcomerAttendanceMap[member.id] || "Absent";
                                        return (
                                            <tr key={member.id}>
                                                <td>{member.firstname} {member.lastname}</td>
                                                <td>
                                                    <span className="tribe-badge">{member.tribe}</span>
                                                </td>
                                                <td>
                                                    <span className={`status-badge ${getStatusBadgeClass(status)}`}>
                                                        {status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <button
                                                            className="action-edit"
                                                            onClick={() => toggleNewcomerAttendance(member.id)}
                                                        >
                                                            {status === "Present" ? "Edit/Mark Absent" : "Edit/Mark Present"}
                                                        </button>
                                                        <button className="action-icon edit-icon">✏️</button>
                                                        <button className="action-icon delete-icon">🗑️</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
//#region --CSS STYLES--
            {/* ===== STYLES ===== */}
            <style>{`
                .layout {
                    display: flex;
                    min-height: 100vh;
                    background: #f8f9fa;
                }
                .content {
                    flex: 1;
                    padding: 24px 32px;
                    overflow-y: auto;
                }
                .attendance-header {
                    margin-bottom: 20px;
                }
                .attendance-title h1 {
                    font-size: 28px;
                    font-weight: 700;
                    color: #1a1a2e;
                    margin: 0;
                }
                .attendance-title p {
                    color: #6b7280;
                    margin: 4px 0 0 0;
                    font-size: 14px;
                }
                .attendance-controls {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                    align-items: center;
                    margin-bottom: 20px;
                    background: #fff;
                    padding: 16px;
                    border-radius: 12px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }
                .attendance-controls input,
                .attendance-controls select {
                    padding: 8px 12px;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    font-size: 14px;
                    outline: none;
                }
                .attendance-controls button {
                    padding: 8px 16px;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    background: #fff;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s;
                }
                .attendance-controls button:hover {
                    background: #f3f4f6;
                }
                .save-attendance-btn {
                    background: #c9a45c !important;
                    color: #fff !important;
                    border-color: #c9a45c !important;
                }
                .save-attendance-btn:hover {
                    background: #b8944f !important;
                }
                .export-btn {
                    background: #1a1a2e !important;
                    color: #fff !important;
                    border-color: #1a1a2e !important;
                }
                .export-btn:hover {
                    background: #2d2d44 !important;
                }
                .attendance-tabs {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 20px;
                }
                .tab-btn {
                    padding: 10px 24px;
                    border: none;
                    border-radius: 8px;
                    background: #e5e7eb;
                    color: #6b7280;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: all 0.2s;
                }
                .tab-btn:hover {
                    background: #d1d5db;
                }
                .active-tab {
                    background: #1a1a2e !important;
                    color: #fff !important;
                }

                /* ===== PROFILES SECTION ===== */
                .profiles-section {
                    background: #fff;
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 24px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }
                .profiles-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }
                .profiles-header h2 {
                    font-size: 16px;
                    font-weight: 600;
                    color: #1a1a2e;
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .profiles-icon {
                    font-size: 18px;
                }
                .minimize-btn {
                    background: #f3f4f6;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    color: #6b7280;
                    cursor: pointer;
                }
                .profiles-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 12px;
                }
                .profile-card {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 14px 16px;
                    border: 1px solid #e5e7eb;
                    border-radius: 10px;
                    background: #fff;
                    transition: box-shadow 0.2s;
                }
                .profile-card:hover {
                    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
                }
                .profile-card-left {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .profile-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    overflow: hidden;
                    background: #e5e7eb;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .profile-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .avatar-placeholder {
                    font-size: 20px;
                }
                .profile-info {
                    display: flex;
                    flex-direction: column;
                }
                .profile-name {
                    font-size: 14px;
                    font-weight: 600;
                    color: #1a1a2e;
                }
                .profile-label {
                    font-size: 10px;
                    color: #9ca3af;
                    letter-spacing: 0.5px;
                    margin-top: 2px;
                }
                .profile-card-right {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                }
                .profile-count {
                    font-size: 16px;
                    font-weight: 700;
                }
                .count-active {
                    color: #c9a45c;
                }
                .count-inactive {
                    color: #6b7280;
                }

                /* ===== ATTENDANCE LIST SECTION ===== */
                .attendance-list-section {
                    background: #fff;
                    border-radius: 12px;
                    padding: 20px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }
                .attendance-list-header {
                    margin-bottom: 16px;
                }
                .attendance-list-header h2 {
                    font-size: 16px;
                    font-weight: 600;
                    color: #1a1a2e;
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .list-icon {
                    font-size: 18px;
                }
                .attendance-table-wrapper {
                    overflow-x: auto;
                }
                .attendance-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .attendance-table thead th {
                    text-align: left;
                    padding: 12px 16px;
                    font-size: 13px;
                    font-weight: 600;
                    color: #374151;
                    background: #f3f4f6;
                    border-bottom: 1px solid #e5e7eb;
                }
                .attendance-table tbody td {
                    padding: 14px 16px;
                    border-bottom: 1px solid #f3f4f6;
                    font-size: 14px;
                    color: #1f2937;
                }
                .attendance-table tbody tr:hover {
                    background: #f9fafb;
                }
                .tribe-badge {
                    display: inline-block;
                    padding: 4px 12px;
                    background: #e5e7eb;
                    border-radius: 20px;
                    font-size: 12px;
                    color: #4b5563;
                    font-weight: 500;
                }
                .status-badge {
                    display: inline-block;
                    padding: 4px 14px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                }
                .status-present {
                    background: #d1fae5;
                    color: #065f46;
                }
                .status-absent {
                    background: #fee2e2;
                    color: #991b1b;
                }
                .status-onleave {
                    background: #fef3c7;
                    color: #92400e;
                }
                .action-buttons {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .action-edit {
                    background: none;
                    border: none;
                    color: #2563eb;
                    font-size: 13px;
                    cursor: pointer;
                    padding: 0;
                    text-decoration: none;
                }
                .action-edit:hover {
                    text-decoration: underline;
                }
                .action-icon {
                    width: 32px;
                    height: 32px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                }
                .edit-icon {
                    background: #dbeafe;
                    color: #2563eb;
                }
                .edit-icon:hover {
                    background: #bfdbfe;
                }
                .delete-icon {
                    background: #fee2e2;
                    color: #dc2626;
                }
                .delete-icon:hover {
                    background: #fecaca;
                }

                /* ===== RESPONSIVE ===== */
                @media (max-width: 768px) {
                    .content {
                        padding: 16px;
                    }
                    .profiles-grid {
                        grid-template-columns: 1fr;
                    }
                    .attendance-controls {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    .attendance-controls input,
                    .attendance-controls select,
                    .attendance-controls button {
                        width: 100%;
                    }
                }
            `}</style>
//#endregion

        </div>
    );
}

export default Attendance;