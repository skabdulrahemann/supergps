import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import '../constants/colors.dart';
import '../models/vehicle_model.dart';
import '../models/vehicle_position.dart';
import '../services/tracking_api_service.dart';
import '../services/tracking_socket_service.dart';
import '../utils/distance_utils.dart';
import '../utils/gps_filter.dart';
import '../widgets/speed_card.dart';
import '../widgets/super_components.dart';
import '../widgets/tracking_bottom_sheet.dart';
import '../widgets/vehicle_marker.dart';
import 'help_screen.dart';
import 'orders_screen.dart';
import 'profile_screen.dart';
import 'shop_screen.dart';

const _noVehicleTitle = 'Select a vehicle';
const _defaultMapCenter = LatLng(20.5937, 78.9629);
const _routeBlue = Color(0xFF2563EB);

class LiveTrackingScreen extends StatefulWidget {
  final String vehicleNumber;
  final VehicleModel? vehicle;
  const LiveTrackingScreen(
      {super.key, this.vehicleNumber = _noVehicleTitle, this.vehicle});

  @override
  State<LiveTrackingScreen> createState() => _LiveTrackingScreenState();
}

class _LiveTrackingScreenState extends State<LiveTrackingScreen>
    with SingleTickerProviderStateMixin {
  final MapController _mapController = MapController();
  final TrackingSocketService _socketService = TrackingSocketService();
  StreamSubscription<VehiclePosition>? _positionSub;
  StreamSubscription<TrackingSocketState>? _socketStateSub;

  late final AnimationController _moveController;
  LatLng? _markerPoint;
  LatLng? _fromPoint;
  LatLng? _toPoint;
  double _heading = 0;
  double _fromHeading = 0;
  double _toHeading = 0;

  List<VehiclePosition> _routePositions = [];
  VehiclePosition? _currentPosition;
  Map<String, dynamic>? _vehicleSnapshot;
  TrackingSocketState _socketState = TrackingSocketState.disconnected;
  bool _loading = true;
  bool _mapReady = false;
  bool _hasCenteredInitially = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _moveController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..addListener(_onMoveTick);
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    final vehicleId = widget.vehicle?.id;
    if (vehicleId == null || vehicleId.isEmpty) {
      setState(() {
        _loading = false;
        _error = 'Select a vehicle to start live tracking.';
      });
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final snapshot = await TrackingApiService.loadInitial(vehicleId);
      final cleanedRoute = GpsFilter.cleanRoute(snapshot.todayRoute);
      final latest = snapshot.latestPosition;
      final initialPosition =
          latest != null && GpsFilter.isValidPosition(latest)
              ? latest
              : cleanedRoute.isNotEmpty
                  ? cleanedRoute.last
                  : _positionFromVehicle();

      if (!mounted) return;
      setState(() {
        _vehicleSnapshot = snapshot.vehicle;
        _routePositions = cleanedRoute;
        _currentPosition = initialPosition;
        _markerPoint = initialPosition?.point;
        _heading = initialPosition?.heading ?? 0;
        _loading = false;
      });
      _centerOnVehicle(zoom: 17, onlyOnce: true);
      _connectSocket(vehicleId);
    } catch (err) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = err.toString().replaceAll('Exception: ', '');
      });
      _connectSocket(vehicleId);
    }
  }

  void _connectSocket(String vehicleId) {
    _positionSub?.cancel();
    _socketStateSub?.cancel();
    _positionSub = _socketService.positions.listen(_handleLivePosition);
    _socketStateSub = _socketService.states.listen((state) async {
      if (!mounted) return;
      setState(() => _socketState = state);
      if (state == TrackingSocketState.connected) {
        await _recoverMissedPositions();
      }
    });
    _socketService.connect(vehicleId);
  }

  VehiclePosition? _positionFromVehicle() {
    final vehicle = widget.vehicle;
    final lat = vehicle?.lastLatitude;
    final lng = vehicle?.lastLongitude;
    if (vehicle == null || lat == null || lng == null) return null;
    final position = VehiclePosition(
      vehicleId: vehicle.id,
      latitude: lat,
      longitude: lng,
      speedKmh: vehicle.speedKmh ?? 0,
      heading: 0,
      ignition: vehicle.lastIgnition,
      satellites: vehicle.lastSatellites,
      deviceTime: DateTime.tryParse(vehicle.lastSeenAt ?? ''),
    );
    return GpsFilter.isValidPosition(position) ? position : null;
  }

  Future<void> _recoverMissedPositions() async {
    final vehicleId = widget.vehicle?.id;
    final lastTime =
        _currentPosition?.deviceTime ?? _currentPosition?.receivedAt;
    if (vehicleId == null || lastTime == null) return;
    try {
      final missed =
          await TrackingApiService.loadPositionsSince(vehicleId, lastTime);
      for (final position in missed) {
        _handleLivePosition(position, animate: false);
      }
    } catch (_) {
      // Keep the last known marker visible; socket reconnect will continue updates.
    }
  }

  void _handleLivePosition(VehiclePosition position, {bool animate = true}) {
    if (position.vehicleId != widget.vehicle?.id) return;
    final previous = _currentPosition;
    if (!GpsFilter.shouldAccept(next: position, previous: previous)) return;

    final shouldAppend = _routePositions.isEmpty ||
        GpsFilter.shouldAccept(next: position, previous: _routePositions.last);

    setState(() {
      _currentPosition = position;
      if (shouldAppend) _routePositions = [..._routePositions, position];
    });

    if (animate && _markerPoint != null) {
      _animateMarker(position);
    } else {
      setState(() {
        _markerPoint = position.point;
        _heading = position.heading;
      });
    }
  }

  void _animateMarker(VehiclePosition next) {
    _fromPoint = _markerPoint;
    _toPoint = next.point;
    _fromHeading = _heading;
    _toHeading = next.heading;
    _moveController
      ..stop()
      ..reset()
      ..forward();
  }

  void _onMoveTick() {
    final from = _fromPoint;
    final to = _toPoint;
    if (from == null || to == null) return;
    final t = Curves.linear.transform(_moveController.value);
    setState(() {
      _markerPoint = lerpLatLng(from, to, t);
      _heading = lerpHeading(_fromHeading, _toHeading, t);
    });
  }

  void _centerOnVehicle({double? zoom, bool onlyOnce = false}) {
    if (onlyOnce && _hasCenteredInitially) return;
    final point = _markerPoint;
    if (point == null || !_mapReady) return;
    _mapController.move(point, zoom ?? _mapController.camera.zoom);
    if (onlyOnce) _hasCenteredInitially = true;
  }

  Future<void> _refresh() async => _bootstrap();

  Future<void> _openMaps() async {
    final point = _markerPoint;
    if (point == null) return;
    final uri = Uri.parse(
        'https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}');
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  void dispose() {
    _positionSub?.cancel();
    _socketStateSub?.cancel();
    _socketService.dispose();
    _moveController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final number = widget.vehicle?.vehicleNumber ?? widget.vehicleNumber;
    final routePoints = GpsFilter.simplifyForRender(
        _routePositions.map((p) => p.point).toList());
    final hasPosition = _markerPoint != null;
    final status = _vehicleStatus();

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        titleSpacing: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(number,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w700)),
            Text(status,
                style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12,
                    fontWeight: FontWeight.w700)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _refresh,
          ),
        ],
      ),
      body: Stack(
        children: [
          Positioned.fill(
            child: _loading && !hasPosition
                ? const Center(
                    child:
                        CircularProgressIndicator(color: AppColors.primaryDark),
                  )
                : FlutterMap(
                    mapController: _mapController,
                    options: MapOptions(
                      initialCenter: _markerPoint ?? _defaultMapCenter,
                      initialZoom: hasPosition ? 16 : 5,
                      onMapReady: () {
                        _mapReady = true;
                        _centerOnVehicle(zoom: 17, onlyOnce: true);
                      },
                      interactionOptions: const InteractionOptions(
                        flags: InteractiveFlag.drag |
                            InteractiveFlag.pinchZoom |
                            InteractiveFlag.doubleTapZoom,
                      ),
                    ),
                    children: [
                      TileLayer(
                        urlTemplate:
                            'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                        userAgentPackageName: 'com.supergps.customer',
                      ),
                      if (routePoints.length > 1) ...[
                        PolylineLayer(
                          polylines: [
                            Polyline(
                              points: routePoints,
                              color: _routeBlue.withValues(alpha: 0.18),
                              strokeWidth: 9,
                            ),
                          ],
                        ),
                        PolylineLayer(
                          polylines: [
                            Polyline(
                              points: routePoints,
                              color: _routeBlue,
                              strokeWidth: 5,
                            ),
                          ],
                        ),
                        MarkerLayer(markers: _directionMarkers(routePoints)),
                      ],
                      if (hasPosition)
                        MarkerLayer(
                          markers: [
                            Marker(
                              point: _markerPoint!,
                              width: 78,
                              height: 78,
                              alignment: Alignment.center,
                              child: VehicleMarker(
                                vehicleType: widget.vehicle?.vehicleType ??
                                    (_vehicleSnapshot?['vehicleType']
                                            ?.toString() ??
                                        'car'),
                                heading: _heading,
                                online: status != 'Offline',
                              ),
                            ),
                          ],
                        ),
                    ],
                  ),
          ),
          if (!_loading && !hasPosition)
            Center(
              child:
                  _NoGpsState(message: _error ?? 'Waiting for GPS location...'),
            ),
          Positioned(
            right: 14,
            top: 14,
            child: Column(
              children: [
                _MapButton(icon: Icons.add_rounded, onTap: _zoomIn),
                const SizedBox(height: 10),
                _MapButton(icon: Icons.remove_rounded, onTap: _zoomOut),
                const SizedBox(height: 10),
                _MapButton(
                  icon: Icons.my_location_rounded,
                  onTap: () => _centerOnVehicle(zoom: 17),
                ),
                const SizedBox(height: 10),
                _MapButton(icon: Icons.open_in_new_rounded, onTap: _openMaps),
              ],
            ),
          ),
          Positioned(
            left: 14,
            top: 14,
            child: SpeedCard(speedKmh: _currentPosition?.speedKmh ?? 0),
          ),
          Positioned(
            left: 14,
            right: 14,
            top: 126,
            child: _SocketStatusBanner(state: _socketState),
          ),
          TrackingBottomSheet(
            vehicleNumber: number,
            status: status,
            position: _currentPosition,
            todayDistanceKm: kilometersForRoute(routePoints),
            location: _currentLocationLabel(),
            lastUpdated: _lastUpdatedLabel(),
            onPlayTrip: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const PlaybackScreen()),
            ),
          ),
        ],
      ),
    );
  }

  void _zoomIn() {
    final camera = _mapController.camera;
    _mapController.move(camera.center, camera.zoom + 1);
  }

  void _zoomOut() {
    final camera = _mapController.camera;
    _mapController.move(camera.center, camera.zoom - 1);
  }

  List<Marker> _directionMarkers(List<LatLng> points) {
    if (points.length < 2) return const [];
    final step = math.max(1, (points.length / 18).ceil());
    final markers = <Marker>[];
    for (var i = step; i < points.length; i += step) {
      final previous = points[i - 1];
      final current = points[i];
      if (metersBetween(previous, current) < 12) continue;
      markers.add(
        Marker(
          point: current,
          width: 22,
          height: 22,
          alignment: Alignment.center,
          child: Transform.rotate(
            angle: _bearingRadians(previous, current),
            child: Icon(
              Icons.navigation_rounded,
              size: 20,
              color: _routeBlue.withValues(alpha: 0.92),
            ),
          ),
        ),
      );
    }
    return markers;
  }

  double _bearingRadians(LatLng from, LatLng to) {
    final lat1 = from.latitude * math.pi / 180;
    final lat2 = to.latitude * math.pi / 180;
    final dLon = (to.longitude - from.longitude) * math.pi / 180;
    final y = math.sin(dLon) * math.cos(lat2);
    final x = math.cos(lat1) * math.sin(lat2) -
        math.sin(lat1) * math.cos(lat2) * math.cos(dLon);
    return math.atan2(y, x);
  }

  String _vehicleStatus() {
    final position = _currentPosition;
    if (position == null) return 'Offline';
    final time = position.deviceTime ?? position.receivedAt;
    if (time != null && DateTime.now().difference(time).inMinutes > 30) {
      return 'Offline';
    }
    if (position.speedKmh > 3) return 'Moving';
    if (position.ignition == false) return 'Parked';
    if (position.ignition == true) return 'Stopped';
    return position.speedKmh <= 3 ? 'Stopped' : 'Moving';
  }

  String _currentLocationLabel() {
    final point = _markerPoint;
    if (point == null) return 'Waiting for first GPS fix';
    return '${point.latitude.toStringAsFixed(6)}, ${point.longitude.toStringAsFixed(6)}';
  }

  String _lastUpdatedLabel() {
    final time = _currentPosition?.deviceTime ?? _currentPosition?.receivedAt;
    if (time == null) return 'Not received yet';
    final diff = DateTime.now().difference(time.toLocal());
    if (diff.inSeconds < 10) return 'Just now';
    if (diff.inMinutes < 1) return '${diff.inSeconds} sec ago';
    if (diff.inHours < 1) return '${diff.inMinutes} min ago';
    return '${diff.inHours} hr ago';
  }
}

