import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../constants/colors.dart';
import '../widgets/bottom_nav.dart';
import 'shop_screen.dart';
import 'vehicles_screen.dart';
import 'help_screen.dart';
import 'gps_feature_screens.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  late final _screens = [
    _HomeTab(onNavigate: _goTo),
    const VehiclesScreen(),
    const AlertsScreen(),
    const MoreScreen(),
  ];

  void _goTo(int i) => setState(() => _currentIndex = i);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: IndexedStack(index: _currentIndex, children: _screens),
      bottomNavigationBar: BottomNav(currentIndex: _currentIndex, onTap: _goTo),
      floatingActionButton: _currentIndex == 0
          ? FloatingActionButton(
              onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const HelpScreen())),
              backgroundColor: AppColors.primary,
              elevation: 4,
              child: const Icon(Icons.headset_mic_rounded, color: Colors.white),
            )
          : null,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Placeholder data for the live-fleet section of the home screen.
// TODO: replace with real data once the live-tracking / fleet-summary API
// endpoint is wired up (e.g. GET /api/vehicles/fleet-summary).
// ─────────────────────────────────────────────────────────────────────────
class _FleetSummary {
  final int online;
  final int offline;
  final int moving;
  final int alerts;
  const _FleetSummary({required this.online, required this.offline, required this.moving, required this.alerts});
}

class _AlertItem {
  final String title;
  final String severity; // High | Medium | Low
  final String vehicleNumber;
  final String timeAgo;
  const _AlertItem({required this.title, required this.severity, required this.vehicleNumber, required this.timeAgo});
}

class _TrackedVehicle {
  final String vehicleNumber;
  final String status; // Online | Moving | Offline
  final String speed;
  final String location;
  const _TrackedVehicle({required this.vehicleNumber, required this.status, required this.speed, required this.location});
}

const _fleetSummary = _FleetSummary(online: 12, offline: 2, moving: 8, alerts: 3);

const _recentAlerts = [
  _AlertItem(title: 'Overspeed Alert', severity: 'High', vehicleNumber: 'MH26CH5075', timeAgo: '2 min ago'),
  _AlertItem(title: 'Ignition ON', severity: 'Medium', vehicleNumber: 'MH26AB1234', timeAgo: '15 min ago'),
];

const _trackedVehicles = [
  _TrackedVehicle(vehicleNumber: 'MH26CH5075', status: 'Online', speed: '45 km/h', location: 'Nanded, Maharashtra'),
  _TrackedVehicle(vehicleNumber: 'MH26AB1234', status: 'Moving', speed: '62 km/h', location: 'Hingoli, Maharashtra'),
  _TrackedVehicle(vehicleNumber: 'MH15JK6789', status: 'Offline', speed: '', location: 'Nanded, MH'),
];

// ─────────────────────────────────────────────────────────────────────────

class _HomeTab extends StatefulWidget {
  final ValueChanged<int> onNavigate;
  const _HomeTab({required this.onNavigate});

