import React, { useState } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { LogOut, Menu } from 'lucide-react';
import Sidebar from './Sidebar';

export default function Layout() {
  const token = localStorage.getItem('token');
  const kodeRs = localStorage.getItem('kodeRs');
  const nama = localStorage.getItem('nama') || 'User';
  const role = localStorage.getItem('role') || 'user';
  const navigate = useNavigate();
  
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('kodeRs');
    localStorage.removeItem('role');
    localStorage.removeItem('nama');
    navigate('/login');
  };

  return (
    <div className="app-container">
      <Sidebar role={role} isCollapsed={isCollapsed} />
      <div className="main-content">
        <header className="top-header" style={{ justifyContent: 'space-between' }}>
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', border: 'none' }}>
            <Menu size={24} />
          </button>
          <div className="header-user">
            <div style={{ textAlign: 'right', lineHeight: '1.2' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{nama}</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>
                {role === 'admin' ? 'ADMIN' : `Kode RS: ${kodeRs}`}
              </div>
            </div>
            <button onClick={handleLogout} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', marginLeft: '1rem' }}>
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
