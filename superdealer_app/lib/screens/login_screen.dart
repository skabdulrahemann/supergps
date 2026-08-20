import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../constants/colors.dart';
import 'home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _obscure = true;
  bool _loading = false;
  String? _error;

  Future<void> _login() async {
    if (_emailCtrl.text.trim().isEmpty || _passCtrl.text.isEmpty) {
      setState(() => _error = 'Please fill all fields');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      await Provider.of<AuthProvider>(context, listen: false)
          .login(_emailCtrl.text.trim(), _passCtrl.text);
      if (mounted) {
        final auth = Provider.of<AuthProvider>(context, listen: false);
        if (auth.user?.role != 'dealer' && auth.user?.role != 'technician') {
          setState(() {
            _error = 'Access denied. Dealer/Technician only.';
            _loading = false;
          });
          await auth.logout();
          return;
        }
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (_) => const HomeScreen()),
          (route) => false,
        );
      }
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 50),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(gradient: AppColors.primaryGradient, borderRadius: BorderRadius.circular(24)),
                child: const Row(
                  children: [
                    Icon(Icons.storefront_rounded, size: 40, color: Colors.white),
                    SizedBox(width: 16),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('SuperDealer', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Colors.white, fontFamily: 'Inter')),
                        Text('Dealer & Technician Portal', style: TextStyle(fontSize: 13, color: Colors.white70, fontFamily: 'Inter')),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 40),
              const Text('Welcome Back', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: AppColors.textPrimary, fontFamily: 'Inter')),
              const SizedBox(height: 8),
              const Text('Sign in to manage orders and activations', style: TextStyle(fontSize: 15, color: AppColors.textSecondary, fontFamily: 'Inter')),
              const SizedBox(height: 32),
              if (_error != null)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(color: AppColors.error.withOpacity(0.08), borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.error.withOpacity(0.2))),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: AppColors.error, size: 20),
                      const SizedBox(width: 10),
                      Expanded(child: Text(_error!, style: const TextStyle(color: AppColors.error, fontSize: 13, fontFamily: 'Inter'))),
                    ],
                  ),
                ),
              _buildField('Email Address', 'dealer@supergps.com', Icons.email_outlined, _emailCtrl, keyboardType: TextInputType.emailAddress),
              const SizedBox(height: 16),
              _buildField('Password', 'Enter your password', Icons.lock_outline, _passCtrl, obscureText: _obscure, suffixIcon: IconButton(
                icon: Icon(_obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: AppColors.textMuted, size: 22),
                onPressed: () => setState(() => _obscure = !_obscure),
              )),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _loading ? null : _login,
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white, elevation: 0, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                  child: _loading
                      ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                      : const Text('Sign In', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, fontFamily: 'Inter')),
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildField(String label, String hint, IconData icon, TextEditingController controller,
      {bool obscureText = false, TextInputType keyboardType = TextInputType.text, Widget? suffixIcon}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary, fontFamily: 'Inter')),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          obscureText: obscureText,
          keyboardType: keyboardType,
          style: const TextStyle(fontSize: 15, fontFamily: 'Inter', color: AppColors.textPrimary),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: AppColors.textMuted, fontFamily: 'Inter', fontSize: 14),
            prefixIcon: Icon(icon, color: AppColors.textMuted, size: 22),
            suffixIcon: suffixIcon,
            filled: true,
            fillColor: AppColors.surface,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.border)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.border)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.primary, width: 2)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
          ),
        ),
      ],
    );
  }
}
