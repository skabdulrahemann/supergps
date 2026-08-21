import 'package:flutter/material.dart';
import '../constants/colors.dart';
import '../models/vehicle_model.dart';
import '../services/api_service.dart';
import 'help_screen.dart';
import 'orders_screen.dart';
import 'profile_screen.dart';
import 'shop_screen.dart';

const _demoVehicle = 'MH26CH5075';
const _demoAddress = 'Shivaji Nagar, Nanded, Maharashtra';

class LiveTrackingScreen extends StatelessWidget {
  final String vehicleNumber;
  final VehicleModel? vehicle;
  const LiveTrackingScreen(
      {super.key, this.vehicleNumber = _demoVehicle, this.vehicle});

  Future<Map<String, dynamic>?> _loadLatest() async {
    final vehicleId = vehicle?.id;
    if (vehicleId == null || vehicleId.isEmpty) return null;
    final res = await ApiService.get('/tracking/$vehicleId/latest');
    return Map<String, dynamic>.from(res as Map);
  }

  String _formatSpeed(dynamic value) {
    final speed = double.tryParse(value?.toString() ?? '');
    if (speed == null) return '0 km/h';
    return '${speed.round()} km/h';
  }

  String _formatStatus(Map<String, dynamic>? snapshot) {
    final lastSeen = snapshot?['lastSeenAt'];
    if (lastSeen == null) return 'Offline';
    final speed = double.tryParse(snapshot?['lastSpeedKmh']?.toString() ?? '');
    if ((speed ?? 0) > 3) return 'Running';
    if (snapshot?['lastIgnition'] == true) return 'Idle';
    return 'Stopped';
  }

  @override
  Widget build(BuildContext context) {
    final number = vehicle?.vehicleNumber ?? vehicleNumber;
    return _Page(
      title: 'Live Tracking',
      action: IconButton(
        icon: const Icon(Icons.refresh_rounded),
        onPressed: () => Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => LiveTrackingScreen(
              vehicleNumber: vehicleNumber,
              vehicle: vehicle,
            ),
          ),
        ),
      ),
      child: FutureBuilder<Map<String, dynamic>?>(
        future: _loadLatest(),
        builder: (context, snapshot) {
          final data = snapshot.data;
          final position = data?['position'] as Map<String, dynamic>?;
          final vehicleSnapshot = data?['vehicle'] as Map<String, dynamic>?;
          final hasPosition =
              position?['latitude'] != null && position?['longitude'] != null;
          final status = _formatStatus(vehicleSnapshot);
          final speed = _formatSpeed(position?['speedKmh'] ??
              vehicleSnapshot?['lastSpeedKmh'] ??
              vehicle?.speedKmh);
          final updated = position?['deviceTimestamp']?.toString() ??
              vehicleSnapshot?['lastSeenAt']?.toString() ??
              vehicle?.lastSeen ??
              'Not received yet';
          final location = hasPosition
              ? '${position!['latitude']}, ${position['longitude']}'
              : vehicle?.lastLocation ?? 'Waiting for first GPS fix';

          if (snapshot.connectionState == ConnectionState.waiting &&
              vehicle != null) {
            return const Center(
              child: CircularProgressIndicator(color: AppColors.primaryDark),
            );
          }

          return Column(
            children: [
              Expanded(
                child: _MapMock(
                  title: number,
                  subtitle: hasPosition
                      ? '$status - $speed - $location'
                      : 'No GPS data received yet',
                  icon: hasPosition
                      ? Icons.navigation_rounded
                      : Icons.gps_off_rounded,
                  route: hasPosition,
                ),
              ),
              _BottomSheetCard(
                children: [
                  _StatusRow(vehicle: number, status: status, speed: speed),
                  const Divider(height: 26),
                  _InfoLine(
                      icon: Icons.location_on_rounded,
                      label: 'Location',
                      value: location),
                  _InfoLine(
                      icon: Icons.access_time_rounded,
                      label: 'Updated',
                      value: updated),
                  _InfoLine(
                      icon: Icons.vpn_key_rounded,
                      label: 'Ignition',
                      value: position?['ignition'] == true
                          ? 'ON'
                          : position?['ignition'] == false
                              ? 'OFF'
                              : 'Unknown'),
                  _InfoLine(
                      icon: Icons.gps_fixed_rounded,
                      label: 'GPS / Network',
                      value: hasPosition ? 'Received / Online' : 'Waiting'),
                ],
              ),
            ],
          );
        },
      ),
    );
  }
}

