import {
    Link,
    useLocation
} from "react-router-dom";

import logo
from "../assets/logo.png";

function Sidebar() {

    const location =
        useLocation();

    const isActive =
        (path) => {

        return location.pathname
            === path;
    };

    return (

        <div className="sidebar">

            <div
                className="sidebar-logo"
            >

                <img
                    src={logo}
                    alt="Logo"
                    className="logo-image"
                />

                <div>

                    <h2>
                        MAC TLDA
                    </h2>

                    <p>
                        Monitoring
                    </p>

                </div>

            </div>

            <div
                className="sidebar-links"
            >

                <Link
                    to="/"
                    className={
                        isActive("/")
                            ? "active-link"
                            : ""
                    }
                >
                    Dashboard
                </Link>

                <Link
                    to="/leaders"
                    className={
                        isActive(
                            "/leaders"
                        )
                            ? "active-link"
                            : ""
                    }
                >
                    Leaders
                </Link>

                <Link
                    to="/attendance"
                    className={
                        isActive(
                            "/attendance"
                        )
                            ? "active-link"
                            : ""
                    }
                >
                    Attendance
                </Link>

                <Link
                    to="/tithes"
                    className={
                        isActive(
                            "/tithes"
                        )
                            ? "active-link"
                            : ""
                    }
                >
                    Tithes
                </Link>

                <Link
                    to="/devotion"
                    className={
                        isActive(
                            "/devotion"
                        )
                            ? "active-link"
                            : ""
                    }
                >
                    Devotion
                </Link>

                <Link
                    to="/lifegroup"
                    className={
                        isActive(
                            "/lifegroup"
                        )
                            ? "active-link"
                            : ""
                    }
                >
                    Life Group
                </Link>

            </div>

        </div>

    );
}

export default Sidebar;