import {
    useEffect,
    useState
} from "react";

import Sidebar
from "../components/Sidebar";

import {
    supabase
} from "../lib/supabase";

function Dashboard() {

    const [
        totalPeople,
        setTotalPeople
    ] = useState(0);

    const [
        totalLeaders,
        setTotalLeaders
    ] = useState(0);

    const [
        totalTribes,
        setTotalTribes
    ] = useState(0);

    const [
        totalNewcomers,
        setTotalNewcomers
    ] = useState(0);

    const [
        totalWinning,
        setTotalWinning
    ] = useState(0);

    const [
        totalSchooling,
        setTotalSchooling
    ] = useState(0);

    useEffect(() => {

        fetchDashboard();

    }, []);

    const fetchDashboard =
        async () => {

        /* =========================
           FETCH LEADERS
        ========================= */

        const {
            data: leadersData
        } = await supabase
            .from("tblMonitoring")
            .select("*");

        /* =========================
           FETCH NEWCOMERS
        ========================= */

        const {
            data: newcomersData
        } = await supabase
            .from("tblNewMembers")
            .select("*");

        if (!leadersData)
            return;

        const leaders =
            leadersData || [];

        const newcomers =
            newcomersData || [];

        /* =========================
           TOTAL CHURCH POPULATION
        ========================= */

        setTotalPeople(
            leaders.length +
            newcomers.length
        );

        /* =========================
           ACTIVE LEADERS
        ========================= */

        setTotalLeaders(
            leaders.length
        );

        /* =========================
           ACTIVE TRIBES
        ========================= */

        const uniqueTribes =
            [
                ...new Set(
                    leaders
                        .map(
                            (item) =>
                                item.tribe
                        )
                        .filter(Boolean)
                )
            ];

        setTotalTribes(
            uniqueTribes.length
        );

        /* =========================
           NEWCOMERS
        ========================= */

        setTotalNewcomers(
            newcomers.length
        );

        /* =========================
           WINNING
        ========================= */

        setTotalWinning(

            newcomers.filter(
                (item) =>
                    item.remarks ===
                    "Winning"
            ).length
        );

        /* =========================
           SCHOOLING
        ========================= */

        setTotalSchooling(

            newcomers.filter(
                (item) =>
                    item.remarks ===
                    "Schooling"
            ).length
        );
    };

    return (

        <div className="layout">

            <Sidebar />

            <div className="content">

                {/* HERO */}

                <div className="dashboard-hero">

                    <h1 className="hero-heading">

                        Modern Acts Church Monitoring System

                    </h1>
                
                </div>

                {/* STATISTICS */}

                <div className="dashboard-grid">

                    <div className="info-card">

                        <p className="info-label">
                            Church Population
                        </p>

                        <h1 className="info-number">
                            {totalPeople}
                        </h1>

                        <p className="info-description">

                            Total leaders and
                            newcomers currently
                            recorded inside
                            the monitoring
                            system.

                        </p>

                    </div>

                    <div className="info-card">

                        <p className="info-label">
                            Active Leaders
                        </p>

                        <h1 className="info-number">
                            {totalLeaders}
                        </h1>

                        <p className="info-description">

                            Total registered
                            TLDA leaders being
                            monitored by
                            the ministry.

                        </p>

                    </div>

                    <div className="info-card">

                        <p className="info-label">
                            Active Tribes
                        </p>

                        <h1 className="info-number">
                            {totalTribes}
                        </h1>

                        <p className="info-description">

                            Total tribes
                            connected and
                            active inside
                            the church
                            network system.

                        </p>

                    </div>

                    <div className="info-card">

                        <p className="info-label">
                            Newcomers
                        </p>

                        <h1 className="info-number">
                            {totalNewcomers}
                        </h1>

                        <p className="info-description">

                            Total newcomers
                            currently undergoing 
                            discipleship process.

                        </p>

                    </div>
{/* 
                    <div className="info-card">

                        <p className="info-label">
                            Winning Stage
                        </p>

                        <h1 className="info-number">
                            {totalWinning}
                        </h1>

                        <p className="info-description">

                            Newcomers currently
                            in the Winning
                            stage of the
                            Winning process.

                        </p>

                    </div> */}

                    <div className="info-card">

                        <p className="info-label">
                            Schooling Stage
                        </p>

                        <h1 className="info-number">
                            {totalSchooling}
                        </h1>

                        <p className="info-description">

                            Newcomers ready
                            for leadership and
                            discipleship growth.

                        </p>
                    </div>

                </div>

                {/* MISSION & VISION */}

                <div className="dashboard-grid">

                    <div className="content-card">

                        <p className="section-title">
                            Mission
                        </p>

                        <h2>

                            To glorify God by
                            equipping and
                            transforming lives.

                        </h2>

                        <p>

                            To glorify God by
                            equipping,
                            influencing,
                            winning souls,
                            and serving people
                            to become
                            Christ-like
                            individuals with
                            transformed lives
                            that reach others
                            for Christ.

                        </p>

                    </div>

                    <div className="content-card">

                        <p className="section-title">
                            Vision
                        </p>

                        <h2>

                            Transforming
                            communities,
                            families,
                            campuses and lives.

                        </h2>

                        <p>

                            We are disciple
                            equipping servants
                            of God influencing
                            people through
                            faith and purpose
                            that transforms
                            communities,
                            campuses,
                            families and lives
                            for the glory
                            of God.

                        </p>

                    </div>

                </div>

                {/* LOCATION */}

                <div className="location-box">

                    <p className="section-title">
                        Church Location
                    </p>

                    <h2>

                        National Highway,
                        Brgy. Del Carmen,
                        Cabangan,
                        Zambales

                    </h2>

                </div>

            </div>

        </div>
    );
}

export default Dashboard;