class VehicleDetailsScreen extends StatelessWidget {
  final VehicleModel? vehicle;
  const VehicleDetailsScreen({super.key, this.vehicle});

  @override
  Widget build(BuildContext context) {
    final number = vehicle?.vehicleNumber ?? _demoVehicle;
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
                model:
                    '${vehicle?.vehicleBrand ?? 'Maruti'} ${vehicle?.vehicleModel ?? 'Swift'}'),
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
                      _MetricGrid(items: const [
                        _Metric('Speed', '48 km/h', Icons.speed_rounded,
                            AppColors.primary),
                        _Metric('Fuel', '72%', Icons.local_gas_station_rounded,
                            AppColors.warning),
                        _Metric(
                            'Battery',
                            '12.8 V',
                            Icons.battery_charging_full_rounded,
                            AppColors.success),
                        _Metric('Odometer', '24,820 km',
                            Icons.social_distance_rounded, AppColors.purple),
                      ]),
                      const SizedBox(height: 14),
                      const _InfoPanel(title: 'Last Location', lines: [
                        _Line(Icons.location_on_rounded, 'Location',
                            _demoAddress),
                        _Line(Icons.access_time_rounded, 'Last Update',
                            'Today, 6:18 PM'),
                      ]),
                      const SizedBox(height: 14),
                      Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        children: [
                          _CommandChip(
                              label: 'Engine Off',
                              icon: Icons.power_settings_new_rounded,
                              color: AppColors.error),
                          _CommandChip(
                              label: 'Lock',
                              icon: Icons.lock_rounded,
                              color: AppColors.purple),
                          _CommandChip(
                              label: 'Refresh',
                              icon: Icons.refresh_rounded,
                              color: AppColors.primary),
                        ],
                      ),
                    ],
                  ),
                  const _SimpleList(items: [
                    'IMEI: 861234567890123',
                    'Device: SG-4G-Pro',
                    'SIM: 899100000000',
                    'Installed by: Super GPS Dealer'
                  ]),
                  const _SimpleList(items: [
                    'Overspeed • Today 5:42 PM',
                    'Ignition ON • Today 4:08 PM',
                    'Geofence Exit • Yesterday'
                  ]),
                  const _SimpleList(items: [
                    'Trip: 42 km • Today',
                    'Stop: 18 min • Railway Station',
                    'Playback available for last 90 days'
                  ]),
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
    return _Page(
      title: 'Playback',
      child: Column(
        children: [
          Expanded(
            child: _MapMock(
                title: _demoVehicle,
                subtitle: 'Route playback • 86.4 km',
                icon: Icons.play_arrow_rounded,
                route: true),
          ),
          _BottomSheetCard(
            children: [
              const Row(
                children: [
                  Expanded(
                      child:
                          _SmallField(label: 'Vehicle', value: _demoVehicle)),
                  SizedBox(width: 10),
                  Expanded(child: _SmallField(label: 'Date', value: 'Today')),
                ],
              ),
              const SizedBox(height: 16),
              Slider(value: 0.42, onChanged: (_) {}),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton.filled(
                      onPressed: () {},
                      icon: const Icon(Icons.play_arrow_rounded)),
                  const Text('1x',
                      style: TextStyle(
                          fontWeight: FontWeight.w800, fontFamily: 'Inter')),
                  const Text('2x',
                      style: TextStyle(
                          fontWeight: FontWeight.w800, fontFamily: 'Inter')),
                  const Text('4x',
                      style: TextStyle(
                          fontWeight: FontWeight.w800, fontFamily: 'Inter')),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class AlertsScreen extends StatelessWidget {
  const AlertsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final alerts = [
      (
        'Overspeed Alert',
        'High',
        _demoVehicle,
        'Today, 6:12 PM',
        AppColors.error,
        Icons.speed_rounded
      ),
      (
        'Geofence Exit',
        'Medium',
        'MH26AB1234',
        'Today, 4:05 PM',
        AppColors.warning,
        Icons.fence_rounded
      ),
      (
        'Ignition ON',
        'Low',
        'MH15JK6789',
        'Yesterday',
        AppColors.success,
        Icons.vpn_key_rounded
      ),
      (
        'Power Disconnect',
        'High',
        _demoVehicle,
        '18 Aug 2026',
        AppColors.error,
        Icons.power_off_rounded
      ),
    ];
    return DefaultTabController(
      length: 3,
      child: _Page(
        title: 'Alerts',
        action: IconButton(
          icon: const Icon(Icons.tune_rounded),
          onPressed: () {},
        ),
        child: Column(
          children: [
            const TabBar(
              labelColor: AppColors.primary,
              unselectedLabelColor: AppColors.textSecondary,
              indicatorColor: AppColors.primary,
              tabs: [
                Tab(text: 'All'),
                Tab(text: 'Today'),
                Tab(text: 'This Week')
              ],
            ),
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.all(18),
                itemCount: alerts.length,
                itemBuilder: (_, i) {
                  final a = alerts[i];
                  return _FeatureTile(
                    icon: a.$6,
                    color: a.$5,
                    title: a.$1,
                    subtitle: '${a.$3} • ${a.$4}',
                    trailing: a.$2,
                    onTap: () => _showAlertDetail(context, a.$1, a.$3, a.$4),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showAlertDetail(
      BuildContext context, String title, String vehicle, String time) {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (_) => Padding(
        padding: const EdgeInsets.all(22),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    fontFamily: 'Inter')),
            const SizedBox(height: 14),
            _InfoLine(
                icon: Icons.directions_car_rounded,
                label: 'Vehicle',
                value: vehicle),
            _InfoLine(
                icon: Icons.access_time_rounded, label: 'Time', value: time),
            const _InfoLine(
                icon: Icons.location_on_rounded,
                label: 'Location',
                value: _demoAddress),
          ],
        ),
      ),
    );
  }
}

class ReportsScreen extends StatelessWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final reports = [
      ('Daily Report', Icons.today_rounded, AppColors.primary),
      ('Trip Report', Icons.route_rounded, AppColors.success),
      ('Summary Report', Icons.summarize_rounded, AppColors.purple),
      ('Stoppage Report', Icons.pause_circle_rounded, AppColors.warning),
      ('Speed Report', Icons.speed_rounded, AppColors.error),
      ('Fuel Report', Icons.local_gas_station_rounded, AppColors.accent),
    ];
    return _Page(
      title: 'Reports',
      child: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          const Row(
            children: [
              Expanded(
                  child: _SmallField(label: 'Vehicle', value: _demoVehicle)),
              SizedBox(width: 10),
              Expanded(child: _SmallField(label: 'Range', value: 'This Week')),
            ],
          ),
          const SizedBox(height: 18),
          ...reports.map((r) => _FeatureTile(
                icon: r.$2,
                color: r.$3,
                title: r.$1,
                subtitle: 'Generate, export PDF/Excel aur WhatsApp share',
                trailing: 'Generate',
                onTap: () {},
              )),
        ],
      ),
    );
  }
}

class GeofenceListScreen extends StatelessWidget {
  const GeofenceListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final zones = ['Home', 'Office', 'Warehouse', 'Work Site'];
    return _Page(
      title: 'Geofence',
      action: IconButton(
        icon: const Icon(Icons.add_circle_outline_rounded),
        onPressed: () => Navigator.push(context,
            MaterialPageRoute(builder: (_) => const AddGeofenceScreen())),
      ),
      child: ListView(
        padding: const EdgeInsets.all(18),
        children: zones
            .map((z) => _FeatureTile(
                  icon: Icons.fence_rounded,
                  color: AppColors.primary,
                  title: z,
                  subtitle: '500 m radius • Entry/Exit enabled',
                  trailing: 'Active',
                  onTap: () {},
                ))
            .toList(),
      ),
    );
  }
}

class AddGeofenceScreen extends StatelessWidget {
  const AddGeofenceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return _Page(
      title: 'Add Geofence',
      child: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          const SizedBox(
              height: 260,
              child: _MapMock(
                  title: 'Choose center',
                  subtitle: _demoAddress,
                  icon: Icons.add_location_alt_rounded)),
          const SizedBox(height: 16),
          const _SmallField(label: 'Geofence Name', value: 'Home'),
          const SizedBox(height: 12),
          const _SmallField(label: 'Radius', value: '500 m'),
          const SizedBox(height: 12),
          const _SmallField(label: 'Vehicles', value: 'All vehicles'),
          SwitchListTile(
            value: true,
            onChanged: (_) {},
            contentPadding: EdgeInsets.zero,
            title: const Text('Entry/Exit Alerts',
                style: TextStyle(
                    fontWeight: FontWeight.w800, fontFamily: 'Inter')),
          ),
          const SizedBox(height: 18),
          _PrimaryButton(
              label: 'Save Geofence', onTap: () => Navigator.pop(context)),
        ],
      ),
    );
  }
}

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return _Page(
      title: 'Notifications',
      action: TextButton(onPressed: () {}, child: const Text('Mark all read')),
      child: const _SimpleList(items: [
        'Renewal due in 12 days',
        'Server maintenance completed',
        'SOS alert resolved for MH26CH5075',
        'New fuel sensor product available',
      ]),
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
          _FeatureTile(
              icon: Icons.person_rounded,
              color: AppColors.primary,
              title: 'Profile',
              subtitle: 'Name, mobile, email',
              onTap: () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const ProfileScreen()))),
          _FeatureTile(
              icon: Icons.lock_rounded,
              color: AppColors.purple,
              title: 'Change Password',
              subtitle: 'Update login password',
              onTap: () {}),
          _FeatureTile(
              icon: Icons.notifications_active_rounded,
              color: AppColors.warning,
              title: 'Notification Settings',
              subtitle: 'Alert preferences',
              onTap: () {}),
          _FeatureTile(
              icon: Icons.speed_rounded,
              color: AppColors.success,
              title: 'Units',
              subtitle: 'km/h',
              onTap: () {}),
          _FeatureTile(
              icon: Icons.language_rounded,
              color: AppColors.accent,
              title: 'Language',
              subtitle: 'English / Hindi / Marathi',
              onTap: () {}),
          _FeatureTile(
              icon: Icons.help_rounded,
              color: AppColors.primary,
              title: 'Help & Support',
              subtitle: 'Chat, call, ticket',
              onTap: () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const HelpScreen()))),
          _FeatureTile(
              icon: Icons.info_rounded,
              color: AppColors.textSecondary,
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
          _InfoBanner(
              title: 'Renewal due in 12 days',
              subtitle: 'Plan: Super GPS Pro • Expiry: 01 Sep 2026',
              icon: Icons.workspace_premium_rounded),
          const SizedBox(height: 16),
          _PrimaryButton(
              label: 'Contact for Renewal',
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
      child: _SimpleList(items: [
        'Device Model: SG-4G-Pro',
        'IMEI: 861234567890123',
        'SIM: Active',
        'GPS: Online',
        'Network: Strong',
        'Firmware: v2.4.1',
      ]),
    );
  }
}

