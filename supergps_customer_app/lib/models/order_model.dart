class OrderModel {
  final String id;
  final String orderNumber;
  final String customerId;
  final String? dealerId;
  final String? salesCode;
  final String productName;
  final String? targetVehicleNumber;
  final String? targetVehicleType;
  final String? targetVehicleBrand;
  final String? targetVehicleModel;
  final int quantity;
  final double price;
  final double totalAmount;
  final String paymentStatus;
  final String? paymentMethod;
  final String orderStatus;
  final String? shippingAddress;
  final bool isActivated;
  final String? createdAt;
  final Map<String, dynamic>? customer;
  final Map<String, dynamic>? dealer;

  OrderModel({
    required this.id,
    required this.orderNumber,
    required this.customerId,
    this.dealerId,
    this.salesCode,
    required this.productName,
    this.targetVehicleNumber,
    this.targetVehicleType,
    this.targetVehicleBrand,
    this.targetVehicleModel,
    required this.quantity,
    required this.price,
    required this.totalAmount,
    required this.paymentStatus,
    this.paymentMethod,
    required this.orderStatus,
    this.shippingAddress,
    required this.isActivated,
    this.createdAt,
    this.customer,
    this.dealer,
  });

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    return OrderModel(
      id: json['id'] ?? '',
      orderNumber: json['orderNumber'] ?? '',
      customerId: json['customerId'] ?? '',
      dealerId: json['dealerId'],
      salesCode: json['salesCode'],
      productName: json['productName'] ?? 'SuperGPS Device',
      targetVehicleNumber: json['targetVehicleNumber'],
      targetVehicleType: json['targetVehicleType'],
      targetVehicleBrand: json['targetVehicleBrand'],
      targetVehicleModel: json['targetVehicleModel'],
      quantity: json['quantity'] ?? 1,
      price: double.tryParse(json['price'].toString()) ?? 0.0,
      totalAmount: double.tryParse(json['totalAmount'].toString()) ?? 0.0,
      paymentStatus: json['paymentStatus'] ?? 'pending',
      paymentMethod: json['paymentMethod'],
      orderStatus: json['orderStatus'] ?? 'placed',
      shippingAddress: json['shippingAddress'],
      isActivated: json['isActivated'] ?? false,
      createdAt: json['createdAt'],
      customer: json['customer'],
      dealer: json['dealer'],
    );
  }
}