class _MapButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _MapButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      elevation: 4,
      shadowColor: Colors.black.withValues(alpha: 0.12),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: SizedBox(
          width: 48,
          height: 48,
          child: Icon(icon, color: AppColors.textPrimary),
        ),
      ),
    );
  }
}

class _SocketStatusBanner extends StatelessWidget {
  final TrackingSocketState state;
  const _SocketStatusBanner({required this.state});

  @override
  Widget build(BuildContext context) {
    final text = switch (state) {
      TrackingSocketState.connected => 'Connected',
      TrackingSocketState.connecting => 'Connecting',
      TrackingSocketState.reconnecting => 'Reconnecting',
      TrackingSocketState.disconnected => 'Disconnected',
    };
    final color = state == TrackingSocketState.connected
        ? AppColors.success
        : state == TrackingSocketState.disconnected
            ? AppColors.offline
            : AppColors.warning;

    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.94),
          borderRadius: BorderRadius.circular(999),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 12,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 8),
            Text(text,
                style: TextStyle(color: color, fontWeight: FontWeight.w700)),
          ],
        ),
      ),
    );
  }
}

class _NoGpsState extends StatelessWidget {
  final String message;
  const _NoGpsState({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(24),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.94),
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.10),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.gps_off_rounded,
              color: AppColors.textMuted, size: 42),
          const SizedBox(height: 12),
          Text(message,
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

class VehicleDetailsScreen extends StatelessWidget {
  final VehicleModel? vehicle;
  const VehicleDetailsScreen({super.key, this.vehicle});

  @override
  Widget build(BuildContext context) {
    final number = vehicle?.vehicleNumber ?? _noVehicleTitle;
    final speed = vehicle?.speedKmh == null
        ? '0 km/h'
        : '${vehicle!.speedKmh!.round()} km/h';
    final status = vehicle?.liveStatus == 'moving'
        ? 'Running'
        : vehicle?.liveStatus == 'idle'
            ? 'Idle'
            : vehicle?.liveStatus == 'stopped'
                ? 'Stopped'
                : vehicle?.lastSeenAt == null
                    ? 'No GPS'
                    : 'Offline';
    final lastLocation = vehicle?.lastLocation ?? 'Waiting for first GPS fix';
    final lastUpdate =
        vehicle?.lastSeen ?? vehicle?.lastSeenAt ?? 'Not received yet';
    final ignition = vehicle?.lastIgnition == true
        ? 'ON'
        : vehicle?.lastIgnition == false
            ? 'OFF'
            : 'Unknown';

    return DefaultTabController(
      length: 4,
      child: _Page(
        title: number,
        action: IconButton(
          icon: const Icon(Icons.refresh_rounded),
          onPressed: () {},
        ),
        child: Column(
          children: [
            _VehicleHero(
                number: number,
                model: [
                  vehicle?.vehicleBrand,
                  vehicle?.vehicleModel,
                  vehicle?.vehicleType
                ].whereType<String>().where((v) => v.isNotEmpty).join(' '),
                status: status),
            const TabBar(
              labelColor: AppColors.primary,
              unselectedLabelColor: AppColors.textSecondary,
              indicatorColor: AppColors.primary,
              tabs: [
                Tab(text: 'Overview'),
                Tab(text: 'Details'),
                Tab(text: 'Alerts'),
                Tab(text: 'History'),
              ],
            ),
            Expanded(
              child: TabBarView(
                children: [
                  ListView(
                    padding: const EdgeInsets.all(18),
                    children: [
                      _MetricGrid(items: [
                        _Metric('Speed', speed, Icons.speed_rounded,
                            AppColors.primary),
                        _Metric('Status', status, Icons.gps_fixed_rounded,
                            AppColors.warning),
                        _Metric('Ignition', ignition, Icons.vpn_key_rounded,
                            AppColors.success),
                        _Metric(
                            'Satellites',
                            '${vehicle?.lastSatellites ?? '-'}',
                            Icons.satellite_alt_rounded,
                            AppColors.purple),
                      ]),
                      const SizedBox(height: 14),
                      _InfoPanel(title: 'Last Location', lines: [
                        _Line(Icons.location_on_rounded, 'Location',
                            lastLocation),
                        _Line(Icons.access_time_rounded, 'Last Update',
                            lastUpdate),
                      ]),
                    ],
                  ),
                  _SimpleList(items: [
                    'IMEI: ${vehicle?.imeiNumber ?? 'Not assigned'}',
                    'Serial: ${vehicle?.deviceSerialNumber ?? 'Not assigned'}',
                    'SIM: ${vehicle?.simNumber ?? 'Not assigned'}',
                    'Activation: ${vehicle?.activationStatus ?? 'pending'}'
                  ]),
                  const EmptyState(
                    icon: Icons.notifications_active_rounded,
                    title: 'No alerts for this vehicle',
                    subtitle:
                        'Vehicle alerts will appear after alert rules and live tracking data are connected.',
                  ),
                  const EmptyState(
                    icon: Icons.route_rounded,
                    title: 'No trip history yet',
                    subtitle:
                        'Trips, stops and playback history will appear after GPS positions are saved.',
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class PlaybackScreen extends StatelessWidget {
  const PlaybackScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _Page(
      title: 'Playback',
      child: EmptyState(
        icon: Icons.history_rounded,
        title: 'No playback data yet',
        subtitle:
            'Trip playback will appear after a vehicle sends GPS history to the server.',
      ),
    );
  }
}

class AlertsScreen extends StatelessWidget {
  const AlertsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _Page(
      title: 'Alerts',
      child: EmptyState(
        icon: Icons.notifications_active_rounded,
        title: 'No alerts yet',
        subtitle:
            'Overspeed, ignition and geofence alerts will appear here after live tracking data starts.',
      ),
    );
  }
}

class ParkingModeScreen extends StatelessWidget {
  const ParkingModeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _Page(
      title: 'Parking',
      child: EmptyState(
        icon: Icons.local_parking_rounded,
        title: 'Parking mode not enabled',
        subtitle:
            'Parking alerts will appear here after parking rules and vehicle movement alerts are connected.',
      ),
    );
  }
}

class ReportsScreen extends StatelessWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _Page(
      title: 'Reports',
      child: EmptyState(
        icon: Icons.summarize_rounded,
        title: 'No reports available',
        subtitle:
            'Reports will be generated from real trip, stop and speed history once GPS data is received.',
      ),
    );
  }
}

class GeofenceListScreen extends StatelessWidget {
  const GeofenceListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _Page(
      title: 'Geofence',
      child: EmptyState(
        icon: Icons.fence_rounded,
        title: 'No geofences yet',
        subtitle:
            'Geofence creation needs map selection and backend storage before zones can be shown here.',
      ),
    );
  }
}

class AddGeofenceScreen extends StatelessWidget {
  const AddGeofenceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _Page(
      title: 'Add Geofence',
      child: EmptyState(
        icon: Icons.add_location_alt_rounded,
        title: 'Geofence setup is not connected',
        subtitle:
            'This screen should use real map coordinates and saved vehicle selections before it is enabled.',
      ),
    );
  }
}

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _Page(
      title: 'Notifications',
      child: EmptyState(
        icon: Icons.notifications_rounded,
        title: 'No notifications',
        subtitle: 'Account, order and vehicle notifications will appear here.',
      ),
    );
  }
}

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return _Page(
      title: 'Settings',
      child: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          const _SettingsGroupTitle('Account'),
          _FeatureTile(
              icon: Icons.lock_rounded,
              color: AppColors.primary,
              title: 'Security',
              subtitle: 'App lock, command PIN and login protection',
              onTap: () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const SecurityScreen()))),
          _FeatureTile(
              icon: Icons.notifications_active_rounded,
              color: AppColors.primary,
              title: 'Notifications',
              subtitle: 'Order, tracking and service alerts',
              onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) => const NotificationsScreen()))),
          const SizedBox(height: 12),
          const _SettingsGroupTitle('App Preferences'),
          _FeatureTile(
              icon: Icons.speed_rounded,
              color: AppColors.primary,
              title: 'Units',
              subtitle: 'Speed: km/h',
              onTap: () {}),
          _FeatureTile(
              icon: Icons.language_rounded,
              color: AppColors.primary,
              title: 'Language',
              subtitle: 'English, Hindi and Marathi',
              onTap: () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const LanguageScreen()))),
          const SizedBox(height: 12),
          const _SettingsGroupTitle('Support'),
          _FeatureTile(
              icon: Icons.help_rounded,
              color: AppColors.primary,
              title: 'Help & Support',
              subtitle: 'Chat, call or create a ticket',
              onTap: () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const HelpScreen()))),
          _FeatureTile(
              icon: Icons.info_rounded,
              color: AppColors.primary,
              title: 'About App',
              subtitle: 'SuperGPS v1.0.0',
              onTap: () {}),
        ],
      ),
    );
  }
}

