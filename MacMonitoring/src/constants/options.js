export const tribes = [
    "DANALI",
    "REUBEN",
    "JOSIAH",
    "EPHRAIM",
    "MANASSEH",
    "GAD",
    "EZRA"
];

export const leaderTypes = [
    "TRIBE LEADER",
    "ANDREW",
    "PETER",
    "MEMBER"
];

// Active ministry assignments
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

// Schooling process classes
export const schoolingClasses = [
    "FOUNDATION CLASS",
    "MAKE DISCIPLE CLASS",
    "LIFE GROUP CLASS"
];

// Combined for dropdowns that need both
export const allMinistries = [
    ...ministries,
    ...schoolingClasses
];

// DJ Types
export const djTypes = [
    "Devotion Checker",
    "LifeGroup Checker"
];

// Civil Status
export const civilStatusOptions = [
    "Single",
    "Married"
];

// Tithing Types
export const tithingTypes = [
    "Individual",
    "Combined"
];

// =========================
// NEWCOMER JOURNEY STAGES
// =========================

export const consoStages = [
    "1st Timer",
    "2nd Timer",
    "3rd Timer"
];

export const soulWinningStages = [
    "Life Track (BUHAY)",
    "Life Start - Jesus",
    "Life Start - TWL",
    "Life Start - Bible and Devotion",
    "Life Start - Prayer",
    "Life Start - Sharing to Others",
    "Lifegroup and Church"
];

export const soakingStages = [
    "Candidate for Life Retreat",
    "Pre Life Retreat",
    "Life Retreat",
    "Victorious Life Class",
    "Project Andrew"
];

export const schoolingStages = [
    "Foundation Class",
    "Make Disciple Class",
    "Life Group Class"
];

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

// Helper: Check if newcomer is ready for conversion
export const isReadyForConversion = (stage) => stage === "Life Group Class";

// Helper: Check if user is still in schooling process
export const isInSchooling = (ministry) => {
    if (!ministry) return false;
    return schoolingClasses.includes(ministry);
};

// Helper: Check if user has a specific ministry
export const hasMinistry = (userMinistries, ministry) => {
    if (!userMinistries) return false;
    if (Array.isArray(userMinistries)) {
        return userMinistries.includes(ministry);
    }
    // Backward compatibility for single ministry string
    return userMinistries === ministry;
};

// Helper: Check if user has any of the given ministries
export const hasAnyMinistry = (userMinistries, ministriesList) => {
    if (!userMinistries || !ministriesList) return false;
    if (Array.isArray(userMinistries)) {
        return ministriesList.some(m => userMinistries.includes(m));
    }
    return ministriesList.includes(userMinistries);
};