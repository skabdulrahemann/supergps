import { useEffect, useState } from 'react';
import api from '../utils/api';
import ConfirmDialog from '../components/ConfirmDialog';
import { Search, Activity, CheckCircle, Clock, AlertCircle, ChevronRight, X, Zap, RotateCcw } from 'lucide-react';

const STEPS = [
  { key: 'device_check', label: 'Device Check', desc: 'Physical inspection of GPS device' },
  { key: 'sim_insert', label: 'SIM Insert', desc: 'SIM card inserted properly' },
  { key: 'power_on', label: 'Power On', desc: 'Device powered on successfully' },
  { key: 'gps_signal', label: 'GPS Signal', desc: 'GPS signal acquired' },
  { key: 'server_connect', label: 'Server Connect', desc: 'Connected to SuperGPS server' },
  { key: 'completed', label: 'Completed', desc: 'Activation fully completed' },
];

export default function Activations() {
  const [vehicles, setVehicles] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [logs, setLogs] = useState([]);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => { fetchVehicles(); }, []);

  const fetchVehicles = async () => {
    try {
      const res = await api.get('/vehicles/all');
      const list = res.data.vehicles || [];
      setVehicles(list);
      setFiltered(list);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!search) { setFiltered(vehicles); return; }
    const term = search.toLowerCase();
    setFiltered(vehicles.filter(v =>
      v.imeiNumber?.includes(term) ||
      v.vehicleNumber?.toLowerCase().includes(term) ||
      v.customer?.name?.toLowerCase().includes(term)
    ));
  }, [search, vehicles]);

  const openLogs = async (vehicle) => {
    setSelectedVehicle(vehicle);
    try {
      const res = await api.get(`/activation/logs/${vehicle.id}`);
      setLogs(res.data.logs || []);
    } catch (err) { setLogs([]); }
  };

  const getProgress = (vehicle) => {
    if (vehicle.activationStatus === 'activated') return 100;
    if (vehicle.activationStatus === 'in_progress') return 50;
    return 0;
  };

  const confirmReset = async () => {
    setResetting(true);
    try {
      await api.delete(`/activation/${resetTarget.id}`);
      setResetTarget(null);
      fetchVehicles();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reset activation');
    } finally {
      setResetting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-dark-800">Activations</h2>
          <p className="text-dark-500 mt-1">Track GPS device activation progress</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-dark-600">{vehicles.filter(v => v.activationStatus === 'activated').length} Active</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-dark-600">{vehicles.filter(v => v.activationStatus === 'pending').length} Pending</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            type="text"
            placeholder="Search by IMEI, vehicle number or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-11"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((v) => {
          const progress = getProgress(v);
          return (
            <div key={v.id} className="card hover:shadow-lg transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${v.activationStatus === 'activated' ? 'bg-emerald-50' : v.activationStatus === 'in_progress' ? 'bg-blue-50' : 'bg-amber-50'}`}>
                    <Activity className={`w-6 h-6 ${v.activationStatus === 'activated' ? 'text-emerald-600' : v.activationStatus === 'in_progress' ? 'text-blue-600' : 'text-amber-600'}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-dark-800">{v.vehicleNumber || 'Unnamed'}</h3>
                    <p className="text-sm text-dark-500">{v.customer?.name} • IMEI: {v.imeiNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className={`badge ${v.activationStatus === 'activated' ? 'badge-green' : v.activationStatus === 'in_progress' ? 'badge-blue' : 'badge-yellow'}`}>
                      {v.activationStatus}
                    </span>
                  </div>
                  <button onClick={() => openLogs(v)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="View activation steps">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  {v.activationStatus !== 'pending' && (
                    <button onClick={() => setResetTarget(v)} className="p-2 text-dark-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Reset activation">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-dark-500 font-medium">Activation Progress</span>
                  <span className="text-xs font-bold text-dark-700">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-dark-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : progress > 0 ? 'bg-primary-500' : 'bg-amber-500'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-dark-400">
          <Zap className="w-16 h-16 mx-auto mb-4 text-dark-300" />
          <p className="text-lg">No activation records found</p>
        </div>
      )}

      {/* Activation Steps Modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedVehicle(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-dark-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-dark-800">Activation Steps</h3>
                  <p className="text-sm text-dark-500 mt-1">{selectedVehicle.vehicleNumber || 'Unnamed Vehicle'}</p>
                </div>
                <button onClick={() => setSelectedVehicle(null)} className="p-2 hover:bg-dark-100 rounded-lg">
                  <X className="w-5 h-5 text-dark-500" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {STEPS.map((step, i) => {
                  const log = logs.find(l => l.step === step.key);
                  const isDone = log?.status === 'done';
                  const isFailed = log?.status === 'failed';
                  const isPending = !log || log.status === 'pending';

                  return (
                    <div key={step.key} className="flex items-start gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isDone ? 'bg-emerald-500 text-white' : isFailed ? 'bg-rose-500 text-white' : 'bg-dark-100 text-dark-400'
                      }`}>
                        {isDone ? <CheckCircle className="w-4 h-4" /> : isFailed ? <AlertCircle className="w-4 h-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className={`font-semibold text-sm ${isDone ? 'text-emerald-700' : isFailed ? 'text-rose-700' : 'text-dark-700'}`}>
                            {step.label}
                          </p>
                          {log?.completedAt && (
                            <span className="text-xs text-dark-400">{new Date(log.completedAt).toLocaleTimeString()}</span>
                          )}
                        </div>
                        <p className="text-xs text-dark-500 mt-0.5">{step.desc}</p>
                        {log?.notes && (
                          <p className="text-xs text-dark-400 mt-1 bg-dark-50 p-2 rounded-lg">{log.notes}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!resetTarget}
        title="Reset this device's activation?"
        message={`All activation step history for ${resetTarget?.vehicleNumber || 'this device'} will be cleared and its status reset to Pending.`}
        confirmLabel="Reset"
        onConfirm={confirmReset}
        onCancel={() => setResetTarget(null)}
        loading={resetting}
      />
    </div>
  );
}