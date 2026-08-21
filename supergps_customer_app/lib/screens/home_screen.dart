import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../constants/app_strings.dart';
import '../constants/colors.dart';
import '../providers/auth_provider.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/super_components.dart';
import 'gps_feature_screens.dart';
import 'help_screen.dart';
import 'orders_screen.dart';
import 'profile_screen.dart';
import 'shop_screen.dart';
import 'vehicles_screen.dart';

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
    const LiveTrackingScreen(),
    const CustomerServicesTab(),
    const CustomerAccountTab(),
  ];

  void _goTo(int i) => setState(() => _currentIndex = i);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: IndexedStack(index: _currentIndex, children: _screens),
      bottomNavigationBar: BottomNav(currentIndex: _currentIndex, onTap: _goTo),
    );
  }
}

class _QuickAction {
  final String label;
  final String subtitle;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  const _QuickAction({
    required this.label,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.onTap,
  });
}

class _HomeTab extends StatelessWidget {
  final ValueChanged<int> onNavigate;
  const _HomeTab({required this.onNavigate});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final firstName = (user?.name.isNotEmpty ?? false)
        ? user!.name.split(' ').first
        : 'Abdul';

    return SafeArea(
      child: RefreshIndicator(
        color: AppColors.primaryDark,
        onRefresh: () async =>
            Future.delayed(const Duration(milliseconds: 650)),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 22),
          children: [
            _Header(firstName: firstName),
            const SizedBox(height: 14),
            const _PromoBanner(),
            const SizedBox(height: 18),
            _HomeOptionGrid(onNavigate: onNavigate),
          ],
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final String firstName;
  const _Header({required this.firstName});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.circular(13)),
          child: const Icon(Icons.navigation_rounded,
              color: AppColors.textPrimary),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(AppStrings.brandName,
                  style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.6)),
              const SizedBox(height: 2),
              Text(
                'Good Morning, $firstName',
                style: const TextStyle(
                    fontSize: 21,
                    fontWeight: FontWeight.w900,
                    color: AppColors.textPrimary),
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
        IconButton.filledTonal(
          onPressed: () => Navigator.push(context,
              MaterialPageRoute(builder: (_) => const NotificationsScreen())),
          icon: const Icon(Icons.notifications_none_rounded),
          style: IconButton.styleFrom(
              backgroundColor: AppColors.surface,
              foregroundColor: AppColors.textPrimary),
        ),
        const SizedBox(width: 4),
        CircleAvatar(
          radius: 20,
          backgroundColor: AppColors.textPrimary,
          child: Text(firstName.characters.first.toUpperCase(),
              style: const TextStyle(
                  color: AppColors.primary, fontWeight: FontWeight.w900)),
        ),
      ],
    );
  }
}

class _PromoBanner extends StatelessWidget {
  const _PromoBanner();

