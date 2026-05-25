import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, UserPlus, Edit, Trash2, Shield, X, Save } from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nama: '',
    kodeRs: '',
    role: 'user'
  });

  const role = localStorage.getItem('role');

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (err) {
      setError('Gagal mengambil data user.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === 'admin') fetchUsers();
  }, [role]);

  if (role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <Shield size={64} className="text-rose-500" />
        <h2 className="text-2xl font-black text-slate-800">AKSES DITOLAK</h2>
        <p className="text-slate-500">Anda tidak memiliki hak akses administrator.</p>
      </div>
    );
  }

  const handleOpenModal = (user = null) => {
    setError('');
    if (user) {
      setEditingId(user.id);
      setFormData({
        username: user.username,
        password: '',
        nama: user.nama || '',
        kodeRs: user.kodeRs,
        role: user.role
      });
    } else {
      setEditingId(null);
      setFormData({
        username: '',
        password: '',
        nama: '',
        kodeRs: '',
        role: 'user'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const payload = { ...formData };
      if (editingId && !payload.password) {
        delete payload.password; // Don't send empty password if not changing
      }

      if (editingId) {
        await axios.put(`http://localhost:5000/api/users/${editingId}`, payload, { headers });
      } else {
        await axios.post('http://localhost:5000/api/users', payload, { headers });
      }
      
      handleCloseModal();
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan user.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus user ini?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchUsers();
    } catch (err) {
      alert('Gagal menghapus user');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-brand-navy uppercase italic">Manajemen <span className="text-brand-tosca">User</span></h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Kelola Akun Akses Rumah Sakit & Admin</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary flex items-center gap-2">
          <UserPlus size={16} /> Tambah User
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-bold animate-pulse">Memuat data user...</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-black">
              <tr>
                <th className="p-4">No</th>
                <th className="p-4">Nama Instansi/User</th>
                <th className="p-4">Username</th>
                <th className="p-4">Role</th>
                <th className="p-4">Kode RS</th>
                <th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u, i) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-bold text-slate-400">{i + 1}</td>
                  <td className="p-4 font-bold text-brand-navy">{u.nama || '-'}</td>
                  <td className="p-4 font-medium">{u.username}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${u.role === 'admin' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-bold text-slate-600">{u.kodeRs}</td>
                  <td className="p-4 flex justify-center gap-2">
                    <button onClick={() => handleOpenModal(u)} className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors">
                      <Edit size={16} />
                    </button>
                    {u.username !== 'admin' && (
                      <button onClick={() => handleDelete(u.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-xl font-black text-brand-navy uppercase">{editingId ? 'Edit User' : 'Tambah User Baru'}</h2>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-rose-500 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold">{error}</div>}
              
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Nama Instansi/User</label>
                <input required type="text" value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-tosca focus:ring-2 focus:ring-brand-tosca/20 outline-none transition-all" placeholder="Contoh: RSUD Berkah" />
              </div>
              
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Username Login</label>
                <input required type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-tosca focus:ring-2 focus:ring-brand-tosca/20 outline-none transition-all" placeholder="Username unik" />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">
                  Password {editingId && <span className="text-slate-400 normal-case font-medium">(Kosongkan jika tidak diubah)</span>}
                </label>
                <input required={!editingId} type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-tosca focus:ring-2 focus:ring-brand-tosca/20 outline-none transition-all" placeholder="Password rahasia" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Role Akses</label>
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-tosca focus:ring-2 focus:ring-brand-tosca/20 outline-none transition-all font-bold">
                    <option value="user">USER (RS)</option>
                    <option value="admin">ADMIN</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Kode RS (Kemkes)</label>
                  <input required type="text" value={formData.kodeRs} onChange={e => setFormData({...formData, kodeRs: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-tosca focus:ring-2 focus:ring-brand-tosca/20 outline-none transition-all font-mono" placeholder="Misal: 3273015" />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Batal</button>
                <button type="submit" className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-brand-tosca hover:bg-teal-600 shadow-lg shadow-teal-500/30 transition-all flex justify-center items-center gap-2">
                  <Save size={18} /> Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