class VehicleDocumentsScreen extends StatelessWidget {
  const VehicleDocumentsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _Page(
      title: 'Vehicle Documents',
      child: _SimpleList(items: [
        'RC Book • Uploaded',
        'Insurance • Expiring soon',
        'PUC • Valid',
        'Permit • Not uploaded',
      ]),
    );
  }
}

class EngineLockScreen extends StatefulWidget {
  const EngineLockScreen({super.key});

  @override
  State<EngineLockScreen> createState() => _EngineLockScreenState();
}

class _EngineLockScreenState extends State<EngineLockScreen> {
  bool _locked = false;
  String _state = 'Ready';

  void _confirmCommand(bool lock) {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (_) => Padding(
        padding: const EdgeInsets.fromLTRB(22, 8, 22, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(lock ? 'Lock Engine?' : 'Enable Engine?',
                style: const TextStyle(
                    fontSize: 21,
                    fontWeight: FontWeight.w900,
                    fontFamily: 'Inter')),
            const SizedBox(height: 10),
            const Text(
              'Vehicle must be safely stationary before engine immobilization. This command requires customer authorization and backend audit.',
              style: TextStyle(
                  color: AppColors.textSecondary,
                  height: 1.45,
                  fontFamily: 'Inter'),
            ),
            const SizedBox(height: 18),
            _PrimaryButton(
              label: lock ? 'Confirm Lock Engine' : 'Confirm Enable Engine',
              onTap: () {
                Navigator.pop(context);
                setState(() {
                  _locked = lock;
                  _state = lock ? 'Command Accepted' : 'Engine Enabled';
                });
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return _Page(
      title: 'Engine Lock',
      child: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          _InfoBanner(
            title: _locked ? 'ENGINE LOCKED' : 'ENGINE ACTIVE',
            subtitle: 'MH26CH5075 - Last command: $_state',
            icon: _locked ? Icons.lock_rounded : Icons.lock_open_rounded,
          ),
          const SizedBox(height: 16),
          _PrimaryButton(
              label: _locked ? 'Enable Engine' : 'Lock Engine',
              onTap: () => _confirmCommand(!_locked)),
        ],
      ),
    );
  }
}

class ShareLocationScreen extends StatelessWidget {
  const ShareLocationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final durations = [
      '15 Minutes',
      '30 Minutes',
      '1 Hour',
      '3 Hours',
      '24 Hours',
      'Custom'
    ];
    return _Page(
      title: 'Share Live Location',
      child: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          const _SmallField(label: 'Vehicle', value: _demoVehicle),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: durations
                .map((d) => ActionChip(label: Text(d), onPressed: () {}))
                .toList(),
          ),
          const SizedBox(height: 18),
          _PrimaryButton(label: 'Generate Secure Link', onTap: () {}),
          const SizedBox(height: 18),
          _FeatureTile(
            icon: Icons.link_rounded,
            color: AppColors.success,
            title: 'Active link',
            subtitle: 'Expires in 54 minutes',
            trailing: 'Stop',
            onTap: () {},
          ),
        ],
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
          _InfoBanner(
              title: 'MH26CH5075',
              subtitle: 'Active - HDFC FASTag - Balance where supported',
              icon: Icons.toll_rounded),
          const SizedBox(height: 14),
          _FeatureTile(
              icon: Icons.account_balance_wallet_rounded,
              color: AppColors.primary,
              title: 'Recharge FASTag',
              subtitle: 'UPI, cards and net banking',
              trailing: 'Recharge',
              onTap: () {}),
          _FeatureTile(
              icon: Icons.receipt_long_rounded,
              color: AppColors.info,
              title: 'Transaction History',
              subtitle: 'Last debit: Toll Plaza - Rs 95',
              onTap: () {}),
          _FeatureTile(
              icon: Icons.support_agent_rounded,
              color: AppColors.success,
              title: 'FASTag Support',
              subtitle: 'KYC, replacement and status help',
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
      child: _SimpleList(items: [
        'Fuel Level: 72%',
        'Estimated Litres: 38 L',
        'Daily Consumption: 12.4 L',
        'Fuel Drop Alerts: Enabled',
        'Fuel vs Time graph requires supported sensor data',
      ]),
    );
  }
}

