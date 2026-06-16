// Session keys
const USER_KEY = "emsUser";
const NEWCOMER_KEY = "emsNewcomer";

/* =========================
   USER SESSION
========================= */
export const getCurrentUser = () => {
    try {
        const user = localStorage.getItem(USER_KEY);
        return user ? JSON.parse(user) : null;
    } catch (e) {
        console.error("Error parsing user", e);
        return null;
    }
};

export const setCurrentUser = (user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event("ems-auth-change"));
};

export const clearCurrentUser = () => {
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event("ems-auth-change"));
};

/* =========================
   NEWCOMER SESSION
========================= */
export const getNewcomer = () => {
    try {
        const newcomer = localStorage.getItem(NEWCOMER_KEY);
        return newcomer ? JSON.parse(newcomer) : null;
    } catch (e) {
        console.error("Error parsing newcomer", e);
        return null;
    }
};

export const setNewcomer = (newcomer) => {
    localStorage.setItem(NEWCOMER_KEY, JSON.stringify(newcomer));
    window.dispatchEvent(new Event("ems-auth-change"));
};

export const clearNewcomer = () => {
    localStorage.removeItem(NEWCOMER_KEY);
    window.dispatchEvent(new Event("ems-auth-change"));
};

/* =========================
   LOGOUT
========================= */
export const logout = () => {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(NEWCOMER_KEY);
    window.dispatchEvent(new Event("ems-auth-change"));
    window.location.href = "/login";
};

/* =========================
   MINISTRY HELPERS
========================= */
export const getUserMinistries = () => {
    const user = getCurrentUser();
    if (!user) return [];
    // Handle both array (new) and string (legacy)
    if (user.ministries && Array.isArray(user.ministries)) {
        return user.ministries;
    }
    if (user.ministry) {
        return [user.ministry];
    }
    return [];
};

export const hasMinistry = (ministry) => {
    const ministries = getUserMinistries();
    return ministries.includes(ministry);
};

export const hasAnyMinistry = (ministriesList) => {
    const userMinistries = getUserMinistries();
    if (!ministriesList || !userMinistries.length) return false;
    return ministriesList.some(m => userMinistries.includes(m));
};

/* =========================
   ROLE CHECKS
========================= */
export const isAdmin = () => {
    return hasMinistry("ADMIN");
};

export const isFinance = () => {
    return hasMinistry("FINANCE");
};

export const isUshering = () => {
    return hasMinistry("USHERING");
};

export const isDiscipleship = () => {
    return hasMinistry("DISCIPLESHIP JOURNEY");
};

export const isWorshipTeam = () => {
    return hasMinistry("WORSHIP TEAM");
};

export const isMedia = () => {
    return hasMinistry("MEDIA");
};

export const isMarshall = () => {
    return hasMinistry("MARSHALL");
};

export const isHospitality = () => {
    return hasMinistry("HOSPITALITY");
};

export const isDance = () => {
    return hasMinistry("DANCE");
};

export const isEventOrganizer = () => {
    return hasMinistry("EVENT ORGANIZER");
};

export const isLeader = () => {
    const user = getCurrentUser();
    return user?.type === "TRIBE LEADER" || user?.type === "ANDREW" || user?.type === "PETER";
};

export const isMember = () => {
    const user = getCurrentUser();
    return user?.type === "MEMBER";
};

/* =========================
   DJ CHECKERS
========================= */
export const isDevotionChecker = () => {
    const user = getCurrentUser();
    return user?.dj_type === "Devotion Checker" && hasMinistry("DISCIPLESHIP JOURNEY");
};

export const isLifeGroupChecker = () => {
    const user = getCurrentUser();
    return user?.dj_type === "LifeGroup Checker" && hasMinistry("DISCIPLESHIP JOURNEY");
};

export const getAssignedTribe = () => {
    const user = getCurrentUser();
    return user?.assigned_tribe || null;
};

/* =========================
   PAGE ACCESS PERMISSIONS
========================= */
export const canAccessDashboard = () => {
    const user = getCurrentUser();
    return !!user;
};

export const canViewLeaders = () => {
    const user = getCurrentUser();
    return !!user;
};

export const canViewLeaderProfile = (targetLeaderId) => {
    const user = getCurrentUser();
    if (!user) return false;
    if (user.id === targetLeaderId) return true;
    if (isAdmin()) return true;
    if (isFinance()) return true;
    if (isUshering()) return true;
    if (isDiscipleship()) return true;
    return false;
};