class ServicesScreen extends StatelessWidget {
  const ServicesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final services = [
      ('Vehicle Tracking', Icons.gps_fixed_rounded),
      ('Fleet Management', Icons.local_shipping_rounded),
      ('Alerts & Notifications', Icons.notifications_active_rounded),
      ('Reports & Analytics', Icons.analytics_rounded),
      ('FASTag / HSRP / RTO Services', Icons.toll_rounded),
      ('Installation & Support', Icons.engineering_rounded),
    ];
    return _Page(
      title: 'Our Services',
      child: ListView(
        padding: const EdgeInsets.all(18),
        children: services
            .map((s) => _FeatureTile(
                  icon: s.$2,
                  color: AppColors.primary,
                  title: s.$1,
                  subtitle: 'Contact Super GPS team for enquiry',
                  trailing: 'Enquire',
                  onTap: () => Navigator.push(context,
                      MaterialPageRoute(builder: (_) => const HelpScreen())),
                ))
            .toList(),
      ),
    );
  }
}

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final items = [
      (
        'Our Products',
        Icons.storefront_rounded,
        AppColors.primary,
        const ShopScreen()
      ),
      (
        'Our Services',
        Icons.miscellaneous_services_rounded,
        AppColors.accent,
        const ServicesScreen()
      ),
      (
        'Reports',
        Icons.summarize_rounded,
        AppColors.purple,
        const ReportsScreen()
      ),
      (
        'Playback / History',
        Icons.history_rounded,
        AppColors.success,
        const PlaybackScreen()
      ),
      (
        'Geofence',
        Icons.fence_rounded,
        AppColors.warning,
        const GeofenceListScreen()
      ),
      (
        'Notifications',
        Icons.notifications_rounded,
        AppColors.error,
        const NotificationsScreen()
      ),
      (
        'Renewal / Subscription',
        Icons.workspace_premium_rounded,
        AppColors.primary,
        const RenewalScreen()
      ),
      (
        'Device Details',
        Icons.memory_rounded,
        AppColors.purple,
        const DeviceDetailsScreen()
      ),
      (
        'Vehicle Documents',
        Icons.description_rounded,
        AppColors.success,
        const VehicleDocumentsScreen()
      ),
      (
        'Order History',
        Icons.receipt_long_rounded,
        AppColors.warning,
        const OrdersScreen()
      ),
      (
        'Add Vehicle / Activation',
        Icons.add_road_rounded,
        AppColors.accent,
        const ShopScreen()
      ),
      (
        'Help & Support',
        Icons.headset_mic_rounded,
        AppColors.primary,
        const HelpScreen()
      ),
      (
        'Privacy Policy & Terms',
        Icons.policy_rounded,
        AppColors.textSecondary,
        const LegalScreen()
      ),
      (
        'Settings',
        Icons.settings_rounded,
        AppColors.textSecondary,
        const SettingsScreen()
      ),
      (
        'Profile',
        Icons.person_rounded,
        AppColors.primary,
        const ProfileScreen()
      ),
    ];
    return _Page(
      title: 'More',
      child: GridView.builder(
        padding: const EdgeInsets.all(18),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.12,
        ),
        itemCount: items.length,
        itemBuilder: (_, i) {
          final item = items[i];
          return _MenuCard(
            title: item.$1,
            icon: item.$2,
            color: item.$3,
            onTap: () => Navigator.push(
                context, MaterialPageRoute(builder: (_) => item.$4)),
          );
        },
      ),
    );
  }
}

