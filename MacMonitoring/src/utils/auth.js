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

// Can EDIT own profile - ONLY ADMIN can edit profiles now
// Regular members CANNOT edit their own profile
export const canEditOwnProfile = () => {
    return isAdmin();
};

// Can EDIT any profile (Admin only)
export const canEditAnyProfile = () => isAdmin();

// Can DELETE profile - Admin only
export const canDeleteProfile = (targetLeaderId) => {
    const user = getCurrentUser();
    if (!user) return false;
    if (isAdmin()) return true;
    return false;
};

// Can ADD new member/leader - Admin and Discipleship only
export const canAddMember = () => {
    const user = getCurrentUser();
    if (!user) return false;
    return isAdmin() || isDiscipleship();
};

// Can ADD devotion - Admin, Discipleship, and Leaders (including members for their own)
export const canAddDevotion = () => {
    const user = getCurrentUser();
    if (!user) return false;
    return true; // All authenticated users can add devotion
};

// Can ADD life group entry - All authenticated leaders/members
export const canAddLifeGroup = () => {
    const user = getCurrentUser();
    if (!user) return false;
    return true; // All authenticated users can add life group
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
    return isAdmin() || isDiscipleship();
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
    return isAdmin() || isLeader();
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

    // Regular MEMBER gets minimal routes only
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