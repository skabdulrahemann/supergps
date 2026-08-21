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
  String? _vehicleId;
  List<Map<String, dynamic>> _logs = [];

  @override
  void initState() {
    super.initState();
    _vehicleNumCtrl.text = widget.order.targetVehicleNumber ?? '';
    _vehicleBrandCtrl.text = widget.order.targetVehicleBrand ?? '';
    _vehicleModelCtrl.text = widget.order.targetVehicleModel ?? '';
    _vehicleType = widget.order.targetVehicleType ?? 'car';

    if (widget.order.vehicles.isNotEmpty) {
      _vehicleId = widget.order.vehicles.first['id']?.toString();
      if (widget.order.isActivated) {
        _currentStep = _steps.length + 1;
      } else {
        _currentStep = 1;
      }
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _fetchActivationLogs();
      });
    }
  }

  @override
  void dispose() {
    _imeiCtrl.dispose();
    _serialCtrl.dispose();
    _simCtrl.dispose();
    _vehicleNumCtrl.dispose();
    _vehicleBrandCtrl.dispose();
    _vehicleModelCtrl.dispose();
    super.dispose();
  }

  final List<Map<String, dynamic>> _steps = [
    {
      'key': 'device_check',
      'label': 'Device Check',
      'icon': Icons.phonelink_setup_rounded,
      'desc': 'Inspect device physically'
    },
    {
      'key': 'sim_insert',
      'label': 'SIM Insert',
      'icon': Icons.sim_card_rounded,
      'desc': 'Insert SIM card properly'
    },
    {
      'key': 'power_on',
      'label': 'Power On',
      'icon': Icons.power_settings_new_rounded,
      'desc': 'Power on the device'
    },
    {
      'key': 'gps_signal',
      'label': 'GPS Signal',
      'icon': Icons.gps_fixed_rounded,
      'desc': 'Wait for GPS signal'
    },
    {
      'key': 'server_connect',
      'label': 'Server Connect',
      'icon': Icons.cloud_done_rounded,
      'desc': 'Connect to SuperGPS server'
    },
    {
      'key': 'completed',
      'label': 'Completed',
      'icon': Icons.verified_rounded,
      'desc': 'Activation complete'
    },
  ];

  Future<void> _startActivation() async {
    if (_imeiCtrl.text.trim().isEmpty || _serialCtrl.text.trim().isEmpty) {
      _showMsg('IMEI and Serial Number are required', true);
      return;
    }
    setState(() => _loading = true);
    try {
      final res =
          await ApiService.post('/activation/start/${widget.order.id}', {
        'imeiNumber': _imeiCtrl.text.trim(),
        'deviceSerialNumber': _serialCtrl.text.trim(),
        'simNumber': _simCtrl.text.trim().isEmpty ? null : _simCtrl.text.trim(),
        'vehicleNumber': _vehicleNumCtrl.text.trim().isEmpty
            ? null
            : _vehicleNumCtrl.text.trim(),
        'vehicleType': _vehicleType,
        'vehicleBrand': _vehicleBrandCtrl.text.trim().isEmpty
            ? null
            : _vehicleBrandCtrl.text.trim(),
        'vehicleModel': _vehicleModelCtrl.text.trim().isEmpty
            ? null
            : _vehicleModelCtrl.text.trim(),
      });
      if (mounted) {
        final vehicle = res['vehicle'];
        _vehicleId = vehicle is Map ? vehicle['id']?.toString() : null;
        await _fetchActivationLogs(showLoader: false);
        _showMsg('Activation started! Complete the steps below.', false);
      }
    } catch (e) {
      _showMsg(e.toString().replaceAll('Exception: ', ''), true);
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _completeStep(int stepIndex) async {
    if (_vehicleId == null) {
      _showMsg(
          'Activation vehicle not found. Refresh orders and try again.', true);
      return;
    }
    if (_logs.isEmpty) {
      await _fetchActivationLogs();
    }
    if (stepIndex >= _logs.length) {
      _showMsg('Activation logs are not ready yet. Pull to refresh.', true);
      return;
    }

    setState(() => _loading = true);
    try {
      final logId = _logs[stepIndex]['id']?.toString();
      if (logId == null || logId.isEmpty) {
        _showMsg('Activation log ID missing. Please refresh.', true);
        return;
      }

      await ApiService.put('/activation/step/$logId', {
        'status': 'done',
      });
      await _fetchActivationLogs(showLoader: false);

      if (_isComplete) {
        _showMsg('Activation completed successfully!', false);
        await Future.delayed(const Duration(seconds: 1));
        if (mounted) Navigator.pop(context, true);
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _fetchActivationLogs({bool showLoader = true}) async {
    if (_vehicleId == null) return;
    if (showLoader && mounted) setState(() => _loading = true);
    try {
      final res = await ApiService.get('/activation/logs/$_vehicleId');
      final logsJson = res['logs'];
      final logs = logsJson is List
          ? logsJson
              .whereType<Map>()
              .map((log) => Map<String, dynamic>.from(log))
              .toList()
          : <Map<String, dynamic>>[];
      if (!mounted) return;
      setState(() {
        _logs = logs;
        _syncStepFromLogs();
      });
    } catch (e) {
      if (mounted) {
        _showMsg(e.toString().replaceAll('Exception: ', ''), true);
      }
    } finally {
      if (showLoader && mounted) setState(() => _loading = false);
    }
  }

  void _syncStepFromLogs() {
    if (_logs.isEmpty) {
      _currentStep = widget.order.isActivated ? _steps.length + 1 : 1;
      return;
    }
    final doneCount = _logs.where((log) => log['status'] == 'done').length;
    _currentStep =
        doneCount >= _steps.length ? _steps.length + 1 : doneCount + 1;
  }

  bool get _isComplete => _currentStep > _steps.length;

  String _statusForStep(int index) {
    if (index >= _logs.length) {
      return index < _currentStep - 1 ? 'done' : 'pending';
    }
    return _logs[index]['status']?.toString() ?? 'pending';
  }

  void _showMsg(String msg, bool isError) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
          content: Text(msg, style: const TextStyle(fontFamily: 'Inter')),
          backgroundColor: isError ? AppColors.error : AppColors.success,
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
            onPressed: () => Navigator.pop(context)),
        title: const Text('Activate Device',
            style: TextStyle(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w900,
                fontFamily: 'Inter')),
        actions: [
          if (_vehicleId != null)
            IconButton(
              tooltip: 'Refresh',
              onPressed: _loading ? null : _fetchActivationLogs,
              icon: const Icon(Icons.refresh_rounded,
                  color: AppColors.textPrimary),
            ),
        ],
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
                decoration: BoxDecoration(
                    gradient: AppColors.darkGradient,
                    borderRadius: BorderRadius.circular(20)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Order: ${widget.order.orderNumber}',
                        style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                            fontFamily: 'Inter')),
                    const SizedBox(height: 4),
                    Text(
                        '${widget.order.productName} x ${widget.order.quantity}',
                        style: const TextStyle(
                            fontSize: 13,
                            color: Colors.white70,
                            fontFamily: 'Inter')),
                    const SizedBox(height: 8),
                    Text('Customer: ${widget.order.customer?['name'] ?? 'N/A'}',
                        style: const TextStyle(
                            fontSize: 13,
                            color: Colors.white70,
                            fontFamily: 'Inter')),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              if (_isComplete) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    color: AppColors.tint(AppColors.success),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: AppColors.success),
                  ),
                  child: const Column(
                    children: [
                      Icon(Icons.verified_rounded,
                          color: AppColors.success, size: 46),
                      SizedBox(height: 12),
                      Text('Activation Complete',
                          style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              color: AppColors.textPrimary,
                              fontFamily: 'Inter')),
                      SizedBox(height: 4),
                      Text('This order is marked activated in backend.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                              fontSize: 13,
                              color: AppColors.textSecondary,
                              fontFamily: 'Inter')),
                    ],
                  ),
                ),
              ] else if (_currentStep == 0) ...[
                const Text('Device Details',
                    style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        color: AppColors.textPrimary,
                        fontFamily: 'Inter')),
                const SizedBox(height: 16),
                _buildField('IMEI Number *', 'Enter device IMEI',
                    Icons.memory_rounded, _imeiCtrl,
                    keyboardType: TextInputType.number),
                const SizedBox(height: 14),
                _buildField('Serial Number *', 'Enter serial number',
                    Icons.confirmation_number_rounded, _serialCtrl),
                const SizedBox(height: 14),
                _buildField('SIM Number', 'Enter SIM number',
                    Icons.sim_card_rounded, _simCtrl,
                    keyboardType: TextInputType.number),
                const SizedBox(height: 14),
                _buildField('Vehicle Number', 'e.g. MH12AB1234',
                    Icons.directions_car_rounded, _vehicleNumCtrl),
                const SizedBox(height: 14),
                _buildField('Vehicle Brand', 'e.g. Maruti',
                    Icons.branding_watermark_rounded, _vehicleBrandCtrl),
                const SizedBox(height: 14),
                _buildField('Vehicle Model', 'e.g. Swift',
                    Icons.model_training_rounded, _vehicleModelCtrl),
                const SizedBox(height: 14),
                const Text('Vehicle Type',
                    style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                        fontFamily: 'Inter')),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 10,
                  children: ['car', 'bike', 'truck', 'bus']
                      .map((type) => ChoiceChip(
                            label: Text(type.toUpperCase()),
                            selected: _vehicleType == type,
                            onSelected: (selected) =>
                                setState(() => _vehicleType = type),
                            selectedColor: AppColors.primary,
                            labelStyle: TextStyle(
                                color: AppColors.textPrimary,
                                fontFamily: 'Inter',
                                fontSize: 12),
                          ))
                      .toList(),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: _loading ? null : _startActivation,
                    style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: AppColors.textPrimary,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16))),
                    child: _loading
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                                strokeWidth: 2.5, color: AppColors.textPrimary))
                        : const Text('Start Activation',
                            style: TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w700,
                                fontFamily: 'Inter')),
                  ),
                ),
              ] else ...[
                const Text('Activation Steps',
                    style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        color: AppColors.textPrimary,
                        fontFamily: 'Inter')),
                const SizedBox(height: 16),
                ...List.generate(_steps.length, (i) {
                  final status = _statusForStep(i);
                  final isDone = status == 'done';
                  final isFailed = status == 'failed';
                  final isCurrent =
                      !isDone && !isFailed && i == _currentStep - 1;
                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isDone
                          ? AppColors.tint(AppColors.success)
                          : isFailed
                              ? AppColors.tint(AppColors.error)
                              : AppColors.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                          color: isDone
                              ? AppColors.success
                              : isFailed
                                  ? AppColors.error
                                  : isCurrent
                                      ? AppColors.primary
                                      : AppColors.border),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: isDone
                                ? AppColors.success
                                : isFailed
                                    ? AppColors.error
                                    : isCurrent
                                        ? AppColors.primary
                                        : AppColors.bg,
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Icon(
                              isDone
                                  ? Icons.check_rounded
                                  : isFailed
                                      ? Icons.close_rounded
                                      : _steps[i]['icon'],
                              color: isDone
                                  ? Colors.white
                                  : isFailed
                                      ? Colors.white
                                      : isCurrent
                                          ? AppColors.textPrimary
                                          : AppColors.textMuted,
                              size: 22),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(_steps[i]['label'],
                                  style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w700,
                                      color: isDone
                                          ? AppColors.success
                                          : isFailed
                                              ? AppColors.error
                                              : AppColors.textPrimary,
                                      fontFamily: 'Inter')),
                              const SizedBox(height: 2),
                              Text(_steps[i]['desc'],
                                  style: const TextStyle(
                                      fontSize: 12,
                                      color: AppColors.textSecondary,
                                      fontFamily: 'Inter')),
                            ],
                          ),
                        ),
                        if (isCurrent)
                          GestureDetector(
                            onTap: _loading ? null : () => _completeStep(i),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 14, vertical: 8),
                              decoration: BoxDecoration(
                                  color: AppColors.primary,
                                  borderRadius: BorderRadius.circular(10)),
                              child: _loading
                                  ? const SizedBox(
                                      width: 16,
                                      height: 16,
                                      child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: AppColors.textPrimary))
                                  : const Text('Done',
                                      style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w900,
                                          color: AppColors.textPrimary,
                                          fontFamily: 'Inter')),
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

  Widget _buildField(String label, String hint, IconData icon,
      TextEditingController controller,
      {TextInputType keyboardType = TextInputType.text}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
                fontFamily: 'Inter')),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          style: const TextStyle(
              fontSize: 15, fontFamily: 'Inter', color: AppColors.textPrimary),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(
                color: AppColors.textMuted, fontFamily: 'Inter', fontSize: 14),
            prefixIcon: Icon(icon, color: AppColors.textMuted, size: 22),
            filled: true,
            fillColor: AppColors.surface,
            border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(color: AppColors.border)),
            enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(color: AppColors.border)),
            focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide:
                    const BorderSide(color: AppColors.primary, width: 2)),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
          ),
        ),
      ],
    );
  }
}
