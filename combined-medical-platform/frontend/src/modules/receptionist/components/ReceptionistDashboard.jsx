"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Phone, Calendar, Activity, Clock } from 'lucide-react';


const ReceptionistDashboard = () => {
    const [logs, setLogs] = useState([]);
    const [appointmentsCount, setAppointmentsCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch logs from backend
        const fetchData = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
                const [logsRes, appointmentsRes] = await Promise.all([
                    axios.get(`${apiUrl}/api/logs`),
                    axios.get(`${apiUrl}/api/appointments`)
                ]);
                setLogs(logsRes.data);
                setAppointmentsCount(appointmentsRes.data.count || 0);
            } catch (err) {
                console.error("Failed to fetch dashboard data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    return (
        <div style={{ padding: '2rem' }} className="animate-fade-in">
            <h1 style={{ color: 'var(--primary)', marginBottom: '2rem' }}>City Care Clinic - AI Receptionist Dashboard</h1>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'var(--primary)', padding: '1rem', borderRadius: '12px', color: 'white' }}>
                        <Phone size={24} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, color: 'var(--text-secondary)' }}>Total Calls Today</h3>
                        <p style={{ fontSize: '2rem', margin: '0.5rem 0 0 0', fontWeight: 'bold' }}>{logs.length || 0}</p>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'var(--success)', padding: '1rem', borderRadius: '12px', color: 'white' }}>
                        <Calendar size={24} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, color: 'var(--text-secondary)' }}>Appointments Booked</h3>
                        <p style={{ fontSize: '2rem', margin: '0.5rem 0 0 0', fontWeight: 'bold' }}>{appointmentsCount}</p>
                    </div>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '2rem' }}>
                <h2 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={20} color="var(--primary)" /> Recent Call Transcripts
                </h2>
                
                {loading ? (
                    <p>Loading call logs...</p>
                ) : logs.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No calls logged yet.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {logs.map((log) => (
                            <div key={log.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <strong>Caller: {log.phoneNumber}</strong>
                                    <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Clock size={14} /> {new Date(log.createdAt).toLocaleString()}
                                    </span>
                                </div>
                                <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '6px', fontSize: '0.95rem' }}>
                                    <em>"{log.transcript}"</em>
                                </div>
                                {log.extractedSymptoms && log.extractedSymptoms !== '[]' && (
                                    <div style={{ marginTop: '1rem', color: 'var(--danger)', fontSize: '0.85rem' }}>
                                        <strong>Detected Medical Entities: </strong> {log.extractedSymptoms}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReceptionistDashboard;
