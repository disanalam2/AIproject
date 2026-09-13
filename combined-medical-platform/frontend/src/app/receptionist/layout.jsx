"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PhoneCall, Settings, Stethoscope } from 'lucide-react';


export default function ReceptionistLayout({ children }) {
  const pathname = usePathname();
  const isLogin = pathname === '/receptionist/login';

  if (isLogin) return <>{children}</>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div style={{ width: '250px', background: 'var(--surface)', borderRight: '1px solid var(--border)', padding: '2rem 1rem' }}>
        <h2 style={{ color: 'var(--primary)', marginBottom: '2rem', paddingLeft: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
           City Care AI
        </h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link href="/receptionist" style={{ textDecoration: 'none', color: 'var(--text-primary)', padding: '10px 15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.2s' }}>
            <LayoutDashboard size={18} /> Dashboard
          </Link>
          <Link href="/receptionist/doctors" style={{ textDecoration: 'none', color: 'var(--text-primary)', padding: '10px 15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.2s' }}>
            <Stethoscope size={18} /> Doctors Management
          </Link>
          <Link href="/admin" style={{ textDecoration: 'none', color: 'var(--text-primary)', padding: '10px 15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.2s' }}>
            <Settings size={18} /> Master Settings
          </Link>
          <Link href="/receptionist/dialer" style={{ textDecoration: 'none', color: 'var(--text-primary)', padding: '10px 15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.2s' }}>
            <PhoneCall size={18} /> Test Web Dialer
          </Link>
          <Link href="/scriber" style={{ textDecoration: 'none', color: 'var(--text-primary)', padding: '10px 15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.2s', marginTop: 'auto' }}>
             Switch to Scriber
          </Link>
          <Link href="/" style={{ textDecoration: 'none', color: 'var(--text-primary)', padding: '10px 15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.2s' }}>
             Back to Main Menu
          </Link>
        </nav>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  );
}
