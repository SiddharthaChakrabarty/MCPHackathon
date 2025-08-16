import { Descope } from '@descope/react-sdk'
import React from 'react'

function Signup() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-indigo-900 to-black">
            <div className="max-w-md w-full bg-gradient-to-tr from-gray-800 via-indigo-800 to-gray-900 shadow-2xl rounded-3xl p-10 border border-indigo-700/40 backdrop-blur-lg">
                <div className="flex flex-col items-center mb-8">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mb-4">
                        <circle cx="12" cy="12" r="10" fill="#6366F1" />
                        <path d="M8 12l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <h2 className="text-3xl font-extrabold text-indigo-300 mb-2 tracking-wide drop-shadow-lg">Welcome Back</h2>
                    <p className="text-indigo-100 text-sm">Sign up or sign in to continue</p>
                </div>
                <div className="bg-black/60 rounded-xl p-6 shadow-inner">
                    <Descope
                        projectId="P31EeCcDPtwQGyi9wbZk4ZLKKE5a"
                        flowId="sign-up-or-in"
                        theme="dark"
                        onSuccess={(e) => {
                            console.log(e.detail.user.name)
                            console.log(e.detail.user.email)
                        }}
                        onError={(err) => {
                            console.log("Error!", err)
                        }}
                    />
                </div>
            </div>
        </div>
    )
}

export default Signup