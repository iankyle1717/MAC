import {
    useEffect,
    useState
} from "react";

import Sidebar
from "../components/Sidebar";

import {
    supabase
} from "../lib/supabase";

import Swal
from "sweetalert2";

import * as XLSX
from "xlsx";

function Attendance() {

    const [leaders, setLeaders] =
        useState([]);

    const [attendanceMap,
        setAttendanceMap] =
        useState({});

    const [date, setDate] =
        useState(
            new Date()
                .toISOString()
                .split("T")[0]
        );

    const [selectedTribe,
        setSelectedTribe] =
        useState("");

    const [sortOrder,
        setSortOrder] =
        useState("asc");

    const [loading,
        setLoading] =
        useState(false);

    const [exportMonth,
        setExportMonth] =
        useState("");

    useEffect(() => {

        fetchLeaders();

    }, []);

    useEffect(() => {

        if (date) {

            fetchAttendance(date);
        }

    }, [date]);

    const fetchLeaders =
        async () => {

        const { data } =
            await supabase
                .from("tblMonitoring")
                .select("*")
                .order(
                    "firstname",
                    {
                        ascending: true
                    }
                );

        setLeaders(data || []);
    };

    const fetchAttendance =
        async (
            selectedDate
        ) => {

        const { data } =
            await supabase
                .from("tblAttendance")
                .select("*")
                .eq(
                    "service_date",
                    selectedDate
                );

        const map = {};

        data?.forEach(
            (item) => {

            map[
                item.leader_id
            ] =
                item.status;
        });

        setAttendanceMap(
            map
        );
    };

    const toggleAttendance =
        (leaderId) => {

        const current =
            attendanceMap[
                leaderId
            ];

        const newStatus =
            current ===
            "Present"
                ? "Absent"
                : "Present";

        setAttendanceMap(
            (prev) => ({

            ...prev,

            [leaderId]:
                newStatus
        }));
    };

    const getServiceLabel =
        () => {

        const selectedDay =
            new Date(date)
                .getDay();

        const formattedDate =
            new Date(date)
                .toLocaleDateString(
                    "en-US",
                    {
                        month:
                            "long",

                        day:
                            "numeric",

                        year:
                            "numeric"
                    }
                );

        if (
            selectedDay === 4
        ) {

            return `PRAYERWORKS ${formattedDate}`;
        }

        if (
            selectedDay === 5
        ) {

            return `FRIDAY YG ${formattedDate}`;
        }

        if (
            selectedDay === 0
        ) {

            return `SUNDAY ${formattedDate}`;
        }

        return null;
    };

    const handleSave =
        async () => {

        const day =
            new Date(date)
                .getDay();

        if (
            day !== 0 &&
            day !== 4 &&
            day !== 5
        ) {

            Swal.fire({

                icon:
                    "warning",

                title:
                    "No Service Day",

                text:
                    "Today is not a church service schedule.",

                confirmButtonColor:
                    "#c9a45c"
            });

            return;
        }

        setLoading(true);

        const remarks =
            getServiceLabel();

        const records =
            leaders.map(
                (leader) => ({

                leader_id:
                    leader.id,

                service_date:
                    date,

                status:
                    attendanceMap[
                        leader.id
                    ] ||
                    "Absent",

                remarks
            }));

        const { error } =
            await supabase
                .from(
                    "tblAttendance"
                )
                .upsert(
                    records
                );

        setLoading(false);

        if (error) {

            Swal.fire({

                icon:
                    "error",

                title:
                    "Save Failed",

                text:
                    "Attendance could not be saved."
            });

        } else {

            Swal.fire({

                icon:
                    "success",

                title:
                    "Attendance Saved",

                text:
                    remarks,

                timer:
                    1800,

                showConfirmButton:
                    false
            });
        }
    };

    const exportExcel =
        async () => {

        if (!exportMonth) {

            Swal.fire({

                icon:
                    "warning",

                title:
                    "Select Month",

                text:
                    "Please select a month first."
            });

            return;
        }

        const startDate =
            `${exportMonth}-01`;

        const endDate =
            `${exportMonth}-31`;

        const { data } =
            await supabase
                .from("tblAttendance")
                .select(`
                    *,
                    tblMonitoring (
                        firstname,
                        lastname,
                        tribe,
                        type
                    )
                `)
                .gte(
                    "service_date",
                    startDate
                )
                .lte(
                    "service_date",
                    endDate
                )
                .order(
                    "service_date",
                    {
                        ascending: true
                    }
                );

        if (!data ||
            data.length === 0
        ) {

            Swal.fire({

                icon:
                    "info",

                title:
                    "No Records",

                text:
                    "No attendance records found."
            });

            return;
        }

        const excelData =
            data.map(
                (item) => ({

                Name:
                    `${item.tblMonitoring?.firstname || ""} ${item.tblMonitoring?.lastname || ""}`,

                Tribe:
                    item.tblMonitoring?.tribe,

                Type:
                    item.tblMonitoring?.type,

                Status:
                    item.status,

                Date:
                    item.service_date,

                Remarks:
                    item.remarks
            }));

        const worksheet =
            XLSX.utils
                .json_to_sheet(
                    []
                );

        XLSX.utils.sheet_add_aoa(
            worksheet,
            [
                [
                    "MAC TLDA CHURCH"
                ],
                [
                    "Attendance Monitoring Report"
                ],
                [],
                [
                    "Generated:",
                    new Date()
                        .toLocaleString()
                ],
                []
            ],
            {
                origin: "A1"
            }
        );

        XLSX.utils.sheet_add_json(
            worksheet,
            excelData,
            {
                origin: "A6"
            }
        );

        worksheet["!cols"] = [

            { wch: 35 },

            { wch: 20 },

            { wch: 18 },

            { wch: 15 },

            { wch: 18 },

            { wch: 40 }
        ];

        const workbook =
            XLSX.utils
                .book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Attendance"
        );

        XLSX.writeFile(
            workbook,
            `Attendance-${exportMonth}.xlsx`
        );

        Swal.fire({

            icon:
                "success",

            title:
                "Excel Exported",

            text:
                "Attendance report downloaded successfully."
        });
    };

    const tribes =
        [...new Set(
            leaders.map(
                (l) =>
                    l.tribe
            )
        )];

    const filtered =
        leaders.filter(
            (leader) =>

            selectedTribe
                ? leader.tribe ===
                  selectedTribe
                : true
        );

    const sorted =
        [...filtered]
            .sort(
                (a, b) =>

                sortOrder ===
                "asc"

                    ? a.firstname
                        .localeCompare(
                            b.firstname
                        )

                    : b.firstname
                        .localeCompare(
                            a.firstname
                        )
            );

    return (

        <div className="layout">

            <Sidebar />

            <div className="content">

                <div className="attendance-header">

                    <div className="attendance-title">

                        <h1>
                            Attendance
                        </h1>

                        <p>
                            Church attendance monitoring
                        </p>

                    </div>

                </div>

                <div className="attendance-controls">

                    <input
                        type="date"
                        value={date}
                        onChange={(e) =>
                            setDate(
                                e.target.value
                            )
                        }
                    />

                    <select
                        value={
                            selectedTribe
                        }
                        onChange={(e) =>
                            setSelectedTribe(
                                e.target.value
                            )
                        }
                    >

                        <option value="">
                            All Tribes
                        </option>

                        {tribes.map(
                            (tribe) => (

                            <option
                                key={tribe}
                                value={tribe}
                            >

                                {tribe}

                            </option>

                        ))}

                    </select>

                    <button
                        onClick={() =>
                            setSortOrder(

                                sortOrder ===
                                "asc"

                                    ? "desc"
                                    : "asc"
                            )
                        }
                    >

                        Sort
                        {" "}
                        {sortOrder ===
                        "asc"
                            ? "A-Z"
                            : "Z-A"}

                    </button>

                    <button
                        className="save-attendance-btn"
                        onClick={
                            handleSave
                        }
                    >

                        {loading
                            ? "Saving..."
                            : "Save Attendance"}

                    </button>

                </div>

                <div className="export-controls">

                    <input
                        type="month"
                        value={exportMonth}
                        onChange={(e) =>
                            setExportMonth(
                                e.target.value
                            )
                        }
                    />

                    <button
                        className="export-btn"
                        onClick={exportExcel}
                    >

                        <span className="export-btn-icon">
                            ⬇
                        </span>

                        Export Excel

                    </button>

                </div>

                <div className="attendance-table-wrapper">

                    <table className="attendance-table">

                        <thead>

                            <tr>

                                <th>
                                    Name
                                </th>

                                <th>
                                    Tribe
                                </th>

                                <th>
                                    Type
                                </th>

                                <th>
                                    Status
                                </th>

                                <th>
                                    Action
                                </th>

                            </tr>

                        </thead>

                        <tbody>

                            {sorted.map(
                                (leader) => {

                                const status =
                                    attendanceMap[
                                        leader.id
                                    ] ||
                                    "Absent";

                                return (

                                    <tr
                                        key={
                                            leader.id
                                        }
                                    >

                                        <td>

                                            <div
                                                className="attendance-name"
                                            >

                                                <img
                                                    src={
                                                        leader.image_url
                                                    }
                                                    alt="Leader"
                                                    className="attendance-avatar"
                                                />

                                                <div>

                                                    {
                                                        leader.firstname
                                                    }
                                                    {" "}
                                                    {
                                                        leader.lastname
                                                    }

                                                </div>

                                            </div>

                                        </td>

                                        <td className="tribe-cell">

                                            {
                                                leader.tribe
                                            }

                                        </td>

                                        <td>

                                            <span
                                                className="type-badge"
                                            >

                                                {
                                                    leader.type
                                                }

                                            </span>

                                        </td>

                                        <td>

                                            <span
                                                className={`status-badge ${
                                                    status === "Present"
                                                        ? "status-present"
                                                        : "status-absent"
                                                }`}
                                            >

                                                {status}

                                            </span>

                                        </td>

                                        <td>

                                            <button
                                                className={`toggle-btn ${
                                                    status === "Present"
                                                        ? "present"
                                                        : "absent"
                                                }`}

                                                onClick={() =>
                                                    toggleAttendance(
                                                        leader.id
                                                    )
                                                }
                                            >

                                                Change

                                            </button>

                                        </td>

                                    </tr>
                                );
                            })}

                        </tbody>

                    </table>

                </div>

            </div>

        </div>
    );
}

export default Attendance;