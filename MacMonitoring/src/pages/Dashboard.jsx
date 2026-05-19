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

    useEffect(() => {

        fetchDashboard();

    }, []);

    const fetchDashboard =
        async () => {

        const {
            data
        } = await supabase
            .from("tblMonitoring")
            .select("*");

        if (!data) return;

        /* TOTAL CHURCH POPULATION */

        setTotalPeople(
            data.length
        );

        /* ACTIVE LEADERS */

        const leaders =
            data.filter(
                (item) =>
                    item.type !==
                    "MEMBER"
            );

        setTotalLeaders(
            leaders.length
        );

        /* ACTIVE TRIBES */

        const uniqueTribes =
            [
                ...new Set(
                    data.map(
                        (item) =>
                            item.tribe
                    )
                )
            ];

        setTotalTribes(
            uniqueTribes.length
        );
    };

    return (

        <div className="layout">

            <Sidebar />

            <div className="content">

                {/* HERO */}

                <div className="dashboard-hero">

                    <p className="hero-label">
                        MAC TLDA Monitoring
                    </p>

                    <h1 className="hero-heading">

                        Ministry Monitoring
                        System

                    </h1>

                    <p className="hero-text">

                        A centralized church
                        monitoring platform
                        for leadership,
                        discipleship,
                        attendance,
                        and ministry
                        management.

                    </p>

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

                            Total registered
                            people inside
                            the church system
                            including leaders
                            and members.

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

                            Andrew, Peter
                            and Tribe Leaders
                            currently monitored
                            by TLDA.

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

                            Total active tribes
                            connected inside
                            the ministry
                            network system.

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
                            to reach others
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
                            of God,
                            influencing people
                            through faith and
                            purpose that
                            transforms
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