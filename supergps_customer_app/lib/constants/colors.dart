import 'package:flutter/material.dart';

/// SuperGPS design system — matches the approved UI reference.
class AppColors {
  // Primary palette
  static const Color primary = Color(0xFF1677FF);
  static const Color primaryDark = Color(0xFF0E5FDB);
  static const Color primaryLight = Color(0xFF4B93FF);
  static const Color accent = Color(0xFF08B8D9);
  static const Color purple = Color(0xFF7C5CFC);

  // Backgrounds
  static const Color bg = Color(0xFFF7F9FC);
  static const Color background = Color(0xFFF7F9FC);
  static const Color surface = Colors.white;
  static const Color cardBg = Color(0xFFFFFFFF);

  // Text
  static const Color textPrimary = Color(0xFF111827);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color textMuted = Color(0xFF94A3B8);

  // Borders
  static const Color border = Color(0xFFE7EBF3);
  static const Color divider = Color(0xFFF1F5F9);

  // Status
  static const Color success = Color(0xFF10B981);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFEF4444);
  static const Color danger = Color(0xFFEF4444);
  static const Color info = Color(0xFF08B8D9);

  // Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF1677FF), Color(0xFF08B8D9)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient darkGradient = LinearGradient(
    colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  // Status tint backgrounds (used for chips / stat cards)
  static Color tint(Color c) => c.withOpacity(0.10);
}
