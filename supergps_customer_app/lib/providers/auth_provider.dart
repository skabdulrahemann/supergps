import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  UserModel? _user;
  bool _isLoading = true;
  bool _initialized = false;

  UserModel? get user => _user;
  bool get isLoading => _isLoading;
  bool get isLoggedIn => _user != null;

  AuthProvider() {
    _init();
  }

  Future<void> _init() async {
    _isLoading = true;
    notifyListeners();
    await checkAuth();
    _initialized = true;
  }

  Future<void> checkAuth() async {
    try {
      final token = await ApiService.getToken();
      if (token != null && token.isNotEmpty) {
        final res = await ApiService.get('/auth/me');
        if (res['success'] == true && res['user'] != null) {
          _user = UserModel.fromJson(res['user']);
        } else {
          await ApiService.clearAuth();
          _user = null;
        }
      } else {
        _user = null;
      }
    } catch (e) {
      _user = null;
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
    notifyListeners();
  }

  Future<void> register(String name, String email, String phone, String password) async {
    final res = await ApiService.post('/auth/register', {
      'name': name,
      'email': email,
      'phone': phone,
      'password': password,
      'role': 'customer',
    });
    await ApiService.saveToken(res['token']);
    await ApiService.saveUser(res['user']);
    _user = UserModel.fromJson(res['user']);
    notifyListeners();
  }

  Future<void> logout() async {
    await ApiService.clearAuth();
    _user = null;
    notifyListeners();
  }
}
