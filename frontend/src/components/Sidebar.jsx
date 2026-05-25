import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Settings, 
  Users, 
  FileText, 
  LogOut, 
  ChevronLeft,
  Menu,
  Database
} from 'lucide-react';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  
  const role = localStorage.getItem('role') || 'user';
  const nama = localStorage.getItem('nama') || 'User';
  const kodeRs = localStorage.getItem('kodeRs') || 'UNKNOWN';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('kodeRs');
    localStorage.removeItem('role');
    localStorage.removeItem('nama');
    navigate('/login');
  };

  const navItems = [
    {
      title: 'Dashboard Analisis',
      items: [
        { path: '/dashboard', label: 'Analisis Kompetensi', icon: LayoutDashboard },
        { path: '/laporan', label: 'Laporan', icon: FileText }
      ]
    },
    {
      title: 'Sistem & Data',
      items: [
        { path: '/settings', label: 'Kompetensi RS', icon: Settings },
        ...(role === 'admin' ? [{ path: '/users', label: 'Manajemen User', icon: Users }] : [])
      ]
    }
  ];

  return (
    <aside
      className={`bg-[var(--bg-secondary)] border-r border-[var(--border-color)] h-screen sticky top-0 flex flex-col transition-all duration-300 z-50 no-print shadow-xl ${collapsed ? 'w-20' : 'w-64'}`}
    >
      <div className={`flex items-center h-16 border-b border-[var(--border-color)] px-4 ${collapsed ? 'justify-center px-0' : 'justify-between'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand-navy flex items-center justify-center text-white font-bold">
              AK
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-tighter text-brand-navy leading-none flex flex-col uppercase italic">
                <span>AKSI<span className="text-brand-tosca">-APCI</span></span>
              </h1>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full transition-colors text-brand-tosca"
        >
          {collapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {navItems.map((section, idx) => (
          <div key={idx} className="mb-4">
            {!collapsed && (
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] px-2 mb-2">
                {section.title}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={collapsed ? item.label : ''}
                  className={({ isActive }) => 
                    `flex items-center w-full transition-all duration-300 rounded-xl px-4 py-2.5 ${isActive
                      ? 'bg-brand-tosca text-white shadow-lg font-bold'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-brand-tosca font-medium'
                    } ${collapsed ? 'justify-center px-0' : 'gap-3'}`
                  }
                >
                  <item.icon size={18} />
                  {!collapsed && <span className="text-xs uppercase tracking-tight">{item.label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* User Info & Logout */}
      <div className={`p-4 border-t border-[var(--border-color)] bg-slate-50 ${collapsed ? 'flex flex-col items-center gap-4' : ''}`}>
        <div className={`flex items-center gap-3 ${collapsed ? 'flex-col' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-brand-navy flex items-center justify-center text-white text-[10px] font-black border-2 border-brand-tosca shrink-0">
            {role === 'admin' ? 'AD' : 'RS'}
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-[11px] font-black text-brand-navy uppercase truncate" title={nama}>{nama}</p>
              <p className="text-[9px] text-brand-tosca font-bold uppercase">{kodeRs}</p>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          className={`mt-4 flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-rose-500 hover:bg-rose-50 transition-all font-black uppercase text-[10px] tracking-widest ${collapsed ? 'justify-center px-0' : ''}`}
        >
          <LogOut size={16} />
          {!collapsed && <span>Keluar</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
