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
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: halo.withValues(alpha: 0.12),
            boxShadow: [
              BoxShadow(
                color: halo.withValues(alpha: 0.18),
                blurRadius: 20,
                spreadRadius: 5,
              ),
            ],
          ),
        ),
        Transform.rotate(
          angle: heading * math.pi / 180,
          child: Container(
            width: 52,
            height: 52,
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 3),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.22),
                  blurRadius: 16,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: ClipOval(
              child:
                  Image.asset(_assetForVehicle(vehicleType), fit: BoxFit.cover),
            ),
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