  @override
  Widget build(BuildContext context) {
    return SuperCard(
      padding: const EdgeInsets.fromLTRB(16, 14, 12, 14),
      color: AppColors.textPrimary,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 92, maxHeight: 116),
        child: Row(
          children: [
            Container(
              width: 58,
              height: 58,
              decoration: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(Icons.workspace_premium_rounded,
                  color: AppColors.textPrimary, size: 30),
            ),
            const SizedBox(width: 14),
            const Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'GPS renewal reminder',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  SizedBox(height: 5),
                  Text(
                    'Keep tracking active with one quick renewal.',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: Color(0xFFD4D4D4),
                      fontSize: 12.5,
                      height: 1.25,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            IconButton.filled(
              onPressed: () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const RenewalScreen())),
              icon: const Icon(Icons.arrow_forward_rounded),
              style: IconButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.textPrimary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HomeOptionGrid extends StatelessWidget {
  final ValueChanged<int> onNavigate;
  const _HomeOptionGrid({required this.onNavigate});

  @override
  Widget build(BuildContext context) {
    final actions = [
      _QuickAction(
        label: 'Live Tracking',
        subtitle: 'Track vehicles',
        icon: Icons.navigation_rounded,
        color: AppColors.success,
        onTap: () => onNavigate(2),
      ),
      _QuickAction(
        label: 'My Vehicles',
        subtitle: 'Fleet list',
        icon: Icons.local_shipping_rounded,
        color: AppColors.textPrimary,
        onTap: () => onNavigate(1),
      ),
      _QuickAction(
        label: 'Playback',
        subtitle: 'Trip history',
        icon: Icons.history_rounded,
        color: AppColors.purple,
        onTap: () => Navigator.push(
            context, MaterialPageRoute(builder: (_) => const PlaybackScreen())),
      ),
      _QuickAction(
        label: 'Reports',
        subtitle: 'Fleet reports',
        icon: Icons.summarize_rounded,
        color: AppColors.info,
        onTap: () => Navigator.push(
            context, MaterialPageRoute(builder: (_) => const ReportsScreen())),
      ),
    ];

    return LayoutBuilder(builder: (context, constraints) {
      final width = constraints.maxWidth;
      final cardWidth = (width - 12) / 2;
      final cardHeight = width <= 340 ? 118.0 : 126.0;

      return Wrap(
        spacing: 12,
        runSpacing: 12,
        children: actions
            .map((action) => SizedBox(
                  width: cardWidth,
                  height: cardHeight,
                  child: _HomeOptionCard(action: action),
                ))
            .toList(),
      );
    });
  }
}

class _HomeOptionCard extends StatelessWidget {
  final _QuickAction action;
  const _HomeOptionCard({required this.action});

  @override
  Widget build(BuildContext context) {
    return SuperCard(
      padding: const EdgeInsets.all(14),
      onTap: action.onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.tint(action.color),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(action.icon, color: action.color, size: 25),
          ),
          const Spacer(),
          Text(
            action.label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 3),
          Text(
            action.subtitle,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 11.5,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class CustomerServicesTab extends StatelessWidget {
  const CustomerServicesTab({super.key});

  @override
  Widget build(BuildContext context) {
    final services = [
      (
        'GPS',
        'Live tracking, reports, alerts',
        Icons.gps_fixed_rounded,
        const ShopScreen()
      ),
      (
        'FASTag',
        'Recharge, status and transactions',
        Icons.toll_rounded,
        const FastagScreen()
      ),
      (
        'Insurance',
        'Renew policy and documents',
        Icons.verified_user_rounded,
        const VehicleDocumentsScreen()
      ),
      (
        'RTO Services',
        'HSRP, fitness, permit help',
        Icons.account_balance_rounded,
        const HelpScreen()
      ),
      (
        'Fuel Sensor',
        'Fuel level and drop alerts',
        Icons.local_gas_station_rounded,
        const FuelMonitoringScreen()
      ),
      (
        'Support',
        'Call, WhatsApp or create ticket',
        Icons.support_agent_rounded,
        const HelpScreen()
      ),
    ];

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
          title: const Text('Services',
              style: TextStyle(fontWeight: FontWeight.w900))),
      body: GridView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: services.length,
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.05),
        itemBuilder: (context, i) {
          final service = services[i];
          return SuperCard(
            onTap: () => Navigator.push(
                context, MaterialPageRoute(builder: (_) => service.$4)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                      color: AppColors.softYellow,
                      borderRadius: BorderRadius.circular(14)),
                  child: Icon(service.$3, color: AppColors.textPrimary),
                ),
                const Spacer(),
                Text(service.$1,
                    style: const TextStyle(
                        fontWeight: FontWeight.w900, fontSize: 16)),
                const SizedBox(height: 4),
                Text(service.$2,
                    style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                        height: 1.3)),
              ],
            ),
          );
        },
      ),
    );
  }
}

class CustomerAccountTab extends StatelessWidget {
  const CustomerAccountTab({super.key});

  @override
  Widget build(BuildContext context) {
    final items = [
      ('Personal Details', Icons.person_rounded, const ProfileScreen()),
      ('My Vehicles', Icons.local_shipping_rounded, const VehiclesScreen()),
      ('Drivers', Icons.badge_rounded, const DriversScreen()),
      ('Orders', Icons.receipt_long_rounded, const OrdersScreen()),
      ('Invoices', Icons.description_rounded, const InvoiceScreen()),
      ('Renewals', Icons.workspace_premium_rounded, const RenewalScreen()),
      (
        'Notifications',
        Icons.notifications_rounded,
        const NotificationsScreen()
      ),
      ('Security', Icons.lock_rounded, const SecurityScreen()),
      ('Language', Icons.language_rounded, const LanguageScreen()),
      ('Support', Icons.support_agent_rounded, const HelpScreen()),
      ('Settings', Icons.settings_rounded, const SettingsScreen()),
    ];

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
          title: const Text('Account',
              style: TextStyle(fontWeight: FontWeight.w900))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const SuperCard(
            child: Row(
              children: [
                CircleAvatar(
                    radius: 28,
                    backgroundColor: AppColors.textPrimary,
                    child: Text('A',
                        style: TextStyle(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w900,
                            fontSize: 20))),
                SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Abdul Shaikh',
                          style: TextStyle(
                              fontSize: 18, fontWeight: FontWeight.w900)),
                      SizedBox(height: 2),
                      Text('+91 98765 43210',
                          style: TextStyle(color: AppColors.textSecondary)),
                      Text('abdul@example.com',
                          style: TextStyle(
                              color: AppColors.textMuted, fontSize: 12)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          ...items.map((item) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: SuperCard(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                  onTap: () => Navigator.push(
                      context, MaterialPageRoute(builder: (_) => item.$3)),
                  child: Row(
                    children: [
                      Icon(item.$2, color: AppColors.textPrimary),
                      const SizedBox(width: 12),
                      Expanded(
                          child: Text(item.$1,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w800))),
                      const Icon(Icons.chevron_right_rounded,
                          color: AppColors.textMuted),
                    ],
                  ),
                ),
              )),
          const SizedBox(height: 6),
          SuperButton(
            label: 'Logout',
            icon: Icons.logout_rounded,
            secondary: true,
            onPressed: () => context.read<AuthProvider>().logout(),
          ),
        ],
      ),
    );
  }
}
