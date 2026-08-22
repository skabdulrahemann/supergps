import 'package:flutter/material.dart';

/// SUPER GPS customer app design system.
class AppColors {
  static const Color primary = Color(0xFF2563EB);
  static const Color primaryStrong = Color(0xFF1D4ED8);
  static const Color primaryDark = Color(0xFF1E40AF);
  static const Color accent = Color(0xFF06B6D4);

  static const Color bg = Color(0xFFF5F8FC);
  static const Color background = Color(0xFFF5F8FC);
  static const Color surface = Colors.white;
  static const Color cardBg = Colors.white;
  static const Color softYellow = Color(0xFFEFF6FF);

  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color textMuted = Color(0xFF94A3B8);

  static const Color border = Color(0xFFE2E8F0);
  static const Color divider = Color(0xFFEEF2F7);

  static const Color success = Color(0xFF16A34A);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFDC2626);
  static const Color danger = Color(0xFFDC2626);
  static const Color info = Color(0xFF2563EB);
  static const Color offline = Color(0xFF9CA3AF);
  static const Color purple = Color(0xFF6D5DF6);

  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF2563EB), Color(0xFF06B6D4)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient darkGradient = LinearGradient(
    colors: [Color(0xFF0F172A), Color(0xFF1E3A8A)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static Color tint(Color c) => c.withValues(alpha: 0.10);
}
