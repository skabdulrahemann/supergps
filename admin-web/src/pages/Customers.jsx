import { useEffect, useState } from 'react';
import api from '../utils/api';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import CreatedCredentials from '../components/CreatedCredentials';
import { Search, Phone, ShoppingCart, Car, User, UserPlus, Trash2 } from 'lucide-react';

const emptyForm = { name: '', email: '', phone: '', password: '' };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState(null); // { email, password } shown once after creation

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    try {
      const [usersRes, vehiclesRes] = await Promise.all([
        api.get('/users?role=customer'),
        api.get('/vehicles/all'),
      ]);
      const users = usersRes.data.users || [];
      const vehicles = vehiclesRes.data.vehicles || [];

      // Order counts still come from the orders list so "Orders" reflects real purchase history.
      const ordersRes = await api.get('/orders/all');
      const orders = ordersRes.data.orders || [];

      const list = users.map((u) => ({
        ...u,
        orders: orders.filter((o) => o.customer?.id === u.id),
        vehicles: vehicles.filter((v) => v.customer?.id === u.id || v.customerId === u.id),
      }));

      setCustomers(list);
      setFiltered(list);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!search) { setFiltered(customers); return; }
    const term = search.toLowerCase();
    setFiltered(customers.filter(c =>
      c.name?.toLowerCase().includes(term) ||
      c.phone?.includes(term) ||
      c.email?.toLowerCase().includes(term)
    ));
  }, [search, customers]);

  const openCreate = () => { setForm(emptyForm); setError(''); setCredentials(null); setShowCreate(true); };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/users', { ...form, role: 'customer' });
      setCredentials({ email: res.data.user.email, password: res.data.generatedPassword || form.password });
      fetchCustomers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create customer');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchCustomers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete customer');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-dark-800">Customers</h2>
          <p className="text-dark-500 mt-1">All registered customers</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-dark-500">Total: <span className="font-semibold text-dark-800">{filtered.length}</span></span>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Add Customer
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

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-dark-50 border-b border-dark-100">
                <th className="table-header">Customer</th>
                <th className="table-header">Contact</th>
                <th className="table-header">Orders</th>
                <th className="table-header">Vehicles</th>
                <th className="table-header">Total Spent</th>
                <th className="table-header">Joined</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const totalSpent = c.orders.reduce((sum, o) => sum + parseFloat(o.totalAmount || 0), 0);
                return (
                  <tr key={c.id} className="border-b border-dark-50 hover:bg-dark-50/50 transition-colors">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 font-bold text-sm">{c.name?.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-dark-800">{c.name}</p>
                          <p className="text-xs text-dark-400">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2 text-sm text-dark-600">
                        <Phone className="w-4 h-4 text-dark-400" />
                        {c.phone}
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-semibold">
                        <ShoppingCart className="w-3 h-3" />
                        {c.orders.length}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">
                        <Car className="w-3 h-3" />
                        {c.vehicles.length}
                      </span>
                    </td>
                    <td className="table-cell font-semibold text-dark-800">₹{totalSpent.toLocaleString()}</td>
                    <td className="table-cell text-dark-400">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="table-cell text-right">
                      <button
                        onClick={() => setDeleteTarget(c)}
                        className="p-2 text-dark-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete customer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-dark-400">
            <User className="w-12 h-12 mx-auto mb-3 text-dark-300" />
            <p>No customers found</p>
          </div>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Customer" subtitle="Create a new customer account">
        {credentials ? (
          <CreatedCredentials credentials={credentials} onDone={() => setShowCreate(false)} />
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            {error && <div className="bg-rose-50 text-rose-700 text-sm px-4 py-3 rounded-xl border border-rose-200">{error}</div>}
            <div>
              <label className="text-sm font-medium text-dark-700 mb-1.5 block">Full Name</label>
              <input required className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ramesh Kumar" />
            </div>
            <div>
              <label className="text-sm font-medium text-dark-700 mb-1.5 block">Email</label>
              <input required type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ramesh@example.com" />
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
              {saving ? 'Creating...' : 'Create Customer'}
            </button>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this customer?"
        message={`${deleteTarget?.name}'s account, orders, vehicles and activation history will be permanently removed. This cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
