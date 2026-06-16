import { useState, useRef, useEffect } from "react";

function MultiSelect({ options, selected = [], onChange, placeholder = "Select options...", label }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleOption = (option) => {
        const newSelected = selected.includes(option)
            ? selected.filter(item => item !== option)
            : [...selected, option];
        onChange(newSelected);
    };

    const removeOption = (e, option) => {
        e.stopPropagation();
        onChange(selected.filter(item => item !== option));
    };

    return (
        <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
            {label && (
                <label style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#374151",
                    marginBottom: "5px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                }}>
                    {label}
                </label>
            )}
            
            {/* Selected Tags Display */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    minHeight: "44px",
                    padding: "8px 12px",
                    border: "1.5px solid #d1d5db",
                    borderRadius: "10px",
                    background: "#fff",
                    cursor: "pointer",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px",
                    alignItems: "center",
                    transition: "all 0.2s",
                    boxSizing: "border-box"
                }}
            >
                {selected.length === 0 ? (
                    <span style={{ color: "#9ca3af", fontSize: "14px" }}>{placeholder}</span>
                ) : (
                    selected.map(item => (
                        <span
                            key={item}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "4px 10px",
                                borderRadius: "8px",
                                background: "linear-gradient(135deg, #c9a45c 0%, #b8934a 100%)",
                                color: "#fff",
                                fontSize: "12px",
                                fontWeight: 600
                            }}
                        >
                            {item}
                            <span
                                onClick={(e) => removeOption(e, item)}
                                style={{
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    lineHeight: 1,
                                    marginLeft: "2px"
                                }}
                            >
                                ✕
                            </span>
                        </span>
                    ))
                )}
                <span style={{
                    marginLeft: "auto",
                    fontSize: "12px",
                    color: "#9ca3af",
                    transition: "transform 0.2s",
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)"
                }}>
                    ▼
                </span>
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    right: 0,
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "10px",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
                    zIndex: 100,
                    maxHeight: "240px",
                    overflowY: "auto",
                    padding: "6px"
                }}>
                    {options.map(option => {
                        const isSelected = selected.includes(option);
                        return (
                            <div
                                key={option}
                                onClick={() => toggleOption(option)}
                                style={{
                                    padding: "10px 12px",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                    fontSize: "13px",
                                    fontWeight: isSelected ? 600 : 400,
                                    color: isSelected ? "#b8934a" : "#374151",
                                    background: isSelected ? "rgba(201, 164, 92, 0.08)" : "transparent",
                                    transition: "all 0.15s",
                                    marginBottom: "2px"
                                }}
                                onMouseEnter={(e) => {
                                    if (!isSelected) e.currentTarget.style.background = "#f9fafb";
                                }}
                                onMouseLeave={(e) => {
                                    if (!isSelected) e.currentTarget.style.background = "transparent";
                                }}
                            >
                                <div style={{
                                    width: "18px",
                                    height: "18px",
                                    borderRadius: "4px",
                                    border: isSelected ? "none" : "2px solid #d1d5db",
                                    background: isSelected ? "linear-gradient(135deg, #c9a45c 0%, #b8934a 100%)" : "#fff",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    transition: "all 0.15s"
                                }}>
                                    {isSelected && (
                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                            <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    )}
                                </div>
                                {option}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default MultiSelect;