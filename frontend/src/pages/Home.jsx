import React, { useState } from "react";
import { motion } from "framer-motion";
import { useSession, useUser, useDescope, Descope } from "@descope/react-sdk";
import Header from "../components/Header";
import ProfileModal from "../components/ProfileModal";
import AuthModal from "../components/AuthModal";
import ConnectPanel from "../components/ConnectPanel";

function AuthenticatedAppContent() {
    const { isAuthenticated, isSessionLoading } = useSession();
    const { user, isUserLoading } = useUser();

    if (isSessionLoading || isUserLoading) {
        return (
            <div className="w-full h-64 flex items-center justify-center">
                <motion.div
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-gray-400"
                >
                    Loading...
                </motion.div>
            </div>
        );
    }

    if (isAuthenticated) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center px-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="max-w-3xl w-full bg-gradient-to-br from-white/3 to-white/6 backdrop-blur rounded-3xl p-8 border border-white/6 shadow-2xl"
                >
                    <h3 className="text-2xl font-semibold text-white">
                        Welcome, {user?.name || user?.email}
                    </h3>
                    <p className="text-sm text-gray-300">{user?.email}</p>
                    <div className="mt-6">
                        <ConnectPanel />
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-6">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="max-w-lg w-full bg-gradient-to-br from-white/6 via-white/4 to-transparent backdrop-blur-md border border-white/6 rounded-2xl p-6 shadow-2xl"
            >
                <div className="flex flex-col items-center gap-4">
                    <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-2xl font-bold text-white shadow-xl">
                        DS
                    </div>
                    <h2 className="text-2xl font-semibold text-white">Welcome</h2>
                    <p className="text-sm text-gray-300 text-center">
                        Create an account to get started — fast, secure authentication powered by Descope.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}

export default function Home() {
    const { isAuthenticated } = useSession();
    const { user } = useUser();
    const { logout } = useDescope();

    const [showFlow, setShowFlow] = useState(null);
    const [showProfile, setShowProfile] = useState(false);
    const [authChanged, setAuthChanged] = useState(false);

    React.useEffect(() => {
        setAuthChanged((prev) => !prev);
    }, [isAuthenticated]);

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_#0b0b0b,_#050505)] text-white relative">
            {/* decorative background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <svg className="absolute -right-40 -top-28 opacity-20" width="600" height="600" viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="g1" x1="0" x2="1">
                            <stop offset="0%" stopColor="#7c3aed" />
                            <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                    </defs>
                    <circle cx="300" cy="300" r="200" fill="url(#g1)" />
                </svg>
                <svg className="absolute -left-40 bottom-0 opacity-10" width="500" height="500" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="250" cy="250" r="200" fill="#06b6d4" />
                </svg>
            </div>

            <Header
                isAuthenticated={isAuthenticated}
                user={user}
                setShowFlow={setShowFlow}
                setShowProfile={setShowProfile}
                logout={logout}
            />

            <main className="relative z-10">
                <AuthenticatedAppContent />
            </main>

            <AuthModal
                showFlow={showFlow}
                setShowFlow={setShowFlow}
                setAuthChanged={setAuthChanged}
            />

            <ProfileModal
                showProfile={showProfile}
                setShowProfile={setShowProfile}
                user={user}
            />
        </div>
    );
}