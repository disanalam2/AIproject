import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import AdminDashboard from './components/AdminDashboard';
import WebDialer from './components/WebDialer';
import MasterSettings from './components/MasterSettings';
import Login from './components/Login';
import { LayoutDashboard, PhoneCall, Settings } from 'lucide-react';
import './index.css';

const Layout = ({ children }) => {
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  if (isLogin) return children;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div style={{ width: '250px', background: 'var(--surface)', borderRight: '1px solid var(--border)', padding: '2rem 1rem' }}>
        <h2 style={{ color: 'var(--primary)', marginBottom: '2rem', paddingLeft: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
           City Care AI
        </h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link to="/" style={{ textDecoration: 'none', color: 'var(--text-primary)', padding: '10px 15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--background)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <LayoutDashboard size={18} /> Dashboard
          </Link>
          <Link to="/settings" style={{ textDecoration: 'none', color: 'var(--text-primary)', padding: '10px 15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--background)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <Settings size={18} /> Master Settings
          </Link>
          <Link to="/dialer" style={{ textDecoration: 'none', color: 'var(--text-primary)', padding: '10px 15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--background)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <PhoneCall size={18} /> Test Web Dialer
          </Link>
        </nav>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/dialer" element={<WebDialer />} />
          <Route path="/settings" element={<MasterSettings />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
