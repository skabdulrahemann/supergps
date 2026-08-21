import 'package:flutter/material.dart';
import '../constants/app_strings.dart';
import '../constants/colors.dart';
import '../widgets/super_components.dart';
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
    _OnboardData(
      icon: Icons.location_on_rounded,
      title: 'Know Where Your Vehicle Is',
      text:
          'Track your vehicles live with location, speed and ignition information.',
      chips: ['Live location', 'Speed', 'Ignition'],
    ),
    _OnboardData(
      icon: Icons.shield_rounded,
      title: 'Stay In Control',
      text:
          'Ignition alerts, geofence, overspeed alerts, parking security and engine lock support.',
      chips: ['Geofence', 'Overspeed', 'Parking'],
    ),
    _OnboardData(
      icon: Icons.dashboard_rounded,
      title: 'Everything in One App',
      text:
          'GPS, FASTag, reports, renewals and support built for vehicle owners and fleets.',
      chips: ['GPS', 'FASTag', 'Reports'],
    ),
  ];

  void _openLogin() => Navigator.pushReplacement(
      context, MaterialPageRoute(builder: (_) => const LoginScreen()));

  void _next() {
    if (_index == _pages.length - 1) {
      _openLogin();
    } else {
      _controller.nextPage(
          duration: const Duration(milliseconds: 260), curve: Curves.easeOut);
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
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 22),
          child: Column(
            children: [
              Row(
                children: [
                  const Text(AppStrings.brandName,
                      style: TextStyle(
                          fontWeight: FontWeight.w900, letterSpacing: 0.5)),
                  const Spacer(),
                  TextButton(onPressed: _openLogin, child: const Text('Skip')),
                ],
              ),
              Expanded(
                child: PageView.builder(
                  controller: _controller,
                  itemCount: _pages.length,
                  onPageChanged: (i) => setState(() => _index = i),
                  itemBuilder: (_, i) => _OnboardPage(data: _pages[i]),
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(_pages.length, (i) {
                  final active = i == _index;
                  return AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    width: active ? 26 : 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: active ? AppColors.primaryDark : AppColors.border,
                      borderRadius: BorderRadius.circular(999),
                    ),
                  );
                }),
              ),
              const SizedBox(height: 22),
              SuperButton(
                  label: _index == _pages.length - 1 ? 'Get Started' : 'Next',
                  onPressed: _next,
                  icon: Icons.arrow_forward_rounded),
            ],
          ),
        ),
      ),
    );
  }
}

class _OnboardData {
  final IconData icon;
  final String title;
  final String text;
  final List<String> chips;

  const _OnboardData(
      {required this.icon,
      required this.title,
      required this.text,
      required this.chips});
}

class _OnboardPage extends StatelessWidget {
  final _OnboardData data;
  const _OnboardPage({required this.data});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          height: 270,
          width: double.infinity,
          decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.border)),
          child: Stack(
            alignment: Alignment.center,
            children: [
              Positioned.fill(
                  child: CustomPaint(painter: _RouteIllustrationPainter())),
              Positioned(
                left: 34,
                bottom: 52,
                child: Container(
                  width: 76,
                  height: 48,
                  decoration: BoxDecoration(
                      color: AppColors.textPrimary,
                      borderRadius: BorderRadius.circular(14)),
                  child: const Icon(Icons.local_shipping_rounded,
                      color: AppColors.primary),
                ),
              ),
              Container(
                width: 112,
                height: 112,
                decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(32)),
                child: Icon(data.icon, color: AppColors.textPrimary, size: 56),
              ),
              Positioned(
                right: 24,
                top: 30,
                child: Wrap(
                  direction: Axis.vertical,
                  spacing: 8,
                  children: data.chips.map((c) {
                    return Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                          color: AppColors.softYellow,
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(color: AppColors.border)),
                      child: Text(c,
                          style: const TextStyle(
                              fontSize: 11, fontWeight: FontWeight.w800)),
                    );
                  }).toList(),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 32),
        Text(data.title,
            textAlign: TextAlign.center,
            style: const TextStyle(
                fontSize: 29,
                fontWeight: FontWeight.w900,
                color: AppColors.textPrimary,
                height: 1.08)),
        const SizedBox(height: 12),
        Text(data.text,
            textAlign: TextAlign.center,
            style: const TextStyle(
                fontSize: 15,
                height: 1.5,
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w500)),
      ],
    );
  }
}

class _RouteIllustrationPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final road = Paint()
      ..color = AppColors.border
      ..strokeWidth = 4
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    final path = Path()
      ..moveTo(size.width * .12, size.height * .68)
      ..cubicTo(size.width * .34, size.height * .42, size.width * .52,
          size.height * .86, size.width * .76, size.height * .33)
      ..cubicTo(size.width * .82, size.height * .18, size.width * .91,
          size.height * .24, size.width * .88, size.height * .16);
    canvas.drawPath(path, road);
    final marker = Paint()..color = AppColors.primaryDark;
    canvas.drawCircle(Offset(size.width * .86, size.height * .18), 8, marker);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
