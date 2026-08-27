import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Lock } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
            const res = await axios.post(`${apiUrl}/api/auth/login`, { username, password });
            localStorage.setItem('adminToken', res.data.token);
            navigate('/settings');
        } catch (err) {
            setError('Invalid credentials');
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw', background: 'var(--background)' }}>
            <div className="glass-panel" style={{ padding: '3rem', width: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ background: 'var(--primary)', padding: '1rem', borderRadius: '50%', color: 'white', marginBottom: '1rem' }}>
                    <Lock size={32} />
                </div>
                <h2 style={{ marginBottom: '2rem', color: 'var(--primary)' }}>Master Admin Login</h2>
                {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>}
                
                <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input 
                        type="text" 
                        placeholder="Username" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)}
                        style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '1rem' }}
                        required
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '1rem' }}
                        required
                    />
                    <button type="submit" className="primary" style={{ padding: '12px', fontSize: '1rem', marginTop: '1rem' }}>
                        Login
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
