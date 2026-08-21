import 'package:flutter/material.dart';
import '../constants/colors.dart';
import '../models/vehicle_model.dart';
import '../services/api_service.dart';

class VehiclesScreen extends StatefulWidget {
  const VehiclesScreen({super.key});

  @override
  State<VehiclesScreen> createState() => _VehiclesScreenState();
}

class _VehiclesScreenState extends State<VehiclesScreen> {
  List<VehicleModel> _vehicles = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetchVehicles();
  }

  Future<void> _fetchVehicles() async {
    try {
      final res = await ApiService.get('/vehicles/dealer-vehicles');
      final data = res['vehicles'] as List? ?? [];
      setState(() {
        _vehicles = data.map((v) => VehicleModel.fromJson(v)).toList();
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: const Text('My Vehicles',
            style: TextStyle(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w900,
                fontFamily: 'Inter')),
      ),
      body: SafeArea(
        child: _loading
            ? const Center(
                child: CircularProgressIndicator(color: AppColors.primary))
            : RefreshIndicator(
                onRefresh: _fetchVehicles,
                color: AppColors.primary,
                child: _vehicles.isEmpty
                    ? ListView(
                        children: [
                          SizedBox(
                              height: MediaQuery.of(context).size.height * 0.3),
                          const Icon(Icons.directions_car_outlined,
                              size: 64, color: AppColors.textMuted),
                          const SizedBox(height: 16),
                          const Center(
                              child: Text('No vehicles yet',
                                  style: TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textSecondary,
                                      fontFamily: 'Inter'))),
                          const SizedBox(height: 8),
                          const Center(
                              child: Text('Activated vehicles will appear here',
                                  style: TextStyle(
                                      fontSize: 14,
                                      color: AppColors.textMuted,
                                      fontFamily: 'Inter'))),
                        ],
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(20),
                        itemCount: _vehicles.length,
                        itemBuilder: (ctx, i) =>
                            _VehicleCard(vehicle: _vehicles[i]),
                      ),
              ),
      ),
    );
  }
}

class _VehicleCard extends StatelessWidget {
  final VehicleModel vehicle;
  const _VehicleCard({required this.vehicle});

  Color get _statusColor {
    switch (vehicle.activationStatus) {
      case 'activated':
        return AppColors.success;
      case 'in_progress':
        return AppColors.primary;
      case 'deactivated':
        return AppColors.error;
      default:
        return AppColors.warning;
    }
  }

  @override
  Widget build(BuildContext context) {
    final model = [
      vehicle.vehicleBrand,
      vehicle.vehicleModel,
      vehicle.vehicleType,
    ].whereType<String>().where((v) => v.isNotEmpty).join(' ');
    final speed = vehicle.speedKmh == null
        ? '0 km/h'
        : '${vehicle.speedKmh!.round()} km/h';
    final location = vehicle.lastLocation ?? 'Waiting for first GPS fix';
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.025),
            blurRadius: 12,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                      color: AppColors.tint(_statusColor),
                      borderRadius: BorderRadius.circular(14)),
                  child: Icon(Icons.directions_car_rounded,
                      color: _statusColor == AppColors.primary
                          ? AppColors.textPrimary
                          : _statusColor,
                      size: 25)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(vehicle.vehicleNumber ?? 'Vehicle number pending',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 16.5,
                            fontWeight: FontWeight.w900,
                            color: AppColors.textPrimary,
                            fontFamily: 'Inter')),
                    const SizedBox(height: 2),
                    Text(model.isEmpty ? 'Vehicle details pending' : model,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 12.5,
                            color: AppColors.textSecondary,
                            fontFamily: 'Inter')),
                  ],
                ),
              ),
              Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                      color: AppColors.tint(_statusColor),
                      borderRadius: BorderRadius.circular(20)),
                  child: Text(vehicle.activationStatus.toUpperCase(),
                      style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          color: _statusColor == AppColors.primary
                              ? AppColors.textPrimary
                              : _statusColor,
                          fontFamily: 'Inter'))),
            ],
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.bg,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              children: [
                Expanded(child: _MiniMetric(label: 'Speed', value: speed)),
                Container(width: 1, height: 30, color: AppColors.border),
                Expanded(
                    child: _MiniMetric(
                        label: 'Updated',
                        value: vehicle.lastSeen ?? 'No GPS yet')),
              ],
            ),
          ),
          const SizedBox(height: 12),
          _Detail(
              icon: Icons.location_on_rounded,
              label: 'Location',
              value: location),
          const SizedBox(height: 10),
          _Detail(
              icon: Icons.person_outline,
              label: 'Customer',
              value:
                  '${vehicle.customer?['name'] ?? 'N/A'} (${vehicle.customer?['phone'] ?? ''})'),
          const SizedBox(height: 10),
          _Detail(
              icon: Icons.memory_rounded,
              label: 'IMEI',
              value: vehicle.imeiNumber),
          const SizedBox(height: 10),
          _Detail(
              icon: Icons.confirmation_number_rounded,
              label: 'Serial',
              value: vehicle.deviceSerialNumber),
          const SizedBox(height: 10),
          _Detail(
              icon: Icons.sim_card_rounded,
              label: 'SIM',
              value: vehicle.simNumber ?? 'N/A'),
          if (vehicle.activatedAt != null) ...[
            const SizedBox(height: 10),
            _Detail(
                icon: Icons.calendar_today_rounded,
                label: 'Activated',
                value: vehicle.activatedAt!.substring(0, 10)),
          ],
        ],
      ),
    );
  }
}

class _MiniMetric extends StatelessWidget {
  final String label;
  final String value;
  const _MiniMetric({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                  color: AppColors.textPrimary,
                  fontFamily: 'Inter')),
          const SizedBox(height: 2),
          Text(label,
              style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary,
                  fontFamily: 'Inter')),
        ],
      ),
    );
  }
}

class _Detail extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _Detail({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 16, color: AppColors.textMuted),
        const SizedBox(width: 8),
        Text('$label: ',
            style: const TextStyle(
                fontSize: 12,
                color: AppColors.textSecondary,
                fontFamily: 'Inter')),
        Expanded(
            child: Text(value,
                style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                    fontFamily: 'Inter'),
                overflow: TextOverflow.ellipsis)),
      ],
    );
  }
}