class RenewalScreen extends StatelessWidget {
  const RenewalScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return _Page(
      title: 'Subscription',
      child: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          const EmptyState(
            icon: Icons.workspace_premium_rounded,
            title: 'No renewal due',
            subtitle:
                'Your renewal status will appear here when subscription data is available.',
          ),
          _PrimaryButton(
              label: 'Contact Support',
              onTap: () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const HelpScreen()))),
        ],
      ),
    );
  }
}

class DeviceDetailsScreen extends StatelessWidget {
  const DeviceDetailsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _Page(
      title: 'Device Details',
      child: EmptyState(
        icon: Icons.memory_rounded,
        title: 'Select a vehicle first',
        subtitle:
            'Device IMEI, SIM, firmware and GPS status should come from the assigned vehicle record.',
      ),
    );
  }
}

class VehicleDocumentsScreen extends StatelessWidget {
  const VehicleDocumentsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _Page(
      title: 'Vehicle Documents',
      child: EmptyState(
        icon: Icons.description_rounded,
        title: 'No documents uploaded',
        subtitle:
            'RC, insurance, PUC and permit documents will appear after document upload is connected.',
      ),
    );
  }
}

class EngineLockScreen extends StatelessWidget {
  const EngineLockScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _Page(
      title: 'Engine Lock',
      child: EmptyState(
        icon: Icons.lock_rounded,
        title: 'Engine commands are disabled',
        subtitle:
            'This action requires a connected vehicle, command PIN, backend audit and supported immobilizer hardware.',
      ),
    );
  }
}

