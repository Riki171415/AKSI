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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem' }}>
        <Shield size={64} color="var(--danger)" />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>AKSES DITOLAK</h2>
        <p style={{ color: 'var(--text-muted)' }}>Anda tidak memiliki hak akses administrator.</p>
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
        delete payload.password;
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
    <div>
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.25rem', fontStyle: 'italic', fontWeight: 900 }}>Manajemen User</h1>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Kelola Akun Akses Rumah Sakit & Admin</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserPlus size={16} /> Tambah User
        </button>
      </div>

      <div className="card table-responsive" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 700 }}>Memuat data user...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Instansi/User</th>
                <th>Username</th>
                <th>Role</th>
                <th>Kode RS</th>
                <th style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{u.nama || '-'}</td>
                  <td style={{ fontWeight: 500 }}>{u.username}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-danger' : ''}`} style={u.role !== 'admin' ? { backgroundColor: 'rgba(0, 177, 234, 0.1)', color: 'var(--primary)' } : {}}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{u.kodeRs}</td>
                  <td style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                    <button onClick={() => handleOpenModal(u)} style={{ padding: '0.5rem', color: '#0284c7', backgroundColor: '#f0f9ff' }}>
                      <Edit size={16} />
                    </button>
                    {u.username !== 'admin' && (
                      <button onClick={() => handleDelete(u.id)} style={{ padding: '0.5rem', color: '#e11d48', backgroundColor: '#ffe4e6' }}>
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: 0, overflow: 'hidden', margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid var(--border)', backgroundColor: '#f8fafc' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>{editingId ? 'Edit User' : 'Tambah User'}</h2>
              <button onClick={handleCloseModal} style={{ background: 'none', padding: 0, color: 'var(--text-muted)' }}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
              {error && <div style={{ padding: '0.75rem', borderRadius: '8px', backgroundColor: '#fef2f2', color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, marginBottom: '1rem' }}>{error}</div>}
              
              <div className="input-group">
                <label>Nama Instansi/User</label>
                <input required type="text" value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} placeholder="Contoh: RSUD Berkah" />
              </div>
              
              <div className="input-group">
                <label>Username Login</label>
                <input required type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} placeholder="Username unik" />
              </div>

              <div className="input-group">
                <label>Password {editingId && <span style={{ fontWeight: 'normal', color: 'var(--text-muted)' }}>(Kosongkan jika tidak diubah)</span>}</label>
                <input required={!editingId} type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Password rahasia" />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label>Role</label>
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--border)', borderRadius: '8px', fontWeight: 700 }}>
                    <option value="user">USER (RS)</option>
                    <option value="admin">ADMIN</option>
                  </select>
                </div>
                <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label>Kode RS</label>
                  <input required type="text" value={formData.kodeRs} onChange={e => setFormData({...formData, kodeRs: e.target.value})} placeholder="Misal: 3273015" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <button type="button" onClick={handleCloseModal} style={{ flex: 1, padding: '0.75rem', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#475569' }}>Batal</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                  <Save size={18} /> Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
