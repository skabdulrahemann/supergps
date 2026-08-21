import 'package:flutter/material.dart';
import '../constants/colors.dart';
import '../constants/products.dart';
import '../services/api_service.dart';
import 'orders_screen.dart';

class ShopScreen extends StatefulWidget {
  const ShopScreen({super.key});

  @override
  State<ShopScreen> createState() => _ShopScreenState();
}

class _ShopScreenState extends State<ShopScreen> {
  Product? _selectedProduct;
  final _vehicleNumberCtrl = TextEditingController();
  final _vehicleBrandCtrl = TextEditingController();
  final _vehicleModelCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _salesCodeCtrl = TextEditingController();
  String _vehicleType = 'car';
  bool _hasSalesCode = false;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _selectedProduct = allProducts.first;
  }

  @override
  void dispose() {
    _vehicleNumberCtrl.dispose();
    _vehicleBrandCtrl.dispose();
    _vehicleModelCtrl.dispose();
    _addressCtrl.dispose();
    _salesCodeCtrl.dispose();
    super.dispose();
  }

  Future<void> _placeOrder() async {
    if (_selectedProduct == null) return;

    final vehicleNumber =
        _vehicleNumberCtrl.text.trim().toUpperCase().replaceAll(' ', '');
    if (vehicleNumber.isEmpty) {
      _showMsg('Pehle vehicle number add karein', true);
      return;
    }
    if (_addressCtrl.text.trim().isEmpty) {
      _showMsg('Installation/shipping address required hai', true);
      return;
    }

    setState(() => _loading = true);
    try {
      await ApiService.post('/orders', {
        'quantity': 1,
        'price': _selectedProduct!.price,
        'shippingAddress': _addressCtrl.text.trim(),
        'paymentMethod': 'online',
        'productName': _selectedProduct!.name,
        'targetVehicleNumber': vehicleNumber,
        'targetVehicleType': _vehicleType,
        'targetVehicleBrand': _vehicleBrandCtrl.text.trim().isEmpty
            ? null
            : _vehicleBrandCtrl.text.trim(),
        'targetVehicleModel': _vehicleModelCtrl.text.trim().isEmpty
            ? null
            : _vehicleModelCtrl.text.trim(),
        if (_hasSalesCode && _salesCodeCtrl.text.trim().isNotEmpty)
          'salesCode': _salesCodeCtrl.text.trim(),
      });
      if (mounted) {
        _showMsg(
            'Order placed! Admin dealer assign karega, phir activation hoga.',
            false);
        Navigator.pushReplacement(
            context, MaterialPageRoute(builder: (_) => const OrdersScreen()));
      }
    } catch (e) {
      _showMsg(e.toString().replaceAll('Exception: ', ''), true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showMsg(String msg, bool isError) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: const TextStyle(fontFamily: 'Inter')),
        backgroundColor: isError ? AppColors.error : AppColors.success,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final total = _selectedProduct?.price ?? 0;

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        title: const Text('Add Vehicle & Order',
            style: TextStyle(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w900,
                fontFamily: 'Inter')),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _hero(),
              const SizedBox(height: 20),
              _sectionTitle(
                  '1. Choose service', 'GPS tracker ya FASTag select karein'),
              const SizedBox(height: 12),
              _serviceGrid(),
              const SizedBox(height: 24),
              _sectionTitle('2. Add vehicle first',
                  'Same vehicle ka duplicate order block hoga'),
              const SizedBox(height: 12),
              _vehicleForm(),
              const SizedBox(height: 24),
              _sectionTitle('3. Dealer & address',
                  'Admin dealer assign karega, dealer activation complete karega'),
              const SizedBox(height: 12),
              _dealerAndAddress(),
              const SizedBox(height: 20),
              _summary(total),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 58,
                child: ElevatedButton(
                  onPressed: _loading ? null : _placeOrder,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(18)),
                  ),
                  child: _loading
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                              strokeWidth: 2.5, color: Colors.white))
                      : const Text('Place Order for This Vehicle',
                          style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              fontFamily: 'Inter')),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _hero() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: AppColors.darkGradient,
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.16),
              blurRadius: 20,
              offset: const Offset(0, 10))
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -20,
            top: -20,
            child: Icon(Icons.route_rounded,
                color: Colors.white.withOpacity(0.08), size: 140),
          ),
          const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Vehicle-first flow',
                  style: TextStyle(
                      color: AppColors.accent,
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      fontFamily: 'Inter',
                      letterSpacing: 0.5)),
              SizedBox(height: 10),
              Text('Add vehicle.\nPlace order.\nGet activation done.',
                  style: TextStyle(
                      color: Colors.white,
                      fontSize: 25,
                      fontWeight: FontWeight.w900,
                      height: 1.12,
                      fontFamily: 'Inter')),
              SizedBox(height: 10),
              Text(
                  'Ek vehicle duplicate nahi hoga. Dealer assignment admin se hoga.',
                  style: TextStyle(
                      color: Colors.white70,
                      fontSize: 13,
                      height: 1.45,
                      fontFamily: 'Inter')),
            ],
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(String title, String subtitle) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title,
            style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w900,
                color: AppColors.textPrimary,
                fontFamily: 'Inter')),
        const SizedBox(height: 3),
        Text(subtitle,
            style: const TextStyle(
                fontSize: 12.5,
                color: AppColors.textSecondary,
                fontFamily: 'Inter')),
      ],
    );
  }

  Widget _serviceGrid() {
    return Column(
      children: allProducts.map((product) {
        final selected = _selectedProduct?.id == product.id;
        final isFastag = product.icon == 'fastag';
        return GestureDetector(
          onTap: () => setState(() => _selectedProduct = product),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: selected ? AppColors.primary : AppColors.surface,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(
                  color: selected ? AppColors.primary : AppColors.border,
                  width: selected ? 2 : 1),
              boxShadow: selected
                  ? [
                      BoxShadow(
                          color: AppColors.primary.withOpacity(0.24),
                          blurRadius: 16,
                          offset: const Offset(0, 8))
                    ]
                  : null,
            ),
            child: Row(
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: selected
                        ? Colors.white.withOpacity(0.18)
                        : AppColors.tint(
                            isFastag ? AppColors.accent : AppColors.primary),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Icon(
                      isFastag ? Icons.toll_rounded : Icons.gps_fixed_rounded,
                      color: selected
                          ? Colors.white
                          : isFastag
                              ? AppColors.accent
                              : AppColors.primary),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(product.name,
                          style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                              color: selected
                                  ? Colors.white
                                  : AppColors.textPrimary,
                              fontFamily: 'Inter')),
                      const SizedBox(height: 4),
                      Text(product.description,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                              fontSize: 12,
                              height: 1.35,
                              color: selected
                                  ? Colors.white70
                                  : AppColors.textSecondary,
                              fontFamily: 'Inter')),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Text('₹${product.price.toStringAsFixed(0)}',
                    style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        color: selected ? Colors.white : AppColors.primary,
                        fontFamily: 'Inter')),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _vehicleForm() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AppColors.border)),
      child: Column(
        children: [
          _field('Vehicle Number *', 'MH26AB1234',
              Icons.confirmation_number_rounded, _vehicleNumberCtrl,
              textCapitalization: TextCapitalization.characters),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                  child: _field('Brand', 'Maruti',
                      Icons.branding_watermark_rounded, _vehicleBrandCtrl)),
              const SizedBox(width: 12),
              Expanded(
                  child: _field('Model', 'Swift', Icons.directions_car_rounded,
                      _vehicleModelCtrl)),
            ],
          ),
          const SizedBox(height: 14),
          Align(
            alignment: Alignment.centerLeft,
            child: Wrap(
              spacing: 10,
              runSpacing: 10,
              children: ['car', 'bike', 'truck', 'bus', 'other'].map((type) {
                final selected = _vehicleType == type;
                return ChoiceChip(
                  label: Text(type.toUpperCase()),
                  selected: selected,
                  onSelected: (_) => setState(() => _vehicleType = type),
                  selectedColor: AppColors.primary,
                  backgroundColor: AppColors.bg,
                  labelStyle: TextStyle(
                      color: selected ? Colors.white : AppColors.textPrimary,
                      fontFamily: 'Inter',
                      fontSize: 12,
                      fontWeight: FontWeight.w800),
                  side: BorderSide(
                      color: selected ? AppColors.primary : AppColors.border),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _dealerAndAddress() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AppColors.border)),
      child: Column(
        children: [
          Row(
            children: [
              const Icon(Icons.storefront_rounded,
                  color: AppColors.purple, size: 20),
              const SizedBox(width: 10),
              const Expanded(
                child: Text('Dealer sales code hai?',
                    style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                        fontFamily: 'Inter')),
              ),
              Switch(
                  value: _hasSalesCode,
                  onChanged: (v) => setState(() => _hasSalesCode = v),
                  activeColor: AppColors.purple),
            ],
          ),
          if (_hasSalesCode) ...[
            const SizedBox(height: 12),
            _field(
                'Sales Code', 'DLR-ABC123', Icons.badge_rounded, _salesCodeCtrl,
                textCapitalization: TextCapitalization.characters),
          ],
          const SizedBox(height: 14),
          _field(
              'Installation / Shipping Address *',
              'Full address jahan installation chahiye',
              Icons.location_on_rounded,
              _addressCtrl,
              maxLines: 3),
        ],
      ),
    );
  }

  Widget _summary(double total) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AppColors.border)),
      child: Column(
        children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            const Text('Selected service',
                style: TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                    fontFamily: 'Inter')),
            Text(_selectedProduct?.name ?? 'N/A',
                style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                    fontFamily: 'Inter')),
          ]),
          const SizedBox(height: 10),
          const Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Quantity',
                    style: TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                        fontFamily: 'Inter')),
                Text('1 vehicle',
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                        fontFamily: 'Inter')),
              ]),
          const Divider(height: 26),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            const Text('Total',
                style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    color: AppColors.textPrimary,
                    fontFamily: 'Inter')),
            Text('₹${total.toStringAsFixed(0)}',
                style: const TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w900,
                    color: AppColors.primary,
                    fontFamily: 'Inter')),
          ]),
        ],
      ),
    );
  }

  Widget _field(
    String label,
    String hint,
    IconData icon,
    TextEditingController controller, {
    int maxLines = 1,
    TextCapitalization textCapitalization = TextCapitalization.words,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
                fontFamily: 'Inter')),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          maxLines: maxLines,
          textCapitalization: textCapitalization,
          style: const TextStyle(
              fontSize: 14,
              fontFamily: 'Inter',
              color: AppColors.textPrimary,
              fontWeight: FontWeight.w600),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(
                color: AppColors.textMuted, fontFamily: 'Inter', fontSize: 13),
            prefixIcon: Icon(icon, color: AppColors.textMuted, size: 20),
            filled: true,
            fillColor: AppColors.bg,
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
                const EdgeInsets.symmetric(horizontal: 14, vertical: 15),
          ),
        ),
      ],
    );
  }
}
