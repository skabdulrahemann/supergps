import { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import CreatedCredentials from '../components/CreatedCredentials';
import {
  Award,
  Building2,
  Copy,
  Download,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Store,
  Trash2,
  TrendingUp,
  UserPlus,
} from 'lucide-react';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  companyName: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
};

const csvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export default function Dealers() {
  const [dealers, setDealers] = useState([]);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [performanceFilter, setPerformanceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('orders');
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchDealers();
  }, []);

  const fetchDealers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dealers/all');
      setDealers(res.data.dealers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const dealerRows = useMemo(() => {
    return dealers.map((dealer) => {
      const orders = dealer.orders || [];
      const vehicles = dealer.vehicles || [];
      const activated = vehicles.filter((v) => v.activationStatus === 'activated').length;
      const inProgress = vehicles.filter((v) => v.activationStatus === 'in_progress').length;
      const pending = vehicles.filter((v) => v.activationStatus === 'pending').length;
      const activationRate = vehicles.length ? Math.round((activated / vehicles.length) * 100) : 0;
      const revenue = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
      const score = Math.min(100, Math.round(orders.length * 8 + activated * 12 + activationRate * 0.35));

      return {
        ...dealer,
        ordersCount: orders.length,
        vehiclesCount: vehicles.length,
        activated,
        inProgress,
        pending,
        activationRate,
        revenue,
        score,
      };
    });
  }, [dealers]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let data = dealerRows.filter((dealer) => {
      const matchesSearch =
        !term ||
        dealer.companyName?.toLowerCase().includes(term) ||
        dealer.salesCode?.toLowerCase().includes(term) ||
        dealer.user?.name?.toLowerCase().includes(term) ||
        dealer.user?.phone?.includes(term) ||
        dealer.city?.toLowerCase().includes(term);
      const matchesCity = cityFilter === 'all' || dealer.city === cityFilter;
      const matchesPerformance =
        performanceFilter === 'all' ||
        (performanceFilter === 'active' && dealer.vehiclesCount > 0) ||
        (performanceFilter === 'top' && dealer.activationRate >= 75 && dealer.vehiclesCount > 0) ||
        (performanceFilter === 'attention' && dealer.pending > 0) ||
        (performanceFilter === 'inactive' && dealer.ordersCount === 0 && dealer.vehiclesCount === 0);

      return matchesSearch && matchesCity && matchesPerformance;
    });

    data = [...data].sort((a, b) => {
      if (sortBy === 'activation') return b.activationRate - a.activationRate;
      if (sortBy === 'revenue') return b.revenue - a.revenue;
      if (sortBy === 'score') return b.score - a.score;
      if (sortBy === 'name') return (a.companyName || '').localeCompare(b.companyName || '');
      return b.ordersCount - a.ordersCount;
    });

    return data;
  }, [dealerRows, search, cityFilter, performanceFilter, sortBy]);

  const stats = useMemo(() => {
    const totalOrders = dealerRows.reduce((sum, dealer) => sum + dealer.ordersCount, 0);
    const totalVehicles = dealerRows.reduce((sum, dealer) => sum + dealer.vehiclesCount, 0);
    const activated = dealerRows.reduce((sum, dealer) => sum + dealer.activated, 0);
    const revenue = dealerRows.reduce((sum, dealer) => sum + dealer.revenue, 0);
    return {
      totalOrders,
      totalVehicles,
      activated,
      revenue,
      activationRate: totalVehicles ? Math.round((activated / totalVehicles) * 100) : 0,
      activeDealers: dealerRows.filter((dealer) => dealer.ordersCount || dealer.vehiclesCount).length,
    };
  }, [dealerRows]);

  const cities = useMemo(() => {
    return [...new Set(dealerRows.map((dealer) => dealer.city).filter(Boolean))].sort();
  }, [dealerRows]);

  const openCreate = () => {
    setForm(emptyForm);
    setError('');
    setCredentials(null);
    setShowCreate(true);
  };

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

  const copySalesCode = async (salesCode) => {
    if (!salesCode) return;
    await navigator.clipboard.writeText(salesCode);
    setCopiedCode(salesCode);
    setTimeout(() => setCopiedCode(''), 1400);
  };

  const exportCsv = () => {
    const rows = [
      ['Company', 'Owner', 'Sales Code', 'Phone', 'Email', 'City', 'Orders', 'Vehicles', 'Activated', 'Activation Rate', 'Revenue'],
      ...filtered.map((dealer) => [
        dealer.companyName || 'Unnamed Dealer',
        dealer.user?.name || '',
        dealer.salesCode || '',
        dealer.user?.phone || '',
        dealer.user?.email || '',
        dealer.city || '',
        dealer.ordersCount,
        dealer.vehiclesCount,
        dealer.activated,
        `${dealer.activationRate}%`,
        dealer.revenue,
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'supergps-dealers.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-500" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-dark-800 bg-dark-950 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-300">
              <ShieldCheck className="h-4 w-4" /> Dealer Network
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Business Partner Control</h2>
            <p className="mt-1 max-w-2xl text-sm text-dark-300">Monitor dealer reach, sales codes, activations, and service load from one operational view.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportCsv} className="btn-secondary flex items-center gap-2 bg-white/10 text-white hover:bg-white/15">
              <Download className="h-4 w-4" /> Export
            </button>
            <button onClick={openCreate} className="btn-primary flex items-center gap-2">
              <UserPlus className="h-4 w-4" /> Add Dealer
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <Metric label="Active Dealers" value={stats.activeDealers} icon={Store} />
        <Metric label="Orders" value={stats.totalOrders} icon={TrendingUp} />
        <Metric label="Vehicles" value={stats.totalVehicles} icon={Building2} />
        <Metric label="Activated" value={stats.activated} icon={ShieldCheck} />
        <Metric label="Activation Rate" value={`${stats.activationRate}%`} icon={Award} />
      </div>

      <div className="rounded-xl border border-dark-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_180px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-400" />
            <input
              type="text"
              placeholder="Search company, owner, phone, city or sales code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-11"
            />
          </div>
          <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="input-field">
            <option value="all">All Cities</option>
            {cities.map((city) => <option key={city} value={city}>{city}</option>)}
          </select>
          <select value={performanceFilter} onChange={(e) => setPerformanceFilter(e.target.value)} className="input-field">
            <option value="all">All Dealers</option>
            <option value="active">Active</option>
            <option value="top">Top Performers</option>
            <option value="attention">Pending Work</option>
            <option value="inactive">No Activity</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="input-field">
            <option value="orders">Sort by Orders</option>
            <option value="activation">Sort by Activation</option>
            <option value="revenue">Sort by Revenue</option>
            <option value="score">Sort by Score</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-dark-100 bg-white shadow-sm">
        <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr_120px_60px] gap-4 border-b border-dark-100 bg-dark-50 px-5 py-3 text-xs font-bold uppercase text-dark-500 max-xl:hidden">
          <span>Dealer</span>
          <span>Contact</span>
          <span>Location</span>
          <span>Performance</span>
          <span>Status</span>
          <span />
        </div>

        {filtered.map((dealer) => (
          <div key={dealer.id} className="grid gap-4 border-b border-dark-100 px-5 py-4 last:border-b-0 xl:grid-cols-[1.3fr_1fr_1fr_1fr_120px_60px] xl:items-center">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-100 text-dark-950">
                  <Store className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-black text-dark-900">{dealer.companyName || 'Unnamed Dealer'}</h3>
                  <button onClick={() => copySalesCode(dealer.salesCode)} className="mt-1 inline-flex items-center gap-1 rounded-md bg-dark-100 px-2 py-1 font-mono text-xs font-bold text-dark-700 hover:bg-primary-100">
                    {dealer.salesCode || 'NO-CODE'} <Copy className="h-3 w-3" />
                  </button>
                  {copiedCode === dealer.salesCode && <span className="ml-2 text-xs font-semibold text-emerald-600">Copied</span>}
                </div>
              </div>
            </div>

            <div className="space-y-1 text-sm text-dark-600">
              <p className="font-semibold text-dark-800">{dealer.user?.name || 'No owner name'}</p>
              <a href={dealer.user?.phone ? `tel:${dealer.user.phone}` : undefined} className="flex items-center gap-2 hover:text-dark-900">
                <Phone className="h-3.5 w-3.5" /> {dealer.user?.phone || 'No phone'}
              </a>
              <a href={dealer.user?.email ? `mailto:${dealer.user.email}` : undefined} className="flex items-center gap-2 truncate hover:text-dark-900">
                <Mail className="h-3.5 w-3.5" /> {dealer.user?.email || 'No email'}
              </a>
            </div>

            <div className="text-sm text-dark-600">
              <p className="flex items-center gap-2 font-semibold text-dark-800"><MapPin className="h-4 w-4" /> {dealer.city || 'City not set'}</p>
              <p className="mt-1 line-clamp-2">{[dealer.address, dealer.state, dealer.pincode].filter(Boolean).join(', ') || 'Address not set'}</p>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-dark-500">
                <span>{dealer.activated}/{dealer.vehiclesCount} activated</span>
                <span>{dealer.activationRate}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-dark-100">
                <div className="h-full rounded-full bg-primary-500" style={{ width: `${dealer.activationRate}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <MiniStat label="Orders" value={dealer.ordersCount} />
                <MiniStat label="Vehicles" value={dealer.vehiclesCount} />
                <MiniStat label="Pending" value={dealer.pending} tone={dealer.pending ? 'warn' : 'normal'} />
              </div>
            </div>

            <div>
              <span className={`badge ${dealer.score >= 70 ? 'badge-green' : dealer.pending ? 'badge-yellow' : dealer.ordersCount ? 'badge-blue' : 'badge-red'}`}>
                {dealer.score >= 70 ? 'Strong' : dealer.pending ? 'Pending' : dealer.ordersCount ? 'Active' : 'Idle'}
              </span>
            </div>

            <button
              onClick={() => setDeleteTarget(dealer)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-dark-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
              title="Delete dealer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-dark-200 bg-white py-16 text-center text-dark-400">
          <Store className="mx-auto mb-4 h-14 w-14 text-dark-300" />
          <p className="text-lg font-semibold">No dealers found</p>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Dealer" subtitle="Create a new dealer account">
        {credentials ? (
          <CreatedCredentials credentials={credentials} onDone={() => setShowCreate(false)} />
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark-700">Owner Name</label>
              <input required className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Suresh Patil" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-dark-700">Email</label>
                <input required type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="dealer@example.com" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-dark-700">Phone</label>
                <input required className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="9876543210" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark-700">Company Name</label>
              <input className="input-field" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="Patil GPS Motors" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark-700">Address</label>
              <input className="input-field" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Shop No. 4, Main Road" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <input className="input-field" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" />
              <input className="input-field" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="State" />
              <input className="input-field" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} placeholder="Pincode" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark-700">Password <span className="font-normal text-dark-400">(optional, auto-generated if blank)</span></label>
              <input type="text" className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" />
            </div>
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

function Metric({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-dark-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-dark-500">{label}</p>
          <p className="mt-1 text-2xl font-black text-dark-900">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-dark-950">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone = 'normal' }) {
  return (
    <div className={`rounded-lg px-2 py-2 ${tone === 'warn' ? 'bg-amber-50 text-amber-700' : 'bg-dark-50 text-dark-700'}`}>
      <p className="font-black">{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase">{label}</p>
    </div>
  );
}
