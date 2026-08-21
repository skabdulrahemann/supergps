import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Activity, Clock, Gauge, Navigation, Power, Radio, Satellite } from 'lucide-react';
import Modal from './Modal';
import api from '../utils/api';
import { createTrackingSocket } from '../utils/socket';

function formatDateTime(value) {
  if (!value) return 'Not received yet';
  return new Date(value).toLocaleString();
}

function formatSpeed(value) {
  if (value === null || value === undefined) return '0 km/h';
  return `${Math.round(Number(value))} km/h`;
}

function RecenterMap({ position }) {
  const map = useMap();

  useEffect(() => {
    if (!position) return;
    map.flyTo([position.latitude, position.longitude], Math.max(map.getZoom(), 15), {
      duration: 0.8,
    });
  }, [map, position]);

  return null;
}

export default function VehicleTrackingModal({ vehicle, open, onClose }) {
  const [position, setPosition] = useState(null);
  const [vehicleSnapshot, setVehicleSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [socketStatus, setSocketStatus] = useState('Connecting...');
  const [socketLive, setSocketLive] = useState(false);

  const loadLatestPosition = useCallback(async ({ showLoading = false, showNoData = false } = {}) => {
    if (!vehicle?.id) return;

    if (showLoading) setLoading(true);

    try {
      const res = await api.get(`/tracking/${vehicle.id}/latest`);
      setPosition(res.data.position || null);
      setVehicleSnapshot(res.data.vehicle || null);

      if (res.data.position) {
        setError('');
      } else if (showNoData) {
        setError('Is vehicle ka GPS data abhi receive nahi hua.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Latest location load nahi ho payi.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [vehicle?.id]);

  const markerIcon = useMemo(() => L.divIcon({
    className: '',
    html: '<div class="tracking-marker"><span></span></div>',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  }), []);

  useEffect(() => {
    if (!open || !vehicle?.id) return;

    let cancelled = false;
    setLoading(true);
    setError('');
    setPosition(null);
    setVehicleSnapshot(null);

    loadLatestPosition({ showLoading: true, showNoData: true }).finally(() => {
      if (cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [loadLatestPosition, open, vehicle?.id]);

  useEffect(() => {
    if (!open || !vehicle?.id) return;

    const refreshMs = socketLive ? 10000 : 2000;
    const intervalId = window.setInterval(() => {
      loadLatestPosition({ showNoData: false });
    }, refreshMs);

    return () => window.clearInterval(intervalId);
  }, [loadLatestPosition, open, socketLive, vehicle?.id]);

  useEffect(() => {
    if (!open || !vehicle?.id) return;

    const socket = createTrackingSocket();
    setSocketStatus('Connecting...');
    setSocketLive(false);

    socket.on('connect', () => {
      setSocketStatus('Connected, joining vehicle...');
      setSocketLive(false);
    });

    socket.on('connect_error', (err) => {
      setSocketStatus('Socket disconnected');
      setSocketLive(false);
      setError(err.message || 'Live connection failed.');
    });

    socket.on('tracking:connected', () => {
      socket.emit('tracking:join', { vehicleId: vehicle.id }, (ack) => {
        if (ack?.success) {
          setSocketStatus('Live');
          setSocketLive(true);
          loadLatestPosition({ showNoData: false });
        } else {
          setSocketStatus('Join failed');
          setSocketLive(false);
          setError(ack?.message || 'Vehicle live room join nahi hua.');
        }
      });
    });

    socket.on('tracking:position', (payload) => {
      if (payload.vehicleId !== vehicle.id) return;
      setPosition(payload.position);
      setVehicleSnapshot(payload.vehicle || null);
      setError('');
      setSocketStatus('Live');
      setSocketLive(true);
    });

    socket.on('disconnect', () => {
      setSocketStatus('Disconnected');
      setSocketLive(false);
    });

    return () => {
      socket.emit('tracking:leave', { vehicleId: vehicle.id });
      socket.close();
    };
  }, [loadLatestPosition, open, vehicle?.id]);

  if (!vehicle) return null;

  const displayVehicle = vehicleSnapshot || vehicle;
  const hasPosition = Number.isFinite(Number(position?.latitude)) && Number.isFinite(Number(position?.longitude));
  const center = hasPosition ? [position.latitude, position.longitude] : [20.5937, 78.9629];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Track ${displayVehicle.vehicleNumber || 'Vehicle'}`}
      subtitle={`IMEI: ${displayVehicle.imeiNumber || vehicle.imeiNumber}`}
      maxWidth="max-w-6xl"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
            <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase">
              <Radio className="w-4 h-4" /> Socket
            </div>
            <p className="mt-2 text-lg font-bold text-dark-800">{socketStatus}</p>
          </div>
          <div className="rounded-2xl bg-dark-50 border border-dark-100 p-4">
            <div className="flex items-center gap-2 text-dark-500 text-xs font-bold uppercase">
              <Gauge className="w-4 h-4" /> Speed
            </div>
            <p className="mt-2 text-lg font-bold text-dark-800">{formatSpeed(position?.speedKmh)}</p>
          </div>
          <div className="rounded-2xl bg-dark-50 border border-dark-100 p-4">
            <div className="flex items-center gap-2 text-dark-500 text-xs font-bold uppercase">
              <Power className="w-4 h-4" /> Ignition
            </div>
            <p className="mt-2 text-lg font-bold text-dark-800">
              {position?.ignition === true ? 'On' : position?.ignition === false ? 'Off' : 'Unknown'}
            </p>
          </div>
          <div className="rounded-2xl bg-dark-50 border border-dark-100 p-4">
            <div className="flex items-center gap-2 text-dark-500 text-xs font-bold uppercase">
              <Clock className="w-4 h-4" /> Last Seen
            </div>
            <p className="mt-2 text-sm font-bold text-dark-800">{formatDateTime(position?.deviceTimestamp)}</p>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-3xl border border-dark-100 bg-dark-50">
          {loading ? (
            <div className="h-[520px] flex items-center justify-center">
              <div className="flex items-center gap-3 text-dark-500 font-medium">
                <Activity className="w-5 h-5 animate-spin" />
                Loading latest location...
              </div>
            </div>
          ) : (
            <div className="relative">
              <MapContainer center={center} zoom={hasPosition ? 15 : 5} className="h-[520px] w-full">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {hasPosition && (
                  <>
                    <RecenterMap position={position} />
                    <Marker position={[position.latitude, position.longitude]} icon={markerIcon}>
                      <Popup>
                        <div className="space-y-1">
                          <p className="font-bold">{displayVehicle.vehicleNumber || 'Vehicle'}</p>
                          <p>Speed: {formatSpeed(position.speedKmh)}</p>
                          <p>Ignition: {position.ignition === true ? 'On' : position.ignition === false ? 'Off' : 'Unknown'}</p>
                          <p>Last seen: {formatDateTime(position.deviceTimestamp)}</p>
                        </div>
                      </Popup>
                    </Marker>
                  </>
                )}
              </MapContainer>

              {!hasPosition && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                  <div className="max-w-sm text-center bg-white rounded-3xl border border-dark-100 shadow-xl p-6">
                    <Satellite className="w-10 h-10 mx-auto text-dark-400 mb-3" />
                    <h3 className="font-bold text-dark-800">Waiting for first GPS fix</h3>
                    <p className="text-sm text-dark-500 mt-2">
                      Device data aate hi marker yahin live show hoga.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {hasPosition && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="rounded-2xl bg-dark-50 border border-dark-100 p-4">
              <span className="text-dark-500 flex items-center gap-2"><Navigation className="w-4 h-4" /> Latitude</span>
              <p className="font-mono font-bold text-dark-800 mt-1">{position.latitude}</p>
            </div>
            <div className="rounded-2xl bg-dark-50 border border-dark-100 p-4">
              <span className="text-dark-500 flex items-center gap-2"><Navigation className="w-4 h-4" /> Longitude</span>
              <p className="font-mono font-bold text-dark-800 mt-1">{position.longitude}</p>
            </div>
            <div className="rounded-2xl bg-dark-50 border border-dark-100 p-4">
              <span className="text-dark-500 flex items-center gap-2"><Satellite className="w-4 h-4" /> Satellites</span>
              <p className="font-bold text-dark-800 mt-1">{position.satellites ?? 'Unknown'}</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
