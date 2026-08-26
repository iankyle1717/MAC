import React from "react";
import { BookOpen, CalendarDays, Clock3, ArrowLeft, Image as ImageIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../styles/global.css";



function Comics() {
  const navigate = useNavigate();

  return (
    <div className="comics-page">

      {/* TOP BAR */}
      <div className="comics-topbar">
        <button
          className="books-button"
          onClick={() => navigate("/comics")}
        >
          <ArrowLeft size={16} />
          <span>Books of the Bible</span>
        </button>
      </div>

      {/* GENESIS HERO */}
      <section className="genesis-hero">

        <div className="genesis-info">

          <div className="genesis-title">
            <h3>Genesis</h3>
            <span>The Beginning</span>
          </div>
          <p className="genesis-description">
            The book of beginnings. It tells how God created the world,
            brought life, chose a people, and started His plan of redemption.
          </p>

          <div className="genesis-stats">

       

          </div>

        </div>

     

      </section>

    </div>
  );
}

export default Comics;