class ShareLocationScreen extends StatelessWidget {
  const ShareLocationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _Page(
      title: 'Share Live Location',
      child: EmptyState(
        icon: Icons.share_location_rounded,
        title: 'No live location to share',
        subtitle:
            'A secure share link can be generated after a vehicle has a latest GPS position.',
      ),
    );
  }
}

class FastagScreen extends StatelessWidget {
  const FastagScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return _Page(
      title: 'FASTag',
      child: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          const EmptyState(
            icon: Icons.toll_rounded,
            title: 'FASTag is not linked',
            subtitle:
                'Recharge, balance and transactions will show after a real FASTag account is connected.',
          ),
          _PrimaryButton(
              label: 'Contact Support',
              onTap: () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const HelpScreen()))),
        ],
      ),
    );
  }
}

class FuelMonitoringScreen extends StatelessWidget {
  const FuelMonitoringScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _Page(
      title: 'Fuel Monitoring',
      child: EmptyState(
        icon: Icons.local_gas_station_rounded,
        title: 'No fuel sensor data',
        subtitle:
            'Fuel level, consumption and drop alerts require a supported sensor and backend readings.',
      ),
    );
  }
}

class DriversScreen extends StatelessWidget {
  const DriversScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _Page(
      title: 'Drivers',
      child: EmptyState(
        icon: Icons.badge_rounded,
        title: 'No drivers added',
        subtitle:
            'Driver profiles and vehicle assignments will appear after driver management is connected.',
      ),
    );
  }
}

