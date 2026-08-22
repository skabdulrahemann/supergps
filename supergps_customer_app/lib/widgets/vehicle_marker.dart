import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../constants/colors.dart';

class VehicleMarker extends StatelessWidget {
  final String vehicleType;
  final double heading;
  final bool online;
  final bool running;

  const VehicleMarker({
    super.key,
    required this.vehicleType,
    required this.heading,
    required this.online,
    this.running = false,
  });

  @override
  Widget build(BuildContext context) {
    final halo = running
        ? AppColors.success
        : online
            ? AppColors.primary
            : AppColors.textMuted;
    return Stack(
      alignment: Alignment.center,
      children: [
        if (running)
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.success.withValues(alpha: 0.16),
              border: Border.all(
                color: AppColors.success.withValues(alpha: 0.55),
                width: 2,
              ),
            ),
          ),
        DecoratedBox(
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: halo.withValues(alpha: running ? 0.34 : 0.20),
                blurRadius: running ? 22 : 16,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: const SizedBox(width: 46, height: 46),
        ),
        Transform.rotate(
          angle: heading * math.pi / 180,
          child: Image.asset(
            _assetForVehicle(vehicleType),
            width: 52,
            height: 52,
            fit: BoxFit.contain,
          ),
        ),
      ],
    );
  }

  String _assetForVehicle(String type) {
    final normalized = type.toLowerCase();
    if (normalized.contains('truck')) return 'assets/gps_marker/trucks.png';
    if (normalized.contains('bike') ||
        normalized.contains('motorcycle') ||
        normalized.contains('scooter')) {
      return 'assets/gps_marker/bike.png';
    }
    return 'assets/gps_marker/car.png';
  }
}
