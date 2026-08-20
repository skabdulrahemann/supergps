import { useEffect, useState } from 'react';
import api from '../utils/api';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import CreatedCredentials from '../components/CreatedCredentials';
import { Search, MapPin, Phone, Mail, Store, UserPlus, Trash2 } from 'lucide-react';

const emptyForm = { name: '', email: '', phone: '', password: '', companyName: '', address: '', city: '', state: '', pincode: '' };

export default function Dealers() {
  const [dealers, setDealers] = useState([]);
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

  useEffect(() => { fetchDealers(); }, []);

  const fetchDealers = async () => {
    try {
      const res = await api.get('/dealers/all');
      setDealers(res.data.dealers || []);
      setFiltered(res.data.dealers || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!search) { setFiltered(dealers); return; }
    const term = search.toLowerCase();
    setFiltered(dealers.filter(d =>
      d.companyName?.toLowerCase().includes(term) ||
      d.salesCode?.toLowerCase().includes(term) ||
      d.user?.name?.toLowerCase().includes(term) ||
      d.user?.phone?.includes(term)
    ));
  }, [search, dealers]);

  const openCreate = () => { setForm(emptyForm); setError(''); setCredentials(null); setShowCreate(true); };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/users', { ...form, role: 'dealer' });
      setCredentials({ email: res.data.user.email, password: res.data.generatedPassword || form.password });
      fetchDealers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create dealer');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/dealers/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchDealers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete dealer');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-dark-800">Dealers</h2>
          <p className="text-dark-500 mt-1">Manage all registered dealers and their performance</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-dark-500">Total: <span className="font-semibold text-dark-800">{filtered.length}</span></span>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Add Dealer
          </button>
        </div>
      </div>

      <div className="card">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            type="text"
            placeholder="Search by company, sales code, name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-11"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((dealer) => (
          <div key={dealer.id} className="card hover:shadow-lg transition-all duration-300 group relative">
            <button
              onClick={() => setDeleteTarget(dealer)}
              className="absolute top-5 right-5 p-2 text-dark-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Delete dealer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center group-hover:bg-primary-600 group-hover:shadow-lg group-hover:shadow-primary-600/30 transition-all">
                <Store className="w-7 h-7 text-primary-600 group-hover:text-white transition-colors" />
              </div>
              <span className="badge badge-blue font-mono text-xs">{dealer.salesCode}</span>
            </div>

            <h3 className="font-bold text-dark-800 text-lg">{dealer.companyName || 'Unnamed Dealer'}</h3>
            <p className="text-dark-500 text-sm mt-1">{dealer.user?.name}</p>

            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-dark-600">
                <Phone className="w-4 h-4 text-dark-400" />
                <span>{dealer.user?.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-dark-600">
                <Mail className="w-4 h-4 text-dark-400" />
                <span>{dealer.user?.email}</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-dark-600">
                <MapPin className="w-4 h-4 text-dark-400 mt-0.5" />
                <span>{dealer.address}, {dealer.city}, {dealer.state} - {dealer.pincode}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-dark-100">
              <div className="text-center">
                <p className="text-2xl font-bold text-dark-800">{dealer.orders?.length || 0}</p>
                <p className="text-xs text-dark-500 mt-0.5">Orders</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-dark-800">{dealer.vehicles?.length || 0}</p>
                <p className="text-xs text-dark-500 mt-0.5">Vehicles</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-dark-400">
          <Store className="w-16 h-16 mx-auto mb-4 text-dark-300" />
          <p className="text-lg">No dealers found</p>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Dealer" subtitle="Create a new dealer account">
        {credentials ? (
          <CreatedCredentials credentials={credentials} onDone={() => setShowCreate(false)} />
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            {error && <div className="bg-rose-50 text-rose-700 text-sm px-4 py-3 rounded-xl border border-rose-200">{error}</div>}
            <div>
              <label className="text-sm font-medium text-dark-700 mb-1.5 block">Owner Name</label>
              <input required className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Suresh Patil" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-dark-700 mb-1.5 block">Email</label>
                <input required type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="dealer@example.com" />
              </div>
              <div>
                <label className="text-sm font-medium text-dark-700 mb-1.5 block">Phone</label>
                <input required className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="9876543210" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-dark-700 mb-1.5 block">Company Name</label>
              <input className="input-field" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="Patil GPS Motors" />
            </div>
            <div>
              <label className="text-sm font-medium text-dark-700 mb-1.5 block">Address</label>
              <input className="input-field" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Shop No. 4, Main Road" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-dark-700 mb-1.5 block">City</label>
                <input className="input-field" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Nanded" />
              </div>
              <div>
                <label className="text-sm font-medium text-dark-700 mb-1.5 block">State</label>
                <input className="input-field" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="Maharashtra" />
              </div>
              <div>
                <label className="text-sm font-medium text-dark-700 mb-1.5 block">Pincode</label>
                <input className="input-field" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} placeholder="431601" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-dark-700 mb-1.5 block">Password <span className="text-dark-400 font-normal">(optional — auto-generated if left blank)</span></label>
              <input type="text" className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" />
            </div>
            <p className="text-xs text-dark-400">A unique sales code (e.g. DLR-XXXXXX) is generated automatically for this dealer.</p>
            <button type="submit" disabled={saving} className="btn-primary w-full">
              {saving ? 'Creating...' : 'Create Dealer'}
            </button>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this dealer?"
        message={`${deleteTarget?.companyName || deleteTarget?.user?.name}'s dealer account will be removed. Their customers' orders and vehicles will be kept but unlinked from this dealer.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