export const canViewNewcomerProfile = (targetNewcomerId) => {
    const user = getCurrentUser();
    const newcomer = getNewcomer();
    if (newcomer && newcomer.id === targetNewcomerId) return true;
    if (user && isAdmin()) return true;
    if (user && isDiscipleship()) return true;
    return false;
};

/* =========================
   ACTION PERMISSIONS
========================= */
export const canEditOwnProfile = () => {
    return isAdmin();
};

export const canEditAnyProfile = () => isAdmin();

export const canDeleteProfile = (targetLeaderId) => {
    const user = getCurrentUser();
    if (!user) return false;
    if (isAdmin()) return true;
    return false;
};

export const canAddMember = () => {
    const user = getCurrentUser();
    if (!user) return false;
    return isAdmin() || isDiscipleship();
};

export const canAddDevotion = () => {
    const user = getCurrentUser();
    if (!user) return false;
    return true;
};

export const canAddLifeGroup = () => {
    const user = getCurrentUser();
    if (!user) return false;
    return true;
};

export const canEditDevotionForTribe = (targetTribe) => {
    const user = getCurrentUser();
    if (!user) return false;
    if (isAdmin()) return true;
    if (isDevotionChecker()) {
        return user.assigned_tribe === targetTribe;
    }
    // Users can edit their own devotion
    if (user.tribe === targetTribe && !isDevotionChecker()) {
        return true;
    }
    return false;
};

export const canViewDevotionForTribe = (targetTribe) => {
    const user = getCurrentUser();
    if (!user) return false;
    if (isAdmin()) return true;
    if (isDevotionChecker()) {
        return user.assigned_tribe === targetTribe;
    }
    if (isDiscipleship()) return true;
    // Users can view their own tribe
    if (user.tribe === targetTribe) return true;
    return false;
};

/* =========================
   MODULE PERMISSIONS
========================= */
export const canAccessAttendance = () => {
    const user = getCurrentUser();
    if (!user) return false;
    return isAdmin() || isUshering();
};

export const canAccessTithes = () => {
    const user = getCurrentUser();
    if (!user) return false;
    return isAdmin() || isFinance();
};

export const canAccessDevotion = () => {
    const user = getCurrentUser();
    if (!user) return false;
    return isAdmin() || isDiscipleship() || isDevotionChecker();
};

export const canAccessAssimilation = () => {
    const user = getCurrentUser();
    if (!user) return false;
    if (isAdmin()) return true;
    if (isDiscipleship()) return true;
    if (isLeader()) return true;
    return false;
};

export const canConvertNewcomer = () => {
    const user = getCurrentUser();
    if (!user) return false;
    return isAdmin() || isDiscipleship();
};

export const canAccessLifeGroup = () => {
    const user = getCurrentUser();
    if (!user) return false;
    return isAdmin() || isLeader() || isLifeGroupChecker();
};

export const canEditGrossIncome = () => {
    return isFinance() || isAdmin();
};

/* =========================
   SIDEBAR VISIBILITY
========================= */
export const getVisibleRoutes = () => {
    const user = getCurrentUser();
    const newcomer = getNewcomer();

    if (!user && !newcomer) return [];

    if (newcomer) {
        return [
            { path: "/newcomer/" + newcomer.id, label: "My Journey" },
        ];
    }

    // Regular MEMBER gets minimal routes
    if (isMember()) {
        return [
            { path: "/dashboard", label: "Dashboard" },
            { path: "/leaders", label: "Leaders" },
            { path: `/leader/${user.id}`, label: "My Profile" },
        ];
    }

    const routes = [
        { path: "/dashboard", label: "Dashboard" },
    ];

    if (canViewLeaders()) {
        routes.push({ path: "/leaders", label: "Leaders" });
    }

    if (canAccessAssimilation()) {
        routes.push({ path: "/assimilation", label: "New Invites" });
    }

    if (canAccessAttendance()) {
        routes.push({ path: "/attendance", label: "Attendance" });
    }

    if (canAccessTithes()) {
        routes.push({ path: "/tithes", label: "Tithes" });
    }

    if (canAccessDevotion()) {
        routes.push({ path: "/devotion", label: "Devotion" });
    }

    if (canAccessLifeGroup()) {
        routes.push({ path: "/lifegroup", label: "Life Group" });
    }

    routes.push({ path: `/leader/${user.id}`, label: "My Profile" });

    return routes;
};