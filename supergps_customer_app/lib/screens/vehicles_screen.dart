import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../constants/colors.dart';
import '../models/vehicle_model.dart';
import '../services/api_service.dart';
import '../widgets/super_components.dart';
import 'gps_feature_screens.dart';

class VehiclesScreen extends StatefulWidget {
  const VehiclesScreen({super.key});

  @override
  State<VehiclesScreen> createState() => _VehiclesScreenState();
}

class _VehiclesScreenState extends State<VehiclesScreen> {
  List<VehicleModel> _vehicles = [];
  bool _loading = true;
  String _query = '';
  String _filter = 'All';

  @override
  void initState() {
    super.initState();
    _fetchVehicles();
  }

  Future<void> _fetchVehicles() async {
    try {
      final res = await ApiService.get('/vehicles/my-vehicles');
      final data = res['vehicles'] as List? ?? [];
      setState(() {
        _vehicles = data.map((v) => VehicleModel.fromJson(v)).toList();
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  String _displayStatus(VehicleModel vehicle) {
    final live = vehicle.liveStatus?.toLowerCase();
    if (live == 'moving' || live == 'running') return 'Running';
    if (live == 'idle') return 'Idle';
    if (live == 'offline') return 'Offline';
    if (vehicle.activationStatus == 'activated') return 'Stopped';
    return 'Offline';
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _vehicles.where((v) {
      final text =
          '${v.vehicleNumber ?? ''} ${v.vehicleBrand ?? ''} ${v.vehicleModel ?? ''} ${v.imeiNumber}'
              .toLowerCase();
      final matchesQuery = text.contains(_query.toLowerCase());
      final status = _displayStatus(v);
      final matchesFilter = _filter == 'All' ||
          status == _filter ||
          (_filter == 'Expiring' && v.activatedAt != null);
      return matchesQuery && matchesFilter;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: const Text('My Vehicles',
            style: TextStyle(fontWeight: FontWeight.w700)),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Center(
              child: Text(
                '${_vehicles.length} Vehicles',
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: _loading
            ? const _VehicleSkeletonList()
            : RefreshIndicator(
                onRefresh: _fetchVehicles,
                color: AppColors.primaryDark,
                child: _vehicles.isEmpty
                    ? ListView(
                        children: const [
                          SizedBox(height: 120),
                          EmptyState(
                            icon: Icons.local_shipping_outlined,
                            title: 'No vehicles yet',
                            subtitle:
                                'Your activated GPS vehicles will appear here after service setup.',
                            actionLabel: 'Contact Support',
                          ),
                        ],
                      )
                    : ListView(
                        padding: const EdgeInsets.fromLTRB(16, 10, 16, 18),
                        children: [
                          _SearchAndFilters(
                              onQuery: (v) => setState(() => _query = v),
                              filter: _filter,
                              onFilter: (v) => setState(() => _filter = v)),
                          const SizedBox(height: 12),
                          ...filtered.map((vehicle) => _VehicleCard(
                              vehicle: vehicle,
                              status: _displayStatus(vehicle))),
                          if (filtered.isEmpty)
                            const Padding(
                              padding: EdgeInsets.only(top: 80),
                              child: EmptyState(
                                icon: Icons.search_off_rounded,
                                title: 'No matching vehicles',
                                subtitle:
                                    'Try another vehicle number or status filter.',
                              ),
                            ),
                        ],
                      ),
              ),
      ),
    );
  }
}

class _VehicleCard extends StatelessWidget {
  final VehicleModel vehicle;
  final String status;
  const _VehicleCard({required this.vehicle, required this.status});

  Color get _statusColor {
    switch (status) {
      case 'Running':
        return AppColors.success;
      case 'Stopped':
        return AppColors.error;
      case 'Idle':
        return AppColors.warning;
      default:
        return AppColors.offline;
    }
  }

  @override
  Widget build(BuildContext context) {
    final speed = vehicle.speedKmh == null
        ? '0 km/h'
        : '${vehicle.speedKmh!.toStringAsFixed(0)} km/h';
    final title = vehicle.vehicleNumber ?? 'Vehicle number pending';
    final model =
        '${vehicle.vehicleBrand ?? 'Vehicle'} ${vehicle.vehicleModel ?? vehicle.vehicleType}';
    final updated = vehicle.lastSeen ?? 'No GPS yet';
    final address = vehicle.lastLocation ?? 'Waiting for first GPS fix';
    final isMoving = (vehicle.speedKmh ?? 0) > 3 ||
        vehicle.liveStatus?.toLowerCase() == 'moving' ||
        vehicle.liveStatus?.toLowerCase() == 'running';
    final ignition = isMoving
        ? 'ON'
        : vehicle.lastIgnition == true
            ? 'ON'
            : vehicle.lastIgnition == false
                ? 'OFF'
                : 'Unknown';
    return SuperCard(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 10),
      onTap: () => _showVehicleActions(context, vehicle, status),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 54,
                height: 54,
                decoration: BoxDecoration(
                    color: AppColors.tint(_statusColor),
                    borderRadius: BorderRadius.circular(14)),
                child: Padding(
                  padding: const EdgeInsets.all(5),
                  child: Image.asset(
                    _vehicleImageAsset(vehicle.vehicleType),
                    fit: BoxFit.contain,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 16.5, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Text(model,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 12.5,
                            color: AppColors.textSecondary,
                            fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
              StatusBadge(label: status, color: _statusColor, compact: true),
            ],
          ),
          const SizedBox(height: 11),
          _CompactInfoRow(
            items: [
              _InfoMetric('Speed', speed),
              _InfoMetric('Ignition', ignition),
              _InfoMetric('Updated', updated),
            ],
          ),
          const SizedBox(height: 9),
          Row(
            children: [
              const Icon(Icons.location_on_rounded,
                  size: 16, color: AppColors.textMuted),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  address,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: 6),
              Icon(
                status == 'Offline'
                    ? Icons.gps_off_rounded
                    : Icons.gps_fixed_rounded,
                color: status == 'Offline' ? AppColors.offline : _statusColor,
                size: 15,
              ),
            ],
          ),
          const SizedBox(height: 8),
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => _showVehicleActions(context, vehicle, status),
            child: Row(
              children: const [
                Expanded(
                  child: Text(
                    'Tap vehicle for tracking options',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Icon(Icons.keyboard_arrow_up_rounded,
                    color: AppColors.textMuted, size: 20),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showVehicleActions(
      BuildContext context, VehicleModel vehicle, String status) {
    final title = vehicle.vehicleNumber ?? 'Vehicle number pending';
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => _VehicleActionsSheet(
        vehicle: vehicle,
        status: status,
        onOpen: (screen) {
          Navigator.pop(context);
          Navigator.push(context, MaterialPageRoute(builder: (_) => screen));
        },
        onShare: () async {
          Navigator.pop(context);
          final lat = vehicle.lastLatitude;
          final lng = vehicle.lastLongitude;
          final text = lat != null && lng != null
              ? 'SuperGPS location for $title: https://www.google.com/maps/search/?api=1&query=$lat,$lng'
              : 'SuperGPS vehicle: $title';
          final uri = Uri(
            scheme: 'sms',
            queryParameters: {'body': text},
          );
          if (await canLaunchUrl(uri)) {
            await launchUrl(uri);
          }
        },
      ),
    );
  }
}

class _VehicleActionsSheet extends StatelessWidget {
  final VehicleModel vehicle;
  final String status;
  final ValueChanged<Widget> onOpen;
  final VoidCallback onShare;

  const _VehicleActionsSheet({
    required this.vehicle,
    required this.status,
    required this.onOpen,
    required this.onShare,
  });

  @override
  Widget build(BuildContext context) {
    final title = vehicle.vehicleNumber ?? 'Vehicle number pending';
    final model = [
      vehicle.vehicleBrand,
      vehicle.vehicleModel,
      vehicle.vehicleType,
    ].whereType<String>().where((item) => item.isNotEmpty).join(' ');
    final actions = [
      _SheetAction(
          'Track',
          Icons.navigation_rounded,
          AppColors.primaryDark,
          () => onOpen(
              LiveTrackingScreen(vehicleNumber: title, vehicle: vehicle))),
      _SheetAction('Reports', Icons.summarize_rounded, AppColors.purple,
          () => onOpen(const ReportsScreen())),
      _SheetAction('Playback', Icons.history_rounded, AppColors.info,
          () => onOpen(const PlaybackScreen())),
      _SheetAction(
          'Share', Icons.share_location_rounded, AppColors.success, onShare),
      _SheetAction('Details', Icons.article_outlined, AppColors.textPrimary,
          () => onOpen(VehicleDetailsScreen(vehicle: vehicle))),
      _SheetAction('Lock', Icons.lock_rounded, AppColors.error,
          () => onOpen(const EngineLockScreen())),
      _SheetAction('Alerts', Icons.notifications_active_rounded,
          AppColors.warning, () => onOpen(const AlertsScreen())),
      _SheetAction('Parking', Icons.local_parking_rounded, AppColors.accent,
          () => onOpen(const ParkingModeScreen())),
    ];

    return SafeArea(
      child: Container(
        padding: const EdgeInsets.fromLTRB(18, 10, 18, 22),
        decoration: const BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Container(
                  width: 62,
                  height: 62,
                  decoration: BoxDecoration(
                    color: AppColors.tint(AppColors.primary),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(6),
                    child: Image.asset(
                      _vehicleImageAsset(vehicle.vehicleType),
                      fit: BoxFit.contain,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 18, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 2),
                      Text(model.isEmpty ? status : '$model - $status',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontWeight: FontWeight.w700)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: actions.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 4,
                mainAxisSpacing: 12,
                crossAxisSpacing: 10,
                childAspectRatio: 0.86,
              ),
              itemBuilder: (_, i) => _SheetActionButton(action: actions[i]),
            ),
          ],
        ),
      ),
    );
  }
}

String _vehicleImageAsset(String type) {
  final normalized = type.toLowerCase();
  if (normalized.contains('truck') || normalized.contains('lorry')) {
    return 'assets/gps_marker/trucks.png';
  }
  if (normalized.contains('bike') ||
      normalized.contains('motorcycle') ||
      normalized.contains('scooter')) {
    return 'assets/gps_marker/bike.png';
  }
  return 'assets/gps_marker/car.png';
}

class _SheetAction {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _SheetAction(this.label, this.icon, this.color, this.onTap);
}

class _SheetActionButton extends StatelessWidget {
  final _SheetAction action;
  const _SheetActionButton({required this.action});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: action.onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: AppColors.tint(action.color),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: action.color.withValues(alpha: 0.16)),
            ),
            child: Icon(action.icon, color: action.color, size: 23),
          ),
          const SizedBox(height: 7),
          Text(
            action.label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoMetric {
  final String label;
  final String value;
  const _InfoMetric(this.label, this.value);
}

class _CompactInfoRow extends StatelessWidget {
  final List<_InfoMetric> items;
  const _CompactInfoRow({required this.items});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
          color: AppColors.bg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border)),
      child: Row(
        children: List.generate(items.length * 2 - 1, (i) {
          if (i.isOdd) {
            return Container(
              width: 1,
              height: 28,
              margin: const EdgeInsets.symmetric(horizontal: 8),
              color: AppColors.border,
            );
          }
          final item = items[i ~/ 2];
          return Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 13.5, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 1),
                Text(
                  item.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 10,
                      fontWeight: FontWeight.w600),
                ),
              ],
            ),
          );
        }),
      ),
    );
  }
}

