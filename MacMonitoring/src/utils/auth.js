// Session keys
const USER_KEY = "emsUser";
const NEWCOMER_KEY = "emsNewcomer";

/* =========================
   USER SESSION (Leaders/Admins/Members)
========================= */
export const getCurrentUser = () => {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
};

export const setCurrentUser = (user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearCurrentUser = () => {
    localStorage.removeItem(USER_KEY);
};

/* =========================
   NEWCOMER SESSION
========================= */
export const getNewcomer = () => {
    const newcomer = localStorage.getItem(NEWCOMER_KEY);
    return newcomer ? JSON.parse(newcomer) : null;
};

export const setNewcomer = (newcomer) => {
    localStorage.setItem(NEWCOMER_KEY, JSON.stringify(newcomer));
};

export const clearNewcomer = () => {
    localStorage.removeItem(NEWCOMER_KEY);
};

/* =========================
   LOGOUT
========================= */
export const logout = () => {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(NEWCOMER_KEY);
    window.location.href = "/login";
};

/* =========================
   ROLE CHECKS
========================= */
export const isAdmin = () => {
    const user = getCurrentUser();
    return user?.type === "ADMIN" || user?.ministry === "ADMIN";
};

export const isFinance = () => {
    const user = getCurrentUser();
    return user?.ministry === "FINANCE";
};

export const isUshering = () => {
    const user = getCurrentUser();
    return user?.ministry === "USHERING";
};

export const isDiscipleship = () => {
    const user = getCurrentUser();
    return user?.ministry === "DISCIPLESHIP JOURNEY";
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
   PAGE ACCESS PERMISSIONS
========================= */

// DASHBOARD: All authenticated leaders/members can VIEW (read-only stats)
export const canAccessDashboard = () => {
    const user = getCurrentUser();
    return !!user; // Any logged-in user from tblMonitoring
};

// Can view Leaders list
export const canViewLeaders = () => {
    const user = getCurrentUser();
    return !!user;
};

// Can view a specific leader profile
export const canViewLeaderProfile = (targetLeaderId) => {
    const user = getCurrentUser();
    if (!user) return false;

    // Own profile
    if (user.id === targetLeaderId) return true;

    // Admin can view all
    if (isAdmin()) return true;

    // Finance can view profiles (for tithes)
    if (isFinance()) return true;

    // Ushering can view profiles (for attendance)
    if (isUshering()) return true;

    // Discipleship can view profiles (for tracking)
    if (isDiscipleship()) return true;

    return false;
};

// Can view newcomer profiles
export const canViewNewcomerProfile = (targetNewcomerId) => {
    const user = getCurrentUser();
    const newcomer = getNewcomer();

    // Newcomer viewing own profile
    if (newcomer && newcomer.id === targetNewcomerId) return true;

    // Admin can view all
    if (user && isAdmin()) return true;

    // Discipleship team can view newcomers
    if (user && isDiscipleship()) return true;

    return false;
};

/* =========================
   ACTION PERMISSIONS
========================= */

// Can EDIT own profile
export const canEditOwnProfile = () => {
    const user = getCurrentUser();
    return !!user;
};

// Can EDIT any profile (Admin only)
export const canEditAnyProfile = () => isAdmin();

// Can DELETE profile
export const canDeleteProfile = (targetLeaderId) => {
    const user = getCurrentUser();
    if (!user) return false;

    if (isAdmin()) return true;
    if (user.id === targetLeaderId) return true;

    return false;
};

/* =========================
   MODULE PERMISSIONS
========================= */

// ATTENDANCE: Only Admin and Ushering
export const canAccessAttendance = () => {
    const user = getCurrentUser();
    if (!user) return false;
    return isAdmin() || isUshering();
};

// TITHES: Only Admin and Finance
export const canAccessTithes = () => {
    const user = getCurrentUser();
    if (!user) return false;
    return isAdmin() || isFinance();
};

// DEVOTION: Only Admin and Discipleship
export const canAccessDevotion = () => {
    const user = getCurrentUser();
    if (!user) return false;
    return isAdmin() || isDiscipleship();
};

// ASSIMILATION: Admin, Discipleship, and Leaders
export const canAccessAssimilation = () => {
    const user = getCurrentUser();
    if (!user) return false;
    return isAdmin() || isDiscipleship() || isLeader();
};

// CONVERT NEWCOMER TO MEMBER: Only Admin and Discipleship
export const canConvertNewcomer = () => {
    const user = getCurrentUser();
    if (!user) return false;
    return isAdmin() || isDiscipleship();
};

// LIFE GROUP: All logged-in leaders
export const canAccessLifeGroup = () => {
    const user = getCurrentUser();
    return !!user;
};

/* =========================
   SIDEBAR VISIBILITY
========================= */
export const getVisibleRoutes = () => {
    const user = getCurrentUser();
    const newcomer = getNewcomer();

    if (!user && !newcomer) return [];

    // Newcomer routes
    if (newcomer) {
        return [
            { path: "/newcomer/" + newcomer.id, label: "My Journey" },
        ];
    }

    // Leader/Admin routes - ALL can see Dashboard now
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