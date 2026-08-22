import 'package:flutter/material.dart';
import '../constants/colors.dart';
import '../models/order_model.dart';
import '../services/api_service.dart';
import 'order_detail_screen.dart';

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
      final res = await ApiService.get('/orders/my-orders');
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
        title: const Text('My Orders',
            style: TextStyle(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w600,
                fontFamily: 'Poppins')),
        centerTitle: true,
      ),
      body: SafeArea(
        child: _loading
            ? const Center(
                child: CircularProgressIndicator(color: AppColors.primary))
            : RefreshIndicator(
                onRefresh: _fetchOrders,
                color: AppColors.primary,
                child: _orders.isEmpty
                    ? ListView(
                        children: [
                          SizedBox(
                              height: MediaQuery.of(context).size.height * 0.3),
                          const Icon(Icons.receipt_long_outlined,
                              size: 64, color: AppColors.textMuted),
                          const SizedBox(height: 16),
                          const Center(
                              child: Text('No orders yet',
                                  style: TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textSecondary,
                                      fontFamily: 'Poppins'))),
                          const SizedBox(height: 8),
                          const Center(
                              child: Text('Your orders will appear here',
                                  style: TextStyle(
                                      fontSize: 14,
                                      color: AppColors.textMuted,
                                      fontFamily: 'Poppins'))),
                        ],
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(20),
                        itemCount: _orders.length,
                        itemBuilder: (ctx, i) => _OrderCard(order: _orders[i]),
                      ),
              ),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final OrderModel order;
  const _OrderCard({required this.order});

  Color _statusColor(String status) {
    switch (status) {
      case 'delivered':
        return AppColors.success;
      case 'placed':
        return AppColors.warning;
      case 'confirmed':
        return AppColors.primary;
      case 'shipped':
        return AppColors.purple;
      default:
        return AppColors.textMuted;
    }
  }

  @override
  Widget build(BuildContext context) {
    final progress = _progress(order);
    final vehicleLabel = order.targetVehicleNumber ?? 'Vehicle pending';

    return GestureDetector(
      onTap: () => Navigator.push(context,
          MaterialPageRoute(builder: (_) => OrderDetailScreen(order: order))),
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.035),
                blurRadius: 14,
                offset: const Offset(0, 8))
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                      color: AppColors.bg,
                      borderRadius: BorderRadius.circular(8)),
                  child: Text(order.orderNumber,
                      style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textSecondary,
                          fontFamily: 'Poppins')),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                      color: _statusColor(order.orderStatus)
                          .withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20)),
                  child: Text(order.orderStatus.toUpperCase(),
                      style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: _statusColor(order.orderStatus),
                          fontFamily: 'Poppins')),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Container(
                  width: 54,
                  height: 54,
                  decoration: BoxDecoration(
                    gradient: order.productName.toLowerCase().contains('fastag')
                        ? null
                        : AppColors.primaryGradient,
                    color: order.productName.toLowerCase().contains('fastag')
                        ? AppColors.tint(AppColors.accent)
                        : null,
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Icon(
                      order.productName.toLowerCase().contains('fastag')
                          ? Icons.toll_rounded
                          : Icons.gps_fixed_rounded,
                      color: order.productName.toLowerCase().contains('fastag')
                          ? AppColors.accent
                          : Colors.white),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(order.productName,
                          style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                              fontFamily: 'Poppins')),
                      const SizedBox(height: 4),
                      Text(vehicleLabel,
                          style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary,
                              fontFamily: 'Poppins')),
                      if (order.targetVehicleBrand != null ||
                          order.targetVehicleModel != null)
                        Text(
                            '${order.targetVehicleBrand ?? ''} ${order.targetVehicleModel ?? ''}'
                                .trim(),
                            style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.textSecondary,
                                fontFamily: 'Poppins')),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 8,
                backgroundColor: AppColors.bg,
                color: order.isActivated
                    ? AppColors.success
                    : _statusColor(order.orderStatus),
              ),
            ),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('₹${order.totalAmount.toStringAsFixed(0)}',
                    style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary,
                        fontFamily: 'Poppins')),
                if (order.salesCode != null)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                        color: AppColors.purple.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8)),
                    child: Text(order.salesCode!,
                        style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: AppColors.purple,
                            fontFamily: 'Poppins')),
                  ),
              ],
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                  color: AppColors.bg, borderRadius: BorderRadius.circular(16)),
              child: Row(
                children: [
                  Icon(Icons.route_rounded,
                      size: 16,
                      color: order.isActivated
                          ? AppColors.success
                          : AppColors.primary),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _nextStep(order),
                      style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                          fontFamily: 'Poppins'),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Icon(Icons.payment_outlined,
                    size: 14,
                    color: order.paymentStatus == 'paid'
                        ? AppColors.success
                        : AppColors.warning),
                const SizedBox(width: 4),
                Text(
                  order.paymentStatus.toUpperCase(),
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: order.paymentStatus == 'paid'
                          ? AppColors.success
                          : AppColors.warning,
                      fontFamily: 'Poppins'),
                ),
                const SizedBox(width: 12),
                if (order.isActivated)
                  Row(
                    children: [
                      const Icon(Icons.verified_rounded,
                          size: 14, color: AppColors.success),
                      const SizedBox(width: 4),
                      const Text('ACTIVATED',
                          style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: AppColors.success,
                              fontFamily: 'Poppins')),
                    ],
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  double _progress(OrderModel order) {
    if (order.isActivated) return 1;
    switch (order.orderStatus) {
      case 'delivered':
        return 0.8;
      case 'shipped':
        return 0.65;
      case 'confirmed':
        return 0.45;
      case 'placed':
        return 0.2;
      default:
        return 0.1;
    }
  }

  String _nextStep(OrderModel order) {
    if (order.isActivated) {
      return 'Device activated. Vehicle tracking ready.';
    }
    if (order.dealer != null) {
      return 'Dealer assigned. Device activation pending.';
    }
    if (order.paymentStatus != 'paid') {
      return 'Payment pending. Admin will verify and assign dealer.';
    }
    return 'Order placed. Admin will assign a dealer.';
  }
}
