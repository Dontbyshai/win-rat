import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import api from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const authToken = Cookies.get('auth_token');
        const username = Cookies.get('username');
        const createdAt = Cookies.get('created_at');
        const updatedAt = Cookies.get('updated_at');

        if (authToken && username) {
            setUser({ username, token: authToken, createdAt, updatedAt });
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        const response = await api.post('/login', { username, password });
        const responseBody = response['data'];

        if (responseBody['status'] === 'failed') {
            throw new Error(responseBody['message']);
        }

        const token = responseBody['data']['token'];
        const createdAt = responseBody['data']['createdAt'];
        const updatedAt = responseBody['data']['updatedAt'];
        Cookies.set('username', username, { expires: 30 });
        Cookies.set('auth_token', token, { expires: 30 });
        Cookies.set('created_at', createdAt, { expires: 30 });
        Cookies.set('updated_at', updatedAt, { expires: 30 });
        setUser({ username, token, createdAt, updatedAt });
        navigate('/');
    };

    const logout = async () => {
        try {
            await api.post('/logout', {});
        } catch (_) {
            // Continue with logout even if API call fails
        }
        Cookies.remove('auth_token');
        Cookies.remove('username');
        Cookies.remove('created_at');
        Cookies.remove('updated_at');
        setUser(null);
        navigate('/login');
    };

    const updateUser = (updates) => {
        if (updates.username) {
            Cookies.set('username', updates.username, { expires: 30 });
        }
        if (updates.updatedAt) {
            Cookies.set('updated_at', updates.updatedAt, { expires: 30 });
        }
        setUser(prev => ({ ...prev, ...updates }));
    };

    const isAuthenticated = !!user;

    return (
        <AuthContext.Provider value={{ user, login, logout, updateUser, isAuthenticated, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
