"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { HeartPulse, PhoneCall, ShieldCheck, Stethoscope } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-sky-50 font-sans selection:bg-sky-200 relative overflow-hidden">
      
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-sky-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob" />
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000" />
      <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="z-10 text-center max-w-3xl mb-12"
      >
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-white rounded-3xl shadow-xl shadow-sky-100 border border-white flex items-center justify-center">
            <HeartPulse className="w-12 h-12 text-sky-500" />
          </div>
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold text-slate-800 tracking-tight mb-4">
          City Care <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-emerald-500">Platform</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-600 font-medium max-w-2xl mx-auto">
          Unified AI-powered medical administration and clinical scribing.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 z-10 w-full max-w-5xl">
        
        {/* Scriber Card */}
        <Link href="/scriber" className="block group">
          <motion.div 
            whileHover={{ y: -5, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="h-full bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-lg shadow-slate-200/50 border border-white hover:border-sky-200 transition-all duration-300 flex flex-col items-center text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-sky-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-16 h-16 bg-sky-100 rounded-2xl flex items-center justify-center mb-6 relative z-10">
              <Stethoscope className="w-8 h-8 text-sky-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3 relative z-10">Clinical Scriber</h2>
            <p className="text-slate-600 relative z-10 leading-relaxed">
              AI-powered voice assistant that automatically generates structured SOAP notes from patient consultations.
            </p>
            <div className="mt-8 relative z-10 text-sky-500 font-semibold group-hover:translate-x-2 transition-transform flex items-center gap-2">
              Launch Scriber &rarr;
            </div>
          </motion.div>
        </Link>

        {/* Receptionist Card */}
        <Link href="/receptionist" className="block group">
          <motion.div 
            whileHover={{ y: -5, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="h-full bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-lg shadow-slate-200/50 border border-white hover:border-emerald-200 transition-all duration-300 flex flex-col items-center text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 relative z-10">
              <PhoneCall className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3 relative z-10">AI Receptionist</h2>
            <p className="text-slate-600 relative z-10 leading-relaxed">
              Intelligent conversational agent handling inbound calls, outbound scheduling, and patient routing.
            </p>
            <div className="mt-8 relative z-10 text-emerald-500 font-semibold group-hover:translate-x-2 transition-transform flex items-center gap-2">
              Launch Receptionist &rarr;
            </div>
          </motion.div>
        </Link>

      </div>

      {/* Admin Link */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-16 z-10"
      >
        <Link href="/login" className="flex items-center gap-2 px-6 py-3 bg-white/50 backdrop-blur-md rounded-full border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-white hover:shadow-md transition-all font-medium text-sm">
          <ShieldCheck className="w-4 h-4" />
          Master Admin Login
        </Link>
      </motion.div>
      
    </div>
  );
}
