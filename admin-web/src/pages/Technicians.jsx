import { useEffect, useState } from 'react';
import api from '../utils/api';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import CreatedCredentials from '../components/CreatedCredentials';
import { Search, Phone, Mail, Wrench, UserPlus, Trash2 } from 'lucide-react';

const emptyForm = { name: '', email: '', phone: '', password: '' };

export default function Technicians() {
  const [technicians, setTechnicians] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchTechnicians(); }, []);

  const fetchTechnicians = async () => {
    try {
      const res = await api.get('/users?role=technician');
      setTechnicians(res.data.users || []);
      setFiltered(res.data.users || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!search) { setFiltered(technicians); return; }
    const term = search.toLowerCase();
    setFiltered(technicians.filter(t =>
      t.name?.toLowerCase().includes(term) ||
      t.phone?.includes(term) ||
      t.email?.toLowerCase().includes(term)
    ));
  }, [search, technicians]);

  const openCreate = () => { setForm(emptyForm); setError(''); setCredentials(null); setShowCreate(true); };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/users', { ...form, role: 'technician' });
      setCredentials({ email: res.data.user.email, password: res.data.generatedPassword || form.password });
      fetchTechnicians();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create technician');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchTechnicians();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete technician');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-dark-800">Technicians</h2>
          <p className="text-dark-500 mt-1">Field staff who perform device activations</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-dark-500">Total: <span className="font-semibold text-dark-800">{filtered.length}</span></span>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Add Technician
          </button>
        </div>
      </div>

      <div className="card">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            type="text"
            placeholder="Search by name, phone or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-11"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((t) => (
          <div key={t.id} className="card hover:shadow-lg transition-all duration-300 group relative">
            <button
              onClick={() => setDeleteTarget(t)}
              className="absolute top-5 right-5 p-2 text-dark-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Delete technician"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center group-hover:bg-amber-500 group-hover:shadow-lg group-hover:shadow-amber-500/30 transition-all">
              <Wrench className="w-7 h-7 text-amber-600 group-hover:text-white transition-colors" />
            </div>
            <h3 className="font-bold text-dark-800 text-lg mt-4">{t.name}</h3>
            <span className={`badge mt-1 inline-block ${t.isActive ? 'badge-green' : 'badge-red'}`}>{t.isActive ? 'Active' : 'Inactive'}</span>

            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-dark-600">
                <Phone className="w-4 h-4 text-dark-400" />
                <span>{t.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-dark-600">
                <Mail className="w-4 h-4 text-dark-400" />
                <span>{t.email}</span>
              </div>
            </div>
            <p className="text-xs text-dark-400 mt-4 pt-4 border-t border-dark-100">Joined {new Date(t.createdAt).toLocaleDateString()}</p>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-dark-400">
          <Wrench className="w-16 h-16 mx-auto mb-4 text-dark-300" />
          <p className="text-lg">No technicians found</p>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Technician" subtitle="Create a new technician account">
        {credentials ? (
          <CreatedCredentials credentials={credentials} onDone={() => setShowCreate(false)} />
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            {error && <div className="bg-rose-50 text-rose-700 text-sm px-4 py-3 rounded-xl border border-rose-200">{error}</div>}
            <div>
              <label className="text-sm font-medium text-dark-700 mb-1.5 block">Full Name</label>
              <input required className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Iqbal Shaikh" />
            </div>
            <div>
              <label className="text-sm font-medium text-dark-700 mb-1.5 block">Email</label>
              <input required type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="tech@example.com" />
            </div>
            <div>
              <label className="text-sm font-medium text-dark-700 mb-1.5 block">Phone</label>
              <input required className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="9876543210" />
            </div>
            <div>
              <label className="text-sm font-medium text-dark-700 mb-1.5 block">Password <span className="text-dark-400 font-normal">(optional — auto-generated if left blank)</span></label>
              <input type="text" className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" />
            </div>
            <button type="submit" disabled={saving} className="btn-primary w-full">
              {saving ? 'Creating...' : 'Create Technician'}
            </button>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this technician?"
        message={`${deleteTarget?.name}'s account will be permanently removed. Their past activation records are kept but unlinked from them.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
