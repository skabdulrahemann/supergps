import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../constants/colors.dart';
import '../services/api_service.dart';
import '../widgets/bottom_nav.dart';
import 'orders_screen.dart';
import 'vehicles_screen.dart';
import 'profile_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  final _screens = [
    const _DashboardTab(),
    const OrdersScreen(),
    const VehiclesScreen(),
    const ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: _screens[_currentIndex],
      bottomNavigationBar: BottomNav(
        currentIndex: _currentIndex,
        onTap: (i) => setState(() => _currentIndex = i),
      ),
    );
  }
}

class _DashboardTab extends StatefulWidget {
  const _DashboardTab();

  @override
  State<_DashboardTab> createState() => _DashboardTabState();
}

class _DashboardTabState extends State<_DashboardTab> {
  int _totalOrders = 0;
  int _pendingActivations = 0;
  int _totalVehicles = 0;
  int _totalCustomers = 0;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetchStats();
  }

  Future<void> _fetchStats() async {
    try {
      final [ordersRes, vehiclesRes] = await Future.wait([
        ApiService.get('/orders/dealer-orders'),
        ApiService.get('/vehicles/dealer-vehicles'),
      ]);
      final orders = ordersRes['orders'] as List? ?? [];
      final vehicles = vehiclesRes['vehicles'] as List? ?? [];
      final pending = orders.where((o) => o['isActivated'] == false).length;
      final customers = vehicles.map((v) => v['customerId']).toSet().length;
      setState(() {
        _totalOrders = orders.length;
        _pendingActivations = pending;
        _totalVehicles = vehicles.length;
        _totalCustomers = customers;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  void _copySalesCode(String code) {
    Clipboard.setData(ClipboardData(text: code));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Sales code copied!', style: TextStyle(fontFamily: 'Inter')),
        backgroundColor: AppColors.success,
        behavior: SnackBarBehavior.floating,
        duration: Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = Provider.of<AuthProvider>(context).user;
    final dealerProfile = Provider.of<AuthProvider>(context).dealerProfile;
    final salesCode = dealerProfile?['salesCode']?.toString();

    return SafeArea(
      child: RefreshIndicator(
        onRefresh: _fetchStats,
        color: AppColors.primary,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Hello, ${user?.name?.split(' ').first ?? 'Dealer'}',
                        style: const TextStyle(fontSize: 14, color: AppColors.textSecondary, fontFamily: 'Inter')),
                      const SizedBox(height: 4),
                      const Text('SuperDealer', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: AppColors.textPrimary, fontFamily: 'Inter')),
                    ],
                  ),
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(gradient: AppColors.primaryGradient, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 4))]),
                    child: const Icon(Icons.notifications_outlined, color: Colors.white, size: 22),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              // Sales Code Banner - ALWAYS VISIBLE
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 20, offset: const Offset(0, 8))],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(8)),
                          child: const Text('YOUR SALES CODE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.white, fontFamily: 'Inter', letterSpacing: 1)),
                        ),
                        const Spacer(),
                        if (salesCode != null)
                          GestureDetector(
                            onTap: () => _copySalesCode(salesCode),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(8)),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.copy_rounded, color: Colors.white, size: 14),
                                  SizedBox(width: 4),
                                  Text('Copy', style: TextStyle(fontSize: 11, color: Colors.white, fontFamily: 'Inter')),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.white.withOpacity(0.3)),
                      ),
                      child: Center(
                        child: Text(
                          salesCode ?? 'No Sales Code Found',
                          style: TextStyle(
                            fontSize: salesCode != null ? 28 : 16,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                            fontFamily: 'Inter',
                            letterSpacing: salesCode != null ? 2 : 0,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      salesCode != null
                          ? 'Share this code with customers to link orders to your account'
                          : 'Please contact admin to get your sales code assigned',
                      style: TextStyle(fontSize: 12, color: Colors.white.withOpacity(0.8), fontFamily: 'Inter', height: 1.5),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              // Stats Grid
              _loading
                  ? const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator(color: AppColors.primary)))
                  : GridView.count(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisCount: 2,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      childAspectRatio: 1.3,
                      children: [
                        _StatCard(label: 'Total Orders', value: _totalOrders.toString(), icon: Icons.receipt_long_rounded, color: AppColors.primary),
                        _StatCard(label: 'Pending', value: _pendingActivations.toString(), icon: Icons.pending_actions_rounded, color: AppColors.warning),
                        _StatCard(label: 'Vehicles', value: _totalVehicles.toString(), icon: Icons.directions_car_rounded, color: AppColors.success),
                        _StatCard(label: 'Customers', value: _totalCustomers.toString(), icon: Icons.people_rounded, color: AppColors.accent),
                      ],
                    ),
              const SizedBox(height: 24),
              // Quick Actions
              const Text('Quick Actions', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textPrimary, fontFamily: 'Inter')),
              const SizedBox(height: 14),
              Row(
                children: [
                  _QuickAction(icon: Icons.receipt_long_rounded, label: 'Orders', color: AppColors.primary, onTap: () {
                    final homeState = context.findAncestorStateOfType<_HomeScreenState>();
                    homeState?.setState(() => homeState._currentIndex = 1);
                  }),
                  const SizedBox(width: 12),
                  _QuickAction(icon: Icons.directions_car_rounded, label: 'Vehicles', color: AppColors.success, onTap: () {
                    final homeState = context.findAncestorStateOfType<_HomeScreenState>();
                    homeState?.setState(() => homeState._currentIndex = 2);
                  }),
                  const SizedBox(width: 12),
                  _QuickAction(icon: Icons.person_rounded, label: 'Profile', color: AppColors.accent, onTap: () {
                    final homeState = context.findAncestorStateOfType<_HomeScreenState>();
                    homeState?.setState(() => homeState._currentIndex = 3);
                  }),
                ],
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  const _StatCard({required this.label, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(20), border: Border.all(color: AppColors.border), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 8, offset: const Offset(0, 2))]),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(width: 40, height: 40, decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(12)), child: Icon(icon, color: color, size: 20)),
          const Spacer(),
          Text(value, style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: color, fontFamily: 'Inter')),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontFamily: 'Inter')),
        ],
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _QuickAction({required this.icon, required this.label, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(20), border: Border.all(color: AppColors.border)),
          child: Column(
            children: [
              Container(width: 44, height: 44, decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(14)), child: Icon(icon, color: color, size: 22)),
              const SizedBox(height: 8),
              Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textPrimary, fontFamily: 'Inter')),
            ],
          ),
        ),
      ),
    );
  }
}
