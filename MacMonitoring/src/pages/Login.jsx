import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { setCurrentUser, setNewcomer } from "../utils/auth";
import logo from "../assets/logo.png";

function Login() {
    const navigate = useNavigate();
    const [mode, setMode] = useState("leader");

    const [leaderFirstname, setLeaderFirstname] = useState("");
    const [pin, setPin] = useState("");

    const [newcomerFirstname, setNewcomerFirstname] = useState("");
    const [newcomerLastname, setNewcomerLastname] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLeaderLogin = async (e) => {
        e.preventDefault();
        setError("");

        if (!leaderFirstname || !pin) {
            setError("Please enter your first name and PIN.");
            return;
        }

        setLoading(true);

        const { data, error } = await supabase
            .from("tblMonitoring")
            .select("*")
            .ilike("firstname", leaderFirstname)
            .eq("pin", pin)
            .single();

        setLoading(false);

        if (error || !data) {
            setError("Invalid credentials. Please check your first name and PIN.");
            return;
        }

        setCurrentUser(data);

        if (data.type === "ADMIN" || data.ministry === "ADMIN") {
            navigate("/dashboard");
        } else {
            navigate(`/leader/${data.id}`);
        }
    };

    const handleNewcomerLogin = async (e) => {
        e.preventDefault();
        setError("");

        if (!newcomerFirstname || !newcomerLastname) {
            setError("Please enter your first and last name.");
            return;
        }

        setLoading(true);

        const { data, error } = await supabase
            .from("tblNewMembers")
            .select("*")
            .ilike("firstname", newcomerFirstname)
            .ilike("lastname", newcomerLastname)
            .single();

        setLoading(false);

        if (error || !data) {
            setError("No record found. Please check your name or contact your leader.");
            return;
        }

        setNewcomer(data);
        navigate(`/newcomer/${data.id}`);
    };

    return (
        <div className="login-page">
            <div className="login-card">
                {/* LOGO */}
                <div className="login-logo-section">
                  
                    <div className="login-brand">
                        <h1>Modern Acts Church</h1>
                        <p>TLDA Monitoring System</p>
                    </div>
                </div>

                {/* Mode Toggle */}
                <div className="login-mode-toggle">
                    <button
                        className={mode === "leader" ? "mode-btn active" : "mode-btn"}
                        onClick={() => { setMode("leader"); setError(""); }}
                    >
                        <span className="mode-icon">👤</span>
                        Leader Login
                    </button>
                    <button
                        className={mode === "newcomer" ? "mode-btn active" : "mode-btn"}
                        onClick={() => { setMode("newcomer"); setError(""); }}
                    >
                        <span className="mode-icon"></span>
                        Newcomer Login
                    </button>
                </div>

                {error && <div className="login-error">{error}</div>}

                {mode === "leader" ? (
                    <form onSubmit={handleLeaderLogin} className="login-form">
                        <div className="form-group">
                            <label>First Name</label>
                            <input
                                type="text"
                                placeholder="Enter your first name"
                                value={leaderFirstname}
                                onChange={(e) => setLeaderFirstname(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>PIN</label>
                            <input
                                type="password"
                                placeholder="Enter your PIN"
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="login-btn" disabled={loading}>
                            {loading ? "Logging in..." : "Login as Leader"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleNewcomerLogin} className="login-form">
                        <div className="form-group">
                            <label>First Name</label>
                            <input
                                type="text"
                                placeholder="Enter your first name"
                                value={newcomerFirstname}
                                onChange={(e) => setNewcomerFirstname(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Last Name</label>
                            <input
                                type="text"
                                placeholder="Enter your last name"
                                value={newcomerLastname}
                                onChange={(e) => setNewcomerLastname(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="login-btn newcomer-btn" disabled={loading}>
                            {loading ? "Logging in..." : "View My Journey"}
                        </button>
                        <p className="login-hint">
                            No password needed. Just enter your name to view your discipleship journey.
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
}

export default Login;