class InvoiceScreen extends StatelessWidget {
  const InvoiceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _Page(
      title: 'Invoices',
      child: EmptyState(
        icon: Icons.description_rounded,
        title: 'No invoices yet',
        subtitle:
            'Paid order and renewal invoices will appear here after billing is connected.',
      ),
    );
  }
}

class SecurityScreen extends StatefulWidget {
  const SecurityScreen({super.key});

  @override
  State<SecurityScreen> createState() => _SecurityScreenState();
}

class _SecurityScreenState extends State<SecurityScreen> {
  bool _biometricLogin = false;
  bool _appLock = false;

  @override
  Widget build(BuildContext context) {
    return _Page(
      title: 'Security',
      child: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Login Security',
                    style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        fontFamily: 'Poppins')),
                const SizedBox(height: 10),
                _CompactSwitchTile(
                  icon: Icons.fingerprint_rounded,
                  title: 'Biometric Login',
                  subtitle: 'Use device biometrics when supported',
                  value: _biometricLogin,
                  onChanged: (value) => setState(() => _biometricLogin = value),
                ),
                const Divider(height: 18),
                _CompactSwitchTile(
                  icon: Icons.phonelink_lock_rounded,
                  title: 'App Lock',
                  subtitle: 'Ask for unlock when the app opens',
                  value: _appLock,
                  onChanged: (value) => setState(() => _appLock = value),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          _FeatureTile(
              icon: Icons.pin_rounded,
              color: AppColors.primary,
              title: 'Sensitive Command PIN',
              subtitle: 'Required before engine commands are enabled',
              onTap: () {}),
          _FeatureTile(
              icon: Icons.password_rounded,
              color: AppColors.primary,
              title: 'Change Password',
              subtitle: 'Password update will be connected to account API',
              onTap: () {}),
        ],
      ),
    );
  }
}

class LanguageScreen extends StatelessWidget {
  const LanguageScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _Page(
      title: 'Language',
      child: _SimpleList(items: ['English', 'Hindi', 'Marathi']),
    );
  }
}

class LegalScreen extends StatelessWidget {
  const LegalScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _Page(
      title: 'Privacy & Terms',
      child: Padding(
        padding: EdgeInsets.all(22),
        child: Text(
          'Super GPS customer data, vehicle location, alert history aur account information ko service delivery ke liye use karta hai. Production app me final Privacy Policy aur Terms backend/CMS se load honi chahiye.',
          style: TextStyle(
              fontSize: 15,
              height: 1.5,
              color: AppColors.textSecondary,
              fontFamily: 'Poppins'),
        ),
      ),
    );
  }
}

class _SettingsGroupTitle extends StatelessWidget {
  final String title;
  const _SettingsGroupTitle(this.title);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(2, 6, 2, 10),
      child: Text(
        title,
        style: const TextStyle(
          color: AppColors.textSecondary,
          fontSize: 12,
          fontWeight: FontWeight.w700,
          fontFamily: 'Poppins',
        ),
      ),
    );
  }
}

