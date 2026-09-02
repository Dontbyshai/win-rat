import { useEffect, useState, useRef } from "react";
import api from "../../api";
import { BsFiletypeExe } from "react-icons/bs";
import { FaUpload as FaUploadIcon, FaCheck as FaCheckIcon, FaTimes as FaTimesIcon, FaSync as FaSyncIcon, FaShieldAlt as FaShieldIcon, FaFingerprint as FaFingerprintIcon, FaDownload as FaDownloadIcon, FaClock, FaFile } from "react-icons/fa";
import { toast } from "react-toastify";
import Loading from "../Loading";

// Dummy executable data
const dummyExecutable = {
    name: 'payload.exe',
    hash: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
    size: '245 KB',
    version: '1.0.0',
    updated_at: new Date().toISOString(),
    status: 'active'
};

// Theme-aware styles
const styles = {
    card: {
        background: 'var(--sidebar)',
        borderColor: 'var(--table-border)',
    },
    cardHeader: {
        borderColor: 'var(--table-border)',
    },
    title: {
        color: 'var(--app-content-main-color)',
    },
    subtitle: {
        color: 'var(--app-content-main-color)',
        opacity: 0.6,
    },
    label: {
        color: 'var(--app-content-main-color)',
        opacity: 0.7,
    },
    inputBg: {
        background: 'var(--app-bg)',
        borderColor: 'var(--table-border)',
        color: 'var(--app-content-main-color)',
    },
};

