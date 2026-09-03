import { useEffect, useState } from "react";
import api from './../../../api';
import Loading from './../../Loading';
import TitleBar from "../TitleBar";
import Interact from './Interact';
import CountryFlag from './CountryFlag';
import { getCode } from 'country-list';
import windows7 from './../../../assets/windows/windows7.png';
import windows8 from './../../../assets/windows/windows8.svg';
import windows10 from './../../../assets/windows/windows10.svg';
import windows11 from './../../../assets/windows/windows11.svg';
import windowsserver from './../../../assets/windows/windowsserver.svg';


// Helper to get the correct OS icon
const getOsIcon = (os) => {
    const osLower = os.toLowerCase();
    if (osLower.includes('windows 7')) return windows7;
    if (osLower.includes('windows 8')) return windows8;
    if (osLower.includes('windows 10')) return windows10;
    if (osLower.includes('windows 11')) return windows11;
    return windowsserver;
};


function Overview() {

    const [targets, setTargets] = useState([]);
    const [selectedTarget, setSelectedTarget] = useState(null);
    const [query, setQuery] = useState('');
    const [view, setView] = useState('list');
    const [previousPage, setPreviousPage] = useState(null);
    const [currentPage, setCurrentPage] = useState(null);
    const [nextPage, setNextPage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const Filter = () => {
        return <div className="app-content-actions">
            <input className="search-bar" placeholder="Search..." type="text" value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="app-content-actions-wrapper">
                <button className={`action-button list p-2 ${view === "list" ? "active" : ""}`} title="List View" onClick={() => setView('list')}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-list"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                </button>
                <button className={`action-button grid p-2 ${view === "grid" ? "active" : ""}`} title="Grid View" onClick={() => setView('grid')}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-grid"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                </button>
            </div>
        </div>;
    };

    const targetClick = (target) => {
        setSelectedTarget(target);
    };


    const fetchTargets = async (url) => {
        try {
            setLoading(true);
            const response = await api.get(url);
            const responseBody = response['data'];

            if (responseBody['status'] === 'success') {
                const data = responseBody['data']['data'].map(target => {
                    
                    let icon;
                    if (target.os.toLowerCase().includes('windows 7')) {
                        icon = windows7;
                    } else if (target.os.toLowerCase().includes('windows 8')) {
                        icon = windows8;
                    } else if (target.os.toLowerCase().includes('windows 10')) {
                        icon = windows10;
                    } else if (target.os.toLowerCase().includes('windows 11')) {
                        icon = windows11;
                    } else {
                        icon = windowsserver;
                    }

                    return { ...target, icon };
                });
                setTargets(data);
                setPreviousPage(responseBody['data']['links'][0]);
                setCurrentPage(responseBody['data']['links'][1]);
                setNextPage(responseBody['data']['links'][2]);
            } else {
                setError('Something went wrong');
            }

            setLoading(false);
        } catch (_) {
            setLoading(false);
            setError('Something went wrong');
        }
    };

    const pageNavigation = async (page) => {
        if (query.trim() === "") {
            await fetchTargets(`/targets?page=${page}`);
            return;
        }

        await fetchTargets(`/search?query=${encodeURIComponent(query)}&page=${page}`);
    };

    useEffect(() => {
        fetchTargets('/targets');

        const interval = setInterval(() => {
            fetchTargets('/targets');
        }, 5 * 60 * 1000); // 5 minutes

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (query.trim() === "") {
            fetchTargets('/targets');
            return;
        }

        const delayDebounce = setTimeout(async () => {
            await fetchTargets(`/search?query=${encodeURIComponent(query)}`);
        }, 500);

        return () => clearTimeout(delayDebounce);
    }, [query]);

    return (
        <div>
            {selectedTarget ?
                <Interact target={selectedTarget} goBack={() => setSelectedTarget(null)} />
                :
                <div>
                    <TitleBar title="Overview" Component={Filter} />

                    {/* Stats Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 px-1">
                        <div className="interact-grid p-4 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold" style={{ color: 'var(--app-content-main-color)' }}>{targets.length}</p>
                                    <p className="text-xs font-medium" style={{ color: 'var(--app-content-main-color)', opacity: 0.6 }}>Total Targets</p>
                                </div>
                            </div>
                        </div>
                        <div className="interact-grid p-4 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold" style={{ color: 'var(--app-content-main-color)' }}>
                                        {targets.filter(t => ((new Date() - new Date(t?.updated_at + 'Z')) / 60000) <= 2).length}
                                    </p>
                                    <p className="text-xs font-medium" style={{ color: 'var(--app-content-main-color)', opacity: 0.6 }}>Active</p>
                                </div>
                            </div>
                        </div>
                        <div className="interact-grid p-4 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold" style={{ color: 'var(--app-content-main-color)' }}>
                                        {targets.filter(t => ((new Date() - new Date(t?.updated_at + 'Z')) / 60000) > 2).length}
                                    </p>
                                    <p className="text-xs font-medium" style={{ color: 'var(--app-content-main-color)', opacity: 0.6 }}>Inactive</p>
                                </div>
                            </div>
                        </div>
                        <div className="interact-grid p-4 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold" style={{ color: 'var(--app-content-main-color)' }}>
                                        {[...new Set(targets.map(t => t.country))].length}
                                    </p>
                                    <p className="text-xs font-medium" style={{ color: 'var(--app-content-main-color)', opacity: 0.6 }}>Countries</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={`products-area-wrapper ${view === "list" ? "tableView" : "gridView"}`}>
                        <div className="products-header">
                            <div className="product-cell image">
                                Hostname
                                <button className="sort-button">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 512 512"><path fill="currentColor" d="M496.1 138.3L375.7 17.9c-7.9-7.9-20.6-7.9-28.5 0L226.9 138.3c-7.9 7.9-7.9 20.6 0 28.5 7.9 7.9 20.6 7.9 28.5 0l85.7-85.7v352.8c0 11.3 9.1 20.4 20.4 20.4 11.3 0 20.4-9.1 20.4-20.4V81.1l85.7 85.7c7.9 7.9 20.6 7.9 28.5 0 7.9-7.8 7.9-20.6 0-28.5zM287.1 347.2c-7.9-7.9-20.6-7.9-28.5 0l-85.7 85.7V80.1c0-11.3-9.1-20.4-20.4-20.4-11.3 0-20.4 9.1-20.4 20.4v352.8l-85.7-85.7c-7.9-7.9-20.6-7.9-28.5 0-7.9 7.9-7.9 20.6 0 28.5l120.4 120.4c7.9 7.9 20.6 7.9 28.5 0l120.4-120.4c7.8-7.9 7.8-20.7-.1-28.5z"/></svg>
                                </button>
                            </div>
                            <div className="product-cell category">
                                Username
                                <button className="sort-button">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 512 512"><path fill="currentColor" d="M496.1 138.3L375.7 17.9c-7.9-7.9-20.6-7.9-28.5 0L226.9 138.3c-7.9 7.9-7.9 20.6 0 28.5 7.9 7.9 20.6 7.9 28.5 0l85.7-85.7v352.8c0 11.3 9.1 20.4 20.4 20.4 11.3 0 20.4-9.1 20.4-20.4V81.1l85.7 85.7c7.9 7.9 20.6 7.9 28.5 0 7.9-7.8 7.9-20.6 0-28.5zM287.1 347.2c-7.9-7.9-20.6-7.9-28.5 0l-85.7 85.7V80.1c0-11.3-9.1-20.4-20.4-20.4-11.3 0-20.4 9.1-20.4 20.4v352.8l-85.7-85.7c-7.9-7.9-20.6-7.9-28.5 0-7.9 7.9-7.9 20.6 0 28.5l120.4 120.4c7.9 7.9 20.6 7.9 28.5 0l120.4-120.4c7.8-7.9 7.8-20.7-.1-28.5z"/></svg>
                                </button>
                            </div>
                            <div className="product-cell status-cell">
                                OS
                                <button className="sort-button">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 512 512"><path fill="currentColor" d="M496.1 138.3L375.7 17.9c-7.9-7.9-20.6-7.9-28.5 0L226.9 138.3c-7.9 7.9-7.9 20.6 0 28.5 7.9 7.9 20.6 7.9 28.5 0l85.7-85.7v352.8c0 11.3 9.1 20.4 20.4 20.4 11.3 0 20.4-9.1 20.4-20.4V81.1l85.7 85.7c7.9 7.9 20.6 7.9 28.5 0 7.9-7.8 7.9-20.6 0-28.5zM287.1 347.2c-7.9-7.9-20.6-7.9-28.5 0l-85.7 85.7V80.1c0-11.3-9.1-20.4-20.4-20.4-11.3 0-20.4 9.1-20.4 20.4v352.8l-85.7-85.7c-7.9-7.9-20.6-7.9-28.5 0-7.9 7.9-7.9 20.6 0 28.5l120.4 120.4c7.9 7.9 20.6 7.9 28.5 0l120.4-120.4c7.8-7.9 7.8-20.7-.1-28.5z"/></svg>
                                </button>
                            </div>
                            <div className="product-cell sales">
                                IP
                                <button className="sort-button">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 512 512"><path fill="currentColor" d="M496.1 138.3L375.7 17.9c-7.9-7.9-20.6-7.9-28.5 0L226.9 138.3c-7.9 7.9-7.9 20.6 0 28.5 7.9 7.9 20.6 7.9 28.5 0l85.7-85.7v352.8c0 11.3 9.1 20.4 20.4 20.4 11.3 0 20.4-9.1 20.4-20.4V81.1l85.7 85.7c7.9 7.9 20.6 7.9 28.5 0 7.9-7.8 7.9-20.6 0-28.5zM287.1 347.2c-7.9-7.9-20.6-7.9-28.5 0l-85.7 85.7V80.1c0-11.3-9.1-20.4-20.4-20.4-11.3 0-20.4 9.1-20.4 20.4v352.8l-85.7-85.7c-7.9-7.9-20.6-7.9-28.5 0-7.9 7.9-7.9 20.6 0 28.5l120.4 120.4c7.9 7.9 20.6 7.9 28.5 0l120.4-120.4c7.8-7.9 7.8-20.7-.1-28.5z"/></svg>
                                </button>
                            </div>
                            <div className="product-cell stock">
                                Country
                                <button className="sort-button">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 512 512"><path fill="currentColor" d="M496.1 138.3L375.7 17.9c-7.9-7.9-20.6-7.9-28.5 0L226.9 138.3c-7.9 7.9-7.9 20.6 0 28.5 7.9 7.9 20.6 7.9 28.5 0l85.7-85.7v352.8c0 11.3 9.1 20.4 20.4 20.4 11.3 0 20.4-9.1 20.4-20.4V81.1l85.7 85.7c7.9 7.9 20.6 7.9 28.5 0 7.9-7.8 7.9-20.6 0-28.5zM287.1 347.2c-7.9-7.9-20.6-7.9-28.5 0l-85.7 85.7V80.1c0-11.3-9.1-20.4-20.4-20.4-11.3 0-20.4 9.1-20.4 20.4v352.8l-85.7-85.7c-7.9-7.9-20.6-7.9-28.5 0-7.9 7.9-7.9 20.6 0 28.5l120.4 120.4c7.9 7.9 20.6 7.9 28.5 0l120.4-120.4c7.8-7.9 7.8-20.7-.1-28.5z"/></svg>
                                </button>
                            </div>
                            <div className="product-cell price">
                                Status
                                <button className="sort-button">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 512 512">
                                        <path fill="currentColor" d="M496.1 138.3L375.7 17.9c-7.9-7.9-20.6-7.9-28.5 0L226.9 138.3c-7.9 7.9-7.9 20.6 0 28.5 7.9 7.9 20.6 7.9 28.5 0l85.7-85.7v352.8c0 11.3 9.1 20.4 20.4 20.4 11.3 0 20.4-9.1 20.4-20.4V81.1l85.7 85.7c7.9 7.9 20.6 7.9 28.5 0 7.9-7.8 7.9-20.6 0-28.5zM287.1 347.2c-7.9-7.9-20.6-7.9-28.5 0l-85.7 85.7V80.1c0-11.3-9.1-20.4-20.4-20.4-11.3 0-20.4 9.1-20.4 20.4v352.8l-85.7-85.7c-7.9-7.9-20.6-7.9-28.5 0-7.9 7.9-7.9 20.6 0 28.5l120.4 120.4c7.9 7.9 20.6 7.9 28.5 0l120.4-120.4c7.8-7.9 7.8-20.7-.1-28.5z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {loading && <Loading /> }

                        {/* Empty State */}
                        {targets.length === 0 && !loading && (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <p className="text-lg font-medium">No targets available</p>
                                <p className="text-sm opacity-70">Targets will appear here once connected</p>
                            </div>
                        )}

                        {/* Target Cards - Direct children for grid layout to work */}
                        {targets.map(target => {
                            const isActive = (Date.now() - new Date(target?.updated_at + 'Z').getTime()) < (2 * 60 * 1000);
                            return (
                                <div
                                    className={`cursor-pointer products-row transition-all duration-200 ${view === 'list' ? 'hover:translate-x-1' : ''}`}
                                    key={target.machine_id}
                                    onClick={() => targetClick(target)}
                                >

                                    <div className="product-cell image">
                                        <div className="relative inline-block">
                                            <img src={target.icon} alt={target.hostname} className="rounded-md" />
                                            <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 ${isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                        </div>
                                        <span className="font-medium">{target.hostname}</span>
                                    </div>
                                    <div className="product-cell category">
                                        <span className="cell-label">Username:</span>
                                        <span className="flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            {target.username}
                                        </span>
                                    </div>
                                    <div className="product-cell status-cell">
                                        <span className="cell-label">OS:</span>
                                        <span className="text-sm">{target.os}</span>
                                    </div>
                                    <div className="product-cell sales">
                                        <span className="cell-label">IP:</span>
                                        <code className="text-xs bg-black/20 px-2 py-1 rounded">{target.ip}</code>
                                    </div>
                                    <div className="product-cell stock">
                                        <span className="cell-label">Country:</span>
                                        <span className="flex items-center gap-2">
                                            {target.country === 'Worldwide' ?
                                                '🌍'
                                                :
                                                <CountryFlag country={getCode(target.country)} height="1.5em" width="1.5em" />
                                            }
                                            <span className="text-sm hidden lg:inline">{target.country}</span>
                                        </span>
                                    </div>
                                    <div className="product-cell price">
                                        <span className="cell-label">Status:</span>
                                        <span className={`status ${isActive ? 'active' : 'inactive'}`}>
                                            {isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <div className="cell-actions" style={{ position: view === 'grid' ? 'absolute' : 'relative', right: view === 'grid' ? '16px' : '0', top: view === 'grid' ? '16px' : '0', zIndex: 1, display: 'flex', gap: '8px', opacity: view === 'grid' ? 0 : 1, transition: 'opacity 0.2s', paddingRight: view === 'list' ? '16px' : '0' }}>
                                        <button
                                            className="text-red-500 hover:text-red-400 hover:bg-red-500/20 p-1.5 rounded transition-all bg-black/40"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if(window.confirm('Are you sure you want to delete this target?')) {
                                                    api.delete(`/targets/${target.machine_id}`).then(() => {
                                                        fetchTargets('/targets');
                                                    }).catch(console.error);
                                                }
                                            }}
                                            title="Delete Target"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                        </button>
                                        <button className="text-white hover:bg-white/20 p-1.5 rounded transition-all bg-black/40">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-more-vertical"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-center items-center gap-2 pt-5">
                        <button
                            className="action-button px-4 py-2 flex items-center gap-2"
                            onClick={() => pageNavigation(previousPage?.page)}
                            disabled={previousPage?.page === null}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Previous
                        </button>
                        <span className="action-button active px-4 py-2">
                            Page {currentPage?.page || 1}
                        </span>
                        <button
                            className="action-button px-4 py-2 flex items-center gap-2"
                            onClick={() => pageNavigation(nextPage?.page)}
                            disabled={nextPage?.page === null}
                        >
                            Next
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div> 
            }
        </div>  
    );
}

export default Overview;