class _CompactSwitchTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _CompactSwitchTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: AppColors.softYellow,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: AppColors.textPrimary, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title,
                  style: const TextStyle(
                      fontWeight: FontWeight.w700, fontFamily: 'Poppins')),
              const SizedBox(height: 2),
              Text(subtitle,
                  style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                      fontFamily: 'Poppins')),
            ],
          ),
        ),
        Transform.scale(
          scale: 0.82,
          child: Switch(
            value: value,
            onChanged: onChanged,
            activeThumbColor: AppColors.textPrimary,
            activeTrackColor: AppColors.primary,
            inactiveThumbColor: AppColors.textMuted,
            inactiveTrackColor: AppColors.border,
          ),
        ),
      ],
    );
  }
}

class _Page extends StatelessWidget {
  final String title;
  final Widget child;
  final Widget? action;

  const _Page({required this.title, required this.child, this.action});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: Text(title,
            style: const TextStyle(
                fontWeight: FontWeight.w700, fontFamily: 'Poppins')),
        actions: action == null ? null : [action!],
      ),
      body: SafeArea(child: child),
    );
  }
}

String _markerAssetForVehicle(String? vehicleType) {
  final normalized = (vehicleType ?? '').toLowerCase();
  if (normalized.contains('truck')) return 'assets/gps_marker/trucks.png';
  if (normalized.contains('bike') ||
      normalized.contains('motorcycle') ||
      normalized.contains('scooter')) {
    return 'assets/gps_marker/bike.png';
  }
  return 'assets/gps_marker/car.png';
}

// ignore: unused_element
class _LiveVehicleMap extends StatelessWidget {
  final VehicleModel? vehicle;
  final String title;
  final String subtitle;
  final double? latitude;
  final double? longitude;
  final double? course;
  final bool online;

  const _LiveVehicleMap({
    required this.vehicle,
    required this.title,
    required this.subtitle,
    required this.latitude,
    required this.longitude,
    required this.course,
    required this.online,
  });

  @override
  Widget build(BuildContext context) {
    final hasPosition = latitude != null && longitude != null;
    final point =
        hasPosition ? LatLng(latitude!, longitude!) : _defaultMapCenter;
    final markerAsset = _markerAssetForVehicle(vehicle?.vehicleType);

    return Container(
      margin: const EdgeInsets.all(18),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: const Color(0xFFEAF3FF),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.border),
      ),
      child: Stack(
        children: [
          FlutterMap(
            options: MapOptions(
              initialCenter: point,
              initialZoom: hasPosition ? 15 : 5,
              interactionOptions: const InteractionOptions(
                flags: InteractiveFlag.drag |
                    InteractiveFlag.pinchZoom |
                    InteractiveFlag.doubleTapZoom,
              ),
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.supergps.customer',
              ),
              if (hasPosition)
                MarkerLayer(
                  markers: [
                    Marker(
                      point: point,
                      width: 72,
                      height: 72,
                      alignment: Alignment.topCenter,
                      child: _VehicleImageMarker(
                        asset: markerAsset,
                        course: course ?? 0,
                        online: online,
                      ),
                    ),
                  ],
                ),
            ],
          ),
          if (!hasPosition)
            Center(
              child: Container(
                width: 78,
                height: 78,
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: AppColors.border),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.10),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: const Icon(Icons.gps_off_rounded,
                    color: AppColors.textMuted, size: 38),
              ),
            ),
          Positioned(
            left: 16,
            right: 16,
            bottom: 16,
            child: _InfoBanner(
                title: title,
                subtitle: subtitle,
                icon: hasPosition
                    ? Icons.navigation_rounded
                    : Icons.location_searching_rounded),
          ),
        ],
      ),
    );
  }
}

class _VehicleImageMarker extends StatelessWidget {
  final String asset;
  final double course;
  final bool online;

  const _VehicleImageMarker({
    required this.asset,
    required this.course,
    required this.online,
  });

  @override
  Widget build(BuildContext context) {
    final halo = online ? AppColors.success : AppColors.textMuted;
    return Stack(
      alignment: Alignment.center,
      children: [
        Container(
          width: 58,
          height: 58,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: halo.withValues(alpha: 0.14),
            boxShadow: [
              BoxShadow(
                color: halo.withValues(alpha: 0.16),
                blurRadius: 22,
                spreadRadius: 7,
              ),
            ],
          ),
        ),
        Transform.rotate(
          angle: course * 0.017453292519943295,
          child: Container(
            width: 48,
            height: 48,
            padding: const EdgeInsets.all(2),
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 3),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.22),
                  blurRadius: 18,
                  offset: const Offset(0, 9),
                ),
              ],
            ),
            child: ClipOval(
              child: Image.asset(asset, fit: BoxFit.cover),
            ),
          ),
        ),
      ],
    );
  }
}

// ignore: unused_element
class _BottomSheetCard extends StatelessWidget {
  final List<Widget> children;
  const _BottomSheetCard({required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 24),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
      ),
      child: Column(mainAxisSize: MainAxisSize.min, children: children),
    );
  }
}

// ignore: unused_element
class _StatusRow extends StatelessWidget {
  final String vehicle;
  final String status;
  final String speed;
  const _StatusRow(
      {required this.vehicle, required this.status, required this.speed});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 50,
          height: 50,
          decoration: BoxDecoration(
              color: AppColors.tint(AppColors.success),
              borderRadius: BorderRadius.circular(16)),
          child: const Icon(Icons.directions_car_rounded,
              color: AppColors.success),
        ),
        const SizedBox(width: 12),
        Expanded(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(vehicle,
                style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    fontFamily: 'Poppins')),
            Text('$status • $speed',
                style: const TextStyle(
                    color: AppColors.textSecondary, fontFamily: 'Poppins')),
          ]),
        ),
      ],
    );
  }
}