function Executable() {
    const [executable, setExecutable] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null);

    const fetchExecutable = async () => {
        try {
            setLoading(true);
            const response = await api.get('exe');
            const responseBody = response['data'];

            if (responseBody['status'] === 'success') {
                setExecutable(responseBody['data']);
            }
            setLoading(false);
        } catch (_) {
            // Use dummy data on error
            // setExecutable(dummyExecutable);
            setLoading(false);
        }
    };

    const updateExecutable = async ()=> {
        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('exe', selectedFile.file);

            const response = await api.post('exe', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            const responseBody = response['data'];

            if (responseBody['status'] === 'success') {
                toast.success('Executable updated');
                await fetchExecutable();
            } else {
                 toast.error('Update failed');
            }
            setLoading(false);
        } catch (_) {
            // Use dummy data on error
            // setExecutable(dummyExecutable);
            setLoading(false);
            toast.error('Update failed');
        }
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
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleFile = (file) => {
        if (!file.name.endsWith('.exe')) {
            toast.error('Please select an .exe file');
            return;
        }
        setSelectedFile({
            name: file.name,
            size: (file.size / 1024).toFixed(2) + ' KB',
            file: file
        });
        toast.success('File selected');
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            toast.error('Please select a file first');
            return;
        }
        setUploading(true);
        // Simulate upload
        // setTimeout(() => {
        //     setUploading(false);
        //     setSelectedFile(null);
        //     toast.success('Executable updated successfully!');
        //     fetchExecutable();
        // }, 2000);
        await updateExecutable();
        setSelectedFile(null);
        setUploading(false);
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        }).replace(",", " at");
    };

    useEffect(() => {
        fetchExecutable();
    }, []);

    return (
        <div className="min-h-screen p-4 md:p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-2" style={styles.title}>Executable Manager</h1>
                <p style={styles.subtitle}>Upload and manage your executable file</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Current Executable */}
                <div className="rounded-2xl border overflow-hidden" style={styles.card}>
                    <div className="p-6 border-b" style={styles.cardHeader}>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                                <BsFiletypeExe className="text-white text-2xl" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold" style={styles.title}>Current Executable</h2>
                                <p className="text-sm" style={styles.subtitle}>Active payload information</p>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loading />
                        </div>
                    ) : executable ? (
                        <div className="p-6 space-y-4">
                            {/* File Info Card */}
                            <div className="flex items-center gap-4 p-4 rounded-xl" style={styles.inputBg}>
                                <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                    <FaFile className="text-purple-400 text-2xl" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate" style={styles.title}>{executable.name || 'payload.exe'}</p>
                                    <p className="text-sm" style={styles.subtitle}>{executable.size || '245 KB'}</p>
                                </div>
                                <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
                                    Active
                                </span>
                            </div>

                            {/* Details */}
                            <div className="space-y-3">
                                <InfoRow
                                    icon={<FaFingerprintIcon className="text-blue-400" />}
                                    label="Hash (MD5)"
                                    value={executable.hash || 'a1b2c3d4e5f6...'}
                                    isCode
                                />
                                <InfoRow
                                    icon={<FaClock className="text-orange-400" />}
                                    label="Last Updated"
                                    value={formatDate(executable.updated_at)}
                                />
                                <InfoRow
                                    icon={<FaShieldIcon className="text-green-400" />}
                                    label="Status"
                                    value="Verified & Active"
                                    valueColor="text-green-400"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <a
                                    href={executable.path}
                                    download
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <button 
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl transition-colors" style={{ background: 'var(--action-color)' }}>
                                        <FaDownloadIcon />
                                        <span>Download</span>
                                    </button>
                                </a>
                                <button
                                    onClick={fetchExecutable}
                                    className="px-4 py-3 rounded-xl transition-colors"
                                    style={styles.inputBg}
                                >
                                    <FaSyncIcon />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16" style={styles.subtitle}>
                            <BsFiletypeExe className="text-5xl mb-4 opacity-30" />
                            <p className="font-medium">No executable uploaded</p>
                            <p className="text-sm opacity-70">Upload one to get started</p>
                        </div>
                    )}
                </div>

                {/* Upload Section */}
                <div className="rounded-2xl border overflow-hidden" style={styles.card}>
                    <div className="p-6 border-b" style={styles.cardHeader}>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                <FaUploadIcon className="text-white text-xl" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold" style={styles.title}>Upload New Executable</h2>
                                <p className="text-sm" style={styles.subtitle}>Replace the current payload</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        {/* Drop Zone */}
                        <div
                            className="relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer"
                            style={{
                                borderColor: dragActive ? 'var(--action-color)' : selectedFile ? '#22c55e' : 'var(--table-border)',
                                background: dragActive ? 'rgba(59, 130, 246, 0.1)' : selectedFile ? 'rgba(34, 197, 94, 0.1)' : 'transparent'
                            }}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {selectedFile ? (
                                <>
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-green-500/20 flex items-center justify-center">
                                        <FaCheckIcon className="text-green-400 text-2xl" />
                                    </div>
                                    <p className="font-medium mb-1" style={styles.title}>{selectedFile.name}</p>
                                    <p className="text-sm mb-4" style={styles.subtitle}>{selectedFile.size}</p>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedFile(null);
                                        }}
                                        className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1 mx-auto"
                                    >
                                        <FaTimesIcon />
                                        <span>Remove</span>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center" style={styles.inputBg}>
                                        <FaUploadIcon className="text-2xl" style={styles.subtitle} />
                                    </div>
                                    <p className="font-medium mb-1" style={styles.title}>
                                        {dragActive ? 'Drop your file here' : 'Drag & drop your .exe file'}
                                    </p>
                                    <p className="text-sm mb-4" style={styles.subtitle}>or click to browse</p>
                                    <p className="text-xs opacity-70" style={styles.subtitle}>Only .exe files are accepted</p>
                                </>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".exe"
                                className="hidden"
                                onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
                            />
                        </div>

                        {/* Warning */}
                        <div className="flex items-start gap-3 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                            <FaShieldIcon className="text-orange-400 mt-0.5" />
                            <div className="text-sm">
                                <p className="text-orange-400 font-medium">Important</p>
                                <p style={styles.label}>Uploading a new executable will replace the current one. Make sure you have a backup.</p>
                            </div>
                        </div>

                        {/* Upload Button */}
                        <button
                            onClick={handleUpload}
                            disabled={!selectedFile || uploading}
                            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-medium transition-all"
                            style={{
                                background: selectedFile && !uploading ? 'var(--action-color)' : 'var(--app-bg)',
                                color: selectedFile && !uploading ? '#fff' : 'var(--app-content-secondary-color)',
                                cursor: selectedFile && !uploading ? 'pointer' : 'not-allowed',
                            }}
                        >
                            {uploading ? (
                                <>
                                    <Loading />
                                    <span>Uploading...</span>
                                </>
                            ) : (
                                <>
                                    <FaUploadIcon />
                                    <span>Upload Executable</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
}

function InfoRow({ icon, label, value, isCode, valueColor }) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--app-bg)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--sidebar)' }}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium" style={{ color: 'var(--app-content-main-color)', opacity: 0.7 }}>{label}</p>
                {isCode ? (
                    <code className="text-sm px-2 py-0.5 rounded truncate block" style={{ background: 'var(--sidebar)', color: 'var(--app-content-main-color)' }}>{value}</code>
                ) : (
                    <p className={`text-sm truncate ${valueColor || ''}`} style={valueColor ? {} : { color: 'var(--app-content-main-color)' }}>{value}</p>
                )}
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, color }) {
    return (
        <div className="rounded-xl border p-4" style={{ background: 'var(--sidebar)', borderColor: 'var(--table-border)' }}>
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-${color}-500/20 flex items-center justify-center`}>
                    {icon}
                </div>
                <div>
                    <p className="text-2xl font-bold" style={{ color: 'var(--app-content-main-color)' }}>{value}</p>
                    <p className="text-xs font-medium" style={{ color: 'var(--app-content-main-color)', opacity: 0.6 }}>{label}</p>
                </div>
            </div>
        </div>
    );
}

export default Executable;