  @override
  State<_HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<_HomeTab> {
  final _bannerController = PageController();
  int _bannerIndex = 0;

  @override
  void dispose() {
    _bannerController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = Provider.of<AuthProvider>(context).user;
    final firstName = (user?.name.isNotEmpty ?? false) ? user!.name.split(' ').first : 'there';

    return SafeArea(
      child: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () async {
          // TODO: refresh fleet summary / alerts / vehicles from API
          await Future.delayed(const Duration(milliseconds: 600));
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader(firstName),
              const SizedBox(height: 20),
              _buildBannerCarousel(context),
              const SizedBox(height: 24),
              _buildSectionHeader('Your Fleet Overview', onViewAll: () => widget.onNavigate(1)),
              const SizedBox(height: 14),
              _buildFleetOverview(),
              const SizedBox(height: 26),
              const Text('Quick Actions',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textPrimary, fontFamily: 'Inter')),
              const SizedBox(height: 14),
              _buildQuickActions(context),
              const SizedBox(height: 26),
              _buildSectionHeader('Recent Alerts', onViewAll: () => widget.onNavigate(2)),
              const SizedBox(height: 12),
              _buildRecentAlerts(),
              const SizedBox(height: 26),
              _buildSectionHeader('Recently Tracked Vehicles', onViewAll: () => widget.onNavigate(1)),
              const SizedBox(height: 12),
              _buildTrackedVehicles(),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(String firstName) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Hello, $firstName 👋',
                style: const TextStyle(fontSize: 14, color: AppColors.textSecondary, fontFamily: 'Inter', fontWeight: FontWeight.w500)),
            const SizedBox(height: 2),
            const Text('SuperGPS',
                style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: AppColors.textPrimary, fontFamily: 'Inter', letterSpacing: -0.5)),
          ],
        ),
        Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: AppColors.surface,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.border),
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 2))],
              ),
              child: const Icon(Icons.notifications_outlined, color: AppColors.textPrimary, size: 22),
            ),
            Positioned(
              top: -2,
              right: -2,
              child: Container(
                padding: const EdgeInsets.all(4),
                decoration: const BoxDecoration(color: AppColors.error, shape: BoxShape.circle, border: Border.fromBorderSide(BorderSide(color: Colors.white, width: 1.5))),
                constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                child: const Text('3', textAlign: TextAlign.center, style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700, fontFamily: 'Inter')),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildBannerCarousel(BuildContext context) {
    final banners = [
      _proBanner(context),
      _referBanner(context),
    ];
    return Column(
      children: [
        SizedBox(
          height: 190,
          child: PageView(
            controller: _bannerController,
            onPageChanged: (i) => setState(() => _bannerIndex = i),
            children: banners,
          ),
        ),
        const SizedBox(height: 10),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(banners.length, (i) {
            final active = i == _bannerIndex;
            return AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.symmetric(horizontal: 3),
              width: active ? 18 : 6,
              height: 6,
              decoration: BoxDecoration(
                color: active ? AppColors.primary : AppColors.border,
                borderRadius: BorderRadius.circular(3),
              ),
            );
          }),
        ),
      ],
    );
  }

  Widget _proBanner(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: AppColors.primaryGradient,
        borderRadius: BorderRadius.circular(26),
        boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.28), blurRadius: 20, offset: const Offset(0, 10))],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -10,
            top: 0,
            bottom: 0,
            child: Center(
              child: Container(
                width: 92,
                height: 92,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(colors: [Colors.white.withOpacity(0.16), Colors.white.withOpacity(0.0)]),
                ),
                child: const Icon(Icons.gps_fixed_rounded, color: Colors.white, size: 44),
              ),
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(8)),
                child: const Text('SUPERGPS PRO',
                    style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800, fontFamily: 'Inter', letterSpacing: 0.5)),
              ),
              const SizedBox(height: 12),
              const Text('Smart Tracking.\nTotal Control.',
                  style: TextStyle(color: Colors.white, fontSize: 21, fontWeight: FontWeight.w800, fontFamily: 'Inter', height: 1.2)),
              const SizedBox(height: 8),
              const Text('Engine Cut-off • Voice Monitoring • SOS Button',
                  style: TextStyle(color: Colors.white70, fontSize: 11.5, fontFamily: 'Inter')),
              const Text('1-Year Data Included',
                  style: TextStyle(color: Colors.white70, fontSize: 11.5, fontFamily: 'Inter')),
              const SizedBox(height: 14),
              ElevatedButton(
                onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ShopScreen())),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: AppColors.primary,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('Explore Pro', style: TextStyle(fontWeight: FontWeight.w700, fontFamily: 'Inter', fontSize: 13)),
                    SizedBox(width: 6),
                    Icon(Icons.arrow_forward_rounded, size: 16),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _referBanner(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(26),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.15), blurRadius: 20, offset: const Offset(0, 10))],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -6,
            bottom: -10,
            child: Icon(Icons.card_giftcard_rounded, color: Colors.white.withOpacity(0.08), size: 110),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(color: AppColors.accent.withOpacity(0.2), borderRadius: BorderRadius.circular(8)),
                child: const Text('REFER & EARN',
                    style: TextStyle(color: AppColors.accent, fontSize: 10, fontWeight: FontWeight.w800, fontFamily: 'Inter', letterSpacing: 0.5)),
              ),
              const SizedBox(height: 12),
              const Text('Get ₹500 for every\nfriend who joins',
                  style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800, fontFamily: 'Inter', height: 1.2)),
              const SizedBox(height: 8),
              const Text('Share your referral code from Profile',
                  style: TextStyle(color: Colors.white60, fontSize: 11.5, fontFamily: 'Inter')),
              const SizedBox(height: 14),
              ElevatedButton(
                onPressed: () => widget.onNavigate(3),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: const Color(0xFF111827),
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('Refer Now', style: TextStyle(fontWeight: FontWeight.w700, fontFamily: 'Inter', fontSize: 13)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, {required VoidCallback onViewAll}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textPrimary, fontFamily: 'Inter')),
        GestureDetector(
          onTap: onViewAll,
          child: const Text('View All', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.primary, fontFamily: 'Inter')),
        ),
      ],
    );
  }

  Widget _buildFleetOverview() {
    final stats = [
      (label: 'Online', value: _fleetSummary.online, color: AppColors.success, icon: Icons.power_settings_new_rounded),
      (label: 'Offline', value: _fleetSummary.offline, color: AppColors.error, icon: Icons.power_off_rounded),
      (label: 'Moving', value: _fleetSummary.moving, color: AppColors.primary, icon: Icons.directions_car_rounded),
      (label: 'Alerts', value: _fleetSummary.alerts, color: AppColors.warning, icon: Icons.warning_rounded),
    ];
    return Row(
      children: stats.map((s) {
        final isLast = s == stats.last;
        return Expanded(
          child: Container(
            margin: EdgeInsets.only(right: isLast ? 0 : 10),
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
            decoration: BoxDecoration(
              color: AppColors.tint(s.color),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: s.color.withOpacity(0.18)),
            ),
            child: Column(
              children: [
                Icon(s.icon, color: s.color, size: 20),
                const SizedBox(height: 8),
                Text('${s.value}', style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800, color: AppColors.textPrimary, fontFamily: 'Inter')),
                const SizedBox(height: 2),
                Text(s.label, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary, fontFamily: 'Inter', fontWeight: FontWeight.w500)),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    final actions = [
      (icon: Icons.add_road_rounded, label: 'Add Vehicle\n& Order', color: AppColors.primary, onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ShopScreen()))),
      (icon: Icons.location_on_rounded, label: 'Live\nTracking', color: AppColors.success, onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LiveTrackingScreen()))),
      (icon: Icons.history_rounded, label: 'Playback\nHistory', color: AppColors.purple, onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PlaybackScreen()))),
      (icon: Icons.fence_rounded, label: 'Geofence\nZones', color: AppColors.warning, onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const GeofenceListScreen()))),
      (icon: Icons.summarize_rounded, label: 'Reports\nAnalytics', color: AppColors.accent, onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ReportsScreen()))),
      (
        icon: Icons.headset_mic_rounded,
        label: 'Support\nHelp Center',
        color: AppColors.warning,
        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const HelpScreen())),
      ),
    ];
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 3,
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: 0.92,
      children: actions.map((a) {
        return GestureDetector(
          onTap: a.onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 6),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.border),
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 8, offset: const Offset(0, 2))],
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(color: AppColors.tint(a.color), borderRadius: BorderRadius.circular(13)),
                  child: Icon(a.icon, color: a.color, size: 20),
                ),
                const SizedBox(height: 8),
                Text(a.label, textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: AppColors.textPrimary, fontFamily: 'Inter', height: 1.25)),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildRecentAlerts() {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: List.generate(_recentAlerts.length, (i) {
          final a = _recentAlerts[i];
          final isHigh = a.severity == 'High';
          final sevColor = isHigh ? AppColors.error : AppColors.warning;
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(color: AppColors.tint(sevColor), shape: BoxShape.circle),
                      child: Icon(isHigh ? Icons.speed_rounded : Icons.vpn_key_rounded, color: sevColor, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(a.title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary, fontFamily: 'Inter')),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(color: AppColors.tint(sevColor), borderRadius: BorderRadius.circular(6)),
                                child: Text(a.severity, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: sevColor, fontFamily: 'Inter')),
                              ),
                            ],
                          ),
                          const SizedBox(height: 3),
                          Text('${a.vehicleNumber} • ${a.timeAgo}',
                              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontFamily: 'Inter')),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              if (i != _recentAlerts.length - 1) const Divider(height: 1, color: AppColors.divider, indent: 14, endIndent: 14),
            ],
          );
        }),
      ),
    );
  }

  Widget _buildTrackedVehicles() {
    return Column(
      children: _trackedVehicles.map((v) {
        Color statusColor;
        switch (v.status) {
          case 'Online':
            statusColor = AppColors.success;
            break;
          case 'Moving':
            statusColor = AppColors.primary;
            break;
          default:
            statusColor = AppColors.error;
        }
        final isLast = v == _trackedVehicles.last;
        return Container(
          margin: EdgeInsets.only(bottom: isLast ? 0 : 10),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(color: AppColors.tint(statusColor), borderRadius: BorderRadius.circular(12)),
                child: Icon(Icons.directions_car_filled_rounded, color: statusColor, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(v.vehicleNumber, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary, fontFamily: 'Inter')),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(color: AppColors.tint(statusColor), borderRadius: BorderRadius.circular(6)),
                          child: Text(v.status, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: statusColor, fontFamily: 'Inter')),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      v.speed.isNotEmpty ? '${v.speed} • ${v.location}' : 'Last seen • ${v.location}',
                      style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontFamily: 'Inter'),
                    ),
                  ],
                ),
              ),
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.bg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Icon(Icons.map_rounded, color: statusColor.withOpacity(0.7), size: 20),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}
