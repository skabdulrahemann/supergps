import 'package:flutter/material.dart';
import '../constants/colors.dart';
import 'login_screen.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _controller = PageController();
  int _index = 0;

  static const _pages = [
    _OnboardPage(
      icon: Icons.map_rounded,
      title: 'Smart Tracking',
      text: 'Real-time vehicle location, live status, route monitoring aur fleet visibility ek jagah.',
    ),
    _OnboardPage(
      icon: Icons.dashboard_customize_rounded,
      title: 'All-in-One GPS',
      text: 'Alerts, Reports, Playback, Geofence, Security aur product services Super GPS app me.',
    ),
    _OnboardPage(
      icon: Icons.security_rounded,
      title: 'Safe & Secure',
      text: 'Ignition alerts, geofence, anti-theft, supported devices me engine lock aur emergency notifications.',
    ),
  ];

  void _next() {
    if (_index == _pages.length - 1) {
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
    } else {
      _controller.nextPage(duration: const Duration(milliseconds: 260), curve: Curves.easeOut);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 18, 24, 24),
          child: Column(
            children: [
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () => Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const LoginScreen())),
                  child: const Text('Skip'),
                ),
              ),
              Expanded(
                child: PageView.builder(
                  controller: _controller,
                  itemCount: _pages.length,
                  onPageChanged: (i) => setState(() => _index = i),
                  itemBuilder: (_, i) => _pages[i],
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(_pages.length, (i) {
                  final active = i == _index;
                  return AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    width: active ? 24 : 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: active ? AppColors.primary : AppColors.border,
                      borderRadius: BorderRadius.circular(8),
                    ),
                  );
                }),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _next,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text(_index == _pages.length - 1 ? 'Get Started' : 'Next',
                      style: const TextStyle(fontWeight: FontWeight.w800, fontFamily: 'Inter')),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _OnboardPage extends StatelessWidget {
  final IconData icon;
  final String title;
  final String text;

  const _OnboardPage({required this.icon, required this.title, required this.text});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          height: 250,
          width: double.infinity,
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: AppColors.border),
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              Positioned(top: 30, left: 36, child: Icon(Icons.location_on_rounded, color: AppColors.error.withOpacity(0.18), size: 42)),
              Positioned(bottom: 34, right: 36, child: Icon(Icons.directions_car_rounded, color: AppColors.success.withOpacity(0.2), size: 52)),
              Positioned(top: 74, right: 54, child: Icon(Icons.route_rounded, color: AppColors.accent.withOpacity(0.2), size: 62)),
              Container(
                width: 118,
                height: 118,
                decoration: BoxDecoration(gradient: AppColors.primaryGradient, borderRadius: BorderRadius.circular(34)),
                child: Icon(icon, color: Colors.white, size: 58),
              ),
            ],
          ),
        ),
        const SizedBox(height: 34),
        Text(title, textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w900, color: AppColors.textPrimary, fontFamily: 'Inter')),
        const SizedBox(height: 12),
        Text(text, textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 15, height: 1.5, color: AppColors.textSecondary, fontFamily: 'Inter')),
      ],
    );
  }
}
