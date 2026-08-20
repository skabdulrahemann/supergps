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
        backgroundColor: AppColors.surface,
        elevation: 0,
        title: const Text('My Vehicles', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w800, fontFamily: 'Inter')),
        centerTitle: true,
      ),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
            : RefreshIndicator(
                onRefresh: _fetchVehicles,
                color: AppColors.primary,
                child: _vehicles.isEmpty
                    ? ListView(
                        children: [
                          SizedBox(height: MediaQuery.of(context).size.height * 0.3),
                          const Icon(Icons.directions_car_outlined, size: 64, color: AppColors.textMuted),
                          const SizedBox(height: 16),
                          const Center(child: Text('No vehicles yet', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.textSecondary, fontFamily: 'Inter'))),
                          const SizedBox(height: 8),
                          const Center(child: Text('Activated vehicles will appear here', style: TextStyle(fontSize: 14, color: AppColors.textMuted, fontFamily: 'Inter'))),
                        ],
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(20),
                        itemCount: _vehicles.length,
                        itemBuilder: (ctx, i) => _VehicleCard(vehicle: _vehicles[i]),
                      ),
              ),
      ),
    );
  }
}

class _VehicleCard extends StatelessWidget {
  final VehicleModel vehicle;
  const _VehicleCard({required this.vehicle});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(24), border: Border.all(color: AppColors.border), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4))]),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(width: 56, height: 56, decoration: BoxDecoration(color: AppColors.success.withOpacity(0.1), borderRadius: BorderRadius.circular(18)), child: const Icon(Icons.directions_car_rounded, color: AppColors.success, size: 28)),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(vehicle.vehicleNumber ?? 'Unnamed', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.textPrimary, fontFamily: 'Inter')),
                    const SizedBox(height: 2),
                    Text('${vehicle.vehicleBrand ?? ''} ${vehicle.vehicleModel ?? ''}', style: const TextStyle(fontSize: 13, color: AppColors.textSecondary, fontFamily: 'Inter')),
                  ],
                ),
              ),
              Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: AppColors.success.withOpacity(0.1), borderRadius: BorderRadius.circular(20)), child: const Text('ACTIVATED', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.success, fontFamily: 'Inter'))),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(),
          const SizedBox(height: 12),
          _Detail(icon: Icons.person_outline, label: 'Customer', value: '${vehicle.customer?['name'] ?? 'N/A'} (${vehicle.customer?['phone'] ?? ''})'),
          const SizedBox(height: 10),
          _Detail(icon: Icons.memory_rounded, label: 'IMEI', value: vehicle.imeiNumber),
          const SizedBox(height: 10),
          _Detail(icon: Icons.confirmation_number_rounded, label: 'Serial', value: vehicle.deviceSerialNumber),
          const SizedBox(height: 10),
          _Detail(icon: Icons.sim_card_rounded, label: 'SIM', value: vehicle.simNumber ?? 'N/A'),
          if (vehicle.activatedAt != null) ...[
            const SizedBox(height: 10),
            _Detail(icon: Icons.calendar_today_rounded, label: 'Activated', value: vehicle.activatedAt!.substring(0, 10)),
          ],
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
        Text('$label: ', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontFamily: 'Inter')),
        Expanded(child: Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textPrimary, fontFamily: 'Inter'), overflow: TextOverflow.ellipsis)),
      ],
    );
  }
}
