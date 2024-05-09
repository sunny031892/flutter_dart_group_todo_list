import 'package:flutter_app/models/category.dart';
import 'package:flutter_app/utils/categories.dart';
import 'package:cloud_firestore/cloud_firestore.dart'; // Import Firestore for Timestamp

class TodoItem {
  String?
      id; // Firestore's local cache mechanism enables optimistic UI updates by immediately writing to the local cache, then synchronizing with the server in the background. There's no need to provide a fallback value for 'id' as it will be generated by Firebase BEFORE the write operation to the local cache. Thus, objects fetched or streamed from the repository always have IDs.
  final String name;
  final String? details;
  final Category category;
  final String userId;
  Timestamp? _createdDate;
  Timestamp get createdDate =>
      _createdDate ??
      Timestamp
          .now(); // Unlike 'id', the '_createdDate' is only assigned a value at the time the data is written to the Firestore database on the server. Before this synchronization, '_createdDate' will be null in the local cache. Here, we provide a fallback value for the UI to render it properly.
  final bool isDone;

  // Constructor for Views or ViewModels
  TodoItem({
    required this.name,
    this.details,
    required this.category,
    required this.userId,
    this.isDone = false,
  });

  TodoItem._({
    required this.id,
    required this.name,
    this.details,
    required this.category,
    required this.userId,
    required Timestamp? createdDate,
    this.isDone = false,
  }) : _createdDate = createdDate;

  factory TodoItem.fromMap(Map<String, dynamic> map, String id) {
    return TodoItem._(
      id: id,
      name: map['name'],
      details: map['details'],
      category: categories.entries
          .firstWhere((catItem) => catItem.value.title == map['category'])
          .value,
      userId: map['userId'],
      createdDate: map['createdDate'],
      isDone: map['isDone'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'details': details,
      'category': category.title,
      'userId': userId,
      'createdDate': _createdDate,
      'isDone': isDone,
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TodoItem && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;
}
