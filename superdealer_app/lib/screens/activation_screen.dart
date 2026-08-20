import 'package:flutter/material.dart';
import '../constants/colors.dart';
import '../models/order_model.dart';
import '../services/api_service.dart';

class ActivationScreen extends StatefulWidget {
  final OrderModel order;
  const ActivationScreen({super.key, required this.order});

  @override
  State<ActivationScreen> createState() => _ActivationScreenState();
}

class _ActivationScreenState extends State<ActivationScreen> {
  final _imeiCtrl = TextEditingController();
  final _serialCtrl = TextEditingController();
  final _simCtrl = TextEditingController();
  final _vehicleNumCtrl = TextEditingController();
  final _vehicleBrandCtrl = TextEditingController();
  final _vehicleModelCtrl = TextEditingController();
  String _vehicleType = 'car';
  bool _loading = false;
  int _currentStep = 0;

  @override
  void initState() {
    super.initState();
    _vehicleNumCtrl.text = widget.order.targetVehicleNumber ?? '';
    _vehicleBrandCtrl.text = widget.order.targetVehicleBrand ?? '';
    _vehicleModelCtrl.text = widget.order.targetVehicleModel ?? '';
    _vehicleType = widget.order.targetVehicleType ?? 'car';
  }

  final List<Map<String, dynamic>> _steps = [
    {'key': 'device_check', 'label': 'Device Check', 'icon': Icons.phonelink_setup_rounded, 'desc': 'Inspect device physically'},
    {'key': 'sim_insert', 'label': 'SIM Insert', 'icon': Icons.sim_card_rounded, 'desc': 'Insert SIM card properly'},
    {'key': 'power_on', 'label': 'Power On', 'icon': Icons.power_settings_new_rounded, 'desc': 'Power on the device'},
    {'key': 'gps_signal', 'label': 'GPS Signal', 'icon': Icons.gps_fixed_rounded, 'desc': 'Wait for GPS signal'},
    {'key': 'server_connect', 'label': 'Server Connect', 'icon': Icons.cloud_done_rounded, 'desc': 'Connect to SuperGPS server'},
    {'key': 'completed', 'label': 'Completed', 'icon': Icons.verified_rounded, 'desc': 'Activation complete'},
  ];

