import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../constants/app_strings.dart';
import '../constants/colors.dart';
import '../providers/auth_provider.dart';
import 'home_screen.dart';
import 'onboarding_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 1800))
      ..repeat(reverse: true);
    _navigate();
  }

  Future<void> _navigate() async {
    await Future.delayed(const Duration(milliseconds: 2400));
    if (!mounted) return;
    final auth = context.read<AuthProvider>();
    while (auth.isLoading) {
      await Future.delayed(const Duration(milliseconds: 100));
    }
    if (!mounted) return;
    Navigator.pushReplacement(
        context,
        MaterialPageRoute(
            builder: (_) => auth.isLoggedIn
                ? const HomeScreen()
                : const OnboardingScreen()));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            AnimatedBuilder(
              animation: _controller,
              builder: (context, child) {
                return Stack(
                  alignment: Alignment.center,
                  children: [
                    Container(
                      width: 118 + (_controller.value * 22),
                      height: 118 + (_controller.value * 22),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: AppColors.primary
                            .withValues(alpha: 0.12 * (1 - _controller.value)),
                      ),
                    ),
                    child!,
                  ],
                );
              },
              child: Container(
                width: 136,
                height: 136,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(34),
                  boxShadow: [
                    BoxShadow(
                        color: AppColors.primaryDark.withValues(alpha: 0.18),
                        blurRadius: 24,
                        offset: const Offset(0, 12)),
                  ],
                ),
                child: Image.asset(
                  'assets/images/logo.png',
                  fit: BoxFit.contain,
                ),
              ),
            ),
            const SizedBox(height: 28),
            const Text(AppStrings.brandName,
                style: TextStyle(
                    fontSize: 34,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.8)),
            const SizedBox(height: 8),
            const Text(AppStrings.tagline,
                style: TextStyle(
                    fontSize: 15,
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w700)),
            const SizedBox(height: 46),
            const SizedBox(
              width: 28,
              height: 28,
              child: CircularProgressIndicator(
                  strokeWidth: 3, color: AppColors.primaryDark),
            ),
          ],
        ),
      ),
    );
  }
}
