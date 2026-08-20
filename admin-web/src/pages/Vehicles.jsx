import { useEffect, useState } from 'react';
import api from '../utils/api';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import VehicleTrackingModal from '../components/VehicleTrackingModal';
import { Search, Car, UserCheck, CheckCircle, XCircle, Clock, MapPin, PlusCircle, Trash2, Power } from 'lucide-react';

const emptyForm = {
  customerId: '', dealerId: '', imeiNumber: '', deviceSerialNumber: '', simNumber: '',
  vehicleNumber: '', vehicleType: 'car', vehicleBrand: '', vehicleModel: '', activationStatus: 'pending'
};

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const [customers, setCustomers] = useState([]);
  const [dealers, setDealers] = useState([]);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [trackingVehicle, setTrackingVehicle] = useState(null);

  useEffect(() => { fetchVehicles(); }, []);

  const fetchVehicles = async () => {
    try {
      const res = await api.get('/vehicles/all');
      setVehicles(res.data.vehicles || []);
      setFiltered(res.data.vehicles || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openCreate = async () => {
    setForm(emptyForm);
    setError('');
    setShowCreate(true);
    try {
      const [custRes, dealerRes] = await Promise.all([api.get('/users?role=customer'), api.get('/dealers/all')]);
      setCustomers(custRes.data.users || []);
      setDealers(dealerRes.data.dealers || []);
    } catch (err) { console.error(err); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/vehicles', { ...form, dealerId: form.dealerId || null });
      setShowCreate(false);
      fetchVehicles();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add device');
    } finally {
      setSaving(false);
    }
  };

  const toggleActivation = async (v) => {
    const next = v.activationStatus === 'activated' ? 'deactivated' : 'activated';
    try {
      await api.put(`/vehicles/${v.id}`, { activationStatus: next });
      fetchVehicles();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update device');
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/vehicles/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchVehicles();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete device');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    let data = vehicles;
    if (search) {
      data = data.filter(v =>
        v.imeiNumber?.includes(search) ||
        v.vehicleNumber?.toLowerCase().includes(search.toLowerCase()) ||
        v.customer?.name?.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      data = data.filter(v => v.activationStatus === statusFilter);
    }
    setFiltered(data);
  }, [search, statusFilter, vehicles]);

  const statusConfig = {
    activated: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Activated' },
    pending: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Pending' },
    in_progress: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50', label: 'In Progress' },
    deactivated: { icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50', label: 'Deactivated' }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-dark-800">Vehicles</h2>
          <p className="text-dark-500 mt-1">All GPS tracked vehicles across the platform</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-dark-500">Total: <span className="font-semibold text-dark-800">{filtered.length}</span></span>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <PlusCircle className="w-4 h-4" /> Add Device
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              type="text"
              placeholder="Search by IMEI, vehicle number or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-11"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field sm:w-48">
            <option value="all">All Status</option>
            <option value="activated">Activated</option>
            <option value="in_progress">In Progress</option>
            <option value="pending">Pending</option>
            <option value="deactivated">Deactivated</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filtered.map((v) => {
          const cfg = statusConfig[v.activationStatus] || statusConfig.pending;
          const StatusIcon = cfg.icon;
          return (
            <div key={v.id} className="card hover:shadow-lg transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 ${cfg.bg} rounded-2xl flex items-center justify-center`}>
                    <Car className={`w-7 h-7 ${cfg.color}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-dark-800">{v.vehicleNumber || 'Unnamed Vehicle'}</h3>
                    <p className="text-sm text-dark-500">{v.vehicleBrand} {v.vehicleModel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`badge ${v.activationStatus === 'activated' ? 'badge-green' : v.activationStatus === 'in_progress' ? 'badge-blue' : v.activationStatus === 'deactivated' ? 'badge-red' : 'badge-yellow'}`}>
                    {v.activationStatus}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-5">
                <div className="bg-dark-50 rounded-xl p-3">
                  <p className="text-xs text-dark-500 uppercase">IMEI</p>
                  <p className="font-mono text-sm font-semibold text-dark-800 mt-1">{v.imeiNumber}</p>
                </div>
                <div className="bg-dark-50 rounded-xl p-3">
                  <p className="text-xs text-dark-500 uppercase">Serial</p>
                  <p className="font-mono text-sm font-semibold text-dark-800 mt-1">{v.deviceSerialNumber}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-dark-100 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-500 flex items-center gap-2"><UserCheck className="w-4 h-4" /> Customer</span>
                  <span className="font-medium text-dark-800">{v.customer?.name} ({v.customer?.phone})</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-500 flex items-center gap-2"><MapPin className="w-4 h-4" /> Dealer</span>
                  <span className="font-medium text-dark-800">{v.dealer?.companyName || 'Direct'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-500 flex items-center gap-2"><Car className="w-4 h-4" /> Type</span>
                  <span className="font-medium text-dark-800 capitalize">{v.vehicleType}</span>
                </div>
                {v.activatedAt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-dark-500">Activated On</span>
                    <span className="font-medium text-dark-800">{new Date(v.activatedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t border-dark-100">
                <button
                  onClick={() => setTrackingVehicle(v)}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-2"
                >
                  <MapPin className="w-4 h-4" /> Track
                </button>
                <button
                  onClick={() => toggleActivation(v)}
                  className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm py-2"
                >
                  <Power className="w-4 h-4" /> {v.activationStatus === 'activated' ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => setDeleteTarget(v)}
                  className="px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center justify-center"
                  title="Delete device"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-dark-400">
          <Car className="w-16 h-16 mx-auto mb-4 text-dark-300" />
          <p className="text-lg">No vehicles found</p>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Device" subtitle="Register a new GPS device and assign it to a customer">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <div className="bg-rose-50 text-rose-700 text-sm px-4 py-3 rounded-xl border border-rose-200">{error}</div>}
          <div>
            <label className="text-sm font-medium text-dark-700 mb-1.5 block">Customer</label>
            <select required className="input-field" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
              <option value="">Select customer...</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-dark-700 mb-1.5 block">Dealer <span className="text-dark-400 font-normal">(optional)</span></label>
            <select className="input-field" value={form.dealerId} onChange={(e) => setForm({ ...form, dealerId: e.target.value })}>
              <option value="">Direct (no dealer)</option>
              {dealers.map((d) => <option key={d.id} value={d.id}>{d.companyName || d.user?.name} — {d.salesCode}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-dark-700 mb-1.5 block">IMEI Number</label>
              <input required className="input-field" value={form.imeiNumber} onChange={(e) => setForm({ ...form, imeiNumber: e.target.value })} placeholder="15-digit IMEI" />
            </div>
            <div>
              <label className="text-sm font-medium text-dark-700 mb-1.5 block">Serial Number</label>
              <input required className="input-field" value={form.deviceSerialNumber} onChange={(e) => setForm({ ...form, deviceSerialNumber: e.target.value })} placeholder="SN-0001" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-dark-700 mb-1.5 block">SIM Number <span className="text-dark-400 font-normal">(optional)</span></label>
              <input className="input-field" value={form.simNumber} onChange={(e) => setForm({ ...form, simNumber: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-dark-700 mb-1.5 block">Vehicle Number</label>
              <input className="input-field" value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })} placeholder="MH26AB1234" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-dark-700 mb-1.5 block">Vehicle Type</label>
              <select className="input-field" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>
                <option value="car">Car</option>
                <option value="bike">Bike</option>
                <option value="truck">Truck</option>
                <option value="bus">Bus</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-dark-700 mb-1.5 block">Brand</label>
              <input className="input-field" value={form.vehicleBrand} onChange={(e) => setForm({ ...form, vehicleBrand: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-dark-700 mb-1.5 block">Model</label>
              <input className="input-field" value={form.vehicleModel} onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-dark-700 mb-1.5 block">Activation Status</label>
            <select className="input-field" value={form.activationStatus} onChange={(e) => setForm({ ...form, activationStatus: e.target.value })}>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="activated">Activated</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Adding...' : 'Add Device'}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this device?"
        message={`Device ${deleteTarget?.imeiNumber} (${deleteTarget?.vehicleNumber || 'unnamed'}) and its activation history will be permanently removed.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      <VehicleTrackingModal
        open={!!trackingVehicle}
        vehicle={trackingVehicle}
        onClose={() => setTrackingVehicle(null)}
      />
    </div>
  );
}
