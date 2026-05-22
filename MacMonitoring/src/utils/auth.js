export const getCurrentUser = () => {

    const user =
        localStorage.getItem(
            "emsUser"
        );

    return user
        ? JSON.parse(user)
        : null;
};

export const logout = () => {

    localStorage.removeItem(
        "emsUser"
    );

    window.location.href =
        "/login";
};