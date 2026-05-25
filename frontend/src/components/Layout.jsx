import React from 'react';
import { Outlet, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Settings, LogOut } from 'lucide-react';

export default function Layout() {
  const token = localStorage.getItem('token');
  const kodeRs = localStorage.getItem('kodeRs');
  const location = useLocation();
  const navigate = useNavigate();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('kodeRs');
    navigate('/login');
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="logo-container">
          <img src="/logo_apci.png" alt="APCI" />
          <span>AKSI</span>
        </div>
        <nav className="nav-links">
          <Link to="/dashboard" className={`nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}>
            <LayoutDashboard />
            <span>Dashboard Analisis</span>
          </Link>
          <Link to="/settings" className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`}>
            <Settings />
            <span>Kompetensi RS</span>
          </Link>
        </nav>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <header className="top-header">
          <div className="header-user">
            <span>Kode RS: {kodeRs}</span>
            <button onClick={handleLogout} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem' }}>
              <LogOut size={16} /> Keluar
            </button>
          </div>
        </header>
        
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
