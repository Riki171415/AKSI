import React, { useState, useEffect } from 'react';
import { clearResult } from '../utils/analyzer';
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
    clearResult();
    localStorage.removeItem('token');
    localStorage.removeItem('kodeRs');
    localStorage.removeItem('role');
    localStorage.removeItem('nama');
    navigate('/login');
  };

  useEffect(() => {
    if (!token) return;

    // 1. Idle timeout (10 minutes)
    let timeoutId;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLogout();
      }, 10 * 60 * 1000); // 10 minutes
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(e => document.addEventListener(e, resetTimer));
    resetTimer();

    // 2. BeforeUnload warning
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Data tidak tersimpan dan akan terhapus, aplikasi tidak menyimpan data anda';
      return e.returnValue;
    };
    
    // 3. Clear data on unload (reload / close tab)
    const handleUnload = () => {
      clearResult();
      localStorage.removeItem('token');
      localStorage.removeItem('kodeRs');
      localStorage.removeItem('role');
      localStorage.removeItem('nama');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    return () => {
      clearTimeout(timeoutId);
      events.forEach(e => document.removeEventListener(e, resetTimer));
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [token]);

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
        <footer style={{ textAlign: 'center', padding: '1.5rem', marginTop: 'auto', fontSize: '0.8rem', color: '#64748b', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', fontWeight: 600, letterSpacing: '0.02em' }}>
          Copyright &copy; APCI Asosiasi Praktisi Casemix Indonesia
        </footer>
      </div>
    </div>
  );
}