class DriversScreen extends StatelessWidget {
  const DriversScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return _Page(
      title: 'Drivers',
      action: IconButton(icon: const Icon(Icons.add_rounded), onPressed: () {}),
      child: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          _FeatureTile(
              icon: Icons.badge_rounded,
              color: AppColors.success,
              title: 'Ramesh Patil',
              subtitle: '+91 98765 43210 - Assigned: MH26CH5075',
              trailing: 'Call',
              onTap: () {}),
          _FeatureTile(
              icon: Icons.badge_rounded,
              color: AppColors.warning,
              title: 'Amit Shinde',
              subtitle: '+91 91234 56780 - No vehicle assigned',
              trailing: 'Assign',
              onTap: () {}),
        ],
      ),
    );
  }
}

class InvoiceScreen extends StatelessWidget {
  const InvoiceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return _Page(
      title: 'Invoices',
      child: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          _FeatureTile(
              icon: Icons.description_rounded,
              color: AppColors.primary,
              title: 'INV-2026-0091',
              subtitle: 'GPS Renewal - Rs 2,950 - Paid',
              trailing: 'PDF',
              onTap: () {}),
          _FeatureTile(
              icon: Icons.description_rounded,
              color: AppColors.info,
              title: 'INV-2026-0044',
              subtitle: 'FASTag Service - Rs 500 - Paid',
              trailing: 'Share',
              onTap: () {}),
        ],
      ),
    );
  }
}