class _VehicleHero extends StatelessWidget {
  final String number;
  final String model;
  final String status;
  const _VehicleHero({
    required this.number,
    required this.model,
    required this.status,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(18, 12, 18, 14),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
          gradient: AppColors.primaryGradient,
          borderRadius: BorderRadius.circular(24)),
      child: Row(
        children: [
          const Icon(Icons.directions_car_filled_rounded,
              color: Colors.white, size: 42),
          const SizedBox(width: 14),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text(number,
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        fontFamily: 'Poppins')),
                Text(model.isEmpty ? 'Vehicle details pending' : model,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        color: Colors.white70, fontFamily: 'Poppins')),
              ])),
          Text(status,
              style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                  fontFamily: 'Poppins')),
        ],
      ),
    );
  }
}

class _Metric {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  const _Metric(this.label, this.value, this.icon, this.color);
}

class _MetricGrid extends StatelessWidget {
  final List<_Metric> items;
  const _MetricGrid({required this.items});

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: items.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 1.55),
      itemBuilder: (_, i) {
        final item = items[i];
        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.border)),
          child: Row(children: [
            Icon(item.icon, color: item.color),
            const SizedBox(width: 10),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                  Text(item.value,
                      style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 16,
                          fontFamily: 'Poppins')),
                  Text(item.label,
                      style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12,
                          fontFamily: 'Poppins')),
                ])),
          ]),
        );
      },
    );
  }
}

class _FeatureTile extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
  final String? trailing;
  final VoidCallback onTap;

  const _FeatureTile(
      {required this.icon,
      required this.color,
      required this.title,
      required this.subtitle,
      this.trailing,
      required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.border)),
      child: ListTile(
        onTap: onTap,
        leading: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
              color: AppColors.tint(color),
              borderRadius: BorderRadius.circular(14)),
          child: Icon(icon, color: color),
        ),
        title: Text(title,
            style: const TextStyle(
                fontWeight: FontWeight.w700, fontFamily: 'Poppins')),
        subtitle: Text(subtitle,
            style: const TextStyle(
                color: AppColors.textSecondary,
                fontFamily: 'Poppins',
                fontSize: 12)),
        trailing: trailing == null
            ? const Icon(Icons.chevron_right_rounded)
            : Text(trailing!,
                style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.w600,
                    fontFamily: 'Poppins',
                    fontSize: 12)),
      ),
    );
  }
}

class _MenuCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  const _MenuCard(
      {required this.title,
      required this.icon,
      required this.color,
      required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColors.border)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
                color: AppColors.tint(color),
                borderRadius: BorderRadius.circular(14)),
            child: Icon(icon, color: color),
          ),
          const Spacer(),
          Text(title,
              style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                  fontFamily: 'Poppins')),
        ]),
      ),
    );
  }
}

class _InfoBanner extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  const _InfoBanner(
      {required this.title, required this.subtitle, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.border)),
      child: Row(children: [
        Icon(icon, color: AppColors.primary),
        const SizedBox(width: 10),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title,
              style: const TextStyle(
                  fontWeight: FontWeight.w700, fontFamily: 'Poppins')),
          Text(subtitle,
              style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.textSecondary,
                  fontFamily: 'Poppins')),
        ])),
      ]),
    );
  }
}

class _InfoLine extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoLine(
      {required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(children: [
        Icon(icon, size: 18, color: AppColors.textMuted),
        const SizedBox(width: 8),
        Text('$label: ',
            style: const TextStyle(
                color: AppColors.textSecondary, fontFamily: 'Poppins')),
        Expanded(
            child: Text(value,
                style: const TextStyle(
                    fontWeight: FontWeight.w600, fontFamily: 'Poppins'),
                overflow: TextOverflow.ellipsis)),
      ]),
    );
  }
}

class _Line {
  final IconData icon;
  final String label;
  final String value;
  const _Line(this.icon, this.label, this.value);
}

class _InfoPanel extends StatelessWidget {
  final String title;
  final List<_Line> lines;
  const _InfoPanel({required this.title, required this.lines});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.border)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title,
            style: const TextStyle(
                fontWeight: FontWeight.w700, fontFamily: 'Poppins')),
        const SizedBox(height: 12),
        ...lines.map(
            (l) => _InfoLine(icon: l.icon, label: l.label, value: l.value)),
      ]),
    );
  }
}

class _SimpleList extends StatelessWidget {
  final List<String> items;
  const _SimpleList({required this.items});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(18),
      children: items
          .map((item) => _FeatureTile(
                icon: Icons.check_circle_rounded,
                color: AppColors.primary,
                title: item,
                subtitle: 'Tap for details',
                onTap: () {},
              ))
          .toList(),
    );
  }
}

class _PrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  const _PrimaryButton({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 56,
      child: ElevatedButton(
        onPressed: onTap,
        style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16))),
        child: Text(label,
            style: const TextStyle(
                fontWeight: FontWeight.w700, fontFamily: 'Poppins')),
      ),
    );
  }
}
