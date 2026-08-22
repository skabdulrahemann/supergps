import { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import VehicleTrackingModal from '../components/VehicleTrackingModal';
import {
  Car,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
  Gauge,
  MapPin,
  Pencil,
  PlusCircle,
  Power,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  UserCheck,
  XCircle,
} from 'lucide-react';

const emptyForm = {
  customerId: '',
  dealerId: '',
  activatedBy: '',
  imeiNumber: '',
  deviceSerialNumber: '',
  simNumber: '',
  vehicleNumber: '',
  vehicleType: 'car',
  vehicleBrand: '',
  vehicleModel: '',
  activationStatus: 'pending',
  isActive: true,
};

const statusConfig = {
  activated: { icon: CheckCircle, badge: 'badge-green', label: 'Activated' },
  pending: { icon: Clock, badge: 'badge-yellow', label: 'Pending' },
  in_progress: { icon: Clock, badge: 'badge-blue', label: 'In Progress' },
  deactivated: { icon: XCircle, badge: 'badge-red', label: 'Deactivated' },
};

const liveConfig = {
  moving: { badge: 'badge-green', label: 'Moving' },
  idle: { badge: 'badge-blue', label: 'Idle' },
  stopped: { badge: 'badge-red', label: 'Stopped' },
  offline: { badge: 'badge-yellow', label: 'Offline' },
  no_gps: { badge: 'badge-yellow', label: 'No GPS' },
};

const csvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [liveFilter, setLiveFilter] = useState('all');
  const [dealerFilter, setDealerFilter] = useState('all');
  const [sortBy, setSortBy] = useState('lastSeen');
  const [loading, setLoading] = useState(true);

  const [customers, setCustomers] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [technicians, setTechnicians] = useState([]);

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [trackingVehicle, setTrackingVehicle] = useState(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const res = await api.get('/vehicles/all');
      setVehicles(res.data.vehicles || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPeople = async () => {
    const [custRes, dealerRes, techRes] = await Promise.all([
      api.get('/users?role=customer'),
      api.get('/dealers/all'),
      api.get('/users?role=technician'),
    ]);
    setCustomers(custRes.data.users || []);
    setDealers(dealerRes.data.dealers || []);
    setTechnicians(techRes.data.users || []);
  };

  const openCreate = async () => {
    setForm(emptyForm);
    setError('');
    setShowCreate(true);
    try {
      await loadPeople();
    } catch (err) {
      console.error(err);
    }
  };

  const openEdit = async (vehicle) => {
    setEditTarget(vehicle);
    setError('');
    setForm({
      customerId: vehicle.customerId || '',
      dealerId: vehicle.dealerId || '',
      activatedBy: vehicle.activatedBy || '',
      imeiNumber: vehicle.imeiNumber || '',
      deviceSerialNumber: vehicle.deviceSerialNumber || '',
      simNumber: vehicle.simNumber || '',
      vehicleNumber: vehicle.vehicleNumber || '',
      vehicleType: vehicle.vehicleType || 'car',
      vehicleBrand: vehicle.vehicleBrand || '',
      vehicleModel: vehicle.vehicleModel || '',
      activationStatus: vehicle.activationStatus || 'pending',
      isActive: vehicle.isActive !== false,
    });
    try {
      await loadPeople();
    } catch (err) {
      console.error(err);
    }
  };

  const closeEdit = () => {
    if (saving) return;
    setEditTarget(null);
    setError('');
    setForm(emptyForm);
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

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    setError('');
    try {
      await api.put(`/vehicles/${editTarget.id}`, {
        ...form,
        dealerId: form.dealerId || null,
        activatedBy: form.activatedBy || null,
        simNumber: form.simNumber || null,
        vehicleNumber: form.vehicleNumber || null,
        vehicleBrand: form.vehicleBrand || null,
        vehicleModel: form.vehicleModel || null,
      });
      setEditTarget(null);
      fetchVehicles();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update device');
    } finally {
      setSaving(false);
    }
  };

  const toggleActivation = async (vehicle) => {
    const next = vehicle.activationStatus === 'activated' ? 'deactivated' : 'activated';
    try {
      await api.put(`/vehicles/${vehicle.id}`, { activationStatus: next });
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

  const enrichedVehicles = useMemo(() => {
    return vehicles.map((vehicle) => {
      const liveKey = getLiveKey(vehicle);
      const speed = Number(vehicle.speedKmh ?? vehicle.lastSpeedKmh ?? 0);
      const lastSeenMs = vehicle.lastSeenAt ? new Date(vehicle.lastSeenAt).getTime() : 0;
      return {
        ...vehicle,
        liveKey,
        speed,
        lastSeenMs: Number.isFinite(lastSeenMs) ? lastSeenMs : 0,
        hasLocation: hasLocation(vehicle),
      };
    });
  }, [vehicles]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let data = enrichedVehicles.filter((vehicle) => {
      const matchesSearch =
        !term ||
        vehicle.imeiNumber?.toLowerCase().includes(term) ||
        vehicle.deviceSerialNumber?.toLowerCase().includes(term) ||
        vehicle.vehicleNumber?.toLowerCase().includes(term) ||
        vehicle.customer?.name?.toLowerCase().includes(term) ||
        vehicle.customer?.phone?.includes(term) ||
        vehicle.dealer?.companyName?.toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || vehicle.activationStatus === statusFilter;
      const matchesLive = liveFilter === 'all' || vehicle.liveKey === liveFilter;
      const matchesDealer =
        dealerFilter === 'all' ||
        (dealerFilter === 'direct' && !vehicle.dealer?.companyName) ||
        vehicle.dealer?.companyName === dealerFilter;
      return matchesSearch && matchesStatus && matchesLive && matchesDealer;
    });

    data = [...data].sort((a, b) => {
      if (sortBy === 'speed') return b.speed - a.speed;
      if (sortBy === 'status') return (a.activationStatus || '').localeCompare(b.activationStatus || '');
      if (sortBy === 'vehicle') return (a.vehicleNumber || '').localeCompare(b.vehicleNumber || '');
      return b.lastSeenMs - a.lastSeenMs;
    });
    return data;
  }, [enrichedVehicles, search, statusFilter, liveFilter, dealerFilter, sortBy]);

  const stats = useMemo(() => {
    const activated = enrichedVehicles.filter((vehicle) => vehicle.activationStatus === 'activated').length;
    const moving = enrichedVehicles.filter((vehicle) => vehicle.liveKey === 'moving').length;
    const noGps = enrichedVehicles.filter((vehicle) => vehicle.liveKey === 'no_gps').length;
    const attention = enrichedVehicles.filter((vehicle) => vehicle.activationStatus !== 'activated' || vehicle.liveKey === 'offline' || vehicle.liveKey === 'no_gps').length;
    return {
      total: enrichedVehicles.length,
      activated,
      moving,
      noGps,
      attention,
      activationRate: enrichedVehicles.length ? Math.round((activated / enrichedVehicles.length) * 100) : 0,
    };
  }, [enrichedVehicles]);

  const dealerNames = useMemo(() => {
    return [...new Set(enrichedVehicles.map((vehicle) => vehicle.dealer?.companyName).filter(Boolean))].sort();
  }, [enrichedVehicles]);

  const exportCsv = () => {
    const rows = [
      ['Vehicle', 'IMEI', 'Serial', 'Customer', 'Dealer', 'Activation', 'Live', 'Speed', 'Last Seen', 'Location'],
      ...filtered.map((vehicle) => [
        vehicle.vehicleNumber || '',
        vehicle.imeiNumber || '',
        vehicle.deviceSerialNumber || '',
        vehicle.customer?.name || '',
        vehicle.dealer?.companyName || 'Direct',
        vehicle.activationStatus || '',
        liveConfig[vehicle.liveKey]?.label || '',
        `${Math.round(vehicle.speed || 0)} km/h`,
        vehicle.lastSeen || vehicle.lastSeenAt || '',
        getLocationText(vehicle),
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'supergps-vehicles.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-500" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-dark-800 bg-dark-950 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-300">
              <Radio className="h-4 w-4" /> Fleet Operations
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Vehicle Command Center</h2>
            <p className="mt-1 max-w-2xl text-sm text-dark-300">Control activation, live GPS health, customer ownership, and dealer assignments from one focused view.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={fetchVehicles} className="btn-secondary flex items-center gap-2 bg-white/10 text-white hover:bg-white/15">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button onClick={exportCsv} className="btn-secondary flex items-center gap-2 bg-white/10 text-white hover:bg-white/15">
              <Download className="h-4 w-4" /> Export
            </button>
            <button onClick={openCreate} className="btn-primary flex items-center gap-2">
              <PlusCircle className="h-4 w-4" /> Add Device
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <Metric label="Total Fleet" value={stats.total} icon={Car} />
        <Metric label="Activated" value={stats.activated} icon={CheckCircle} />
        <Metric label="Moving Now" value={stats.moving} icon={Gauge} />
        <Metric label="No GPS" value={stats.noGps} icon={MapPin} />
        <Metric label="Attention" value={stats.attention} icon={ShieldAlert} tone="warn" />
      </div>

      <div className="rounded-xl border border-dark-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[1fr_160px_160px_190px_160px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-400" />
            <input
              type="text"
              placeholder="Search vehicle, IMEI, serial, customer or dealer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-11"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field">
            <option value="all">All Activation</option>
            <option value="activated">Activated</option>
            <option value="in_progress">In Progress</option>
            <option value="pending">Pending</option>
            <option value="deactivated">Deactivated</option>
          </select>
          <select value={liveFilter} onChange={(e) => setLiveFilter(e.target.value)} className="input-field">
            <option value="all">All Live</option>
            <option value="moving">Moving</option>
            <option value="idle">Idle</option>
            <option value="stopped">Stopped</option>
            <option value="offline">Offline</option>
            <option value="no_gps">No GPS</option>
          </select>
          <select value={dealerFilter} onChange={(e) => setDealerFilter(e.target.value)} className="input-field">
            <option value="all">All Dealers</option>
            <option value="direct">Direct</option>
            {dealerNames.map((dealer) => <option key={dealer} value={dealer}>{dealer}</option>)}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="input-field">
            <option value="lastSeen">Latest GPS</option>
            <option value="speed">Highest Speed</option>
            <option value="status">Activation Status</option>
            <option value="vehicle">Vehicle Number</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-dark-100 bg-white shadow-sm">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_160px_170px] gap-4 border-b border-dark-100 bg-dark-50 px-5 py-3 text-xs font-bold uppercase text-dark-500 max-2xl:hidden">
          <span>Vehicle</span>
          <span>Device</span>
          <span>Owner</span>
          <span>Live Health</span>
          <span>Location</span>
          <span>Actions</span>
        </div>

        {filtered.map((vehicle) => {
          const activation = statusConfig[vehicle.activationStatus] || statusConfig.pending;
          const live = liveConfig[vehicle.liveKey] || liveConfig.offline;
          const StatusIcon = activation.icon;
          const location = getLocationText(vehicle);
          return (
            <div key={vehicle.id} className="grid gap-4 border-b border-dark-100 px-5 py-4 last:border-b-0 2xl:grid-cols-[1.2fr_1fr_1fr_1fr_160px_170px] 2xl:items-center">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-100 text-dark-950">
                    <Car className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-black text-dark-900">{vehicle.vehicleNumber || 'Unnamed Vehicle'}</h3>
                    <p className="truncate text-sm text-dark-500">{[vehicle.vehicleBrand, vehicle.vehicleModel, vehicle.vehicleType].filter(Boolean).join(' ') || 'Vehicle details pending'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm 2xl:block 2xl:space-y-1">
                <DeviceLine label="IMEI" value={vehicle.imeiNumber} />
                <DeviceLine label="Serial" value={vehicle.deviceSerialNumber} />
                {vehicle.simNumber && <DeviceLine label="SIM" value={vehicle.simNumber} />}
              </div>

              <div className="space-y-1 text-sm text-dark-600">
                <p className="flex items-center gap-2 font-semibold text-dark-800">
                  <UserCheck className="h-4 w-4" /> {vehicle.customer?.name || 'No customer'}
                </p>
                <p>{vehicle.customer?.phone || 'Phone not set'}</p>
                <p className="text-xs font-semibold text-dark-500">{vehicle.dealer?.companyName || 'Direct assignment'}</p>
              </div>

              <div>
                <div className="flex flex-wrap gap-2">
                  <span className={`badge ${activation.badge} inline-flex items-center gap-1`}>
                    <StatusIcon className="h-3 w-3" /> {activation.label}
                  </span>
                  <span className={`badge ${live.badge}`}>{live.label}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <MiniValue label="Speed" value={`${Math.round(vehicle.speed || 0)} km/h`} />
                  <MiniValue label="Last Seen" value={vehicle.lastSeen || (vehicle.lastSeenAt ? new Date(vehicle.lastSeenAt).toLocaleString() : 'No GPS')} />
                </div>
              </div>

              <div className="text-sm">
                <p className="line-clamp-2 font-semibold text-dark-800">{location}</p>
                {vehicle.hasLocation && (
                  <a
                    href={`https://www.google.com/maps?q=${vehicle.lastLatitude},${vehicle.lastLongitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-dark-600 hover:text-dark-950"
                  >
                    Open Map <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button onClick={() => setTrackingVehicle(vehicle)} className="btn-primary flex items-center gap-2 px-3 py-2 text-sm">
                  <MapPin className="h-4 w-4" /> Track
                </button>
                <button onClick={() => toggleActivation(vehicle)} className="btn-secondary flex items-center gap-2 px-3 py-2 text-sm">
                  <Power className="h-4 w-4" /> {vehicle.activationStatus === 'activated' ? 'Off' : 'On'}
                </button>
                <button onClick={() => openEdit(vehicle)} className="btn-secondary flex items-center gap-2 px-3 py-2 text-sm">
                  <Pencil className="h-4 w-4" /> Edit
                </button>
                <button
                  onClick={() => setDeleteTarget(vehicle)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-dark-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                  title="Delete device"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-dark-200 bg-white py-16 text-center text-dark-400">
          <Car className="mx-auto mb-4 h-14 w-14 text-dark-300" />
          <p className="text-lg font-semibold">No vehicles found</p>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Device" subtitle="Register a new GPS device and assign it to a customer">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-dark-700">Customer</label>
            <select required className="input-field" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
              <option value="">Select customer...</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} - {customer.phone}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-dark-700">Dealer <span className="font-normal text-dark-400">(optional)</span></label>
            <select className="input-field" value={form.dealerId} onChange={(e) => setForm({ ...form, dealerId: e.target.value })}>
              <option value="">Direct (no dealer)</option>
              {dealers.map((dealer) => <option key={dealer.id} value={dealer.id}>{dealer.companyName || dealer.user?.name} - {dealer.salesCode}</option>)}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark-700">IMEI Number</label>
              <input required className="input-field" value={form.imeiNumber} onChange={(e) => setForm({ ...form, imeiNumber: e.target.value })} placeholder="15-digit IMEI" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark-700">Serial Number</label>
              <input required className="input-field" value={form.deviceSerialNumber} onChange={(e) => setForm({ ...form, deviceSerialNumber: e.target.value })} placeholder="SN-0001" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark-700">SIM Number <span className="font-normal text-dark-400">(optional)</span></label>
              <input className="input-field" value={form.simNumber} onChange={(e) => setForm({ ...form, simNumber: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark-700">Vehicle Number</label>
              <input className="input-field" value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })} placeholder="MH26AB1234" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark-700">Vehicle Type</label>
              <select className="input-field" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>
                <option value="car">Car</option>
                <option value="bike">Bike</option>
                <option value="truck">Truck</option>
                <option value="bus">Bus</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark-700">Brand</label>
              <input className="input-field" value={form.vehicleBrand} onChange={(e) => setForm({ ...form, vehicleBrand: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark-700">Model</label>
              <input className="input-field" value={form.vehicleModel} onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-dark-700">Activation Status</label>
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

      <Modal
        open={!!editTarget}
        onClose={closeEdit}
        title="Edit Device"
        subtitle={editTarget ? `${editTarget.vehicleNumber || 'Unnamed vehicle'} - ${editTarget.imeiNumber}` : ''}
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark-700">Customer</label>
              <select required className="input-field" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                <option value="">Select customer...</option>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} - {customer.phone}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark-700">Dealer</label>
              <select className="input-field" value={form.dealerId} onChange={(e) => setForm({ ...form, dealerId: e.target.value })}>
                <option value="">Direct (no dealer)</option>
                {dealers.map((dealer) => <option key={dealer.id} value={dealer.id}>{dealer.companyName || dealer.user?.name} - {dealer.salesCode}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-dark-700">Technician</label>
            <select className="input-field" value={form.activatedBy} onChange={(e) => setForm({ ...form, activatedBy: e.target.value })}>
              <option value="">No technician assigned</option>
              {technicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.name} - {technician.phone}</option>)}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark-700">IMEI Number</label>
              <input required className="input-field" value={form.imeiNumber} onChange={(e) => setForm({ ...form, imeiNumber: e.target.value })} placeholder="15-digit IMEI" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark-700">Serial Number</label>
              <input required className="input-field" value={form.deviceSerialNumber} onChange={(e) => setForm({ ...form, deviceSerialNumber: e.target.value })} placeholder="SN-0001" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark-700">SIM Number</label>
              <input className="input-field" value={form.simNumber} onChange={(e) => setForm({ ...form, simNumber: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark-700">Vehicle Number</label>
              <input className="input-field" value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })} placeholder="MH26AB1234" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark-700">Vehicle Type</label>
              <select className="input-field" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>
                <option value="car">Car</option>
                <option value="bike">Bike</option>
                <option value="truck">Truck</option>
                <option value="bus">Bus</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark-700">Brand</label>
              <input className="input-field" value={form.vehicleBrand} onChange={(e) => setForm({ ...form, vehicleBrand: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark-700">Model</label>
              <input className="input-field" value={form.vehicleModel} onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark-700">Activation Status</label>
              <select className="input-field" value={form.activationStatus} onChange={(e) => setForm({ ...form, activationStatus: e.target.value })}>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="activated">Activated</option>
                <option value="deactivated">Deactivated</option>
              </select>
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-dark-200 bg-dark-50 px-4 py-3 text-sm font-semibold text-dark-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-dark-300 text-primary-500 focus:ring-primary-500"
              />
              Active device
            </label>
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Saving...' : 'Save Changes'}
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

function getLiveKey(vehicle) {
  if (!vehicle.lastSeenAt && !vehicle.lastLocation && !hasLocation(vehicle)) return 'no_gps';
  if (vehicle.liveStatus === 'moving') return 'moving';
  if (vehicle.liveStatus === 'idle') return 'idle';
  if (vehicle.liveStatus === 'stopped') return 'stopped';
  return 'offline';
}

function hasLocation(vehicle) {
  return vehicle.lastLatitude !== null && vehicle.lastLatitude !== undefined && vehicle.lastLongitude !== null && vehicle.lastLongitude !== undefined;
}

function getLocationText(vehicle) {
  if (vehicle.lastLocation) return vehicle.lastLocation;
  if (hasLocation(vehicle)) return `${Number(vehicle.lastLatitude).toFixed(6)}, ${Number(vehicle.lastLongitude).toFixed(6)}`;
  return 'Waiting for first GPS fix';
}

function Metric({ label, value, icon: Icon, tone = 'normal' }) {
  return (
    <div className="rounded-xl border border-dark-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-dark-500">{label}</p>
          <p className={`mt-1 text-2xl font-black ${tone === 'warn' ? 'text-amber-700' : 'text-dark-900'}`}>{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone === 'warn' ? 'bg-amber-50 text-amber-700' : 'bg-primary-100 text-dark-950'}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function MiniValue({ label, value }) {
  return (
    <div className="rounded-lg bg-dark-50 px-2 py-2">
      <p className="text-[10px] font-bold uppercase text-dark-500">{label}</p>
      <p className="mt-0.5 truncate font-semibold text-dark-800">{value}</p>
    </div>
  );
}

function DeviceLine({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase text-dark-400">{label}</p>
      <p className="truncate font-mono text-xs font-bold text-dark-800">{value || 'Not set'}</p>
    </div>
  );
}
