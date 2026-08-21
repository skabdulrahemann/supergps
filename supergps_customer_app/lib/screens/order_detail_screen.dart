import 'package:flutter/material.dart';
import '../constants/colors.dart';
import '../models/order_model.dart';
import 'package:intl/intl.dart';

class OrderDetailScreen extends StatelessWidget {
  final OrderModel order;
  const OrderDetailScreen({super.key, required this.order});

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
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
            onPressed: () => Navigator.pop(context)),
        title: const Text('Order Details',
            style: TextStyle(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w800,
                fontFamily: 'Inter')),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: AppColors.border)),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                          color: AppColors.bg,
                          borderRadius: BorderRadius.circular(10)),
                      child: Text(order.orderNumber,
                          style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textSecondary,
                              fontFamily: 'Inter')),
                    ),
                    const SizedBox(height: 16),
                    Text('₹${NumberFormat('#,##0').format(order.totalAmount)}',
                        style: const TextStyle(
                            fontSize: 36,
                            fontWeight: FontWeight.w900,
                            color: AppColors.primary,
                            fontFamily: 'Inter')),
                    const SizedBox(height: 14),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _StatusBadge(
                            label: order.orderStatus.toUpperCase(),
                            color: _statusColor(order.orderStatus)),
                        const SizedBox(width: 8),
                        _StatusBadge(
                          label: order.paymentStatus.toUpperCase(),
                          color: order.paymentStatus == 'paid'
                              ? AppColors.success
                              : AppColors.warning,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              _Section(title: 'Product Details', children: [
                _InfoRow(label: 'Product', value: order.productName),
                _InfoRow(label: 'Quantity', value: order.quantity.toString()),
                _InfoRow(
                    label: 'Price per unit',
                    value: '₹${NumberFormat('#,##0').format(order.price)}'),
              ]),
              const SizedBox(height: 14),
              _Section(title: 'Vehicle Details', children: [
                _InfoRow(
                    label: 'Vehicle Number',
                    value: order.targetVehicleNumber ?? 'N/A',
                    valueColor: AppColors.primary),
                _InfoRow(
                    label: 'Type', value: order.targetVehicleType ?? 'N/A'),
                _InfoRow(
                    label: 'Brand', value: order.targetVehicleBrand ?? 'N/A'),
                _InfoRow(
                    label: 'Model', value: order.targetVehicleModel ?? 'N/A'),
              ]),
              const SizedBox(height: 14),
              _Section(title: 'Shipping', children: [
                _InfoRow(
                    label: 'Address',
                    value: order.shippingAddress ?? 'Not provided'),
              ]),
              if (order.salesCode != null) ...[
                const SizedBox(height: 14),
                _Section(title: 'Dealer Info', children: [
                  _InfoRow(label: 'Sales Code', value: order.salesCode!),
                  _InfoRow(
                      label: 'Dealer',
                      value: order.dealer?['companyName'] ?? 'N/A'),
                ]),
              ],
              const SizedBox(height: 14),
              _Section(title: 'Order Info', children: [
                _InfoRow(
                    label: 'Order Date',
                    value: order.createdAt != null
                        ? DateFormat('dd MMM yyyy, hh:mm a')
                            .format(DateTime.parse(order.createdAt!))
                        : 'N/A'),
                _InfoRow(
                    label: 'Activated',
                    value: order.isActivated ? 'Yes' : 'Pending',
                    valueColor: order.isActivated
                        ? AppColors.success
                        : AppColors.warning),
              ]),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String label;
  final Color color;
  const _StatusBadge({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
      decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(20)),
      child: Text(label,
          style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: color,
              fontFamily: 'Inter')),
    );
  }
}

class _Section extends StatelessWidget {
  final String title;
  final List<Widget> children;
  const _Section({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.border)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                  fontFamily: 'Inter')),
          const SizedBox(height: 14),
          ...children,
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;
  const _InfoRow({required this.label, required this.value, this.valueColor});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
              flex: 2,
              child: Text(label,
                  style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                      fontFamily: 'Inter'))),
          Expanded(
            flex: 3,
            child: Text(value,
                style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: valueColor ?? AppColors.textPrimary,
                    fontFamily: 'Inter'),
                textAlign: TextAlign.right),
          ),
        ],
      ),
    );
  }
}