class _SearchAndFilters extends StatelessWidget {
  final ValueChanged<String> onQuery;
  final String filter;
  final ValueChanged<String> onFilter;

  const _SearchAndFilters(
      {required this.onQuery, required this.filter, required this.onFilter});

  @override
  Widget build(BuildContext context) {
    final filters = [
      'All',
      'Running',
      'Stopped',
      'Idle',
      'Offline',
      'Expiring'
    ];
    return Column(
      children: [
        SizedBox(
          height: 50,
          child: TextField(
            onChanged: onQuery,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.search_rounded, size: 22),
              hintText: 'Search vehicle number',
              hintStyle: const TextStyle(
                  color: AppColors.textSecondary, fontWeight: FontWeight.w500),
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(15),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(15),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(15),
                borderSide:
                    const BorderSide(color: AppColors.primaryDark, width: 1.4),
              ),
            ),
          ),
        ),
        const SizedBox(height: 10),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: filters.map((item) {
              final selected = filter == item;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  visualDensity: VisualDensity.compact,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  label: Text(item),
                  selected: selected,
                  onSelected: (_) => onFilter(item),
                  selectedColor: AppColors.primary,
                  backgroundColor: AppColors.surface,
                  labelStyle: TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: selected ? FontWeight.w700 : FontWeight.w700),
                  side: BorderSide(
                      color:
                          selected ? AppColors.primaryDark : AppColors.border),
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
}

class _VehicleSkeletonList extends StatelessWidget {
  const _VehicleSkeletonList();

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: 5,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (_, __) => SuperCard(
        child: Column(
          children: [
            Row(
              children: [
                Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                        color: AppColors.border,
                        borderRadius: BorderRadius.circular(16))),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    children: [
                      Container(
                          height: 14,
                          decoration: BoxDecoration(
                              color: AppColors.border,
                              borderRadius: BorderRadius.circular(8))),
                      const SizedBox(height: 8),
                      Container(
                          height: 12,
                          decoration: BoxDecoration(
                              color: AppColors.divider,
                              borderRadius: BorderRadius.circular(8))),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
