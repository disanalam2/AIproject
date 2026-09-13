"use client";
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { LogOut, Calendar, FileText, UserCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PatientDashboard() {
    const [appointments, setAppointments] = useState([]);
    const [notes, setNotes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('patientToken');
        if (!token) {
            router.push('/login');
            return;
        }

        const fetchData = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
                const headers = { Authorization: `Bearer ${token}` };

                const [apptsRes, notesRes] = await Promise.all([
                    axios.get(`${apiUrl}/api/patient/appointments`, { headers }),
                    axios.get(`${apiUrl}/api/patient/notes`, { headers })
                ]);

                setAppointments(apptsRes.data);
                setNotes(notesRes.data);
            } catch (err) {
                console.error(err);
                if (err.response?.status === 401 || err.response?.status === 403) {
                    localStorage.removeItem('patientToken');
                    router.push('/login');
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('patientToken');
        router.push('/login');
    };

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-teal-600">Loading your portal...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-100 rounded-lg">
                        <UserCircle className="text-teal-600" size={24} />
                    </div>
                    <h1 className="text-xl font-bold text-slate-700">Patient Portal</h1>
                </div>
                <button 
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                    <LogOut size={16} /> Logout
                </button>
            </header>

            <main className="max-w-5xl mx-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                
                {/* Appointments Section */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Calendar className="text-teal-500" />
                        <h2 className="text-xl font-bold text-slate-700">My Appointments</h2>
                    </div>
                    
                    <div className="space-y-4">
                        {appointments.length === 0 ? (
                            <div className="p-6 bg-white rounded-xl border border-slate-200 text-center text-slate-500">
                                No appointments found.
                            </div>
                        ) : (
                            appointments.map(appt => (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={appt.id} 
                                    className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-semibold text-lg text-slate-800">
                                            {new Date(appt.appointmentDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        </h3>
                                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                                            appt.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                                            appt.status === 'RESCHEDULED' ? 'bg-orange-100 text-orange-700' :
                                            'bg-slate-100 text-slate-700'
                                        }`}>
                                            {appt.status}
                                        </span>
                                    </div>
                                    <div className="text-sm text-slate-500 mb-1">
                                        Time: <span className="font-medium text-slate-700">{new Date(appt.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    {appt.reason && (
                                        <div className="mt-3 text-sm p-3 bg-slate-50 rounded-lg text-slate-600 border border-slate-100">
                                            <span className="font-medium text-slate-700">Reason:</span> {appt.reason}
                                        </div>
                                    )}
                                </motion.div>
                            ))
                        )}
                    </div>
                </section>

                {/* Clinical Notes Section */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <FileText className="text-blue-500" />
                        <h2 className="text-xl font-bold text-slate-700">Clinical Notes</h2>
                    </div>
                    
                    <div className="space-y-4">
                        {notes.length === 0 ? (
                            <div className="p-6 bg-white rounded-xl border border-slate-200 text-center text-slate-500">
                                No clinical records found.
                            </div>
                        ) : (
                            notes.map(note => (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={note.id} 
                                    className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="text-sm font-medium text-blue-600 mb-3 border-b border-slate-100 pb-2">
                                        Visit on {new Date(note.createdAt).toLocaleDateString()}
                                    </div>
                                    
                                    <div className="space-y-3 text-sm">
                                        {note.assessment && (
                                            <div>
                                                <span className="font-semibold text-slate-700 block mb-1">Assessment:</span>
                                                <p className="text-slate-600 leading-relaxed">{note.assessment}</p>
                                            </div>
                                        )}
                                        {note.medications && note.medications !== "[]" && (
                                            <div>
                                                <span className="font-semibold text-slate-700 block mb-1">Prescriptions:</span>
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {JSON.parse(note.medications).map((med, idx) => (
                                                        <span key={idx} className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 text-xs">
                                                            {med.medication} {med.dosage}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {note.lifestyle_advice && (
                                            <div>
                                                <span className="font-semibold text-slate-700 block mb-1">Advice:</span>
                                                <p className="text-slate-600 italic leading-relaxed">{note.lifestyle_advice}</p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </section>

            </main>
        </div>
    );
}
