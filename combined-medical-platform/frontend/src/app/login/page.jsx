"use client";
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import MasterLogin from '@/modules/admin/components/Login';
import TenantLogin from '@/modules/admin/components/TenantLogin';

export default function Page() {
    const [domain, setDomain] = useState(null);
    const [tenant, setTenant] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const checkDomain = async () => {
            const currentDomain = window.location.hostname;
            setDomain(currentDomain);

            if (currentDomain !== 'localhost') {
                try {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
                    const res = await axios.get(`${apiUrl}/api/tenant/resolve?domain=${currentDomain}`);
                    setTenant(res.data);
                } catch (err) {
                    setError('Hospital not found for this domain.');
                }
            }
            setIsLoading(false);
        };
        checkDomain();
    }, []);

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">Loading...</div>;
    }

    if (domain === 'localhost') {
        return <MasterLogin />;
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-800">
                <div className="bg-white p-8 rounded-xl shadow-lg border border-red-100 text-center">
                    <h2 className="text-2xl font-bold text-red-600 mb-2">404 Not Found</h2>
                    <p className="text-slate-600">{error}</p>
                </div>
            </div>
        );
    }

    return <TenantLogin tenant={tenant} />;
}
