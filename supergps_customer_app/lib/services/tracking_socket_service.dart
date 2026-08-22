import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../models/vehicle_position.dart';
import 'api_service.dart';

enum TrackingSocketState {
  disconnected,
  connecting,
  connected,
  reconnecting,
}

class TrackingSocketService {
  io.Socket? _socket;
  String? _vehicleId;
  final _positionController = StreamController<VehiclePosition>.broadcast();
  final _stateController = StreamController<TrackingSocketState>.broadcast();

  Stream<VehiclePosition> get positions => _positionController.stream;
  Stream<TrackingSocketState> get states => _stateController.stream;

  Future<void> connect(String vehicleId) async {
    _vehicleId = vehicleId;
    _stateController.add(TrackingSocketState.connecting);

    final token = await ApiService.getToken();
    final socketUrl = ApiService.baseUrl.replaceFirst(RegExp(r'/api/?$'), '');

    _socket?.dispose();
    _socket = io.io(
      socketUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .enableReconnection()
          .setReconnectionAttempts(999999)
          .setReconnectionDelay(600)
          .setTimeout(10000)
          .setAuth({'token': token})
          .disableAutoConnect()
          .build(),
    );

    final socket = _socket!;
    socket.onConnect((_) {
      _stateController.add(TrackingSocketState.connected);
      _joinVehicle();
    });
    socket.onReconnect((_) {
      _stateController.add(TrackingSocketState.connected);
      _joinVehicle();
    });
    socket.onReconnectAttempt((_) {
      _stateController.add(TrackingSocketState.reconnecting);
    });
    socket.onDisconnect((_) {
      _stateController.add(TrackingSocketState.disconnected);
    });
    socket.onConnectError((_) {
      _stateController.add(TrackingSocketState.reconnecting);
    });
    socket.on('tracking:connected', (_) => _joinVehicle());
    socket.on('tracking:position', _handlePosition);
    socket.on('position:update', _handlePosition);
    socket.connect();
  }

  void _joinVehicle() {
    final vehicleId = _vehicleId;
    final socket = _socket;
    if (vehicleId == null || socket == null || !socket.connected) return;
    socket.emit('tracking:join', {'vehicleId': vehicleId});
    socket.emit('joinVehicle', vehicleId);
  }

  void _handlePosition(dynamic payload) {
    final vehicleId = _vehicleId;
    if (vehicleId == null || payload is! Map) return;

    final data = Map<String, dynamic>.from(payload);
    final payloadVehicleId = (data['vehicleId'] ??
            (data['position'] is Map
                ? (data['position'] as Map)['vehicleId']
                : null))
        ?.toString();
    if (payloadVehicleId != vehicleId) return;

    final rawPosition = data['position'] is Map ? data['position'] : data;
    if (rawPosition is! Map) return;

    final position = VehiclePosition.fromJson(
      {
        'position': Map<String, dynamic>.from(rawPosition)
          ..putIfAbsent('vehicleId', () => vehicleId),
        if (data['vehicle'] is Map)
          'vehicle': Map<String, dynamic>.from(data['vehicle'] as Map),
      },
    );
    _positionController.add(position);
  }

  void dispose() {
    final vehicleId = _vehicleId;
    final socket = _socket;
    if (vehicleId != null && socket != null) {
      socket.emit('tracking:leave', {'vehicleId': vehicleId});
      socket.emit('leaveVehicle', vehicleId);
      socket.off('tracking:position');
      socket.off('position:update');
      socket.disconnect();
      socket.dispose();
    }
    _socket = null;
    _vehicleId = null;
  }

  Future<void> close() async {
    dispose();
    await _positionController.close();
    await _stateController.close();
  }
}