class SecurityScreen extends StatelessWidget {
  const SecurityScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return _Page(
      title: 'Security',
      child: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          SwitchListTile(
              value: true,
              onChanged: (_) {},
              title: const Text('Biometric Login',
                  style: TextStyle(
                      fontWeight: FontWeight.w800, fontFamily: 'Inter'))),
          SwitchListTile(
              value: true,
              onChanged: (_) {},
              title: const Text('App Lock',
                  style: TextStyle(
                      fontWeight: FontWeight.w800, fontFamily: 'Inter'))),
          _FeatureTile(
              icon: Icons.pin_rounded,
              color: AppColors.danger,
              title: 'Sensitive Command PIN',
              subtitle: 'Required for engine commands',
              onTap: () {}),
          _FeatureTile(
              icon: Icons.password_rounded,
              color: AppColors.textPrimary,
              title: 'Change Password',
              subtitle: 'Update your login password',
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
              fontFamily: 'Inter'),
        ),
      ),
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
                fontWeight: FontWeight.w900, fontFamily: 'Inter')),
        actions: action == null ? null : [action!],
      ),
      body: SafeArea(child: child),
    );
  }
}

class _MapMock extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final bool route;

  const _MapMock(
      {required this.title,
      required this.subtitle,
      required this.icon,
      this.route = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFFEAF3FF),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.border),
      ),
      child: Stack(
        children: [
          Positioned.fill(
              child: CustomPaint(painter: _GridPainter(route: route))),
          Center(
            child: Container(
              width: 74,
              height: 74,
              decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                        color: AppColors.primary.withOpacity(0.28),
                        blurRadius: 18,
                        offset: const Offset(0, 8)),
                  ]),
              child: Icon(icon, color: Colors.white, size: 38),
            ),
          ),
          Positioned(
            left: 16,
            right: 16,
            bottom: 16,
            child: _InfoBanner(
                title: title,
                subtitle: subtitle,
                icon: Icons.location_on_rounded),
          ),
        ],
      ),
    );
  }
}