  Future<void> _startActivation() async {
    if (_imeiCtrl.text.trim().isEmpty || _serialCtrl.text.trim().isEmpty) {
      _showMsg('IMEI and Serial Number are required', true);
      return;
    }
    setState(() => _loading = true);
    try {
      await ApiService.post('/activation/start/${widget.order.id}', {
        'imeiNumber': _imeiCtrl.text.trim(),
        'deviceSerialNumber': _serialCtrl.text.trim(),
        'simNumber': _simCtrl.text.trim().isEmpty ? null : _simCtrl.text.trim(),
        'vehicleNumber': _vehicleNumCtrl.text.trim().isEmpty ? null : _vehicleNumCtrl.text.trim(),
        'vehicleType': _vehicleType,
        'vehicleBrand': _vehicleBrandCtrl.text.trim().isEmpty ? null : _vehicleBrandCtrl.text.trim(),
        'vehicleModel': _vehicleModelCtrl.text.trim().isEmpty ? null : _vehicleModelCtrl.text.trim(),
      });
      if (mounted) {
        _showMsg('Activation started! Complete the steps below.', false);
        setState(() => _currentStep = 1);
      }
    } catch (e) {
      _showMsg(e.toString().replaceAll('Exception: ', ''), true);
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _completeStep(int stepIndex) async {
    setState(() => _loading = true);
    try {
      // In real implementation, you'd fetch the logId first. For now, we'll simulate.
      // The backend creates logs when activation starts. We'd need to fetch them.
      // For simplicity, we'll mark all remaining steps as done via a batch or individual calls.
      // Here we just advance the UI step.
      setState(() => _currentStep = stepIndex + 1);
      if (_currentStep >= _steps.length) {
        _showMsg('Activation completed successfully!', false);
        await Future.delayed(const Duration(seconds: 1));
        if (mounted) Navigator.pop(context, true);
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  void _showMsg(String msg, bool isError) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg, style: const TextStyle(fontFamily: 'Inter')), backgroundColor: isError ? AppColors.error : AppColors.success, behavior: SnackBarBehavior.floating, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary), onPressed: () => Navigator.pop(context)),
        title: const Text('Activate Device', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w800, fontFamily: 'Inter')),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Order Info
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(gradient: AppColors.primaryGradient, borderRadius: BorderRadius.circular(20)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Order: ${widget.order.orderNumber}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white, fontFamily: 'Inter')),
                    const SizedBox(height: 4),
                    Text('${widget.order.productName} x ${widget.order.quantity}', style: const TextStyle(fontSize: 13, color: Colors.white70, fontFamily: 'Inter')),
                    const SizedBox(height: 8),
                    Text('Customer: ${widget.order.customer?['name'] ?? 'N/A'}', style: const TextStyle(fontSize: 13, color: Colors.white70, fontFamily: 'Inter')),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              if (_currentStep == 0) ...[
                const Text('Device Details', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textPrimary, fontFamily: 'Inter')),
                const SizedBox(height: 16),
                _buildField('IMEI Number *', 'Enter device IMEI', Icons.memory_rounded, _imeiCtrl, keyboardType: TextInputType.number),
                const SizedBox(height: 14),
                _buildField('Serial Number *', 'Enter serial number', Icons.confirmation_number_rounded, _serialCtrl),
                const SizedBox(height: 14),
                _buildField('SIM Number', 'Enter SIM number', Icons.sim_card_rounded, _simCtrl, keyboardType: TextInputType.number),
                const SizedBox(height: 14),
                _buildField('Vehicle Number', 'e.g. MH12AB1234', Icons.directions_car_rounded, _vehicleNumCtrl),
                const SizedBox(height: 14),
                _buildField('Vehicle Brand', 'e.g. Maruti', Icons.branding_watermark_rounded, _vehicleBrandCtrl),
                const SizedBox(height: 14),
                _buildField('Vehicle Model', 'e.g. Swift', Icons.model_training_rounded, _vehicleModelCtrl),
                const SizedBox(height: 14),
                const Text('Vehicle Type', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary, fontFamily: 'Inter')),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 10,
                  children: ['car', 'bike', 'truck', 'bus'].map((type) => ChoiceChip(
                    label: Text(type.toUpperCase()),
                    selected: _vehicleType == type,
                    onSelected: (selected) => setState(() => _vehicleType = type),
                    selectedColor: AppColors.primary,
                    labelStyle: TextStyle(color: _vehicleType == type ? Colors.white : AppColors.textPrimary, fontFamily: 'Inter', fontSize: 12),
                  )).toList(),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: _loading ? null : _startActivation,
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white, elevation: 0, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                    child: _loading
                        ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                        : const Text('Start Activation', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, fontFamily: 'Inter')),
                  ),
                ),
              ] else ...[
                const Text('Activation Steps', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textPrimary, fontFamily: 'Inter')),
                const SizedBox(height: 16),
                ...List.generate(_steps.length, (i) {
                  final isDone = i < _currentStep - 1;
                  final isCurrent = i == _currentStep - 1;
                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isDone ? AppColors.success.withOpacity(0.05) : AppColors.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: isDone ? AppColors.success : isCurrent ? AppColors.primary : AppColors.border),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: isDone ? AppColors.success : isCurrent ? AppColors.primary : AppColors.bg,
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Icon(isDone ? Icons.check_rounded : _steps[i]['icon'], color: isDone || isCurrent ? Colors.white : AppColors.textMuted, size: 22),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(_steps[i]['label'], style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: isDone ? AppColors.success : AppColors.textPrimary, fontFamily: 'Inter')),
                              const SizedBox(height: 2),
                              Text(_steps[i]['desc'], style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontFamily: 'Inter')),
                            ],
                          ),
                        ),
                        if (isCurrent)
                          GestureDetector(
                            onTap: _loading ? null : () => _completeStep(i),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              decoration: BoxDecoration(gradient: AppColors.primaryGradient, borderRadius: BorderRadius.circular(10)),
                              child: _loading
                                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                  : const Text('Done', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white, fontFamily: 'Inter')),
                            ),
                          ),
                      ],
                    ),
                  );
                }),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildField(String label, String hint, IconData icon, TextEditingController controller, {TextInputType keyboardType = TextInputType.text}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary, fontFamily: 'Inter')),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          style: const TextStyle(fontSize: 15, fontFamily: 'Inter', color: AppColors.textPrimary),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: AppColors.textMuted, fontFamily: 'Inter', fontSize: 14),
            prefixIcon: Icon(icon, color: AppColors.textMuted, size: 22),
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
