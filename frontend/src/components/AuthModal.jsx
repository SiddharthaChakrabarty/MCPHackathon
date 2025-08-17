import React from "react";
import { motion } from "framer-motion";
import { Descope } from "@descope/react-sdk";

export default function AuthModal({ showFlow, setShowFlow, setAuthChanged }) {
    if (!showFlow) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFlow(null)} />
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
                className="relative z-10 w-full max-w-md bg-gradient-to-br from-white/3 to-white/6 rounded-2xl p-5 border border-white/6 shadow-2xl"
            >
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white">Sign up / Sign in</h3>
                    <button
                        onClick={() => setShowFlow(null)}
                        className="text-gray-300 hover:text-white text-sm"
                        aria-label="Close auth"
                    >
                        Close
                    </button>
                </div>
                <div className="rounded-lg overflow-hidden bg-black/60 p-2">
                    <Descope
                        flowId={showFlow}
                        theme="dark"
                        onSuccess={() => {
                            setShowFlow(null);
                            setAuthChanged((prev) => !prev);
                        }}
                        onError={(e) => console.error("Login failed:", e)}
                    />
                </div>
            </motion.div>
        </div>
    );
}