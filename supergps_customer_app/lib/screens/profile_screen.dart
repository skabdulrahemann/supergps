import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../constants/colors.dart';
import 'login_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = Provider.of<AuthProvider>(context).user;

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              const SizedBox(height: 20),
              // Avatar
              Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(30),
                  boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 20, offset: const Offset(0, 8))],
                ),
                child: Center(
                  child: Text(
                    user?.name?.substring(0, 1).toUpperCase() ?? 'U',
                    style: const TextStyle(fontSize: 40, fontWeight: FontWeight.w900, color: Colors.white, fontFamily: 'Inter'),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(user?.name ?? 'User', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.textPrimary, fontFamily: 'Inter')),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
                child: Text((user?.role ?? 'customer').toUpperCase(), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.primary, fontFamily: 'Inter')),
              ),
              const SizedBox(height: 32),
              _InfoCard(icon: Icons.email_outlined, label: 'Email', value: user?.email ?? 'N/A', color: AppColors.primary),
              const SizedBox(height: 12),
              _InfoCard(icon: Icons.phone_outlined, label: 'Phone', value: user?.phone ?? 'N/A', color: AppColors.success),
              const SizedBox(height: 12),
              _InfoCard(icon: Icons.verified_user_outlined, label: 'Account Status', value: user?.isActive == true ? 'Active' : 'Inactive', color: AppColors.purple),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton.icon(
                  onPressed: () async {
                    await Provider.of<AuthProvider>(context, listen: false).logout();
                    if (context.mounted) {
                      Navigator.pushAndRemoveUntil(
                        context,
                        MaterialPageRoute(builder: (_) => const LoginScreen()),
                        (route) => false,
                      );
                    }
                  },
                  icon: const Icon(Icons.logout_rounded, color: AppColors.error),
                  label: const Text('Logout', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.error, fontFamily: 'Inter')),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.error.withOpacity(0.08),
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              const Text('SuperGPS v1.0.0', style: TextStyle(fontSize: 12, color: AppColors.textMuted, fontFamily: 'Inter')),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _InfoCard({required this.icon, required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(20), border: Border.all(color: AppColors.border)),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(14)),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontFamily: 'Inter')),
                const SizedBox(height: 2),
                Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary, fontFamily: 'Inter')),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
