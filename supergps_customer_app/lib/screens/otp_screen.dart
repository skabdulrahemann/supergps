import 'package:flutter/material.dart';
import '../constants/colors.dart';
import 'home_screen.dart';

class OtpScreen extends StatefulWidget {
  final String mobile;
  const OtpScreen({super.key, required this.mobile});

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  final _otpCtrl = TextEditingController();
  int _seconds = 30;

  @override
  void initState() {
    super.initState();
    _tick();
  }

  Future<void> _tick() async {
    while (mounted && _seconds > 0) {
      await Future.delayed(const Duration(seconds: 1));
      if (mounted) setState(() => _seconds--);
    }
  }

  @override
  void dispose() {
    _otpCtrl.dispose();
    super.dispose();
  }

  void _verify() {
    if (_otpCtrl.text.trim().length < 4) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Valid OTP enter karein')));
      return;
    }
    Navigator.pushAndRemoveUntil(context, MaterialPageRoute(builder: (_) => const HomeScreen()), (_) => false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(title: const Text('OTP Verification')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 76,
                height: 76,
                decoration: BoxDecoration(gradient: AppColors.primaryGradient, borderRadius: BorderRadius.circular(24)),
                child: const Icon(Icons.password_rounded, color: Colors.white, size: 36),
              ),
              const SizedBox(height: 28),
              const Text('Verify your account',
                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: AppColors.textPrimary, fontFamily: 'Inter')),
              const SizedBox(height: 8),
              Text('OTP ${widget.mobile} par bheja gaya hai.',
                  style: const TextStyle(fontSize: 14, color: AppColors.textSecondary, fontFamily: 'Inter')),
              const SizedBox(height: 28),
              TextField(
                controller: _otpCtrl,
                keyboardType: TextInputType.number,
                maxLength: 6,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w900, letterSpacing: 8, fontFamily: 'Inter'),
                decoration: InputDecoration(
                  counterText: '',
                  hintText: '000000',
                  filled: true,
                  fillColor: AppColors.surface,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: const BorderSide(color: AppColors.border)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: const BorderSide(color: AppColors.border)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: const BorderSide(color: AppColors.primary, width: 2)),
                ),
              ),
              const SizedBox(height: 16),
              Center(
                child: TextButton(
                  onPressed: _seconds == 0 ? () => setState(() => _seconds = 30) : null,
                  child: Text(_seconds == 0 ? 'Resend OTP' : 'Resend in ${_seconds}s'),
                ),
              ),
              const Spacer(),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _verify,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: const Text('Verify', style: TextStyle(fontWeight: FontWeight.w800, fontFamily: 'Inter')),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
