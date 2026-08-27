import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Clock3,
  ArrowLeft,
  ArrowRight,
  Image as ImageIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import "../styles/global.css";
import "../styles/Comics.css";

import bbleCover from "../assets/bbleee.jpg";

/* ════════════════════════════════════════════════════════════════════════
   GENESIS COMIC IMAGE AUTO-LOADER

   Naming system:
     ge1.png  = Genesis Chapter 1
     ge2.png  = Genesis Chapter 2
     ge3.png  = Genesis Chapter 3
     ...
     ge50.png = Genesis Chapter 50

   Drop new files into src/assets/comics/genesis/ and they show up
   automatically — nothing else in this file needs to change.
   ════════════════════════════════════════════════════════════════════════ */

const genesisImageFiles = import.meta.glob("../assets/comics/genesis/ge*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

const genesisImages = {};
Object.entries(genesisImageFiles).forEach(([path, imageUrl]) => {
  const match = path.match(/ge(\d+)\.png$/i);
  if (match) {
    genesisImages[Number(match[1])] = imageUrl;
  }
});

/* ════════════════════════════════════════════════════════════════════════
   66 BOOKS OF THE BIBLE
   ════════════════════════════════════════════════════════════════════════ */

const bibleBooks = [
  { name: "Genesis", testament: "OT", chapters: 50, category: "Law", desc: "The book of beginnings.", longDesc: "The book of beginnings. It tells how God created the world, brought life, chose a people, and started His plan of redemption." },
  { name: "Exodus", testament: "OT", chapters: 40, category: "Law", desc: "Israel's deliverance from Egypt.", longDesc: "The story of Israel's deliverance from slavery in Egypt and the giving of the Law at Sinai." },
  { name: "Leviticus", testament: "OT", chapters: 27, category: "Law", desc: "Laws for holiness and worship.", longDesc: "God gives Moses the laws for sacrifices, priesthood, and holy living for His people." },
  { name: "Numbers", testament: "OT", chapters: 36, category: "Law", desc: "Israel in the wilderness.", longDesc: "The census and wandering of Israel in the wilderness before entering the Promised Land." },
  { name: "Deuteronomy", testament: "OT", chapters: 34, category: "Law", desc: "Moses restates the Law.", longDesc: "Moses reviews the Law for the new generation about to enter Canaan." },
  { name: "Joshua", testament: "OT", chapters: 24, category: "History", desc: "Conquest of the Promised Land.", longDesc: "Joshua leads Israel into Canaan and divides the land among the tribes." },
  { name: "Judges", testament: "OT", chapters: 21, category: "History", desc: "Cycles of sin and deliverance.", longDesc: "Israel repeatedly falls into sin, is oppressed, and is rescued by judges." },
  { name: "Ruth", testament: "OT", chapters: 4, category: "History", desc: "Loyalty and redemption.", longDesc: "The story of Ruth, Boaz, and the lineage leading to King David." },
  { name: "1 Samuel", testament: "OT", chapters: 31, category: "History", desc: "Samuel, Saul, and David.", longDesc: "The birth of Samuel, the reign of Saul, and the rise of David." },
  { name: "2 Samuel", testament: "OT", chapters: 24, category: "History", desc: "King David's reign.", longDesc: "David becomes king, unites Israel, and establishes the kingdom." },
  { name: "1 Kings", testament: "OT", chapters: 22, category: "History", desc: "Solomon and the divided kingdom.", longDesc: "The reign of Solomon, the building of the temple, and the division of the kingdom." },
  { name: "2 Kings", testament: "OT", chapters: 25, category: "History", desc: "The fall of Israel and Judah.", longDesc: "The history of the kings of Israel and Judah leading to exile." },
  { name: "1 Chronicles", testament: "OT", chapters: 29, category: "History", desc: "Genealogy and David's reign.", longDesc: "Genealogies from Adam to David and the reign of King David." },
  { name: "2 Chronicles", testament: "OT", chapters: 36, category: "History", desc: "History of Judah.", longDesc: "The history of the kings of Judah from Solomon to the exile." },
  { name: "Ezra", testament: "OT", chapters: 10, category: "History", desc: "Return from exile.", longDesc: "The return of the Jews to Jerusalem and the rebuilding of the temple." },
  { name: "Nehemiah", testament: "OT", chapters: 13, category: "History", desc: "Rebuilding Jerusalem's walls.", longDesc: "Nehemiah leads the effort to rebuild the walls of Jerusalem." },
  { name: "Esther", testament: "OT", chapters: 10, category: "History", desc: "Protection of God's people.", longDesc: "Esther becomes queen and saves the Jews from destruction in Persia." },
  { name: "Job", testament: "OT", chapters: 42, category: "Poetry", desc: "Suffering and faith.", longDesc: "A righteous man suffers and wrestles with questions of justice and God's sovereignty." },
  { name: "Psalms", testament: "OT", chapters: 150, category: "Poetry", desc: "Songs of worship and prayer.", longDesc: "A collection of songs, prayers, and poems expressing every human emotion before God." },
  { name: "Proverbs", testament: "OT", chapters: 31, category: "Poetry", desc: "Wisdom for daily living.", longDesc: "Practical wisdom for life, relationships, and righteousness." },
  { name: "Ecclesiastes", testament: "OT", chapters: 12, category: "Poetry", desc: "The meaning of life.", longDesc: "Reflections on the meaning of life and the importance of God." },
  { name: "Song of Solomon", testament: "OT", chapters: 8, category: "Poetry", desc: "A love song.", longDesc: "A poetic celebration of love, marriage, and devotion." },
  { name: "Isaiah", testament: "OT", chapters: 66, category: "Major Prophets", desc: "Salvation through the Messiah.", longDesc: "Prophecies of judgment and hope, pointing to the coming Messiah." },
  { name: "Jeremiah", testament: "OT", chapters: 52, category: "Major Prophets", desc: "Warnings before the fall.", longDesc: "Jeremiah warns Judah of coming judgment and the new covenant." },
  { name: "Lamentations", testament: "OT", chapters: 5, category: "Major Prophets", desc: "Grief over Jerusalem.", longDesc: "Poems mourning the destruction of Jerusalem." },
  { name: "Ezekiel", testament: "OT", chapters: 48, category: "Major Prophets", desc: "Visions of restoration.", longDesc: "Ezekiel prophesies to the exiles about judgment and future restoration." },
  { name: "Daniel", testament: "OT", chapters: 12, category: "Major Prophets", desc: "Faith in a foreign land.", longDesc: "Daniel serves God in Babylon and receives apocalyptic visions." },
  { name: "Hosea", testament: "OT", chapters: 14, category: "Minor Prophets", desc: "Unfailing love.", longDesc: "Hosea's life mirrors God's persistent love for unfaithful Israel." },
  { name: "Joel", testament: "OT", chapters: 3, category: "Minor Prophets", desc: "The day of the Lord.", longDesc: "A prophecy of judgment and the promise of the Spirit's outpouring." },
  { name: "Amos", testament: "OT", chapters: 9, category: "Minor Prophets", desc: "Justice and righteousness.", longDesc: "Amos condemns social injustice and calls for true worship." },
  { name: "Obadiah", testament: "OT", chapters: 1, category: "Minor Prophets", desc: "Judgment on Edom.", longDesc: "The shortest book, pronouncing judgment on Edom." },
  { name: "Jonah", testament: "OT", chapters: 4, category: "Minor Prophets", desc: "Mercy for Nineveh.", longDesc: "Jonah flees from God, yet God shows mercy to Nineveh." },
  { name: "Micah", testament: "OT", chapters: 7, category: "Minor Prophets", desc: "Justice, mercy, and humility.", longDesc: "Micah prophesies judgment and the birthplace of the Messiah." },
  { name: "Nahum", testament: "OT", chapters: 3, category: "Minor Prophets", desc: "Nineveh's destruction.", longDesc: "The fall of Nineveh is declared as God's vengeance." },
  { name: "Habakkuk", testament: "OT", chapters: 3, category: "Minor Prophets", desc: "Faith amidst confusion.", longDesc: "Habakkuk questions God and learns to trust Him regardless." },
  { name: "Zephaniah", testament: "OT", chapters: 3, category: "Minor Prophets", desc: "The great day of the Lord.", longDesc: "Warnings of judgment and promises of restoration." },
  { name: "Haggai", testament: "OT", chapters: 2, category: "Minor Prophets", desc: "Rebuild the temple.", longDesc: "Haggai urges the returned exiles to rebuild the temple." },
  { name: "Zechariah", testament: "OT", chapters: 14, category: "Minor Prophets", desc: "Messianic prophecies.", longDesc: "Visions of hope and prophecies about the coming Messiah." },
  { name: "Malachi", testament: "OT", chapters: 4, category: "Minor Prophets", desc: "A call to faithfulness.", longDesc: "Malachi confronts spiritual apathy before the New Testament era." },
  { name: "Matthew", testament: "NT", chapters: 28, category: "Gospels", desc: "Jesus the King.", longDesc: "The Gospel of Jesus Christ, presenting Him as the promised Messiah and King." },
  { name: "Mark", testament: "NT", chapters: 16, category: "Gospels", desc: "Jesus the Servant.", longDesc: "A fast-paced account of Jesus' ministry, suffering, and sacrifice." },
  { name: "Luke", testament: "NT", chapters: 24, category: "Gospels", desc: "Jesus the Savior of all.", longDesc: "A detailed Gospel emphasizing Jesus' compassion for all people." },
  { name: "John", testament: "NT", chapters: 21, category: "Gospels", desc: "Jesus the Son of God.", longDesc: "The Gospel presenting Jesus as the divine Son of God." },
  { name: "Acts", testament: "NT", chapters: 28, category: "History", desc: "The early church.", longDesc: "The birth and spread of the early church through the apostles." },
  { name: "Romans", testament: "NT", chapters: 16, category: "Pauline Epistles", desc: "The Gospel explained.", longDesc: "Paul's systematic explanation of the Gospel and righteousness by faith." },
  { name: "1 Corinthians", testament: "NT", chapters: 16, category: "Pauline Epistles", desc: "Problems in the church.", longDesc: "Paul addresses divisions, immorality, and spiritual gifts in Corinth." },
  { name: "2 Corinthians", testament: "NT", chapters: 13, category: "Pauline Epistles", desc: "Paul's defense and appeal.", longDesc: "Paul defends his ministry and urges reconciliation." },
  { name: "Galatians", testament: "NT", chapters: 6, category: "Pauline Epistles", desc: "Freedom from the Law.", longDesc: "Paul defends salvation by faith and freedom from legalism." },
  { name: "Ephesians", testament: "NT", chapters: 6, category: "Pauline Epistles", desc: "Unity in Christ.", longDesc: "The believer's position in Christ and the call to unity." },
  { name: "Philippians", testament: "NT", chapters: 4, category: "Pauline Epistles", desc: "Joy in Christ.", longDesc: "A letter of joy, encouragement, and contentment." },
  { name: "Colossians", testament: "NT", chapters: 4, category: "Pauline Epistles", desc: "Christ is supreme.", longDesc: "Paul exalts the supremacy of Christ over all creation." },
  { name: "1 Thessalonians", testament: "NT", chapters: 5, category: "Pauline Epistles", desc: "Hope and readiness.", longDesc: "Encouragement for the church and teaching on Christ's return." },
  { name: "2 Thessalonians", testament: "NT", chapters: 3, category: "Pauline Epistles", desc: "The Day of the Lord.", longDesc: "Teaching concerning the Day of the Lord and faithful living." },
  { name: "1 Timothy", testament: "NT", chapters: 6, category: "Pauline Epistles", desc: "Leadership in the church.", longDesc: "Instructions for church leadership, doctrine, and godly living." },
  { name: "2 Timothy", testament: "NT", chapters: 4, category: "Pauline Epistles", desc: "Finish the race.", longDesc: "Paul's final letter urging Timothy to remain faithful." },
  { name: "Titus", testament: "NT", chapters: 3, category: "Pauline Epistles", desc: "Sound doctrine.", longDesc: "Guidelines for church order and godly living." },
  { name: "Philemon", testament: "NT", chapters: 1, category: "Pauline Epistles", desc: "Forgiveness and reconciliation.", longDesc: "Paul appeals for forgiveness and reconciliation." },
  { name: "Hebrews", testament: "NT", chapters: 13, category: "General Epistles", desc: "Christ is greater.", longDesc: "Jesus is shown as superior to all Old Testament types and institutions." },
  { name: "James", testament: "NT", chapters: 5, category: "General Epistles", desc: "Faith that works.", longDesc: "Practical teaching on living out genuine faith." },
  { name: "1 Peter", testament: "NT", chapters: 5, category: "General Epistles", desc: "Hope in suffering.", longDesc: "Encouragement for believers suffering persecution." },
  { name: "2 Peter", testament: "NT", chapters: 3, category: "General Epistles", desc: "Beware of false teachers.", longDesc: "Warnings against false teachers and the promise of Christ's return." },
  { name: "1 John", testament: "NT", chapters: 5, category: "General Epistles", desc: "God is love.", longDesc: "Assurance of salvation, love, and truth." },
  { name: "2 John", testament: "NT", chapters: 1, category: "General Epistles", desc: "Walk in truth.", longDesc: "A brief letter urging love and truth." },
  { name: "3 John", testament: "NT", chapters: 1, category: "General Epistles", desc: "Support the truth.", longDesc: "Commending hospitality and faithful workers." },
  { name: "Jude", testament: "NT", chapters: 1, category: "General Epistles", desc: "Contend for the faith.", longDesc: "A call to defend the faith against false teachers." },
  { name: "Revelation", testament: "NT", chapters: 22, category: "Prophecy", desc: "The end of all things.", longDesc: "The revelation of Jesus Christ, His return, judgment, and the new creation." },
];

/* ════════════════════════════════════════════════════════════════════════
   GENESIS CHAPTER TITLES & DESCRIPTIONS (1–50, matches ge1.png–ge50.png)
   ════════════════════════════════════════════════════════════════════════ */

const genesisChapterText = [
  ["In the Beginning", "God creates the heavens and the earth."],
  ["The Garden of Eden", "God creates man and places him in Eden."],
  ["The Fall of Man", "Disobedience enters the world."],
  ["Cain and Abel", "The first family and the first murder."],
  ["The Genealogy", "The descendants of Adam are recorded."],
  ["The Sons of God", "Wickedness fills the earth. Noah finds favor."],
  ["The Great Flood", "The waters rise and cover the earth."],
  ["The Waters Recede", "The floodwaters go down and hope appears."],
  ["God's Covenant", "God promises never to destroy the earth by flood again."],
  ["The Nations", "The nations descend from Noah's family."],
  ["The Tower of Babel", "Human pride leads to the confusion of languages."],
  ["The Call of Abram", "God calls Abram and promises to bless him."],
  ["Abram and Lot", "Abram and Lot separate peacefully."],
  ["Abram Rescues Lot", "Abram rescues Lot and meets Melchizedek."],
  ["God's Promise", "God confirms His covenant with Abram."],
  ["Hagar and Ishmael", "Abram and Sarai's family begins to grow."],
  ["The Covenant of Circumcision", "God establishes His covenant with Abraham."],
  ["The Visitors", "The Lord visits Abraham with a promise."],
  ["Sodom and Gomorrah", "Lot is rescued and the cities are destroyed."],
  ["Abraham and Abimelech", "God protects Abraham and Sarah."],
  ["The Birth of Isaac", "God fulfills His promise and Isaac is born."],
  ["Abraham Tested", "Abraham is tested and trusts God."],
  ["Sarah's Death", "Abraham mourns Sarah."],
  ["Isaac and Rebekah", "A wife is found for Isaac."],
  ["Esau and Jacob", "The sons of Isaac are born."],
  ["Isaac and Abimelech", "God blesses Isaac in the land."],
  ["Jacob Receives the Blessing", "Jacob receives Isaac's blessing."],
  ["Jacob's Ladder", "God speaks to Jacob in a dream."],
  ["Jacob Marries Leah and Rachel", "Jacob begins his family in Haran."],
  ["Jacob's Children", "Jacob's family continues to grow."],
  ["Jacob Leaves Laban", "Jacob returns toward his homeland."],
  ["Jacob Wrestles With God", "Jacob encounters God and receives a new name."],
  ["Jacob Meets Esau", "Jacob and Esau reconcile."],
  ["Dinah and Shechem", "A conflict arises involving Dinah."],
  ["Jacob Returns to Bethel", "God renews His covenant with Jacob."],
  ["The Descendants of Esau", "The family line of Esau is recorded."],
  ["Joseph's Dreams", "Joseph dreams of his future."],
  ["Judah and Tamar", "The story of Judah and Tamar."],
  ["Joseph in Egypt", "Joseph serves in Potiphar's house."],
  ["Joseph Interprets Dreams", "Joseph interprets the dreams of Pharaoh's servants."],
  ["Joseph Becomes Governor", "Joseph rises to power in Egypt."],
  ["Joseph's Brothers Arrive", "Joseph's brothers come to Egypt for food."],
  ["Benjamin Goes to Egypt", "Joseph's brothers return with Benjamin."],
  ["Joseph Tests His Brothers", "Joseph tests whether his brothers have changed."],
  ["Joseph Reveals Himself", "Joseph reveals his identity to his brothers."],
  ["Jacob Goes to Egypt", "Jacob and his family travel to Egypt."],
  ["Jacob's Family in Egypt", "Joseph provides for his family during the famine."],
  ["Jacob Blesses Joseph's Sons", "Jacob blesses Ephraim and Manasseh."],
  ["Jacob Blesses His Sons", "Jacob speaks blessings over his sons."],
  ["Joseph's Death", "Joseph forgives his brothers and dies in Egypt."],
];

const genesisChapterData = genesisChapterText.map(([title, description], index) => ({
  number: index + 1,
  title,
  description,
}));

/* ════════════════════════════════════════════════════════════════════════
   EXODUS, LEVITICUS, NUMBERS, DEUTERONOMY
   ════════════════════════════════════════════════════════════════════════ */

const exodusChapters = [
  { number: 1, title: "Israel Oppressed in Egypt", description: "A new Pharaoh enslaves the Israelites and orders the Hebrew baby boys to be killed." },
  { number: 2, title: "The Birth of Moses", description: "Moses is born, rescued from the Nile, and raised in Pharaoh's household." },
  { number: 3, title: "The Burning Bush", description: "God appears to Moses in a burning bush and calls him to deliver Israel." },
  { number: 4, title: "Moses Returns to Egypt", description: "God gives Moses signs and Aaron is appointed to help him speak." },
  { number: 5, title: "Bricks Without Straw", description: "Moses and Aaron confront Pharaoh, but Pharaoh increases Israel's workload." },
  { number: 6, title: "God Renews His Promise", description: "God promises to rescue Israel and establish His covenant with them." },
  { number: 7, title: "Aaron's Staff and the First Plague", description: "Moses and Aaron confront Pharaoh, and the Nile is turned into blood." },
  { number: 8, title: "Frogs, Gnats, and Flies", description: "God sends three more plagues upon Egypt." },
  { number: 9, title: "More Plagues", description: "Livestock die, boils cover Egypt, and devastating hail falls on the land." },
  { number: 10, title: "Locusts and Darkness", description: "Locusts consume the land, followed by three days of darkness." },
  { number: 11, title: "The Final Plague Announced", description: "God announces the death of every firstborn throughout Egypt." },
  { number: 12, title: "The Passover", description: "God establishes the Passover and Israel leaves Egypt after the firstborn die." },
  { number: 13, title: "Consecration of the Firstborn", description: "God commands Israel to remember the Exodus and leads them with a pillar of cloud and fire." },
  { number: 14, title: "Crossing the Red Sea", description: "God parts the Red Sea and Israel escapes Pharaoh's army." },
  { number: 15, title: "The Song of Moses", description: "Moses and Israel sing praises to God after crossing the sea." },
  { number: 16, title: "Manna in the Wilderness", description: "God provides manna and quail for Israel in the wilderness." },
  { number: 17, title: "Water from the Rock", description: "God provides water from a rock, and Israel defeats the Amalekites." },
  { number: 18, title: "Jethro's Advice", description: "Moses' father-in-law Jethro advises him to appoint leaders to help judge the people." },
  { number: 19, title: "Israel at Mount Sinai", description: "Israel arrives at Sinai and prepares to meet God." },
  { number: 20, title: "The Ten Commandments", description: "God gives Israel the Ten Commandments." },
  { number: 21, title: "Laws for Israel", description: "God gives laws concerning servants, violence, and personal responsibility." },
  { number: 22, title: "Laws About Property", description: "God gives instructions concerning theft, restitution, justice, and worship." },
  { number: 23, title: "Justice and the Sabbath", description: "God gives laws about justice, festivals, and Sabbath rest." },
  { number: 24, title: "The Covenant Confirmed", description: "Israel confirms its covenant with God, and Moses goes up Mount Sinai." },
  { number: 25, title: "Offerings for the Tabernacle", description: "God gives instructions for the ark, table, and lampstand." },
  { number: 26, title: "The Tabernacle", description: "God gives detailed instructions for constructing the Tabernacle." },
  { number: 27, title: "The Altar and Courtyard", description: "Instructions are given for the bronze altar, courtyard, and lamp oil." },
  { number: 28, title: "Priestly Garments", description: "God gives instructions for the sacred garments of Aaron and the priests." },
  { number: 29, title: "Ordination of the Priests", description: "God gives instructions for consecrating Aaron and his sons as priests." },
  { number: 30, title: "The Altar of Incense", description: "Instructions are given for the incense altar, basin, anointing oil, and sacred incense." },
  { number: 31, title: "Bezalel and Oholiab", description: "God appoints skilled craftsmen and commands Israel to observe the Sabbath." },
  { number: 32, title: "The Golden Calf", description: "Israel worships a golden calf while Moses is on Mount Sinai." },
  { number: 33, title: "God's Presence", description: "Moses pleads for God's presence to remain with Israel." },
  { number: 34, title: "The Covenant Renewed", description: "God renews His covenant with Israel and Moses' face shines after meeting God." },
  { number: 35, title: "Offerings for the Tabernacle", description: "Israel brings offerings and skilled workers begin preparing the Tabernacle." },
  { number: 36, title: "Building the Tabernacle", description: "The craftsmen begin constructing the curtains and framework of the Tabernacle." },
  { number: 37, title: "The Ark and Sacred Furniture", description: "The ark, table, lampstand, and incense altar are constructed." },
  { number: 38, title: "The Bronze Altar and Courtyard", description: "The bronze altar, basin, courtyard, and inventory of materials are completed." },
  { number: 39, title: "Priestly Garments Completed", description: "The sacred garments for Aaron and the priests are completed." },
  { number: 40, title: "The Tabernacle Completed", description: "The Tabernacle is assembled, and God's glory fills it." },
];

const leviticusChapters = [
  { number: 1, title: "The Burnt Offering", description: "God gives instructions for presenting burnt offerings." },
  { number: 2, title: "The Grain Offering", description: "Instructions are given for grain offerings brought to the Lord." },
  { number: 3, title: "The Fellowship Offering", description: "God gives instructions for offerings of fellowship and thanksgiving." },
  { number: 4, title: "The Sin Offering", description: "Instructions are given for sacrifices when someone sins unintentionally." },
  { number: 5, title: "Offerings for Sin", description: "God explains additional situations requiring confession and sacrifice." },
  { number: 6, title: "Instructions for the Priests", description: "God gives the priests instructions concerning offerings and their duties." },
  { number: 7, title: "Additional Offering Laws", description: "Further instructions are given concerning fellowship and other sacrifices." },
  { number: 8, title: "The Priests Are Ordained", description: "Aaron and his sons are consecrated for priestly service." },
  { number: 9, title: "The Priests Begin Their Ministry", description: "Aaron offers sacrifices and God's glory appears to the people." },
  { number: 10, title: "Nadab and Abihu", description: "Aaron's sons offer unauthorized fire and are judged by God." },
  { number: 11, title: "Clean and Unclean Animals", description: "God gives Israel laws concerning clean and unclean animals." },
  { number: 12, title: "Purification After Childbirth", description: "Instructions are given concerning purification after childbirth." },
  { number: 13, title: "Skin Diseases", description: "God gives priests instructions for examining skin diseases and infections." },
  { number: 14, title: "Cleansing From Skin Diseases", description: "Instructions are given for restoring people healed from skin diseases." },
  { number: 15, title: "Bodily Discharges", description: "God gives laws concerning bodily discharges and ceremonial cleanliness." },
  { number: 16, title: "The Day of Atonement", description: "The high priest makes atonement for Israel's sins once each year." },
  { number: 17, title: "The Place of Sacrifice", description: "God commands Israel to bring sacrifices to the appointed place." },
  { number: 18, title: "Unlawful Sexual Relations", description: "God gives Israel boundaries for sexual relationships and holy living." },
  { number: 19, title: "Be Holy", description: "God calls Israel to holiness, justice, love, and obedience." },
  { number: 20, title: "Punishments for Sin", description: "God establishes penalties for serious violations of His commands." },
  { number: 21, title: "Rules for Priests", description: "God gives special holiness requirements for the priests." },
  { number: 22, title: "Acceptable Offerings", description: "God explains which offerings are acceptable and how holy things must be treated." },
  { number: 23, title: "The Appointed Festivals", description: "God establishes Israel's appointed feasts and sacred gatherings." },
  { number: 24, title: "The Lamp and Holy Bread", description: "Instructions are given for the lamp, bread, and punishment for blasphemy." },
  { number: 25, title: "The Sabbath Year and Jubilee", description: "God establishes Sabbath years and the Year of Jubilee." },
  { number: 26, title: "Blessings and Curses", description: "God promises blessings for obedience and warns of consequences for rebellion." },
  { number: 27, title: "Redeeming What Is the Lord's", description: "God gives laws concerning vows, dedicated property, and offerings." },
];

const numbersChapters = [
  { number: 1, title: "The First Census", description: "God commands Moses to count the men of Israel able to serve in battle." },
  { number: 2, title: "The Arrangement of the Camp", description: "God establishes how the tribes are to camp around the Tabernacle." },
  { number: 3, title: "The Levites", description: "The Levites are appointed to serve and care for the Tabernacle." },
  { number: 4, title: "Duties of the Levite Families", description: "The families of Levi receive specific responsibilities for transporting the Tabernacle." },
  { number: 5, title: "Purity in the Camp", description: "God gives laws concerning purity, restitution, and marital faithfulness." },
  { number: 6, title: "The Nazirite Vow", description: "God gives instructions for those who dedicate themselves to Him as Nazirites and gives the priestly blessing." },
  { number: 7, title: "Offerings of the Leaders", description: "The leaders of Israel bring offerings for the dedication of the Tabernacle." },
  { number: 8, title: "The Levites Are Dedicated", description: "The Levites are cleansed and dedicated for service to God." },
  { number: 9, title: "The Second Passover", description: "Israel celebrates Passover and follows God's cloud over the Tabernacle." },
  { number: 10, title: "The Silver Trumpets", description: "God gives instructions for using trumpets and Israel begins its journey from Sinai." },
  { number: 11, title: "Complaints in the Wilderness", description: "Israel complains about food, and God provides quail while judging their craving." },
  { number: 12, title: "Miriam and Aaron Oppose Moses", description: "Miriam and Aaron challenge Moses, and God affirms Moses' unique calling." },
  { number: 13, title: "The Twelve Spies", description: "Twelve spies explore Canaan, but most return with a fearful report." },
  { number: 14, title: "Israel Rebels", description: "Israel refuses to enter Canaan, and God declares that the unbelieving generation will wander in the wilderness." },
  { number: 15, title: "Offerings and the Sabbath Breaker", description: "God gives additional laws concerning offerings and obedience." },
  { number: 16, title: "Korah's Rebellion", description: "Korah and others rebel against Moses and Aaron, and God judges the rebels." },
  { number: 17, title: "Aaron's Staff Buds", description: "Aaron's staff miraculously buds as God confirms his priestly authority." },
  { number: 18, title: "Duties of Priests and Levites", description: "God establishes the responsibilities and provisions for priests and Levites." },
  { number: 19, title: "The Red Heifer", description: "God provides instructions for purification from ceremonial uncleanness." },
  { number: 20, title: "Water From the Rock", description: "Miriam dies, Moses strikes the rock, and Aaron dies before Israel enters Canaan." },
  { number: 21, title: "The Bronze Serpent", description: "Israel is attacked by snakes, and God provides healing through the bronze serpent." },
  { number: 22, title: "Balak Summons Balaam", description: "King Balak summons Balaam to curse Israel, but God intervenes." },
  { number: 23, title: "Balaam Blesses Israel", description: "Balaam speaks blessings over Israel instead of curses." },
  { number: 24, title: "Balaam's Final Oracles", description: "Balaam continues to bless Israel and prophesies about their future." },
  { number: 25, title: "Israel Worships Baal of Peor", description: "Israel falls into idolatry and sexual immorality at Peor." },
  { number: 26, title: "The Second Census", description: "A new census counts the next generation of Israelites." },
  { number: 27, title: "Joshua Appointed as Moses' Successor", description: "Joshua is appointed to lead Israel after Moses." },
  { number: 28, title: "Daily and Festival Offerings", description: "God gives instructions concerning daily and festival sacrifices." },
  { number: 29, title: "Offerings During the Festivals", description: "Additional offerings are prescribed for the Feast of Trumpets, Day of Atonement, and Tabernacles." },
  { number: 30, title: "Vows", description: "God gives laws concerning vows made by men and women." },
  { number: 31, title: "War Against Midian", description: "Israel defeats Midian, and Moses gives instructions concerning the spoils of war." },
  { number: 32, title: "The Eastern Tribes Settle", description: "Reuben and Gad request land east of the Jordan and agree to help conquer Canaan." },
  { number: 33, title: "Israel's Journey", description: "Moses records Israel's journey from Egypt through the wilderness." },
  { number: 34, title: "Boundaries of Canaan", description: "God establishes the boundaries of the Promised Land and appoints leaders to divide it." },
  { number: 35, title: "Cities of Refuge", description: "God establishes towns for the Levites and cities of refuge for those who cause accidental death." },
  { number: 36, title: "Inheritance of Zelophehad's Daughters", description: "God establishes rules protecting tribal inheritance through marriage." },
];

const deuteronomyChapters = [
  { number: 1, title: "The Previous Journey Reviewed", description: "Moses reviews Israel's journey from Horeb toward the Promised Land." },
  { number: 2, title: "Wandering in the Wilderness", description: "Moses recalls Israel's journey around Edom, Moab, and Ammon." },
  { number: 3, title: "Victory East of the Jordan", description: "Israel defeats Og of Bashan, and Moses prepares Joshua to lead the people." },
  { number: 4, title: "Obey God's Commands", description: "Moses urges Israel to obey God and warns against idolatry." },
  { number: 5, title: "The Ten Commandments Repeated", description: "Moses repeats the Ten Commandments given at Mount Sinai." },
  { number: 6, title: "Love the Lord Your God", description: "Moses commands Israel to love God wholeheartedly and teach His commands to their children." },
  { number: 7, title: "A Chosen People", description: "Israel is reminded that God chose them and commands them to reject idolatry." },
  { number: 8, title: "Remember the Lord", description: "Moses warns Israel not to forget God when they become prosperous." },
  { number: 9, title: "Not Because of Your Righteousness", description: "Moses reminds Israel that they receive the land because of God's promise, not their own righteousness." },
  { number: 10, title: "New Tablets and the Call to Obey", description: "God gives Moses new tablets, and Israel is called to fear, love, and serve Him." },
  { number: 11, title: "Love and Obey God", description: "Moses describes the blessings of obedience and consequences of rebellion." },
  { number: 12, title: "The Place of Worship", description: "God commands Israel to worship at the place He chooses." },
  { number: 13, title: "Worship the Lord Alone", description: "Israel is warned against false prophets and anyone who leads them toward other gods." },
  { number: 14, title: "Clean and Unclean Food", description: "God gives dietary laws and instructions concerning tithes." },
  { number: 15, title: "The Year of Release", description: "God establishes debt release, generosity toward the poor, and laws concerning servants." },
  { number: 16, title: "The Passover and Festivals", description: "Moses reviews the Passover, Feast of Weeks, and Feast of Tabernacles." },
  { number: 17, title: "Justice and Leadership", description: "God gives laws concerning judges, kings, priests, and justice." },
  { number: 18, title: "Priests and Prophets", description: "God provides for the Levites and promises to raise up a prophet like Moses." },
  { number: 19, title: "Cities of Refuge", description: "God establishes cities of refuge and gives laws concerning justice and witnesses." },
  { number: 20, title: "Laws Concerning Warfare", description: "God gives Israel instructions for warfare and dealing with enemy cities." },
  { number: 21, title: "Various Laws", description: "God gives laws concerning unsolved murders, family relationships, and justice." },
  { number: 22, title: "Laws of Neighborly Responsibility", description: "Moses gives laws concerning property, marriage, purity, and responsibility toward others." },
  { number: 23, title: "The Assembly and the Camp", description: "God gives laws concerning the community, cleanliness, servants, and worship." },
  { number: 24, title: "Marriage, Justice, and the Poor", description: "Moses gives laws concerning divorce, lending, justice, and caring for the vulnerable." },
  { number: 25, title: "Justice and Fairness", description: "God gives laws concerning punishment, honest weights, and remembering Amalek." },
  { number: 26, title: "Firstfruits and Tithes", description: "Israel is instructed to present firstfruits and declare their covenant faithfulness." },
  { number: 27, title: "The Covenant at Mount Ebal", description: "Israel is commanded to set up stones and pronounce blessings and curses." },
  { number: 28, title: "Blessings and Curses", description: "God describes blessings for obedience and curses for rebellion." },
  { number: 29, title: "The Covenant Renewed", description: "Moses renews God's covenant with Israel before they enter the Promised Land." },
  { number: 30, title: "Choose Life", description: "God calls Israel to return to Him and choose life by loving and obeying Him." },
  { number: 31, title: "Joshua Succeeds Moses", description: "Moses commissions Joshua and prepares Israel for the future." },
  { number: 32, title: "The Song of Moses", description: "Moses teaches Israel a song warning them against forgetting God." },
  { number: 33, title: "Moses Blesses the Tribes", description: "Moses gives his final blessing to the tribes of Israel." },
  { number: 34, title: "The Death of Moses", description: "Moses sees the Promised Land from Mount Nebo and dies, and Joshua becomes Israel's leader." },
];

/* ════════════════════════════════════════════════════════════════════════
   HISTORICAL BOOKS (Joshua → 2 Chronicles)
   ════════════════════════════════════════════════════════════════════════ */

const historicalChapters = {
  Joshua: [
    { number: 1, title: "God Commissions Joshua", description: "God commands Joshua to lead Israel and be strong and courageous." },
    { number: 2, title: "Rahab and the Spies", description: "Two spies enter Jericho and are protected by Rahab." },
    { number: 3, title: "Crossing the Jordan", description: "Israel crosses the Jordan River on dry ground." },
    { number: 4, title: "Twelve Memorial Stones", description: "Israel sets up twelve stones to remember God's faithfulness." },
    { number: 5, title: "The Commander of the Lord's Army", description: "Joshua encounters the commander of the Lord's army near Jericho." },
    { number: 6, title: "The Fall of Jericho", description: "The walls of Jericho fall after Israel follows God's instructions." },
    { number: 7, title: "Achan's Sin", description: "Israel suffers defeat because of Achan's disobedience." },
    { number: 8, title: "The Battle of Ai", description: "Israel defeats Ai and renews its commitment to God's Law." },
    { number: 9, title: "The Gibeonite Deception", description: "The Gibeonites deceive Israel into making a covenant with them." },
    { number: 10, title: "The Sun Stands Still", description: "Joshua leads Israel in battle and God gives them victory." },
    { number: 11, title: "Northern Kings Defeated", description: "Joshua defeats the northern kings and their armies." },
    { number: 12, title: "Kings Defeated by Israel", description: "The kings defeated by Moses and Joshua are listed." },
    { number: 13, title: "Land Still to Be Conquered", description: "God tells Joshua about the remaining land and begins its division." },
    { number: 14, title: "Caleb Receives Hebron", description: "Caleb receives the land promised to him because he followed God faithfully." },
    { number: 15, title: "The Land of Judah", description: "The territory assigned to the tribe of Judah is described." },
    { number: 16, title: "The Land of Ephraim", description: "The inheritance of the tribe of Ephraim is described." },
    { number: 17, title: "The Land of Manasseh", description: "The tribe of Manasseh receives its inheritance." },
    { number: 18, title: "The Land of Benjamin", description: "The land is surveyed and Benjamin receives its inheritance." },
    { number: 19, title: "The Remaining Tribal Lands", description: "Simeon, Zebulun, Issachar, Asher, Naphtali, and Dan receive their territories." },
    { number: 20, title: "Cities of Refuge", description: "Cities of refuge are established for those who accidentally cause death." },
    { number: 21, title: "Cities for the Levites", description: "Cities are given to the Levites throughout Israel." },
    { number: 22, title: "The Eastern Tribes Return", description: "The eastern tribes return home and build an altar by the Jordan." },
    { number: 23, title: "Joshua's Final Message", description: "Joshua urges Israel to remain faithful to the Lord." },
    { number: 24, title: "Joshua's Farewell and Death", description: "Joshua renews the covenant and Israel declares its commitment to serve the Lord." },
  ],
  Judges: [
    { number: 1, title: "Israel Fights the Remaining Canaanites", description: "The tribes continue fighting to take possession of the land." },
    { number: 2, title: "Israel's Disobedience", description: "Israel turns away from God and enters a cycle of sin and deliverance." },
    { number: 3, title: "Othniel, Ehud, and Shamgar", description: "God raises judges to rescue Israel from oppression." },
    { number: 4, title: "Deborah and Barak", description: "Deborah and Barak lead Israel to victory over the Canaanites." },
    { number: 5, title: "The Song of Deborah", description: "Deborah and Barak sing a song celebrating God's victory." },
    { number: 6, title: "Gideon Called by God", description: "God calls Gideon to deliver Israel from Midian." },
    { number: 7, title: "Gideon's Three Hundred", description: "God gives Gideon victory with only three hundred men." },
    { number: 8, title: "Gideon's Leadership", description: "Gideon defeats Midian and later dies after leading Israel." },
    { number: 9, title: "Abimelech's Rule", description: "Abimelech becomes ruler through violence and eventually falls." },
    { number: 10, title: "Tola and Jair", description: "Two judges lead Israel before the nation again turns away from God." },
    { number: 11, title: "Jephthah's Vow", description: "Jephthah leads Israel against Ammon but makes a tragic vow." },
    { number: 12, title: "Jephthah and the Ephraimites", description: "Conflict breaks out between Jephthah and Ephraim." },
    { number: 13, title: "The Birth of Samson", description: "An angel announces Samson's birth and his special calling." },
    { number: 14, title: "Samson's Riddle", description: "Samson marries a Philistine woman and gives a riddle." },
    { number: 15, title: "Samson's Victory", description: "Samson fights the Philistines and defeats many of them." },
    { number: 16, title: "Samson and Delilah", description: "Delilah discovers Samson's secret and the Philistines capture him." },
    { number: 17, title: "Micah's Idol", description: "Micah creates an idol and establishes his own private worship." },
    { number: 18, title: "Dan Captures Laish", description: "The tribe of Dan takes Laish and establishes its own center of worship." },
    { number: 19, title: "The Levite and His Concubine", description: "A terrible crime in Gibeah reveals the moral collapse of Israel." },
    { number: 20, title: "Israel Fights Benjamin", description: "Israel goes to war against the tribe of Benjamin." },
    { number: 21, title: "The Tribe of Benjamin Preserved", description: "Israel seeks a way to preserve the tribe of Benjamin." },
  ],
  Ruth: [
    { number: 1, title: "Ruth's Loyalty to Naomi", description: "Ruth refuses to leave Naomi and returns with her to Bethlehem." },
    { number: 2, title: "Ruth Meets Boaz", description: "Ruth gathers grain in Boaz's field and finds favor with him." },
    { number: 3, title: "Ruth and Boaz", description: "Naomi instructs Ruth to approach Boaz as her family redeemer." },
    { number: 4, title: "Boaz Marries Ruth", description: "Boaz redeems Ruth, marries her, and becomes part of David's family line." },
  ],
  "1 Samuel": [
    { number: 1, title: "The Birth of Samuel", description: "Hannah prays for a son and dedicates Samuel to the Lord." },
    { number: 2, title: "Hannah's Prayer", description: "Hannah praises God while Eli's sons act wickedly." },
    { number: 3, title: "The Lord Calls Samuel", description: "God speaks to Samuel for the first time." },
    { number: 4, title: "The Ark Captured", description: "The Philistines capture the ark and Eli's sons die." },
    { number: 5, title: "The Ark Among the Philistines", description: "God demonstrates His power among the Philistines." },
    { number: 6, title: "The Ark Returns", description: "The Philistines return the ark to Israel." },
    { number: 7, title: "Samuel Leads Israel", description: "Samuel calls Israel to repentance and God gives victory over the Philistines." },
    { number: 8, title: "Israel Asks for a King", description: "Israel demands a king like the surrounding nations." },
    { number: 9, title: "Saul Meets Samuel", description: "Saul searches for his father's donkeys and encounters Samuel." },
    { number: 10, title: "Saul Anointed King", description: "Samuel anoints Saul and Saul is publicly chosen as king." },
    { number: 11, title: "Saul Rescues Jabesh", description: "Saul leads Israel to victory over the Ammonites." },
    { number: 12, title: "Samuel's Farewell Speech", description: "Samuel reminds Israel of God's faithfulness." },
    { number: 13, title: "Saul's Unlawful Sacrifice", description: "Saul disobeys Samuel and begins losing God's favor." },
    { number: 14, title: "Jonathan's Victory", description: "Jonathan attacks the Philistines and Israel wins a great victory." },
    { number: 15, title: "Saul Rejected as King", description: "Saul disobeys God's command concerning Amalek." },
    { number: 16, title: "David Anointed", description: "Samuel anoints David as the future king of Israel." },
    { number: 17, title: "David and Goliath", description: "David defeats the giant Goliath by trusting God." },
    { number: 18, title: "David and Jonathan", description: "Jonathan becomes David's close friend while Saul grows jealous." },
    { number: 19, title: "Saul Tries to Kill David", description: "Saul repeatedly attempts to kill David." },
    { number: 20, title: "David and Jonathan's Covenant", description: "Jonathan warns David and renews their covenant of friendship." },
    { number: 21, title: "David Flees", description: "David escapes Saul and seeks help from the priest and Philistines." },
    { number: 22, title: "Saul Kills the Priests", description: "Saul orders the priests of Nob to be killed." },
    { number: 23, title: "David Saves Keilah", description: "David rescues Keilah while Saul continues pursuing him." },
    { number: 24, title: "David Spares Saul", description: "David refuses to kill Saul when he has the opportunity." },
    { number: 25, title: "David, Nabal, and Abigail", description: "Abigail prevents David from taking revenge against Nabal." },
    { number: 26, title: "David Spares Saul Again", description: "David once again refuses to kill Saul." },
    { number: 27, title: "David Among the Philistines", description: "David lives among the Philistines while hiding from Saul." },
    { number: 28, title: "Saul and the Medium", description: "Saul seeks guidance from a medium before his final battle." },
    { number: 29, title: "David Rejected by the Philistines", description: "The Philistine commanders refuse to let David fight with them." },
    { number: 30, title: "David Rescues His Family", description: "David defeats the Amalekites and recovers everything they captured." },
    { number: 31, title: "Saul's Death", description: "Saul and his sons die in battle against the Philistines." },
  ],
  "2 Samuel": [
    { number: 1, title: "David Mourns Saul and Jonathan", description: "David mourns the deaths of Saul and Jonathan." },
    { number: 2, title: "David Becomes King of Judah", description: "David is anointed king over Judah while conflict begins with Israel." },
    { number: 3, title: "David's Kingdom Grows", description: "Abner seeks peace with David but is killed by Joab." },
    { number: 4, title: "Ish-Bosheth Is Murdered", description: "Ish-Bosheth is assassinated and David condemns the murderers." },
    { number: 5, title: "David Becomes King of Israel", description: "All Israel recognizes David as king and Jerusalem becomes his capital." },
    { number: 6, title: "The Ark Comes to Jerusalem", description: "David brings the ark of God to Jerusalem." },
    { number: 7, title: "God's Covenant with David", description: "God promises David an enduring dynasty." },
    { number: 8, title: "David's Victories", description: "David defeats surrounding nations and establishes his kingdom." },
    { number: 9, title: "David and Mephibosheth", description: "David shows kindness to Jonathan's son Mephibosheth." },
    { number: 10, title: "David Defeats the Ammonites", description: "David defeats the Ammonites and Arameans." },
    { number: 11, title: "David and Bathsheba", description: "David sins with Bathsheba and arranges Uriah's death." },
    { number: 12, title: "Nathan Confronts David", description: "Nathan confronts David and David repents of his sin." },
    { number: 13, title: "Amnon and Tamar", description: "Amnon abuses Tamar and is later killed by Absalom." },
    { number: 14, title: "Absalom Returns", description: "Absalom returns to Jerusalem but remains separated from David." },
    { number: 15, title: "Absalom's Rebellion", description: "Absalom gains support and David flees Jerusalem." },
    { number: 16, title: "David Flees Jerusalem", description: "David encounters supporters and enemies during his flight." },
    { number: 17, title: "Hushai Saves David", description: "Hushai's counsel helps David escape Absalom." },
    { number: 18, title: "Absalom's Death", description: "David's army defeats Absalom's forces and Absalom dies." },
    { number: 19, title: "David Returns to Jerusalem", description: "David returns as king and restores his rule." },
    { number: 20, title: "Sheba's Rebellion", description: "Sheba leads a rebellion against David but is defeated." },
    { number: 21, title: "David and the Gibeonites", description: "A famine leads David to address an old injustice involving the Gibeonites." },
    { number: 22, title: "David's Song of Praise", description: "David praises God for delivering him from his enemies." },
    { number: 23, title: "David's Last Words", description: "David gives his final words and his mighty warriors are remembered." },
    { number: 24, title: "David Counts Israel", description: "David orders a census, repents, and builds an altar to the Lord." },
  ],
  "1 Kings": [
    { number: 1, title: "David Makes Solomon King", description: "Solomon is declared king after Adonijah attempts to take the throne." },
    { number: 2, title: "David's Final Instructions", description: "David gives Solomon his final charge before dying." },
    { number: 3, title: "Solomon Asks for Wisdom", description: "God appears to Solomon and grants him wisdom." },
    { number: 4, title: "Solomon's Kingdom", description: "Solomon's kingdom becomes prosperous and renowned for wisdom." },
    { number: 5, title: "Preparations for the Temple", description: "Solomon begins preparations to build the temple." },
    { number: 6, title: "Solomon Builds the Temple", description: "The temple of the Lord is constructed in Jerusalem." },
    { number: 7, title: "Solomon's Palace", description: "Solomon builds his palace and completes the temple furnishings." },
    { number: 8, title: "The Ark Enters the Temple", description: "Solomon dedicates the temple and prays before God." },
    { number: 9, title: "God Appears to Solomon", description: "God warns Solomon to remain faithful to the covenant." },
    { number: 10, title: "The Queen of Sheba", description: "The Queen of Sheba visits Solomon and marvels at his wisdom." },
    { number: 11, title: "Solomon Turns Away", description: "Solomon's foreign wives turn his heart toward other gods." },
    { number: 12, title: "The Kingdom Divides", description: "Rehoboam's harsh rule leads to the division of Israel." },
    { number: 13, title: "The Man of God from Judah", description: "A prophet confronts Jeroboam and later dies after disobeying God's command." },
    { number: 14, title: "Jeroboam and Rehoboam", description: "God judges both kingdoms because of their sin." },
    { number: 15, title: "Kings of Judah and Israel", description: "The reigns of Abijah, Asa, Nadab, and Baasha are recorded." },
    { number: 16, title: "Kings of Israel", description: "Several kings rule Israel as the nation becomes increasingly corrupt." },
    { number: 17, title: "Elijah and the Drought", description: "Elijah announces a drought and is miraculously provided for." },
    { number: 18, title: "Elijah on Mount Carmel", description: "God answers Elijah with fire and proves He alone is God." },
    { number: 19, title: "Elijah Meets God", description: "Elijah encounters God in a gentle whisper and receives renewed purpose." },
    { number: 20, title: "Ahab's Victories", description: "Ahab defeats the Arameans but disobeys God's command." },
    { number: 21, title: "Naboth's Vineyard", description: "Ahab and Jezebel arrange Naboth's death to take his vineyard." },
    { number: 22, title: "Ahab's Death", description: "Ahab dies in battle after rejecting God's warning." },
  ],
  "2 Kings": [
    { number: 1, title: "Elijah and King Ahaziah", description: "Elijah announces judgment against Ahaziah for seeking Baal-Zebub." },
    { number: 2, title: "Elijah Taken to Heaven", description: "Elijah is taken to heaven and Elisha becomes his successor." },
    { number: 3, title: "Moab Rebels", description: "Israel and Judah fight Moab with God's help through Elisha." },
    { number: 4, title: "Elisha's Miracles", description: "Elisha performs miracles for a widow, a Shunammite woman, and others." },
    { number: 5, title: "Naaman Healed", description: "Naaman is healed of leprosy after obeying Elisha's instructions." },
    { number: 6, title: "The Floating Axe Head", description: "Elisha performs miracles and protects Israel from the Arameans." },
    { number: 7, title: "Samaria Rescued", description: "God causes the Aramean army to flee and ends the famine in Samaria." },
    { number: 8, title: "Kings and Prophets", description: "Elisha predicts Hazael's rise and the reigns of several kings are recorded." },
    { number: 9, title: "Jehu Anointed King", description: "Jehu is anointed and destroys the house of Ahab." },
    { number: 10, title: "Jehu Destroys Baal Worship", description: "Jehu destroys Ahab's family and eliminates Baal worship from Israel." },
    { number: 11, title: "Joash Becomes King", description: "Joash is protected from Athaliah and crowned king of Judah." },
    { number: 12, title: "Joash Repairs the Temple", description: "King Joash organizes repairs to the temple." },
    { number: 13, title: "Elisha's Final Days", description: "Elisha dies after promising victory over Aram." },
    { number: 14, title: "Amaziah and Jeroboam II", description: "The reigns of Amaziah and Jeroboam II are described." },
    { number: 15, title: "Kings of Israel and Judah", description: "Several kings reign as Israel and Judah continue in different paths." },
    { number: 16, title: "Ahaz of Judah", description: "Ahaz turns to foreign powers and corrupt worship." },
    { number: 17, title: "Israel Falls to Assyria", description: "The northern kingdom of Israel is conquered because of persistent disobedience." },
    { number: 18, title: "Hezekiah Trusts God", description: "Hezekiah reforms Judah and trusts God during the Assyrian threat." },
    { number: 19, title: "God Delivers Jerusalem", description: "God answers Hezekiah's prayer and defeats the Assyrian army." },
    { number: 20, title: "Hezekiah's Illness", description: "God heals Hezekiah and gives him additional years of life." },
    { number: 21, title: "Manasseh's Wickedness", description: "Manasseh leads Judah into deep idolatry and evil." },
    { number: 22, title: "The Book of the Law Found", description: "Josiah discovers the Book of the Law and begins reform." },
    { number: 23, title: "Josiah's Reforms", description: "Josiah removes idols and renews the covenant with God." },
    { number: 24, title: "Judah's Final Kings", description: "Babylon conquers Judah and takes Jerusalem's leaders into exile." },
    { number: 25, title: "The Fall of Jerusalem", description: "Jerusalem and the temple are destroyed, and Judah is taken into exile." },
  ],
  "1 Chronicles": [
    { number: 1, title: "Adam to Abraham", description: "Genealogies trace the family line from Adam through Abraham." },
    { number: 2, title: "The Family of Israel", description: "The genealogy of Israel's tribes begins with Judah." },
    { number: 3, title: "The Line of David", description: "David's descendants and royal family line are recorded." },
    { number: 4, title: "The Families of Judah", description: "The descendants of Judah and Simeon are recorded." },
    { number: 5, title: "The Eastern Tribes", description: "The descendants of Reuben, Gad, and half of Manasseh are listed." },
    { number: 6, title: "The Tribe of Levi", description: "The descendants and responsibilities of Levi are recorded." },
    { number: 7, title: "Other Tribes", description: "The genealogies of Issachar, Benjamin, Naphtali, Manasseh, Ephraim, and Asher are listed." },
    { number: 8, title: "The Family of Benjamin", description: "The descendants of Benjamin and Saul's family are recorded." },
    { number: 9, title: "Those Who Returned", description: "Families who returned to Jerusalem after the exile are listed." },
    { number: 10, title: "The Death of Saul", description: "Saul dies in battle and his kingdom passes to David." },
    { number: 11, title: "David Becomes King", description: "David is recognized as king and captures Jerusalem." },
    { number: 12, title: "David's Mighty Warriors", description: "Warriors from throughout Israel join David." },
    { number: 13, title: "David Brings Back the Ark", description: "David attempts to bring the ark to Jerusalem." },
    { number: 14, title: "God Establishes David", description: "David's kingdom grows and God gives him victory over the Philistines." },
    { number: 15, title: "The Ark Comes to Jerusalem", description: "The ark is brought to Jerusalem according to God's instructions." },
    { number: 16, title: "David's Psalm of Praise", description: "David appoints worshipers and gives thanks before the ark." },
    { number: 17, title: "God's Covenant with David", description: "God promises David an enduring royal line." },
    { number: 18, title: "David's Victories", description: "David defeats surrounding nations and establishes his kingdom." },
    { number: 19, title: "David Defeats the Ammonites", description: "David's army defeats the Ammonites and Arameans." },
    { number: 20, title: "David's Victories over the Philistines", description: "David's warriors defeat several Philistine giants." },
    { number: 21, title: "David Counts Israel", description: "David orders a census and later builds an altar to the Lord." },
    { number: 22, title: "Preparations for the Temple", description: "David prepares materials and gives Solomon instructions for the temple." },
    { number: 23, title: "The Levites Organized", description: "David organizes the Levites for service in the temple." },
    { number: 24, title: "Priestly Divisions", description: "The priests are organized into divisions for temple service." },
    { number: 25, title: "Musicians Organized", description: "David organizes musicians for worship." },
    { number: 26, title: "Gatekeepers Organized", description: "Gatekeepers and other temple officials are appointed." },
    { number: 27, title: "Military and Civil Leaders", description: "David organizes military divisions and officials over Israel." },
    { number: 28, title: "David Charges Solomon", description: "David publicly charges Solomon to build the temple and remain faithful." },
    { number: 29, title: "David's Final Prayer", description: "The people give generously for the temple and David dies after blessing God." },
  ],
  "2 Chronicles": [
    { number: 1, title: "Solomon Asks for Wisdom", description: "Solomon asks God for wisdom and receives wealth and honor." },
    { number: 2, title: "Solomon Builds the Temple", description: "Solomon begins building the temple with Huram's help." },
    { number: 3, title: "The Temple Furnished", description: "The temple is built and beautifully furnished." },
    { number: 4, title: "The Bronze Altar", description: "The bronze altar, sea, and utensils are made for the temple." },
    { number: 5, title: "The Ark Brought to the Temple", description: "The ark is brought to the temple and God's glory fills it." },
    { number: 6, title: "Solomon's Prayer of Dedication", description: "Solomon dedicates the temple and prays for the people." },
    { number: 7, title: "God's Response and Solomon's Wealth", description: "God appears to Solomon, and Solomon's wealth is described." },
    { number: 8, title: "Solomon's Other Activities", description: "Solomon's building projects and administrative work are detailed." },
    { number: 9, title: "The Queen of Sheba", description: "The Queen of Sheba visits Solomon and God is glorified." },
    { number: 10, title: "Israel Rebels against Rehoboam", description: "Rehoboam's harshness causes the kingdom to divide." },
    { number: 11, title: "Rehoboam Fortifies Judah", description: "Rehoboam strengthens Judah's defenses and the priests follow him." },
    { number: 12, title: "Shishak Attacks Jerusalem", description: "Egypt attacks Judah because of their unfaithfulness." },
    { number: 13, title: "Abijah King of Judah", description: "Abijah relies on God and defeats Jeroboam in battle." },
    { number: 14, title: "Asa King of Judah", description: "Asa reforms Judah and destroys idols." },
    { number: 15, title: "Asa's Reforms", description: "Asa leads the people to renew their covenant with God." },
    { number: 16, title: "Asa's Last Years", description: "Asa relies on a foreign king instead of God and faces conflict." },
    { number: 17, title: "Jehoshaphat King of Judah", description: "Jehoshaphat follows God and strengthens his kingdom." },
    { number: 18, title: "Micaiah Prophesies", description: "Jehoshaphat and Ahab go to battle despite Micaiah's warning." },
    { number: 19, title: "Jehoshaphat Appoints Judges", description: "Jehoshaphat establishes judges and calls for faithfulness." },
    { number: 20, title: "Moab and Ammon Invade", description: "God defeats Judah's enemies as they worship." },
    { number: 21, title: "Jehoram King of Judah", description: "Jehoram leads Judah into sin and faces judgment." },
    { number: 22, title: "Ahaziah King of Judah", description: "Ahaziah follows wicked advice and is killed by Jehu." },
    { number: 23, title: "Joash Crowned King", description: "Jehoiada the priest overthrows Athaliah and crowns Joash." },
    { number: 24, title: "Joash Repairs the Temple", description: "Joash repairs the temple but later abandons God after Jehoiada's death." },
    { number: 25, title: "Amaziah King of Judah", description: "Amaziah follows God partially but is defeated by Israel." },
    { number: 26, title: "Uzziah King of Judah", description: "Uzziah is strong but becomes proud and is struck with leprosy." },
    { number: 27, title: "Jotham King of Judah", description: "Jotham rules well and grows powerful because he follows God." },
    { number: 28, title: "Ahaz King of Judah", description: "Ahaz worships idols and Judah suffers defeats." },
    { number: 29, title: "Hezekiah King of Judah", description: "Hezekiah reopens and repairs the temple." },
    { number: 30, title: "Hezekiah Celebrates Passover", description: "All Israel is invited to celebrate the Passover in Jerusalem." },
    { number: 31, title: "Contributions for Worship", description: "Hezekiah organizes the priests and the people give generously." },
    { number: 32, title: "Sennacherib Threatens Jerusalem", description: "God miraculously delivers Jerusalem from the Assyrian army." },
    { number: 33, title: "Manasseh King of Judah", description: "Manasseh repents after being taken captive by the Assyrians." },
    { number: 34, title: "Josiah King of Judah", description: "Josiah purifies the land and the Book of the Law is found." },
    { number: 35, title: "Josiah Celebrates Passover", description: "Josiah leads a great Passover and later dies in battle." },
    { number: 36, title: "The Fall of Jerusalem", description: "Judah's final kings fail, and Babylon destroys Jerusalem." },
  ],
};

/* ════════════════════════════════════════════════════════════════════════
   NEW TESTAMENT CHAPTERS
   ════════════════════════════════════════════════════════════════════════ */

const newTestamentChapters = {
  Matthew: [
    { number: 1, title: "The Genealogy of Jesus", description: "Jesus' genealogy and His birth." },
    { number: 2, title: "The Visit of the Magi", description: "The wise men visit Jesus, and the family flees to Egypt." },
    { number: 3, title: "John the Baptist", description: "John prepares the way and Jesus is baptized." },
    { number: 4, title: "Jesus Begins His Ministry", description: "Jesus is tempted and begins preaching in Galilee." },
    { number: 5, title: "The Sermon on the Mount", description: "Jesus teaches the Beatitudes and kingdom living." },
    { number: 6, title: "Teaching on Giving and Prayer", description: "Jesus teaches about prayer, fasting, treasures, and trusting God." },
    { number: 7, title: "Judging Others", description: "Jesus teaches about judgment, prayer, and building on the rock." },
    { number: 8, title: "Jesus Heals the Sick", description: "Jesus heals many and demonstrates authority over nature and demons." },
    { number: 9, title: "Jesus Forgives and Heals", description: "Jesus heals the sick, calls Matthew, and raises a girl." },
    { number: 10, title: "Jesus Sends the Twelve", description: "Jesus sends His disciples to proclaim the kingdom." },
    { number: 11, title: "Jesus and John the Baptist", description: "Jesus speaks about John and invites the weary to come to Him." },
    { number: 12, title: "Lord of the Sabbath", description: "Jesus teaches about mercy and confronts religious opposition." },
    { number: 13, title: "Parables of the Kingdom", description: "Jesus teaches the kingdom through parables." },
    { number: 14, title: "Jesus Feeds Five Thousand", description: "Jesus feeds the crowd and walks on water." },
    { number: 15, title: "Traditions and Faith", description: "Jesus teaches about what truly defiles a person and heals many." },
    { number: 16, title: "Peter Confesses Christ", description: "Peter declares Jesus to be the Messiah." },
    { number: 17, title: "The Transfiguration", description: "Jesus is transfigured before Peter, James, and John." },
    { number: 18, title: "Life in the Kingdom", description: "Jesus teaches humility, forgiveness, and care for others." },
    { number: 19, title: "Teaching on Marriage and Riches", description: "Jesus teaches about marriage, children, and wealth." },
    { number: 20, title: "Workers in the Vineyard", description: "Jesus teaches about grace and servant leadership." },
    { number: 21, title: "The Triumphal Entry", description: "Jesus enters Jerusalem and cleanses the temple." },
    { number: 22, title: "The Parable of the Wedding Feast", description: "Jesus answers religious challenges and teaches about God's kingdom." },
    { number: 23, title: "Woes Against the Pharisees", description: "Jesus warns against hypocrisy and religious pride." },
    { number: 24, title: "Signs of the End Times", description: "Jesus teaches about His return and the end of the age." },
    { number: 25, title: "The Ten Virgins", description: "Jesus teaches readiness through the parables of the virgins and talents." },
    { number: 26, title: "Jesus Is Arrested", description: "Jesus is anointed, betrayed, arrested, and questioned." },
    { number: 27, title: "The Crucifixion", description: "Jesus is sentenced, crucified, and buried." },
    { number: 28, title: "The Resurrection", description: "Jesus rises from the dead and commissions His disciples." },
  ],
  Mark: [
    { number: 1, title: "John Prepares the Way", description: "John baptizes Jesus, and Jesus begins His ministry." },
    { number: 2, title: "Jesus Forgives and Heals", description: "Jesus heals a paralytic and calls Levi." },
    { number: 3, title: "Jesus Heals on the Sabbath", description: "Jesus chooses the Twelve and teaches about God's family." },
    { number: 4, title: "Parables of the Kingdom", description: "Jesus teaches through parables and calms the storm." },
    { number: 5, title: "Jesus' Authority Over Evil and Sickness", description: "Jesus delivers a demon-possessed man and heals two people." },
    { number: 6, title: "Jesus Sends the Twelve", description: "Jesus sends His disciples and feeds five thousand." },
    { number: 7, title: "Jesus and Human Traditions", description: "Jesus teaches about purity and heals Gentiles." },
    { number: 8, title: "Peter Declares Jesus the Messiah", description: "Jesus feeds four thousand and predicts His suffering." },
    { number: 9, title: "The Transfiguration", description: "Jesus is transfigured and teaches His disciples about greatness." },
    { number: 10, title: "Teaching on Marriage and Servanthood", description: "Jesus teaches about marriage, children, wealth, and serving." },
    { number: 11, title: "Jesus Enters Jerusalem", description: "Jesus enters Jerusalem and cleanses the temple." },
    { number: 12, title: "Parable of the Tenants", description: "Jesus answers challenges and teaches about love and giving." },
    { number: 13, title: "The Destruction of the Temple", description: "Jesus teaches about the end times and His return." },
    { number: 14, title: "Jesus Is Betrayed and Arrested", description: "Jesus shares the Last Supper and is arrested." },
    { number: 15, title: "Jesus Is Crucified", description: "Jesus is condemned, crucified, and buried." },
    { number: 16, title: "Jesus Rises Again", description: "The women discover the empty tomb and Jesus is proclaimed risen." },
  ],
  Luke: [
    { number: 1, title: "The Births of John and Jesus Foretold", description: "The angel announces the births of John and Jesus." },
    { number: 2, title: "The Birth of Jesus", description: "Jesus is born in Bethlehem and presented at the temple." },
    { number: 3, title: "John the Baptist Prepares the Way", description: "John preaches repentance and Jesus is baptized." },
    { number: 4, title: "Jesus Is Tempted", description: "Jesus defeats temptation and begins His ministry." },
    { number: 5, title: "Jesus Calls His First Disciples", description: "Jesus calls fishermen and heals the sick." },
    { number: 6, title: "Jesus Chooses the Twelve", description: "Jesus teaches His disciples about kingdom living." },
    { number: 7, title: "Jesus Heals and Forgives", description: "Jesus heals a servant and forgives a sinful woman." },
    { number: 8, title: "Parables and Miracles", description: "Jesus teaches the parable of the sower and performs miracles." },
    { number: 9, title: "Jesus Sends the Twelve", description: "Jesus feeds five thousand and is transfigured." },
    { number: 10, title: "The Good Samaritan", description: "Jesus sends seventy-two disciples and teaches about loving one's neighbor." },
    { number: 11, title: "Jesus Teaches About Prayer", description: "Jesus teaches the Lord's Prayer and confronts unbelief." },
    { number: 12, title: "Do Not Worry", description: "Jesus teaches about possessions, readiness, and faithfulness." },
    { number: 13, title: "Repent or Perish", description: "Jesus teaches repentance and the narrow door." },
    { number: 14, title: "The Cost of Discipleship", description: "Jesus teaches humility and counting the cost." },
    { number: 15, title: "The Lost Son", description: "Jesus tells the parables of the lost sheep, coin, and son." },
    { number: 16, title: "The Rich Man and Lazarus", description: "Jesus teaches about wealth, faithfulness, and eternity." },
    { number: 17, title: "Faith and Thankfulness", description: "Jesus teaches about forgiveness, faith, and gratitude." },
    { number: 18, title: "The Persistent Widow", description: "Jesus teaches about prayer, humility, and salvation." },
    { number: 19, title: "Jesus and Zacchaeus", description: "Jesus saves Zacchaeus and enters Jerusalem." },
    { number: 20, title: "Jesus' Authority Challenged", description: "Religious leaders challenge Jesus' authority." },
    { number: 21, title: "The Widow's Offering", description: "Jesus teaches about giving and the coming destruction." },
    { number: 22, title: "The Last Supper", description: "Jesus shares the Passover meal and is arrested." },
    { number: 23, title: "Jesus Is Crucified", description: "Jesus is sentenced, crucified, and buried." },
    { number: 24, title: "Jesus Is Risen", description: "Jesus rises and appears to His disciples." },
  ],
  John: [
    { number: 1, title: "The Word Became Flesh", description: "Jesus is revealed as the Word and the Lamb of God." },
    { number: 2, title: "Jesus Turns Water Into Wine", description: "Jesus performs His first sign at Cana." },
    { number: 3, title: "Jesus and Nicodemus", description: "Jesus teaches about being born again." },
    { number: 4, title: "Jesus and the Samaritan Woman", description: "Jesus offers living water and heals an official's son." },
    { number: 5, title: "Jesus Heals at Bethesda", description: "Jesus heals a man and teaches about His authority." },
    { number: 6, title: "Jesus Feeds Five Thousand", description: "Jesus feeds the crowd and declares Himself the Bread of Life." },
    { number: 7, title: "Jesus at the Feast", description: "Jesus teaches publicly and reveals His identity." },
    { number: 8, title: "Jesus the Light of the World", description: "Jesus teaches about freedom, truth, and His divine identity." },
    { number: 9, title: "Jesus Heals a Blind Man", description: "Jesus gives sight to a man born blind." },
    { number: 10, title: "The Good Shepherd", description: "Jesus declares Himself the Good Shepherd." },
    { number: 11, title: "Jesus Raises Lazarus", description: "Jesus raises Lazarus from the dead." },
    { number: 12, title: "Jesus Is Anointed", description: "Jesus enters Jerusalem and speaks about His coming death." },
    { number: 13, title: "Jesus Washes His Disciples' Feet", description: "Jesus demonstrates servant leadership and gives a new commandment." },
    { number: 14, title: "Jesus Is the Way", description: "Jesus comforts His disciples and promises the Holy Spirit." },
    { number: 15, title: "The True Vine", description: "Jesus teaches His disciples to remain in Him." },
    { number: 16, title: "The Work of the Holy Spirit", description: "Jesus prepares His disciples for persecution and promises the Spirit." },
    { number: 17, title: "Jesus Prays for His Disciples", description: "Jesus prays for Himself, His disciples, and future believers." },
    { number: 18, title: "Jesus Is Arrested", description: "Jesus is betrayed, arrested, and questioned." },
    { number: 19, title: "Jesus Is Crucified", description: "Jesus is sentenced, crucified, and buried." },
    { number: 20, title: "Jesus Rises Again", description: "Jesus appears to Mary Magdalene and His disciples." },
    { number: 21, title: "Jesus Restores Peter", description: "Jesus appears to His disciples and restores Peter." },
  ],
  Acts: [
    { number: 1, title: "Jesus Ascends to Heaven", description: "Jesus commissions His disciples and ascends to heaven." },
    { number: 2, title: "The Holy Spirit Comes", description: "The Holy Spirit comes at Pentecost and the church begins." },
    { number: 3, title: "Peter Heals a Lame Man", description: "Peter heals a man and preaches about Jesus." },
    { number: 4, title: "Peter and John Before the Council", description: "The apostles boldly proclaim Jesus despite opposition." },
    { number: 5, title: "The Apostles Perform Signs", description: "The apostles continue preaching despite persecution." },
    { number: 6, title: "Seven Servants Chosen", description: "The church chooses seven men to serve." },
    { number: 7, title: "Stephen Is Martyred", description: "Stephen gives his testimony and is killed for his faith." },
    { number: 8, title: "The Gospel Spreads to Samaria", description: "Philip preaches in Samaria and meets the Ethiopian official." },
    { number: 9, title: "Saul Encounters Jesus", description: "Saul meets Jesus and becomes His messenger." },
    { number: 10, title: "Peter and Cornelius", description: "The gospel reaches Gentiles through Cornelius." },
    { number: 11, title: "The Church in Antioch", description: "Gentile believers are welcomed and the church grows." },
    { number: 12, title: "Peter Is Rescued From Prison", description: "An angel frees Peter while Herod faces judgment." },
    { number: 13, title: "Paul's First Missionary Journey", description: "Paul and Barnabas begin preaching the gospel." },
    { number: 14, title: "Paul and Barnabas in Iconium and Lystra", description: "The missionaries preach despite persecution." },
    { number: 15, title: "The Jerusalem Council", description: "The apostles decide that Gentile believers are not required to follow the Law of Moses." },
    { number: 16, title: "Paul's Vision of Macedonia", description: "Paul enters Macedonia and the gospel reaches Philippi." },
    { number: 17, title: "Paul in Athens", description: "Paul preaches about the true God in Athens." },
    { number: 18, title: "Paul in Corinth", description: "Paul ministers in Corinth and continues preaching." },
    { number: 19, title: "Paul in Ephesus", description: "The gospel spreads powerfully throughout Ephesus." },
    { number: 20, title: "Paul's Farewell to the Elders", description: "Paul encourages the Ephesian elders before departing." },
    { number: 21, title: "Paul Goes to Jerusalem", description: "Paul returns to Jerusalem and is arrested." },
    { number: 22, title: "Paul Gives His Testimony", description: "Paul tells the crowd about his encounter with Jesus." },
    { number: 23, title: "Paul Before the Council", description: "Paul defends himself before the Jewish council." },
    { number: 24, title: "Paul Before Felix", description: "Paul stands trial before Governor Felix." },
    { number: 25, title: "Paul Appeals to Caesar", description: "Paul appears before Festus and appeals to Caesar." },
    { number: 26, title: "Paul Before King Agrippa", description: "Paul shares his testimony before Agrippa." },
    { number: 27, title: "Paul's Shipwreck", description: "Paul survives a dangerous storm and shipwreck." },
    { number: 28, title: "Paul Arrives in Rome", description: "Paul reaches Rome and continues preaching the gospel." },
  ],
  Romans: [
    { number: 1, title: "The Gospel and God's Righteousness", description: "Paul introduces the gospel and humanity's rebellion against God." },
    { number: 2, title: "God's Judgment", description: "God judges impartially and looks at the heart." },
    { number: 3, title: "All Have Sinned", description: "Everyone falls short, but righteousness comes through faith in Christ." },
    { number: 4, title: "Abraham Justified by Faith", description: "Abraham's faith demonstrates justification apart from works." },
    { number: 5, title: "Peace With God", description: "Believers receive peace with God through Christ." },
    { number: 6, title: "Dead to Sin, Alive in Christ", description: "Believers are called to live a new life in Christ." },
    { number: 7, title: "Released From the Law", description: "Paul explains the struggle with sin and the Law." },
    { number: 8, title: "Life Through the Spirit", description: "There is no condemnation for those in Christ Jesus." },
    { number: 9, title: "God's Sovereign Choice", description: "Paul discusses God's purposes and mercy." },
    { number: 10, title: "Faith Comes From Hearing", description: "Salvation comes through faith in Christ." },
    { number: 11, title: "Israel's Restoration", description: "Paul explains God's purposes for Israel and the Gentiles." },
    { number: 12, title: "Living Sacrifices", description: "Believers are called to transformed lives and genuine love." },
    { number: 13, title: "Love Fulfills the Law", description: "Christians are called to honor authorities and love others." },
    { number: 14, title: "Do Not Judge Others", description: "Believers should pursue unity and avoid causing others to stumble." },
    { number: 15, title: "Paul's Ministry and Plans", description: "Paul explains his mission and plans to visit Rome." },
    { number: 16, title: "Personal Greetings", description: "Paul greets many believers and warns against division." },
  ],
  "1 Corinthians": [
    { number: 1, title: "Christ Is the Power of God", description: "Paul addresses divisions and points believers to Christ." },
    { number: 2, title: "God's Wisdom", description: "The wisdom of God is revealed through the Spirit." },
    { number: 3, title: "God's Fellow Workers", description: "The church belongs to God and must grow in maturity." },
    { number: 4, title: "Servants of Christ", description: "Paul teaches humility and faithful stewardship." },
    { number: 5, title: "Dealing With Sin", description: "The church must confront serious unrepentant sin." },
    { number: 6, title: "Lawsuits and Sexual Immorality", description: "Believers are called to holiness and purity." },
    { number: 7, title: "Marriage and Singleness", description: "Paul gives guidance about marriage and singleness." },
    { number: 8, title: "Food Offered to Idols", description: "Christian freedom must be guided by love." },
    { number: 9, title: "Paul Gives Up His Rights", description: "Paul sacrifices personal rights for the sake of the gospel." },
    { number: 10, title: "Warnings From Israel's History", description: "Paul warns believers against idolatry and spiritual pride." },
    { number: 11, title: "Worship and the Lord's Supper", description: "Paul teaches about worship and the Lord's Supper." },
    { number: 12, title: "Spiritual Gifts", description: "The church is one body with many spiritual gifts." },
    { number: 13, title: "The Way of Love", description: "Love is greater than every spiritual gift." },
    { number: 14, title: "Orderly Worship", description: "Paul teaches about prophecy, tongues, and orderly worship." },
    { number: 15, title: "The Resurrection", description: "Paul teaches the truth and hope of resurrection." },
    { number: 16, title: "Final Instructions", description: "Paul gives practical instructions and final greetings." },
  ],
  "2 Corinthians": [
    { number: 1, title: "The God of All Comfort", description: "Paul explains suffering and God's comfort." },
    { number: 2, title: "Forgiveness and Triumph", description: "Paul encourages forgiveness and describes victory in Christ." },
    { number: 3, title: "Ministers of the New Covenant", description: "The new covenant brings life and freedom through the Spirit." },
    { number: 4, title: "Treasure in Jars of Clay", description: "Paul describes ministry through weakness and suffering." },
    { number: 5, title: "Ambassadors for Christ", description: "Believers are called to reconciliation with God." },
    { number: 6, title: "Do Not Receive God's Grace in Vain", description: "Paul urges holy living and faithful ministry." },
    { number: 7, title: "Godly Sorrow and Joy", description: "Paul rejoices over the Corinthians' repentance." },
    { number: 8, title: "Generosity in Giving", description: "Paul encourages generous giving for believers in need." },
    { number: 9, title: "God Loves a Cheerful Giver", description: "Generosity reflects God's grace." },
    { number: 10, title: "Paul Defends His Ministry", description: "Paul defends his authority and ministry." },
    { number: 11, title: "Paul and False Apostles", description: "Paul warns against false teachers." },
    { number: 12, title: "Paul's Vision and Weakness", description: "Paul speaks about visions and God's strength in weakness." },
    { number: 13, title: "Final Warnings", description: "Paul calls the church to examine itself and pursue restoration." },
  ],
  Galatians: [
    { number: 1, title: "No Other Gospel", description: "Paul defends the true gospel of grace." },
    { number: 2, title: "Justified by Faith", description: "Paul explains justification through faith in Christ." },
    { number: 3, title: "Faith or Works of the Law", description: "Believers receive God's promise through faith." },
    { number: 4, title: "Children of God", description: "Through Christ, believers become God's children and heirs." },
    { number: 5, title: "Freedom in Christ", description: "Believers are called to live by the Spirit." },
    { number: 6, title: "Carry One Another's Burdens", description: "Paul teaches sowing, doing good, and living by the cross." },
  ],
  Ephesians: [
    { number: 1, title: "Blessings in Christ", description: "Paul celebrates spiritual blessings and God's plan in Christ." },
    { number: 2, title: "Saved by Grace", description: "Salvation is by grace and Christ creates one new people." },
    { number: 3, title: "The Mystery of Christ", description: "Paul explains God's plan to unite Jews and Gentiles." },
    { number: 4, title: "Unity in the Body", description: "Believers are called to unity and transformed living." },
    { number: 5, title: "Walk in Love", description: "Paul teaches holy living, love, marriage, and wisdom." },
    { number: 6, title: "The Armor of God", description: "Believers are called to stand firm in spiritual warfare." },
  ],
  Philippians: [
    { number: 1, title: "To Live Is Christ", description: "Paul rejoices that the gospel is advancing despite imprisonment." },
    { number: 2, title: "Christ's Humility", description: "Believers are called to humility and Christlike service." },
    { number: 3, title: "Knowing Christ", description: "Paul counts everything as loss compared with knowing Christ." },
    { number: 4, title: "Rejoice in the Lord", description: "Paul teaches contentment, prayer, and generosity." },
  ],
  Colossians: [
    { number: 1, title: "The Supremacy of Christ", description: "Christ is supreme over creation and the church." },
    { number: 2, title: "Alive in Christ", description: "Believers are complete in Christ and warned against false teaching." },
    { number: 3, title: "New Life in Christ", description: "Believers are called to put off the old self and live in Christ." },
    { number: 4, title: "Devote Yourselves to Prayer", description: "Paul gives final instructions and greetings." },
  ],
  "1 Thessalonians": [
    { number: 1, title: "The Thessalonians' Faith", description: "Paul praises the believers for their faith and witness." },
    { number: 2, title: "Paul's Ministry", description: "Paul describes his sincere ministry among the Thessalonians." },
    { number: 3, title: "Paul Sends Timothy", description: "Paul is encouraged by the believers' faithfulness." },
    { number: 4, title: "Living to Please God", description: "Paul teaches holiness, love, and Christ's return." },
    { number: 5, title: "The Day of the Lord", description: "Believers are called to remain alert, faithful, and hopeful." },
  ],
  "2 Thessalonians": [
    { number: 1, title: "Encouragement in Persecution", description: "Paul encourages believers suffering for their faith." },
    { number: 2, title: "The Man of Lawlessness", description: "Paul explains events surrounding the Day of the Lord." },
    { number: 3, title: "Pray and Keep Working", description: "Paul urges faithful living and responsible work." },
  ],
  "1 Timothy": [
    { number: 1, title: "Warning Against False Teaching", description: "Paul instructs Timothy to guard sound doctrine." },
    { number: 2, title: "Instructions About Prayer", description: "Paul teaches about prayer and worship." },
    { number: 3, title: "Qualifications for Leaders", description: "Paul describes qualifications for overseers and deacons." },
    { number: 4, title: "A Good Servant of Christ", description: "Timothy is encouraged to remain faithful and teach truth." },
    { number: 5, title: "Care for the Church", description: "Paul teaches about relationships, widows, elders, and responsibility." },
    { number: 6, title: "Godliness and Contentment", description: "Paul warns against greed and urges Timothy to pursue godliness." },
  ],
  "2 Timothy": [
    { number: 1, title: "Guard the Gospel", description: "Paul encourages Timothy to remain courageous and faithful." },
    { number: 2, title: "A Good Soldier of Christ", description: "Paul teaches endurance, discipline, and faithful ministry." },
    { number: 3, title: "Godlessness in the Last Days", description: "Paul warns about false teachers and points Timothy to Scripture." },
    { number: 4, title: "Finish the Race", description: "Paul gives his final charge and reflects on his ministry." },
  ],
  Titus: [
    { number: 1, title: "Appointing Church Leaders", description: "Paul gives Titus instructions about elders and false teachers." },
    { number: 2, title: "Teach What Is Consistent With Sound Doctrine", description: "Believers are called to live godly lives." },
    { number: 3, title: "Devote Yourself to Good Works", description: "Paul teaches grace, renewal, and good works." },
  ],
  Philemon: [
    { number: 1, title: "Paul Appeals for Onesimus", description: "Paul asks Philemon to receive Onesimus as a beloved brother." },
  ],
  Hebrews: [
    { number: 1, title: "The Son Is Greater Than Angels", description: "Jesus is God's supreme revelation and Son." },
    { number: 2, title: "Jesus Became Fully Human", description: "Jesus shares humanity to bring salvation." },
    { number: 3, title: "Jesus Is Greater Than Moses", description: "Believers are warned not to harden their hearts." },
    { number: 4, title: "The Promise of God's Rest", description: "Believers are invited to enter God's rest through faith." },
    { number: 5, title: "Jesus the Great High Priest", description: "Jesus is appointed as the perfect High Priest." },
    { number: 6, title: "Hope as an Anchor", description: "Believers are encouraged to persevere in hope." },
    { number: 7, title: "Jesus and Melchizedek", description: "Jesus is the eternal High Priest." },
    { number: 8, title: "The New Covenant", description: "Jesus mediates a better covenant." },
    { number: 9, title: "Christ's Sacrifice", description: "Christ enters the heavenly sanctuary with His own blood." },
    { number: 10, title: "Christ's Once-for-All Sacrifice", description: "Jesus' sacrifice completely accomplishes salvation." },
    { number: 11, title: "The Hall of Faith", description: "Examples of faithful believers throughout history." },
    { number: 12, title: "Run the Race With Perseverance", description: "Believers are called to endure and pursue holiness." },
    { number: 13, title: "Final Exhortations", description: "Practical instructions for faithful Christian living." },
  ],
  James: [
    { number: 1, title: "Trials and Temptation", description: "James teaches about perseverance, wisdom, and genuine faith." },
    { number: 2, title: "Faith and Works", description: "True faith is demonstrated through action." },
    { number: 3, title: "Taming the Tongue", description: "James teaches about controlling speech and seeking wisdom." },
    { number: 4, title: "Submit Yourselves to God", description: "Believers are warned against pride and worldliness." },
    { number: 5, title: "Patience in Suffering", description: "James encourages prayer, patience, and restoring those who wander." },
  ],
  "1 Peter": [
    { number: 1, title: "A Living Hope", description: "Believers have a living hope through Christ's resurrection." },
    { number: 2, title: "Living Stones", description: "Believers are called to holy living and submission." },
    { number: 3, title: "Suffering for Doing Good", description: "Peter teaches about relationships and suffering faithfully." },
    { number: 4, title: "Living for God", description: "Believers are called to live for God's will and endure suffering." },
    { number: 5, title: "Cast Your Anxiety on Him", description: "Peter encourages humility, leadership, and standing firm in faith." },
  ],
  "2 Peter": [
    { number: 1, title: "Growing in Faith", description: "Believers are called to grow in godly character." },
    { number: 2, title: "False Teachers", description: "Peter warns against destructive false teachers." },
    { number: 3, title: "The Day of the Lord", description: "Peter teaches about Christ's return and the new creation." },
  ],
  "1 John": [
    { number: 1, title: "Walking in the Light", description: "Believers are called to walk in truth and confess sin." },
    { number: 2, title: "Obedience and Love", description: "John teaches about obedience, love, and avoiding worldliness." },
    { number: 3, title: "Children of God", description: "Believers are called to live as God's children and love one another." },
    { number: 4, title: "God Is Love", description: "John teaches that genuine love comes from God." },
    { number: 5, title: "Faith in the Son of God", description: "John gives assurance of eternal life through Jesus." },
  ],
  "2 John": [
    { number: 1, title: "Walk in Truth and Love", description: "John encourages believers to walk in truth and beware of deceivers." },
  ],
  "3 John": [
    { number: 1, title: "Support Faithful Workers", description: "John commends faithful hospitality and warns against harmful leadership." },
  ],
  Jude: [
    { number: 1, title: "Contend for the Faith", description: "Jude urges believers to defend the faith against false teachers." },
  ],
  Revelation: [
    { number: 1, title: "The Revelation of Jesus Christ", description: "John receives a revelation of Jesus Christ." },
    { number: 2, title: "Messages to Four Churches", description: "Jesus speaks to the churches in Ephesus, Smyrna, Pergamum, and Thyatira." },
    { number: 3, title: "Messages to Three Churches", description: "Jesus speaks to the churches in Sardis, Philadelphia, and Laodicea." },
    { number: 4, title: "The Throne in Heaven", description: "John sees God's throne and heavenly worship." },
    { number: 5, title: "The Lamb and the Scroll", description: "The Lamb is found worthy to open the scroll." },
    { number: 6, title: "The Seven Seals", description: "The Lamb opens the first six seals." },
    { number: 7, title: "The Great Multitude", description: "God seals His servants and a great multitude worships before Him." },
    { number: 8, title: "The Seventh Seal", description: "The seventh seal opens and seven angels receive trumpets." },
    { number: 9, title: "The Fifth and Sixth Trumpets", description: "Terrible judgments come upon the earth." },
    { number: 10, title: "The Angel and the Little Scroll", description: "John receives the little scroll and is told to prophesy." },
    { number: 11, title: "The Two Witnesses", description: "Two witnesses testify before God and the seventh trumpet sounds." },
    { number: 12, title: "The Woman and the Dragon", description: "A cosmic battle unfolds between God's people and the dragon." },
    { number: 13, title: "The Two Beasts", description: "John sees the beast from the sea and the beast from the earth." },
    { number: 14, title: "The Lamb and the Harvest", description: "The Lamb stands with His people and final judgment approaches." },
    { number: 15, title: "The Seven Bowls of Wrath", description: "Seven angels prepare to pour out God's final judgments." },
    { number: 16, title: "The Seven Bowls", description: "The seven bowls of God's wrath are poured out." },
    { number: 17, title: "Babylon the Great", description: "The judgment of the great prostitute is revealed." },
    { number: 18, title: "The Fall of Babylon", description: "Babylon falls and heaven rejoices over God's judgment." },
    { number: 19, title: "The Rider on the White Horse", description: "Christ appears as the victorious King and defeats His enemies." },
    { number: 20, title: "The Thousand Years", description: "Satan is defeated and the final judgment takes place." },
    { number: 21, title: "The New Heaven and New Earth", description: "God creates a new heaven and new earth, and the New Jerusalem appears." },
    { number: 22, title: "The River of Life", description: "The final vision reveals the river of life and Jesus' promised return." },
  ],
};

/* ════════════════════════════════════════════════════════════════════════
   UNIFIED CHAPTER LOADER — the single source of truth for every book
   ════════════════════════════════════════════════════════════════════════ */

const getChaptersForBook = (bookName, chapterCount) => {
  // Genesis uses its own dedicated data (matches ge1.png–ge50.png)
  if (bookName === "Genesis") {
    return genesisChapterData;
  }

  // Torah books with dedicated arrays
  switch (bookName) {
    case "Exodus":
      return exodusChapters;
    case "Leviticus":
      return leviticusChapters;
    case "Numbers":
      return numbersChapters;
    case "Deuteronomy":
      return deuteronomyChapters;
    default:
      break;
  }

  // Historical books (Joshua → 2 Chronicles)
  if (historicalChapters[bookName]) {
    return historicalChapters[bookName];
  }

  // New Testament books
  if (newTestamentChapters[bookName]) {
    return newTestamentChapters[bookName];
  }

  // Fallback for any book without custom chapter text yet
  // (Ezra, Nehemiah, Esther, Job, Psalms, Proverbs, the Prophets, etc.)
  return Array.from({ length: chapterCount }, (_, index) => ({
    number: index + 1,
    title: `Chapter ${index + 1}`,
    description: "",
  }));
};

// Category badge colors (used for the book-detail testament/category tags)
const categoryColor = (cat) => {
  const map = {
    Law: "#dbeafe",
    History: "#fef3c7",
    Poetry: "#fce7f3",
    "Major Prophets": "#dcfce7",
    "Minor Prophets": "#e0e7ff",
    Gospels: "#fee2e2",
    "Pauline Epistles": "#d1fae5",
    "General Epistles": "#ccfbf1",
    Prophecy: "#f3e8ff",
  };
  return map[cat] || "#f3f4f6";
};

const categoryTextColor = (cat) => {
  const map = {
    Law: "#1e40af",
    History: "#92400e",
    Poetry: "#9d174d",
    "Major Prophets": "#166534",
    "Minor Prophets": "#3730a3",
    Gospels: "#991b1b",
    "Pauline Epistles": "#065f46",
    "General Epistles": "#115e59",
    Prophecy: "#6b21a8",
  };
  return map[cat] || "#374151";
};

/* ════════════════════════════════════════════════════════════════════════
   COMPONENT (declared once)
   ════════════════════════════════════════════════════════════════════════ */

function Comics() {
  const navigate = useNavigate();

  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [testamentFilter, setTestamentFilter] = useState("ALL");

  const handleSelectBook = (book) => {
    setSelectedBook(book);
    setSelectedChapter(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenChapter = (chapter) => {
    setSelectedChapter(chapter);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToBooks = () => {
    setSelectedBook(null);
    setSelectedChapter(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToChapters = () => {
    setSelectedChapter(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const chapters = selectedBook
    ? getChaptersForBook(selectedBook.name, selectedBook.chapters)
    : [];

  const currentChapterIndex = selectedChapter
    ? chapters.findIndex((chapter) => chapter.number === selectedChapter.number)
    : -1;

  const previousChapter =
    currentChapterIndex > 0 ? chapters[currentChapterIndex - 1] : null;

  const nextChapter =
    currentChapterIndex >= 0 && currentChapterIndex < chapters.length - 1
      ? chapters[currentChapterIndex + 1]
      : null;

  // Resolves the ge{N}.png image for the currently open Genesis chapter
  const currentComicImage = useMemo(() => {
    if (!selectedBook || !selectedChapter) return null;
    if (selectedBook.name !== "Genesis") return null;
    return genesisImages[selectedChapter.number] || null;
  }, [selectedBook, selectedChapter]);

  // Keyboard navigation: ← previous, → next, Esc back to chapter grid
  useEffect(() => {
    if (!selectedChapter) return;

    const handleKeyDown = (event) => {
      if (event.key === "ArrowLeft" && previousChapter) {
        setSelectedChapter(previousChapter);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      if (event.key === "ArrowRight" && nextChapter) {
        setSelectedChapter(nextChapter);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      if (event.key === "Escape") {
        handleBackToChapters();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedChapter, previousChapter, nextChapter]);

  /* ══════════════════════════════════════════════════════════════════════
     VIEW 1 — COMIC READER (vertical, manga-style, one image = one chapter)
     ══════════════════════════════════════════════════════════════════════ */

  if (selectedChapter) {
    return (
      <div className="comics-page comic-reader-page">
        <div className="comics-topbar">
          <button className="books-button" onClick={handleBackToChapters}>
            <ArrowLeft size={16} />
            <span>Back to {selectedBook.name}</span>
          </button>
        </div>

        <main className="comic-reader">
          <header className="comic-reader-header">
            <div className="comic-reader-book">
              {selectedBook.name} · Chapter {selectedChapter.number}
            </div>
            <h1>{selectedChapter.title}</h1>
            {selectedChapter.description && <p>{selectedChapter.description}</p>}
          </header>

          <section className="vertical-comic-reader">
            {currentComicImage ? (
              <div className="comic-full-page">
                <img
                  src={currentComicImage}
                  alt={`${selectedBook.name} Chapter ${selectedChapter.number}`}
                  className="comic-page-image"
                />
              </div>
            ) : (
              <div className="comic-image-missing">
                <ImageIcon size={55} />
                <h2>Chapter {selectedChapter.number}</h2>
                <p>The comic image for this chapter is not available yet.</p>
                {selectedBook.name === "Genesis" && (
                  <small>
                    Add: <br />
                    <strong>
                      src/assets/comics/genesis/ge{selectedChapter.number}.png
                    </strong>
                  </small>
                )}
              </div>
            )}
          </section>

          <div className="comic-end">
            <div className="comic-end-line" />
            <span>End of Chapter {selectedChapter.number}</span>
            <div className="comic-end-line" />
          </div>

          <div className="comic-navigation">
            <button
              className="comic-nav-button"
              disabled={!previousChapter}
              onClick={() => previousChapter && handleOpenChapter(previousChapter)}
            >
              <ArrowLeft size={20} />
              <span>
                {previousChapter ? `Chapter ${previousChapter.number}` : "Previous"}
              </span>
            </button>

            <div className="comic-page-counter">
              <strong>{selectedChapter.number}</strong>
              <span>/ {chapters.length}</span>
            </div>

            <button
              className="comic-nav-button"
              disabled={!nextChapter}
              onClick={() => nextChapter && handleOpenChapter(nextChapter)}
            >
              <span>{nextChapter ? `Chapter ${nextChapter.number}` : "Next"}</span>
              <ArrowRight size={20} />
            </button>
          </div>

          <div className="comic-keyboard-help">
            <span>← Previous</span>
            <span>→ Next</span>
            <span>Esc Back</span>
          </div>
        </main>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════
     VIEW 2 — CHAPTER GRID FOR A SELECTED BOOK
     ══════════════════════════════════════════════════════════════════════ */

  if (selectedBook) {
    return (
      <div className="comics-page">
        <div className="comics-topbar">
          <button className="books-button" onClick={handleBackToBooks}>
            <ArrowLeft size={16} />
            <span>Books of the Bible</span>
          </button>
        </div>

        <section className="genesis-hero">
          <div className="genesis-info">
            <div className="genesis-title">
              <h1>{selectedBook.name}</h1>
              <span>{selectedBook.category}</span>
            </div>

            <p className="genesis-description">{selectedBook.longDesc}</p>

            <div className="genesis-stats">
              <div className="stat-card">
                <BookOpen size={25} />
                <div>
                  <small>Chapters</small>
                  <strong>{selectedBook.chapters}</strong>
                </div>
              </div>
              <div className="stat-card">
                <CalendarDays size={25} />
                <div>
                  <small>Testament</small>
                  <strong>{selectedBook.testament === "OT" ? "Old" : "New"}</strong>
                </div>
              </div>
              <div className="stat-card">
                <Clock3 size={25} />
                <div>
                  <small>Category</small>
                  <strong>{selectedBook.category}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="genesis-cover">
            {selectedBook.name === "Genesis" ? (
              <img src={bbleCover} alt="Bible Collection Cover" className="cover-image" />
            ) : (
              <>
                <ImageIcon size={55} />
                <span>{selectedBook.name}</span>
                <small>Comics style</small>
              </>
            )}
          </div>
        </section>

        <section className="chapters-section">
          <div className="chapters-heading">
            <h2>
              All Chapters <span> ({chapters.length})</span>
            </h2>
          </div>

          <div className="chapters-grid">
            {chapters.map((chapter) => {
              const chapterImage =
                selectedBook.name === "Genesis" ? genesisImages[chapter.number] : null;

              return (
                <article
                  className="chapter-card"
                  key={chapter.number}
                  onClick={() => handleOpenChapter(chapter)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="chapter-image" style={{ position: "relative" }}>
                    <span className="chapter-number">Chapter {chapter.number}</span>

                    {chapterImage ? (
                      <img
                        src={chapterImage}
                        alt={`Genesis Chapter ${chapter.number}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div className="image-placeholder">
                        <ImageIcon size={35} />
                      </div>
                    )}
                  </div>

                  <div className="chapter-content">
                    <h3>{chapter.title}</h3>
                    {chapter.description && <p>{chapter.description}</p>}

                    {selectedBook.name === "Genesis" && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          color: chapterImage ? "#4d7c0f" : "#999",
                        }}
                      >
                        {chapterImage ? "Comic available" : "Comic coming soon"}
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════
     VIEW 3 — BOOK LIST (default landing view)
     ══════════════════════════════════════════════════════════════════════ */

  const filteredBooks =
    testamentFilter === "ALL"
      ? bibleBooks
      : bibleBooks.filter((book) => book.testament === testamentFilter);

  return (
    <div className="comics-page">
      <div className="comics-topbar">
        <button className="books-button" onClick={() => navigate("/comics")}>
          <ArrowLeft size={16} />
          <span>Books of the Bible</span>
        </button>
      </div>

      <section className="genesis-hero">
        <div className="genesis-info">
          <div className="genesis-title">
            <h1>The Holy Bible</h1>
            <span>66 Books · One Story</span>
          </div>

          <p className="genesis-description">
            Explore the Bible from Genesis to Revelation. Choose a book, select a
            chapter, and read its comic illustration.
          </p>

          <div className="genesis-stats">
            <div className="stat-card">
              <BookOpen size={25} />
              <div>
                <small>Old Testament</small>
                <strong>39 Books</strong>
              </div>
            </div>
            <div className="stat-card">
              <BookOpen size={25} />
              <div>
                <small>New Testament</small>
                <strong>27 Books</strong>
              </div>
            </div>
            <div className="stat-card">
              <Clock3 size={25} />
              <div>
                <small>Total Chapters</small>
                <strong>1,189</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="genesis-cover">
          <img src={bbleCover} alt="Bible Collection Cover" className="cover-image" />
          <div className="comic-label">
            <span>BIBLE</span>
            <small>Comics style</small>
          </div>
        </div>
      </section>

      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {[
          { key: "ALL", label: "All Books" },
          { key: "OT", label: "Old Testament" },
          { key: "NT", label: "New Testament" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTestamentFilter(tab.key)}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: "1px solid",
              borderColor: testamentFilter === tab.key ? "#c9a45c" : "#e5e7eb",
              background: testamentFilter === tab.key ? "#fdf6e8" : "#fff",
              color: testamentFilter === tab.key ? "#92400e" : "#6b7280",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="chapters-section">
        <div className="chapters-heading">
          <h2>
            {testamentFilter === "ALL"
              ? "All Books"
              : testamentFilter === "OT"
              ? "Old Testament"
              : "New Testament"}
            <span style={{ color: "#9ca3af", fontWeight: 500, marginLeft: "6px" }}>
              ({filteredBooks.length})
            </span>
          </h2>
        </div>

        <div
          className="chapters-grid"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}
        >
          {filteredBooks.map((book) => (
            <article
              className="chapter-card"
              key={book.name}
              onClick={() => handleSelectBook(book)}
              style={{ cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s" }}
              onMouseEnter={(event) => {
                event.currentTarget.style.transform = "translateY(-3px)";
                event.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.08)";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.transform = "translateY(0)";
                event.currentTarget.style.boxShadow = "none";
              }}
            >
              <div className="chapter-image" style={{ position: "relative" }}>
                <span
                  className="chapter-number"
                  style={{
                    position: "absolute",
                    top: "8px",
                    left: "8px",
                    zIndex: 2,
                    padding: "2px 8px",
                    borderRadius: "6px",
                    fontSize: "10px",
                    fontWeight: 700,
                    background: categoryColor(book.category),
                    color: categoryTextColor(book.category),
                  }}
                >
                  {book.testament}
                </span>

                {book.name === "Genesis" ? (
                  <img
                    src={bbleCover}
                    alt="Genesis"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    className="image-placeholder"
                    style={{
                      height: "100px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ImageIcon size={30} />
                  </div>
                )}
              </div>

              <div className="chapter-content" style={{ padding: "10px 12px" }}>
                <h3 style={{ fontSize: "14px", margin: "0 0 4px 0" }}>{book.name}</h3>
                <p style={{ fontSize: "11px", color: "#9ca3af", margin: "0 0 6px 0" }}>
                  {book.desc}
                </p>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#6b7280" }}>
                  {book.chapters} Chapters
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Comics;