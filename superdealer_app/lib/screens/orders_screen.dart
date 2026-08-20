import 'package:flutter/material.dart';
import '../constants/colors.dart';
import '../models/order_model.dart';
import '../services/api_service.dart';
import 'activation_screen.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  List<OrderModel> _orders = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetchOrders();
  }

  Future<void> _fetchOrders() async {
    try {
      final res = await ApiService.get('/orders/dealer-orders');
      final data = res['orders'] as List? ?? [];
      setState(() {
        _orders = data.map((o) => OrderModel.fromJson(o)).toList();
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
        title: const Text('Orders', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w800, fontFamily: 'Inter')),
        centerTitle: true,
      ),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
            : RefreshIndicator(
                onRefresh: _fetchOrders,
                color: AppColors.primary,
                child: _orders.isEmpty
                    ? ListView(
                        children: [
                          SizedBox(height: MediaQuery.of(context).size.height * 0.3),
                          const Icon(Icons.receipt_long_outlined, size: 64, color: AppColors.textMuted),
                          const SizedBox(height: 16),
                          const Center(child: Text('No orders yet', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.textSecondary, fontFamily: 'Inter'))),
                          const SizedBox(height: 8),
                          const Center(child: Text('Orders placed with your sales code will appear here', style: TextStyle(fontSize: 14, color: AppColors.textMuted, fontFamily: 'Inter'))),
                        ],
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(20),
                        itemCount: _orders.length,
                        itemBuilder: (ctx, i) => _OrderCard(order: _orders[i], onActivate: () {
                          Navigator.push(context, MaterialPageRoute(builder: (_) => ActivationScreen(order: _orders[i]))).then((_) => _fetchOrders());
                        }),
                      ),
              ),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final OrderModel order;
  final VoidCallback onActivate;

  const _OrderCard({required this.order, required this.onActivate});

  Color _statusColor(String status) {
    switch (status) {
      case 'delivered': return AppColors.success;
      case 'placed': return AppColors.warning;
      case 'confirmed': return AppColors.primary;
      case 'shipped': return AppColors.info;
      default: return AppColors.textMuted;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(20), border: Border.all(color: AppColors.border)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: AppColors.bg, borderRadius: BorderRadius.circular(8)), child: Text(order.orderNumber, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textSecondary, fontFamily: 'Inter'))),
              Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: _statusColor(order.orderStatus).withOpacity(0.1), borderRadius: BorderRadius.circular(20)), child: Text(order.orderStatus.toUpperCase(), style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: _statusColor(order.orderStatus), fontFamily: 'Inter'))),
            ],
          ),
          const SizedBox(height: 12),
          Text(order.productName, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary, fontFamily: 'Inter')),
          const SizedBox(height: 4),
          Text(order.targetVehicleNumber ?? 'Vehicle details pending', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.primary, fontFamily: 'Inter')),
          if (order.targetVehicleBrand != null || order.targetVehicleModel != null)
            Padding(
              padding: const EdgeInsets.only(top: 3),
              child: Text('${order.targetVehicleBrand ?? ''} ${order.targetVehicleModel ?? ''}'.trim(), style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontFamily: 'Inter')),
            ),
          const SizedBox(height: 10),
          Row(
            children: [
              const Icon(Icons.person_outline, size: 14, color: AppColors.textMuted),
              const SizedBox(width: 4),
              Text('${order.customer?['name'] ?? 'N/A'} (${order.customer?['phone'] ?? ''})', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontFamily: 'Inter')),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('₹${order.totalAmount.toStringAsFixed(0)}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.primary, fontFamily: 'Inter')),
              if (!order.isActivated)
                GestureDetector(
                  onTap: onActivate,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(gradient: AppColors.primaryGradient, borderRadius: BorderRadius.circular(12)),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.rocket_launch_rounded, color: Colors.white, size: 16),
                        SizedBox(width: 6),
                        Text('Activate', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white, fontFamily: 'Inter')),
                      ],
                    ),
                  ),
                )
              else
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(color: AppColors.success.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.check_circle_rounded, color: AppColors.success, size: 16),
                      SizedBox(width: 4),
                      Text('Activated', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.success, fontFamily: 'Inter')),
                    ],
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
