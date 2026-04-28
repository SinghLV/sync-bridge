class RescueTeam {
  final String id;
  final String displayName;
  final int capacity;

  const RescueTeam({
    required this.id,
    required this.displayName,
    required this.capacity,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'display_name': displayName,
    'capacity': capacity,
  };

  factory RescueTeam.fromJson(Map<String, dynamic> json) {
    return RescueTeam(
      id: json['id'] as String,
      displayName: json['display_name'] as String? ?? json['id'] as String,
      capacity: (json['capacity'] as num?)?.toInt() ?? 0,
    );
  }

  RescueTeam copyWith({
    String? id,
    String? displayName,
    int? capacity,
  }) {
    return RescueTeam(
      id: id ?? this.id,
      displayName: displayName ?? this.displayName,
      capacity: capacity ?? this.capacity,
    );
  }
}
