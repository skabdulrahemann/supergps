import 'package:flutter/material.dart';
import '../constants/colors.dart';
import '../models/vehicle_position.dart';

class TrackingBottomSheet extends StatelessWidget {
  final String vehicleNumber;
  final String status;
  final VehiclePosition? position;
  final double todayDistanceKm;
  final String location;
  final String lastUpdated;
  final VoidCallback onPlayTrip;

  const TrackingBottomSheet({
    super.key,
    required this.vehicleNumber,
    required this.status,
    required this.position,
    required this.todayDistanceKm,
    required this.location,
    required this.lastUpdated,
    required this.onPlayTrip,
  });

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.32,
      minChildSize: 0.22,
      maxChildSize: 0.62,
      snap: true,
      builder: (context, controller) {
        return Container(
          decoration: const BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: ListView(
            controller: controller,
            padding: const EdgeInsets.fromLTRB(18, 10, 18, 24),
            children: [
              Center(
                child: Container(
                  width: 46,
                  height: 5,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: AppColors.softYellow,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Icon(Icons.directions_car_filled_rounded,
                        color: AppColors.textPrimary),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          vehicleNumber,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 18, fontWeight: FontWeight.w900),
                        ),
                        const SizedBox(height: 4),
                        _StatusPill(status: status),
                      ],
                    ),
                  ),
                  ElevatedButton.icon(
                    onPressed: onPlayTrip,
                    icon: const Icon(Icons.play_arrow_rounded),
                    label: const Text('Play Trip'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: AppColors.textPrimary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              _InfoGrid(
                items: [
                  _TrackingInfo(
                      'Speed',
                      '${(position?.speedKmh ?? 0).round()} km/h',
                      Icons.speed_rounded),
                  _TrackingInfo('Ignition', _ignitionText(position?.ignition),
                      Icons.vpn_key_rounded),
                  _TrackingInfo('GPS', position == null ? 'Waiting' : 'Fixed',
                      Icons.gps_fixed_rounded),
                  _TrackingInfo(
                      'Last Updated', lastUpdated, Icons.access_time_rounded),
                ],
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.bg,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _Line(
                      icon: Icons.route_rounded,
                      label: 'Today Distance',
                      value: '${todayDistanceKm.toStringAsFixed(1)} km',
                    ),
                    const SizedBox(height: 12),
                    _Line(
                      icon: Icons.location_on_rounded,
                      label: 'Current Location',
                      value: location,
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  String _ignitionText(bool? ignition) {
    if (ignition == true) return 'ON';
    if (ignition == false) return 'OFF';
    return 'Unknown';
  }
}

class _StatusPill extends StatelessWidget {
  final String status;
  const _StatusPill({required this.status});

  @override
  Widget build(BuildContext context) {
    final color = status == 'Moving'
        ? AppColors.success
        : status == 'Offline'
            ? AppColors.offline
            : status == 'Parked'
                ? AppColors.textSecondary
                : AppColors.warning;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        status,
        style: TextStyle(color: color, fontWeight: FontWeight.w900),
      ),
    );
  }
}

class _TrackingInfo {
  final String label;
  final String value;
  final IconData icon;
  const _TrackingInfo(this.label, this.value, this.icon);
}

class _InfoGrid extends StatelessWidget {
  final List<_TrackingInfo> items;
  const _InfoGrid({required this.items});

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: items.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 2.45,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
      ),
      itemBuilder: (_, index) {
        final item = items[index];
        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              Icon(item.icon, color: AppColors.primaryDark, size: 21),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      item.value,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w900),
                    ),
                    Text(
                      item.label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _Line extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _Line({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: AppColors.textMuted, size: 20),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontWeight: FontWeight.w700)),
              const SizedBox(height: 3),
              Text(value,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w900)),
            ],
          ),
        ),
      ],
    );
  }
}
