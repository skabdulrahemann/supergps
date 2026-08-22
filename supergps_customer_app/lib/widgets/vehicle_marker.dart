import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../constants/colors.dart';

class VehicleMarker extends StatelessWidget {
  final String vehicleType;
  final double heading;
  final bool online;

  const VehicleMarker({
    super.key,
    required this.vehicleType,
    required this.heading,
    required this.online,
  });

  @override
  Widget build(BuildContext context) {
    final halo = online ? AppColors.success : AppColors.textMuted;
    return Stack(
      alignment: Alignment.center,
      children: [
        DecoratedBox(
          decoration: BoxDecoration(
            boxShadow: [
              BoxShadow(
                color: halo.withValues(alpha: 0.20),
                blurRadius: 16,
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
