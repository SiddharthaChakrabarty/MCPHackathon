import React from "react";
import { motion } from "framer-motion";
import { getInitials } from "../utils/helpers";

export default function ProfileModal({ showProfile, setShowProfile, user }) {
    if (!showProfile) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowProfile(false)} />
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
                className="relative z-10 w-full max-w-md bg-gradient-to-br from-white/3 to-white/6 rounded-2xl p-5 border border-white/6 shadow-2xl"
            >
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white">Profile</h3>
                    <button
                        onClick={() => setShowProfile(false)}
                        className="text-gray-300 hover:text-white text-sm"
                        aria-label="Close profile"
                    >
                        Close
                    </button>
                </div>
                <div className="flex flex-col items-center gap-4">
                    <span className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center font-bold text-white text-2xl">
                        {getInitials(user?.name, user?.email)}
                    </span>
                    <p className="text-lg font-semibold text-white">{user?.name || user?.email}</p>
                    <p className="text-sm text-gray-300">{user?.email}</p>
                </div>
            </motion.div>
        </div>
    );
}