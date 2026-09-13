"use client";
import React, { useState } from 'react';
import { useRouter } from "next/navigation";
import axios from 'axios';
import { Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            const res = await axios.post(`${apiUrl}/api/auth/login`, { username, password });
            localStorage.setItem('adminToken', res.data.token);
            router.push('/admin');
        } catch (err) {
            setError('Invalid master credentials');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 text-slate-100 overflow-hidden relative">
            
            {/* Background animated circles */}
            <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-indigo-500/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[35vw] h-[35vw] bg-blue-500/20 rounded-full blur-[100px] mix-blend-screen pointer-events-none" />
            
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full max-w-md p-8 md:p-10 z-10"
            >
                <div className="backdrop-blur-xl bg-slate-900/50 border border-slate-700/50 shadow-2xl rounded-3xl p-8 relative overflow-hidden">
                    
                    {/* Inner highlight */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
                    
                    <div className="flex flex-col items-center mb-8">
                        <motion.div 
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", bounce: 0.5 }}
                            className="bg-indigo-600/20 p-4 rounded-2xl border border-indigo-500/30 mb-4"
                        >
                            <ShieldCheck className="w-10 h-10 text-indigo-400" />
                        </motion.div>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-300 to-blue-300 bg-clip-text text-transparent">
                            Master Admin
                        </h2>
                        <p className="text-slate-400 mt-2 text-sm text-center">
                            Secure configuration access for AI Clinical Suite
                        </p>
                    </div>

                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm text-center"
                        >
                            {error}
                        </motion.div>
                    )}
                    
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                                    <User size={18} />
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="Admin Username" 
                                    value={username} 
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all text-slate-200 placeholder:text-slate-500"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input 
                                    type="password" 
                                    placeholder="Master Password" 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all text-slate-200 placeholder:text-slate-500"
                                    required
                                />
                            </div>
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white py-3.5 rounded-xl font-medium transition-all active:scale-[0.98] disabled:opacity-70 shadow-lg shadow-indigo-900/50 mt-4 group"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Authenticate <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
