import { useState } from "react";

import { useNavigate } from "react-router-dom";

import { supabase } from "../lib/supabase";

function Login() {

    const navigate =
        useNavigate();

    const [firstname,
        setFirstname] =
        useState("");

    const [pin,
        setPin] =
        useState("");

    const [loading,
        setLoading] =
        useState(false);

    const handleLogin =
        async (e) => {

        e.preventDefault();

        if (!firstname || !pin) {

            alert(
                "Complete login fields."
            );

            return;
        }

        setLoading(true);

        const {
            data,
            error
        } = await supabase
            .from("tblMonitoring")
            .select("*")
            .ilike(
                "firstname",
                firstname
            )
            .eq("pin", pin)
            .single();

        setLoading(false);

        if (error || !data) {

            alert(
                "Invalid credentials."
            );

            return;
        }

        /* SAVE SESSION */

        localStorage.setItem(
            "emsUser",
            JSON.stringify(data)
        );

        /* REDIRECT */

        navigate(
            `/leader/${data.id}`
        );
    };

    return (

        <div className="login-page">

            <form
                className="login-card"
                onSubmit={handleLogin}
            >

                <h1>
                  MAC Login
                </h1>

                <p>
                    Engineering Management System
                </p>

                <input
                    type="text"
                    placeholder="First Name"
                    value={firstname}
                    onChange={(e) =>
                        setFirstname(
                            e.target.value
                        )
                    }
                />

                <input
                    type="password"
                    placeholder="PIN"
                    value={pin}
                    onChange={(e) =>
                        setPin(
                            e.target.value
                        )
                    }
                />

                <button type="submit">

                    {loading
                        ? "Logging in..."
                        : "Login"}

                </button>

            </form>

        </div>
    );
}

export default Login;