import { useEffect, useState } from "react";
import Loading from './../Loading';
import api from './../../api';
import Cookies from "js-cookie";
import TitleBar from "./TitleBar";
import { FaUser, FaLock, FaEnvelope, FaShieldAlt, FaCheck, FaEye, FaEyeSlash, FaKey, FaClock, FaSignInAlt, FaDownload, FaWindows } from "react-icons/fa";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";

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


function Account() {

    // const [username, setUsername] = useState('');
    // const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    // const [errorColor, setErrorColor] = useState('text-red-500');
    // const [loading, setLoading] = useState(false);

    const [username, setUsername] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { user, updateUser } = useAuth();
    const [exeUrl, setExeUrl] = useState(null);
    const [exeName, setExeName] = useState('helper.exe');

    const fetchExeUrl = async () => {
        try {
            const response = await api.get('/exe');
            const data = response?.data?.data;
            if (data?.path) {
                setExeUrl(data.path);
                setExeName(data.name || 'helper.exe');
            }
        } catch (_) {}
    };

    const formatDate = (date) => {
        if (!date) return '-';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[d.getMonth()];
        const year = String(d.getFullYear()).slice(-2);
        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        const formattedHours = String(hours).padStart(2, '0');
        return `${day}-${month}-${year} ${formattedHours}:${minutes}:${seconds}${ampm}`;
    };
    

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (newPassword && newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        try {
            setLoading(true);

            const payload = { username };
            if (newPassword) {
                payload.password = newPassword;
                payload.password_confirmation = confirmPassword;
            }

            const response = await api.put('/account', payload);
            const responseBody = response['data'];
            if (responseBody['status'] === 'success') {
                updateUser({
                    username: responseBody['data']['username'],
                    updatedAt: responseBody['data']['updatedAt']
                });
                toast.success('Account updated successfully');
                setNewPassword('');
                setConfirmPassword('');
            }

            setLoading(false);
        } catch (_) {
            toast.error('Something went wrong');
            setLoading(false);
        }
    };

    useEffect(() => {
        setUsername(user?.username);
    }, [user?.username]);

    useEffect(() => {
        fetchExeUrl();
    }, []);


    return (
        <div className="min-h-screen p-4 md:p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-2" style={styles.title}>Account Settings</h1>
                <p style={styles.subtitle}>Manage your account information and security</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Card */}
                <div className="lg:col-span-1">
                    <div className="rounded-2xl border overflow-hidden" style={styles.card}>
                        <div className="p-6 text-center">
                            {/* Avatar */}
                            <div className="relative inline-block mb-4">
                                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                                    {/* {username.charAt(0).toUpperCase()} */}{username[0]}
                                </div>
                                <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 flex items-center justify-center" style={{ borderColor: 'var(--sidebar)' }}>
                                    <FaCheck className="text-white text-xs" />
                                </span>
                            </div>

                            {/* Name */}
                            <h2 className="text-xl font-bold mb-1" style={styles.title}>{username}</h2>

                            {/* Badge */}
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-400 text-sm font-medium rounded-full">
                                <FaShieldAlt className="text-xs" />
                                Administrator
                            </span>
                        </div>

                        {/* Divider */}
                        <div className="h-px" style={{ background: 'var(--table-border)' }}></div>

                        {/* Version Info */}
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm" style={styles.subtitle}>App Version</span>
                                <span className="text-sm font-medium" style={styles.title}>1.0.0</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm" style={styles.subtitle}>API Version</span>
                                <span className="text-sm" style={styles.title}>v1</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm" style={styles.subtitle}>Environment</span>
                                <span className="text-blue-400 text-sm font-medium">Production</span>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px" style={{ background: 'var(--table-border)' }}></div>

                        {/* Account Dates */}
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm" style={styles.subtitle}>Created At</span>
                                <span className="text-sm" style={styles.title}>{formatDate(user?.createdAt)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm" style={styles.subtitle}>Last Updated</span>
                                <span className="text-sm" style={styles.title}>{formatDate(user?.updatedAt)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Settings Forms */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Profile Settings */}
                    <div className="rounded-2xl border overflow-hidden" style={styles.card}>
                        <div className="p-6 border-b" style={styles.cardHeader}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                    <FaUser className="text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold" style={styles.title}>Profile Information</h2>
                                    <p className="text-sm" style={styles.subtitle}>Update your account details</p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2" style={styles.label}>Username</label>
                                <div className="relative">
                                    <FaUser className="absolute left-4 top-1/2 -translate-y-1/2" style={styles.subtitle} />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 border rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        style={styles.inputBg}
                                        placeholder="Enter username"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2" style={styles.label}>New Password</label>
                                <div className="relative">
                                    <FaKey className="absolute left-4 top-1/2 -translate-y-1/2" style={styles.subtitle} />
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full pl-11 pr-12 py-3 border rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        style={styles.inputBg}
                                        placeholder="Enter new password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 hover:opacity-70"
                                        style={styles.subtitle}
                                    >
                                        {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2" style={styles.label}>Confirm New Password</label>
                                <div className="relative">
                                    <FaKey className="absolute left-4 top-1/2 -translate-y-1/2" style={styles.subtitle} />
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full pl-11 pr-12 py-3 border rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        style={styles.inputBg}
                                        placeholder="Confirm new password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 hover:opacity-70"
                                        style={styles.subtitle}
                                    >
                                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                                    </button>
                                </div>
                            </div>

                            {/* Password strength indicator */}
                            {newPassword && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span style={styles.label}>Password Strength</span>
                                        <span className={newPassword.length >= 8 ? 'text-green-400' : newPassword.length >= 6 ? 'text-yellow-400' : 'text-red-400'}>
                                            {newPassword.length >= 8 ? 'Strong' : newPassword.length >= 6 ? 'Medium' : 'Weak'}
                                        </span>
                                    </div>
                                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--app-bg)' }}>
                                        <div
                                            className={`h-full transition-all duration-300 ${
                                                newPassword.length >= 8 ? 'bg-green-500 w-full' :
                                                newPassword.length >= 6 ? 'bg-yellow-500 w-2/3' :
                                                'bg-red-500 w-1/3'
                                            }`}
                                        />
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
                            >
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </form>
                    </div>


                    {/* Agent Download Card */}
                    <div className="rounded-2xl border overflow-hidden" style={styles.card}>
                        <div className="p-6 border-b" style={styles.cardHeader}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                                    <FaWindows className="text-green-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold" style={styles.title}>Deploy Agent</h2>
                                    <p className="text-sm" style={styles.subtitle}>Download and run the Windows agent</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-sm mb-4" style={styles.subtitle}>
                                Download <strong style={styles.title}>{exeName}</strong> and execute it on the target Windows machine to establish a connection.
                            </p>
                            <a
                                href={exeUrl || '#'}
                                download={exeName}
                                onClick={(e) => { if (!exeUrl) e.preventDefault(); }}
                                className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all ${
                                    exeUrl
                                        ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20 hover:shadow-green-500/40 hover:-translate-y-0.5'
                                        : 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                                }`}
                            >
                                <FaDownload />
                                {exeUrl ? `Download ${exeName}` : 'No agent uploaded'}
                            </a>
                            {exeUrl && (
                                <p className="text-xs mt-3" style={styles.subtitle}>
                                    Direct link: <code className="opacity-70 text-xs">{exeUrl}</code>
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="rounded-2xl border border-red-500/20 overflow-hidden" style={{ background: 'var(--sidebar)' }}>
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                                    <FaShieldAlt className="text-red-400" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-lg font-semibold mb-1" style={styles.title}>Danger Zone</h2>
                                    <p className="text-sm mb-4" style={styles.subtitle}>Irreversible and destructive actions</p>
                                    <button className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-colors text-sm">
                                        Delete Account
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // return (
    //     <div>
    //         <TitleBar title='Account' />
    //         <div className="flex justify-center items-center min-h-screen">
    //             <div className="interact-grid w-full sm:w-2/3 md:w-1/2 lg:w-2/4 bg-gray-800 text-white p-6 rounded-lg shadow-lg">
    //                 <h1 className="login-card-text text-xl font-semibold text-center">Update Account</h1>
    //                 <form onSubmit={update} className="space-y-5">
    //                     <div>
    //                         <label className="login-card-text block mb-2 text-sm font-medium">Username</label>
    //                         <input
    //                         type="text"
    //                         value={username}
    //                         onChange={(e) => setUsername(e.target.value)}
    //                         className="login-field w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    //                         required
    //                         disabled={loading}
    //                         />
    //                     </div>

    //                     <div>
    //                         <label className="login-card-text block mb-2 text-sm font-medium">Password</label>
    //                         <input
    //                         type="password"
    //                         value={password}
    //                         onChange={(e) => setPassword(e.target.value)}
    //                         className="login-field w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    //                         required
    //                         disabled={loading}
    //                         />
    //                     </div>

    //                     <button
    //                         type="submit"
    //                         className="app-content-headerButton w-full py-5 rounded-lg fon-semibold "
    //                     >
    //                         {loading ?
    //                             <Loading />
    //                             :
    //                             <>Submit</>
    //                         }
    //                     </button>
    //                     {error && (
    //                         <p className={`${errorColor} text-sm mt-2`}>{error}</p>
    //                     )}
    //                 </form>
    //             </div>
    //         </div>
    //     </div>
    // );
}

export default Account;