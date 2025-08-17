import React from "react";
import { getInitials } from "../utils/helpers";

export default function Header({ isAuthenticated, user, setShowFlow, setShowProfile, logout }) {
    return (
        <header className="relative z-10">
            <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center font-bold text-white">DS</div>
                    <div>
                        <h1 className="text-lg font-semibold">Descope Demo</h1>
                        <p className="text-xs text-gray-400">Beautiful dark authentication UI</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {!isAuthenticated ? (
                        <button
                            onClick={() => setShowFlow("sign-up-or-in")}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-semibold shadow-lg hover:scale-[1.01] active:scale-95 transition-transform"
                        >
                            Sign up / Sign in
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => setShowProfile(true)}
                                className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center font-bold text-white text-sm border-2 border-white/10 hover:scale-105 transition"
                                aria-label="Profile"
                            >
                                {getInitials(user?.name, user?.email)}
                            </button>
                            <button
                                onClick={() => logout()}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold shadow-md hover:scale-[1.01] active:scale-95 transition-transform"
                            >
                                Logout
                            </button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}