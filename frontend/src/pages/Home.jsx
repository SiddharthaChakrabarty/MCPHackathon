// src/pages/Home.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import { useSession, useUser, useDescope } from "@descope/react-sdk";
import Header from "../components/Header";
import ProfileModal from "../components/ProfileModal";
import AuthModal from "../components/AuthModal";
import ConnectPanel from "../components/ConnectPanel";

function AuthenticatedAppContent({ setShowProfile }) {
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

    if (!isAuthenticated) {
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

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-start px-6 pt-12">
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35 }}
                className="w-full max-w-7xl bg-gradient-to-br from-white/3 to-white/6 backdrop-blur rounded-3xl p-6 border border-white/6 shadow-2xl"
            >
                {/* header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-semibold text-white">Welcome, {user?.name || user?.email}</h3>
                        <p className="text-sm text-gray-300">{user?.email}</p>
                    </div>
                    <div>
                        <button
                            onClick={() => setShowProfile(true)}
                            className="px-4 py-2 rounded-xl bg-white/6 text-white font-semibold shadow hover:scale-[1.02] transition"
                        >
                            View profile
                        </button>
                    </div>
                </div>

                {/* layout: left (fixed), center (flex), right (fixed) */}
                <div className="mt-6 flex flex-col lg:flex-row gap-6">
                    {/* Left: ConnectPanel — fixed width on large screens, fully scrollable vertically but no horizontal overflow */}
                    <div className="w-full lg:w-96">
                        <div
                            className="max-h-[68vh] overflow-y-auto overflow-x-hidden p-2"
                            style={{ scrollbarWidth: "thin", msOverflowStyle: "auto" }}
                        >
                            <ConnectPanel />
                        </div>
                    </div>

                    {/* Center: Orchestrator hub */}
                    <div className="flex-1 flex items-center justify-center">
                        <div className="w-full max-w-md p-6 rounded-2xl bg-gradient-to-br from-black/40 to-black/60 border border-white/6 shadow-xl text-center">
                            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center font-bold text-white text-lg mb-3">
                                Orchestrator
                            </div>
                            <div className="text-md text-gray-300">
                                Connect services → Generate recommendations → Schedule & share
                            </div>

                            {/* small decorative svg that won't block UI */}
                            <div className="mt-4 pointer-events-none select-none">
                                <svg width="140" height="80" viewBox="0 0 140 80" className="mx-auto opacity-30">
                                    <defs>
                                        <linearGradient id="hubG" x1="0" x2="1">
                                            <stop offset="0%" stopColor="#7c3aed" />
                                            <stop offset="100%" stopColor="#ec4899" />
                                        </linearGradient>
                                    </defs>
                                    <circle cx="70" cy="30" r="24" fill="url(#hubG)" />
                                    <path d="M10 70 L40 40 L100 50 L130 20" stroke="#fff" strokeWidth="1" strokeOpacity="0.15" fill="none" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Right: Outcomes — fixed width on large screens */}
                    <div className="w-full lg:w-80">
                        <div className="flex flex-col gap-4">
                            <div className="p-4 rounded-xl bg-black/60 border border-white/6 shadow">
                                <h4 className="font-semibold text-white">YouTube learning</h4>
                                <p className="text-xs text-gray-400 mt-1">Curated tutorials & playlists matched to your repos and gaps.</p>
                            </div>
                            <div className="p-4 rounded-xl bg-black/60 border border-white/6 shadow">
                                <h4 className="font-semibold text-white">LinkedIn & Jobs</h4>
                                <p className="text-xs text-gray-400 mt-1">Auto-post project updates and suggest job opportunities tailored to your projects.</p>
                            </div>
                            <div className="p-4 rounded-xl bg-black/60 border border-white/6 shadow">
                                <h4 className="font-semibold text-white">Schedule (Notion & Google Calendar)</h4>
                                <p className="text-xs text-gray-400 mt-1">Automatic timetables, study sessions, and calendar events (with Google Meet links).</p>
                            </div>
                            <div className="p-4 rounded-xl bg-black/60 border border-white/6 shadow">
                                <h4 className="font-semibold text-white">Wellbeing (Spotify)</h4>
                                <p className="text-xs text-gray-400 mt-1">Create playlists for focus and breaks; sync to your calendar.</p>
                            </div>
                            <div className="p-4 rounded-xl bg-black/60 border border-white/6 shadow">
                                <h4 className="font-semibold text-white">Collaboration (Slack & Discord)</h4>
                                <p className="text-xs text-gray-400 mt-1">Join channels, share progress, and schedule live meetings via Google Meet.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* footer */}
                <div className="mt-6 text-right">
                    <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="px-4 py-2 rounded bg-indigo-600 text-white font-semibold">
                        Back to top
                    </button>
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
            {/* subtle decorative circles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <svg className="absolute -right-40 -top-28 opacity-18" width="600" height="600" viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs><linearGradient id="g1" x1="0" x2="1"><stop offset="0%" stopColor="#7c3aed" /><stop offset="100%" stopColor="#ec4899" /></linearGradient></defs>
                    <circle cx="300" cy="300" r="200" fill="url(#g1)" />
                </svg>
            </div>

            <Header isAuthenticated={isAuthenticated} user={user} setShowFlow={setShowFlow} setShowProfile={setShowProfile} logout={logout} />

            <main className="relative z-10">
                <AuthenticatedAppContent setShowProfile={setShowProfile} />
            </main>

            <AuthModal showFlow={showFlow} setShowFlow={setShowFlow} setAuthChanged={setAuthChanged} />
            <ProfileModal showProfile={showProfile} setShowProfile={setShowProfile} user={user} />
        </div>
    );
}
