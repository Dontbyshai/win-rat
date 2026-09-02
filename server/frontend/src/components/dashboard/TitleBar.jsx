import { useEffect, useState } from "react";

function TitleBar({ title, Component }) {

    const [isLightMode, setIsLightMode] = useState(false);

     const toggleTheme = () => {
            const newMode = !isLightMode;
            setIsLightMode(newMode);
    
            if (newMode) {
                document.documentElement.classList.add("light");
                localStorage.setItem("theme", "light");
            } else {
                document.documentElement.classList.remove("light");
                localStorage.setItem("theme", "dark");
            }
        };

    useEffect(() => {
        const storedTheme = localStorage.getItem("theme");
        if (storedTheme === "light") {
            setIsLightMode(true);
        } else {
            setIsLightMode(false);
        }
    }, []);

    return (
        <div className="pb-3">
            <div className="app-content-header">
                <h1 className="app-content-headerText">{title}</h1>
                <button className="mode-switch" title="Switch Theme" onClick={toggleTheme}>
                    <svg className="moon" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" width="24" height="24" viewBox="0 0 24 24">
                        <defs></defs>
                        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path>
                    </svg>
                </button>
                {/* <button className="app-content-headerButton">Add Product</button> */}
            </div>
            {Component && <Component />}
        </div>
    );
}

export default TitleBar;