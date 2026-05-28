export const tribes = [
    "DANALI",
    "REUBEN",
    "ASHER",
    "EPHRAIM",
    "MANASSEH",
    "JOSEPH",
    "GAD",
    "EZRA"
];

export const leaderTypes = [
    "TRIBE LEADER",
    "ANDREW",
    "PETER",
    "MEMBER"
];

// Active ministry assignments (after completing all schooling)
export const ministries = [
    "ADMIN",
    "FINANCE",
    "WORSHIP TEAM",
    "MEDIA",
    "MARSHALL",
    "USHERING",
    "HOSPITALITY",
    "DANCE",
    "DISCIPLESHIP JOURNEY",
    "EVENT ORGANIZER",
    "NONE"
];

// Schooling process classes (Discipleship Journey)
export const schoolingClasses = [
    "FOUNDATION CLASS",
    "MAKE DISCIPLE CLASS",
    "LIFE GROUP CLASS"
];

// Combined for admin dropdowns
export const allMinistries = [
    ...ministries,
    ...schoolingClasses
];

// =========================
// NEWCOMER JOURNEY STAGES
// =========================

// Conso stages (initial visits)
export const consoStages = [
    "1st Timer",
    "2nd Timer",
    "3rd Timer"
];

// Soul Winning stages (Life Track → Life Start topics)
export const soulWinningStages = [
    "Life Track (BUHAY)",
    "Life Start - Jesus",
    "Life Start - TWL",
    "Life Start - Bible and Devotion",
    "Life Start - Prayer",
    "Life Start - Sharing to Others",
    "Lifegroup and Church"
];

// Soaking stages (after Soul Winning, before Schooling)
export const soakingStages = [
    "Candidate for Life Retreat",
    "Pre Life Retreat",
    "Life Retreat",
    "Victorious Life Class",
    "Project Peter"
];

// Schooling stages (Discipleship Journey — lowercase for newcomers table)
export const schoolingStages = [
    "Foundation Class",
    "Make Disciple Class",
    "Life Group Class"
];

// All newcomer stages in order
export const allNewcomerStages = [
    ...consoStages,
    ...soulWinningStages,
    ...soakingStages,
    ...schoolingStages
];

// Helper: Check which category a stage belongs to
export const getStageCategory = (stage) => {
    if (consoStages.includes(stage)) return "CONSO";
    if (soulWinningStages.includes(stage)) return "SOUL WINNING";
    if (soakingStages.includes(stage)) return "SOAKING";
    if (schoolingStages.includes(stage)) return "SCHOOLING";
    return "UNKNOWN";
};

// Helper: Get next stage in the journey
export const getNextStage = (currentStage) => {
    const index = allNewcomerStages.indexOf(currentStage);
    if (index === -1 || index === allNewcomerStages.length - 1) return null;
    return allNewcomerStages[index + 1];
};

// Helper: Check if stage is in Soul Winning
export const isSoulWinningStage = (stage) => soulWinningStages.includes(stage);

// Helper: Check if stage is in Soaking
export const isSoakingStage = (stage) => soakingStages.includes(stage);

// Helper: Check if stage is in Schooling
export const isSchoolingStage = (stage) => schoolingStages.includes(stage);

// Helper: Check if newcomer is ready for conversion (completed all schooling)
export const isReadyForConversion = (stage) => stage === "Life Group Class";

// Helper: Check if user is still in schooling process
export const isInSchooling = (ministry) => {
    if (!ministry) return false;
    return schoolingClasses.includes(ministry);
};