import 'package:flutter/material.dart';

/// SUPER GPS customer app design system.
class AppColors {
  static const Color primary = Color(0xFFFFC400);
  static const Color primaryStrong = Color(0xFFFFB800);
  static const Color primaryDark = Color(0xFFF5A800);
  static const Color accent = Color(0xFFFFC400);

  static const Color bg = Color(0xFFF7F8FA);
  static const Color background = Color(0xFFF7F8FA);
  static const Color surface = Colors.white;
  static const Color cardBg = Colors.white;
  static const Color softYellow = Color(0xFFFFF8E1);

  static const Color textPrimary = Color(0xFF171717);
  static const Color textSecondary = Color(0xFF666666);
  static const Color textMuted = Color(0xFF929292);

  static const Color border = Color(0xFFE8E8E8);
  static const Color divider = Color(0xFFF0F0F0);

  static const Color success = Color(0xFF16A34A);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFDC2626);
  static const Color danger = Color(0xFFDC2626);
  static const Color info = Color(0xFF2563EB);
  static const Color offline = Color(0xFF9CA3AF);
  static const Color purple = Color(0xFF6D5DF6);

  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFFFFC400), Color(0xFFFFB800)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient darkGradient = LinearGradient(
    colors: [Color(0xFF171717), Color(0xFF2A2A2A)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static Color tint(Color c) => c.withValues(alpha: 0.10);
}
