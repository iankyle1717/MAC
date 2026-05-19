function ThemeToggle() {

    const toggleTheme = () => {

        document.body.classList.toggle(
            "dark"
        );
    };

    return (

        <div
            className="theme-toggle"
            onClick={toggleTheme}
        >

            <div className="toggle-circle"></div>

        </div>
    );
}

export default ThemeToggle;