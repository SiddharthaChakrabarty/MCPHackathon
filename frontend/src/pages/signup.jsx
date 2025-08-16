import { Descope } from '@descope/react-sdk'
import React from 'react'

function Signup() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-black">
            <div className="w-full max-w-md bg-neutral-900 rounded-2xl shadow-xl border border-neutral-800 pt-10">
                <div className="bg-neutral-950 px-8 pb-8 pt-4 rounded-b-2xl">
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