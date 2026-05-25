import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Settings, Users, FileText, Target, LogOut } from 'lucide-react';

export default function Sidebar({ role, isCollapsed }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Analisis Klaim', icon: LayoutDashboard },
    { path: '/laporan', label: 'Laporan', icon: FileText },
    { path: '/positioning', label: 'Positioning RS', icon: Target },
    { path: '/settings', label: 'Kompetensi RS', icon: Settings },
    ...(role === 'admin' ? [{ path: '/users', label: 'Manajemen User', icon: Users }] : [])
  ];

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="logo-container" style={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
        <img src="/logo_apci.png" alt="APCI" style={{ width: isCollapsed ? '32px' : '48px', height: isCollapsed ? '32px' : '48px', transition: 'all 0.3s' }} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ lineHeight: '1', fontStyle: 'italic', fontWeight: 900 }}>AKSI</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Analisis Klaim dan Kompetensi Rumah Sakit</span>
        </div>
      </div>
      <nav className="nav-links">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
