"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authAPI } from "@/lib/api";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Check if user is authenticated on mount
    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const token = localStorage.getItem("accessToken");
            if (!token) {
                setLoading(false);
                return;
            }

            const response = await authAPI.getProfile();
            if (response.success) {
                setUser(response.data);
            } else {
                // Token invalid, clear storage
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
            }
        } catch (err) {
            console.error("Auth check failed:", err);
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
        } finally {
            setLoading(false);
        }
    };

    const login = useCallback(async (email, password) => {
        setError(null);
        try {
            const response = await authAPI.login({ email, password });

            if (response.success) {
                const { user: userData, tokens } = response.data;

                // Store tokens
                localStorage.setItem("accessToken", tokens.accessToken);
                localStorage.setItem("refreshToken", tokens.refreshToken);

                setUser(userData);
                return { success: true, user: userData };
            }

            throw new Error(response.message || "Đăng nhập thất bại");
        } catch (err) {
            const message = err.message || "Đăng nhập thất bại. Vui lòng thử lại.";
            setError(message);
            return { success: false, error: message };
        }
    }, []);

    const register = useCallback(async (userData) => {
        setError(null);
        try {
            const response = await authAPI.register(userData);

            if (response.success) {
                const { user: newUser, tokens } = response.data;

                // Store tokens
                localStorage.setItem("accessToken", tokens.accessToken);
                localStorage.setItem("refreshToken", tokens.refreshToken);

                setUser(newUser);
                return { success: true, user: newUser };
            }

            throw new Error(response.message || "Đăng ký thất bại");
        } catch (err) {
            const message = err.message || "Đăng ký thất bại. Vui lòng thử lại.";
            setError(message);
            return { success: false, error: message };
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            await authAPI.logout();
        } catch (err) {
            console.error("Logout error:", err);
        } finally {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            setUser(null);
        }
    }, []);

    const updateProfile = useCallback(async (data) => {
        setError(null);
        try {
            const response = await authAPI.updateProfile(data);

            if (response.success) {
                setUser((prev) => ({ ...prev, ...response.data }));
                return { success: true };
            }

            throw new Error(response.message || "Cập nhật thất bại");
        } catch (err) {
            const message = err.message || "Cập nhật thất bại. Vui lòng thử lại.";
            setError(message);
            return { success: false, error: message };
        }
    }, []);

    const value = {
        user,
        loading,
        error,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        checkAuth,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

export default AuthContext;
