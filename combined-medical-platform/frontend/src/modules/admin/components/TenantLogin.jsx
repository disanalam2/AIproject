"use client";
import React, { useState } from 'react';
import { useRouter } from "next/navigation";
import axios from 'axios';
import { Lock, User, Phone, ArrowRight, Building2, UserCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TenantLogin = ({ tenant }) => {
    const [loginType, setLoginType] = useState('patient'); // 'patient' or 'staff'
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleStaffLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            const res = await axios.post(`${apiUrl}/api/auth/client-login`, { username, password });
            localStorage.setItem('clientToken', res.data.token);
            router.push('/dashboard');
        } catch (err) {
            setError('Invalid staff credentials');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePatientLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            const res = await axios.post(`${apiUrl}/api/auth/patient-login`, { 
                phone, 
                otp, 
                tenantId: tenant.tenantId 
            });
            localStorage.setItem('patientToken', res.data.token);
            router.push('/patient/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid OTP or unregistered phone');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 text-slate-800 overflow-hidden relative">
            
            <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-teal-400/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[35vw] h-[35vw] bg-blue-400/20 rounded-full blur-[100px] pointer-events-none" />
            
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full max-w-md p-8 md:p-10 z-10"
            >
                <div className="backdrop-blur-xl bg-white/70 border border-white/50 shadow-2xl rounded-3xl p-8 relative overflow-hidden">
                    
                    <div className="flex flex-col items-center mb-8">
                        <motion.div 
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", bounce: 0.5 }}
                            className="bg-teal-100 p-4 rounded-2xl border border-teal-200 mb-4"
                        >
                            <Building2 className="w-10 h-10 text-teal-600" />
                        </motion.div>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
                            {tenant.name}
                        </h2>
                        <p className="text-slate-500 mt-2 text-sm text-center">
                            Welcome to your healthcare portal
                        </p>
                    </div>

                    {/* Tabs */}
                    <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
                        <button
                            onClick={() => { setLoginType('patient'); setError(''); }}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${loginType === 'patient' ? 'bg-white shadow-sm text-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <UserCircle size={16} /> Patient
                        </button>
                        <button
                            onClick={() => { setLoginType('staff'); setError(''); }}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${loginType === 'staff' ? 'bg-white shadow-sm text-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Building2 size={16} /> Staff
                        </button>
                    </div>

                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm text-center"
                        >
                            {error}
                        </motion.div>
                    )}
                    
                    <AnimatePresence mode="wait">
                        {loginType === 'patient' ? (
                            <motion.form 
                                key="patient"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onSubmit={handlePatientLogin} 
                                className="space-y-5"
                            >
                                <div>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-500 transition-colors">
                                            <Phone size={18} />
                                        </div>
                                        <input 
                                            type="text" 
                                            placeholder="Phone Number (e.g. +9876543210)" 
                                            value={phone} 
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all text-slate-700 placeholder:text-slate-400 shadow-sm"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-500 transition-colors">
                                            <Lock size={18} />
                                        </div>
                                        <input 
                                            type="text" 
                                            placeholder="4-digit OTP (Use 1234)" 
                                            value={otp} 
                                            onChange={(e) => setOtp(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all text-slate-700 placeholder:text-slate-400 shadow-sm"
                                            required
                                        />
                                    </div>
                                </div>
                                
                                <button 
                                    type="submit" 
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 text-white py-3.5 rounded-xl font-medium transition-all active:scale-[0.98] disabled:opacity-70 shadow-lg shadow-teal-500/30 mt-4 group"
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            Access Portal <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </motion.form>
                        ) : (
                            <motion.form 
                                key="staff"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onSubmit={handleStaffLogin} 
                                className="space-y-5"
                            >
                                <div>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-500 transition-colors">
                                            <User size={18} />
                                        </div>
                                        <input 
                                            type="text" 
                                            placeholder="Staff Username" 
                                            value={username} 
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all text-slate-700 placeholder:text-slate-400 shadow-sm"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-500 transition-colors">
                                            <Lock size={18} />
                                        </div>
                                        <input 
                                            type="password" 
                                            placeholder="Password" 
                                            value={password} 
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all text-slate-700 placeholder:text-slate-400 shadow-sm"
                                            required
                                        />
                                    </div>
                                </div>
                                
                                <button 
                                    type="submit" 
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black text-white py-3.5 rounded-xl font-medium transition-all active:scale-[0.98] disabled:opacity-70 shadow-lg shadow-slate-900/20 mt-4 group"
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            Secure Login <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </motion.form>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default TenantLogin;
