import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  UserModel? _user;
  Map<String, dynamic>? _dealerProfile;
  bool _isLoading = true;

  UserModel? get user => _user;
  Map<String, dynamic>? get dealerProfile => _dealerProfile;
  bool get isLoading => _isLoading;
  bool get isLoggedIn => _user != null;
  bool get isDealer => _user?.role == 'dealer';
  bool get isTechnician => _user?.role == 'technician';

  AuthProvider() {
    _init();
  }

  Future<void> _init() async {
    _isLoading = true;
    notifyListeners();
    await checkAuth();
  }

  Future<void> checkAuth() async {
    try {
      final token = await ApiService.getToken();
      if (token != null && token.isNotEmpty) {
        final res = await ApiService.get('/auth/me');
        if (res['success'] == true && res['user'] != null) {
          _user = UserModel.fromJson(res['user']);
          // Handle dealerProfile from response
          if (res.containsKey('dealerProfile') && res['dealerProfile'] != null) {
            _dealerProfile = Map<String, dynamic>.from(res['dealerProfile']);
          } else {
            _dealerProfile = null;
          }
        } else {
          await ApiService.clearAuth();
          _user = null;
          _dealerProfile = null;
        }
      } else {
        _user = null;
        _dealerProfile = null;
      }
    } catch (e) {
      _user = null;
      _dealerProfile = null;
    }
    _isLoading = false;
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    final res = await ApiService.post('/auth/login', {
      'email': email,
      'password': password,
    });
    await ApiService.saveToken(res['token']);
    await ApiService.saveUser(res['user']);
    _user = UserModel.fromJson(res['user']);
    if (res.containsKey('dealerProfile') && res['dealerProfile'] != null) {
      _dealerProfile = Map<String, dynamic>.from(res['dealerProfile']);
    }
    notifyListeners();
  }

  Future<void> logout() async {
    await ApiService.clearAuth();
    _user = null;
    _dealerProfile = null;
    notifyListeners();
  }
}
