import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { FaHome, FaSignOutAlt, FaUser, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { BsFiletypeExe } from "react-icons/bs";
import { HiOutlineMenuAlt2 } from "react-icons/hi";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../hooks/useNotifications";


function Dashboard() {

    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();
    const { user, logout, isAuthenticated } = useAuth();
    const username = user?.username || '';
    // useNotifications(isAuthenticated);
    

    const navItems = [
        { label: "Overview", path: "/dashboard/session", icon: FaHome },
        { label: "Executable", path: "/dashboard/executable", icon: BsFiletypeExe },
        { label: "Account", path: "/dashboard/account", icon: FaUser },
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <div className="app-container">
            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
                style={{
                    flexBasis: collapsed ? '70px' : '200px',
                    maxWidth: collapsed ? '70px' : '200px',
                }}>
                {/* Logo */}
                <div className="sidebar-header">
                    <div className="app-icon" style={{ margin: collapsed ? '0 auto' : '0' }}>
                        <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                            <path fill="currentColor" d="M507.606 371.054a187.217 187.217 0 00-23.051-19.606c-17.316 19.999-37.648 36.808-60.572 50.041-35.508 20.505-75.893 31.452-116.875 31.711 21.762 8.776 45.224 13.38 69.396 13.38 49.524 0 96.084-19.286 131.103-54.305a15 15 0 004.394-10.606 15.028 15.028 0 00-4.395-10.615zM27.445 351.448a187.392 187.392 0 00-23.051 19.606C1.581 373.868 0 377.691 0 381.669s1.581 7.793 4.394 10.606c35.019 35.019 81.579 54.305 131.103 54.305 24.172 0 47.634-4.604 69.396-13.38-40.985-.259-81.367-11.206-116.879-31.713-22.922-13.231-43.254-30.04-60.569-50.039zM103.015 375.508c24.937 14.4 53.928 24.056 84.837 26.854-53.409-29.561-82.274-70.602-95.861-94.135-14.942-25.878-25.041-53.917-30.063-83.421-14.921.64-29.775 2.868-44.227 6.709-6.6 1.576-11.507 7.517-11.507 14.599 0 1.312.172 2.618.512 3.885 15.32 57.142 52.726 100.35 96.309 125.509zM324.148 402.362c30.908-2.799 59.9-12.454 84.837-26.854 43.583-25.159 80.989-68.367 96.31-125.508.34-1.267.512-2.573.512-3.885 0-7.082-4.907-13.023-11.507-14.599-14.452-3.841-29.306-6.07-44.227-6.709-5.022 29.504-15.121 57.543-30.063 83.421-13.588 23.533-42.419 64.554-95.862 94.134zM187.301 366.948c-15.157-24.483-38.696-71.48-38.696-135.903 0-32.646 6.043-64.401 17.945-94.529-16.394-9.351-33.972-16.623-52.273-21.525-8.004-2.142-16.225 2.604-18.37 10.605-16.372 61.078-4.825 121.063 22.064 167.631 16.325 28.275 39.769 54.111 69.33 73.721zM324.684 366.957c29.568-19.611 53.017-45.451 69.344-73.73 26.889-46.569 38.436-106.553 22.064-167.631-2.145-8.001-10.366-12.748-18.37-10.605-18.304 4.902-35.883 12.176-52.279 21.529 11.9 30.126 17.943 61.88 17.943 94.525.001 64.478-23.58 111.488-38.702 135.912zM266.606 69.813c-2.813-2.813-6.637-4.394-10.615-4.394a15 15 0 00-10.606 4.394c-39.289 39.289-66.78 96.005-66.78 161.231 0 65.256 27.522 121.974 66.78 161.231 2.813 2.813 6.637 4.394 10.615 4.394s7.793-1.581 10.606-4.394c39.248-39.247 66.78-95.96 66.78-161.231.001-65.256-27.511-121.964-66.78-161.231z"/>
                        </svg>
                    </div>
                    {!collapsed && (
                        <span style={{ color: 'var(--sidebar-main-color)', fontSize: '14px', fontWeight: '600' }}>
                            Dashboard
                        </span>
                    )}
                </div>

                {/* Navigation */}
                <ul className="sidebar-list">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);
                        return (
                            <li
                                key={item.path}
                                className={`sidebar-list-item ${active ? 'active' : ''}`}
                            >
                                <Link to={item.path} onClick={() => setMobileOpen(false)} title={collapsed ? item.label : ''}>
                                    <Icon style={{ fontSize: '18px' }} />
                                    {!collapsed && <span>{item.label}</span>}
                                </Link>
                            </li>
                        );
                    })}
                </ul>

                {/* Collapse Button */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="collapse-btn"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        margin: '8px 16px',
                        padding: '10px',
                        border: 'none',
                        borderRadius: '8px',
                        backgroundColor: 'var(--sidebar-hover-link)',
                        color: 'var(--sidebar-link)',
                        cursor: 'pointer',
                        fontSize: '14px',
                    }}
                >
                    {collapsed ? <FaChevronRight /> : <><FaChevronLeft /> <span>Collapse</span></>}
                </button>

                {/* User Section */}
                <div
                    className="account-info"
                    onClick={logout}
                    style={{ cursor: 'pointer' }}
                    title="Logout"
                >
                    <div className="account-info-picture" style={{
                        background: 'linear-gradient(135deg, var(--action-color), #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '14px',
                    }}>
                        {username.charAt(0).toUpperCase()}
                    </div>
                    {!collapsed && <div className="account-info-name">{username}</div>}
                    <div
                        className="account-info-more"
                        style={{
                            marginLeft: collapsed ? '0' : 'auto',
                        }}
                    >
                        <FaSignOutAlt />
                    </div>
                </div>
            </div>

            {/* Mobile Header */}
            <div className="app-content">
                <header className="mobile-header" style={{
                    display: 'none',
                    padding: '16px',
                    borderBottom: '1px solid var(--table-border)',
                }}>
                    <button
                        onClick={() => setMobileOpen(true)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--app-content-main-color)',
                            fontSize: '24px',
                            cursor: 'pointer',
                        }}
                    >
                        <HiOutlineMenuAlt2 />
                    </button>
                </header>

                {/* Page Content */}
                <main>
                    <Outlet />
                </main>
            </div>

            <style>{`
                @media screen and (max-width: 1024px) {
                    .sidebar {
                        display: flex !important;
                        position: fixed;
                        left: 0;
                        top: 0;
                        bottom: 0;
                        z-index: 50;
                        transform: translateX(-100%);
                        transition: transform 0.3s ease;
                    }
                    .sidebar.mobile-open {
                        transform: translateX(0);
                    }
                    .mobile-header {
                        display: flex !important;
                    }
                    .collapse-btn {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
}

export default Dashboard;