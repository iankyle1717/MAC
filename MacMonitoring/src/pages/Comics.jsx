import React from "react";
import { BookOpen, CalendarDays, Clock3, ArrowLeft, Image as ImageIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../styles/global.css";

const chapters = [
  { number: 1, title: "In the Beginning", description: "God creates the heavens and the earth." },
  { number: 2, title: "The Garden of Eden", description: "God creates man and places him in Eden." },
  { number: 3, title: "The Fall of Man", description: "Disobedience enters the world." },
  { number: 4, title: "Cain and Abel", description: "The first family and the first sin." },
  { number: 5, title: "The Genealogy", description: "The record of Adam's descendants." },
  { number: 6, title: "The Sons of God", description: "Wickedness fills the earth. Noah finds favor." },
  { number: 7, title: "The Great Flood", description: "The waters rise and cover the earth." },
  { number: 8, title: "The Waters Recede", description: "The floodwaters go down and hope appears." },
  { number: 9, title: "God's Covenant", description: "God promises never to destroy the earth again." },
  { number: 10, title: "The Nations", description: "The table of nations after the flood." },
  { number: 11, title: "The Tower of Babel", description: "Pride leads to the confusion of languages." },
  { number: 12, title: "The Call of Abram", description: "God calls Abram to leave and promises blessings." },
  { number: 13, title: "Abram and Lot", description: "A separation to avoid conflict." },
  { number: 14, title: "Abram Rescues Lot", description: "Abram rescues Lot and is blessed by Melchizedek." },
  { number: 15, title: "God's Promise", description: "God's covenant with Abram is confirmed." },
  { number: 16, title: "Hagar and Ishmael", description: "Sarai gives Hagar to Abram as a servant." },
  { number: 17, title: "The Covenant of Circumcision", description: "Abram's name is changed to Abraham." },
  { number: 18, title: "The Visitors", description: "The Lord visits Abraham with a promise." },
  { number: 19, title: "Sodom and Gomorrah", description: "Lot is rescued and the cities are destroyed." },
  { number: 20, title: "Abraham and Abimelech", description: "Abraham sojourns in Gerar and God protects him." },
  { number: 21, title: "The Birth of Isaac", description: "God fulfills His promise; Isaac is born." },
  { number: 22, title: "Abraham Tested", description: "Abraham is tested and trusts God." },
  { number: 23, title: "Sarah's Death", description: "Abraham mourns Sarah and purchases a burial place." },
  { number: 24, title: "Isaac and Rebekah", description: "A wife is found for Isaac." },
  { number: 25, title: "Esau and Jacob", description: "The sons of Isaac are born." },
  { number: 26, title: "Isaac and Abimelech", description: "God blesses Isaac in the land." },
  { number: 27, title: "Jacob Receives the Blessing", description: "Jacob receives Isaac's blessing." },
  { number: 28, title: "Jacob's Ladder", description: "God speaks to Jacob in a dream." },
  { number: 29, title: "Jacob Marries Leah and Rachel", description: "Jacob begins his family in Haran." },
  { number: 30, title: "Jacob's Children", description: "Jacob's family continues to grow." },
  { number: 31, title: "Jacob Leaves Laban", description: "Jacob returns toward his homeland." },
  { number: 32, title: "Jacob Wrestles With God", description: "Jacob encounters God and receives a new name." },
  { number: 33, title: "Jacob Meets Esau", description: "Jacob and Esau reconcile." },
  { number: 34, title: "Dinah and Shechem", description: "A conflict arises involving Dinah." },
  { number: 35, title: "Jacob Returns to Bethel", description: "God renews His covenant with Jacob." },
  { number: 36, title: "The Descendants of Esau", description: "The family line of Esau is recorded." },
  { number: 37, title: "Joseph's Dreams", description: "Joseph dreams of his future." },
  { number: 38, title: "Judah and Tamar", description: "The story of Judah and Tamar." },
  { number: 39, title: "Joseph in Egypt", description: "Joseph serves in Potiphar's house." },
  { number: 40, title: "Joseph Interprets Dreams", description: "Joseph interprets the dreams of Pharaoh's servants." },
  { number: 41, title: "Joseph Becomes Governor", description: "Joseph rises to power in Egypt." },
  { number: 42, title: "Joseph's Brothers Arrive", description: "Joseph's brothers come to Egypt for food." },
  { number: 43, title: "Benjamin Goes to Egypt", description: "Joseph's brothers return with Benjamin." },
  { number: 44, title: "Joseph Tests His Brothers", description: "Joseph tests whether his brothers have changed." },
  { number: 45, title: "Joseph Reveals Himself", description: "Joseph reveals his identity to his brothers." },
  { number: 46, title: "Jacob Goes to Egypt", description: "Jacob and his family travel to Egypt." },
  { number: 47, title: "Jacob's Family in Egypt", description: "Joseph provides for his family during the famine." },
  { number: 48, title: "Jacob Blesses Joseph's Sons", description: "Jacob blesses Ephraim and Manasseh." },
  { number: 49, title: "Jacob Blesses His Sons", description: "Jacob speaks blessings over his sons." },
  { number: 50, title: "Joseph's Death", description: "Joseph forgives his brothers and dies in Egypt." },
];

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
            <h1>Genesis</h1>
            <span>The Beginning</span>
          </div>

          <p className="genesis-description">
            The book of beginnings. It tells how God created the world,
            brought life, chose a people, and started His plan of redemption.
          </p>

          <div className="genesis-stats">

            <div className="stat-card">
              <BookOpen size={25} />
              <div>
                <small>Chapters</small>
                <strong>50</strong>
              </div>
            </div>

            <div className="stat-card">
              <CalendarDays size={25} />
              <div>
                <small>Events</small>
                <strong>Major Events</strong>
              </div>
            </div>

            <div className="stat-card">
              <Clock3 size={25} />
              <div>
                <small>Read Time</small>
                <strong>~2–3 Hours</strong>
              </div>
            </div>

          </div>

        </div>

        {/* COVER PLACEHOLDER */}
        <div className="genesis-cover">
          <ImageIcon size={55} />
          <span>Genesis Cover Illustration</span>
          <small>Comics style</small>
        </div>

      </section>

      {/* CHAPTERS */}
      <section className="chapters-section">

        <div className="chapters-heading">
          <h2>
            All Chapters <span>(50)</span>
          </h2>
        </div>

        <div className="chapters-grid">

          {chapters.map((chapter) => (

            <article
              className="chapter-card"
              key={chapter.number}
            >

              <div className="chapter-image">

                <span className="chapter-number">
                  Chapter {chapter.number}
                </span>

                <div className="image-placeholder">
                  <ImageIcon size={35} />
                </div>

              </div>

              <div className="chapter-content">

                <h3>{chapter.title}</h3>

                <p>{chapter.description}</p>

              </div>

            </article>

          ))}

        </div>

      </section>

    </div>
  );
}

export default Comics;