class _GridPainter extends CustomPainter {
  final bool route;
  const _GridPainter({required this.route});

  @override
  void paint(Canvas canvas, Size size) {
    final grid = Paint()
      ..color = Colors.white.withOpacity(0.75)
      ..strokeWidth = 1;
    for (double x = 0; x < size.width; x += 42) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), grid);
    }
    for (double y = 0; y < size.height; y += 42) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), grid);
    }
    if (route) {
      final paint = Paint()
        ..color = AppColors.primary
        ..strokeWidth = 5
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round;
      final path = Path()
        ..moveTo(size.width * .16, size.height * .72)
        ..cubicTo(size.width * .32, size.height * .48, size.width * .45,
            size.height * .85, size.width * .62, size.height * .42)
        ..cubicTo(size.width * .72, size.height * .18, size.width * .86,
            size.height * .38, size.width * .82, size.height * .24);
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

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
                    fontWeight: FontWeight.w900,
                    fontFamily: 'Inter')),
            Text('$status • $speed',
                style: const TextStyle(
                    color: AppColors.textSecondary, fontFamily: 'Inter')),
          ]),
        ),
      ],
    );
  }
}

class _VehicleHero extends StatelessWidget {
  final String number;
  final String model;
  const _VehicleHero({required this.number, required this.model});

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
                        fontWeight: FontWeight.w900,
                        fontFamily: 'Inter')),
                Text(model,
                    style: const TextStyle(
                        color: Colors.white70, fontFamily: 'Inter')),
              ])),
          const Text('Running',
              style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontFamily: 'Inter')),
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
                          fontWeight: FontWeight.w900,
                          fontSize: 16,
                          fontFamily: 'Inter')),
                  Text(item.label,
                      style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12,
                          fontFamily: 'Inter')),
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
                fontWeight: FontWeight.w900, fontFamily: 'Inter')),
        subtitle: Text(subtitle,
            style: const TextStyle(
                color: AppColors.textSecondary,
                fontFamily: 'Inter',
                fontSize: 12)),
        trailing: trailing == null
            ? const Icon(Icons.chevron_right_rounded)
            : Text(trailing!,
                style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.w800,
                    fontFamily: 'Inter',
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
                  fontWeight: FontWeight.w900,
                  color: AppColors.textPrimary,
                  fontFamily: 'Inter')),
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
                  fontWeight: FontWeight.w900, fontFamily: 'Inter')),
          Text(subtitle,
              style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.textSecondary,
                  fontFamily: 'Inter')),
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
                color: AppColors.textSecondary, fontFamily: 'Inter')),
        Expanded(
            child: Text(value,
                style: const TextStyle(
                    fontWeight: FontWeight.w800, fontFamily: 'Inter'),
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
                fontWeight: FontWeight.w900, fontFamily: 'Inter')),
        const SizedBox(height: 12),
        ...lines.map(
            (l) => _InfoLine(icon: l.icon, label: l.label, value: l.value)),
      ]),
    );
  }
}

class _CommandChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  const _CommandChip(
      {required this.label, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return ActionChip(
      avatar: Icon(icon, color: color, size: 18),
      label: Text(label,
          style: TextStyle(
              color: color, fontWeight: FontWeight.w800, fontFamily: 'Inter')),
      onPressed: () {},
      backgroundColor: AppColors.tint(color),
      side: BorderSide(color: color.withOpacity(0.18)),
    );
  }
}

class _SmallField extends StatelessWidget {
  final String label;
  final String value;
  const _SmallField({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label,
            style: const TextStyle(
                fontSize: 12,
                color: AppColors.textSecondary,
                fontFamily: 'Inter')),
        const SizedBox(height: 4),
        Text(value,
            style: const TextStyle(
                fontWeight: FontWeight.w900, fontFamily: 'Inter')),
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
                fontWeight: FontWeight.w900, fontFamily: 'Inter')),
      ),
    );
  }
}
