import React, { useState, useEffect } from 'react';

export default function DoctorManagement() {
  const [doctors, setDoctors] = useState([]);
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    departmentName: '',
    email: '',
    googleCalendarId: '',
    schedules: [{ dayOfWeek: 'Monday', startTime: '09:00', endTime: '17:00' }]
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const res = await fetch('/api/receptionist/doctors');
      if (res.ok) {
        const data = await res.json();
        // Since we are mocking auth, filter by tenantId 1 for now (City Hospital)
        setDoctors(data.filter(d => d.tenantId === 1));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        tenantId: 1, // Mocked Tenant ID for City Hospital
        ...newDoctor
      };
      const res = await fetch('/api/receptionist/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setNewDoctor({
          name: '',
          departmentName: '',
          email: '',
          googleCalendarId: '',
          schedules: [{ dayOfWeek: 'Monday', startTime: '09:00', endTime: '17:00' }]
        });
        fetchDoctors();
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ color: 'var(--text-primary)', marginBottom: '2rem' }}>Doctors Management</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Add Doctor Form */}
        <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Add New Doctor</h2>
          <form onSubmit={handleAddDoctor} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Full Name</label>
              <input 
                type="text" 
                value={newDoctor.name} 
                onChange={e => setNewDoctor({...newDoctor, name: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-primary)' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Department</label>
              <input 
                type="text" 
                value={newDoctor.departmentName} 
                onChange={e => setNewDoctor({...newDoctor, departmentName: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-primary)' }}
                placeholder="e.g. Cardiology"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Google Calendar ID (Optional)</label>
              <input 
                type="text" 
                value={newDoctor.googleCalendarId} 
                onChange={e => setNewDoctor({...newDoctor, googleCalendarId: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-primary)' }}
                placeholder="doctor@clinic.com"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              style={{ padding: '0.75rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
            >
              {loading ? 'Adding...' : 'Add Doctor'}
            </button>
          </form>
        </div>

        {/* Doctors List */}
        <div>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Current Staff</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {doctors.map(doc => (
              <div key={doc.id} style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ color: 'var(--primary)', margin: 0 }}>{doc.name}</h3>
                  <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>{doc.department?.name}</p>
                  {doc.schedules?.length > 0 && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      <strong>Schedule:</strong> {doc.schedules.map(s => `${s.dayOfWeek} (${s.startTime} - ${s.endTime})`).join(', ')}
                    </div>
                  )}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {doc.googleCalendarId ? '📅 Calendar Synced' : '❌ No Calendar'}
                </div>
              </div>
            ))}
            {doctors.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--surface)', borderRadius: '12px' }}>
                No doctors found. Add one to get started!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
