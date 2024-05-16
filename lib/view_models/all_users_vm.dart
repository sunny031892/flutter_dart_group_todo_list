import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_app/models/user.dart';
import 'package:flutter_app/repositories/user_repo.dart';

class AllUsersViewModel with ChangeNotifier {
  final UserRepository _userRepository;

  List<User> _users = [];
  List<User> get users => _users;
  StreamSubscription<List<User>>? _usersSubscription;

  AllUsersViewModel({UserRepository? userRepository})
      : _userRepository = userRepository ?? UserRepository() {
    _usersSubscription = _userRepository.streamUsers().listen((usersData) {
      _users = usersData;
      notifyListeners();
    });
  }

  @override
  void dispose() {
    _usersSubscription?.cancel();
    super.dispose();
  }

  Future<void> addUser(User newUser) async {
    await _userRepository.addUser(newUser);
  }

  // 添加用戶刪除的方法
  Future<void> deleteUser(String userId) async {
    await _userRepository.deleteUser(userId); // 調用 UserRepository 中的刪除方法
    _users.removeWhere((user) => user.id == userId); // 從本地列表中移除用戶
    notifyListeners(); // 通知所有觀察者
  }
}
