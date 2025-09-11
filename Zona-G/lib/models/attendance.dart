enum RecognitionMode { quick, verified }
enum SyncStatus { synced, pending, failed }

class Attendance {
  final String? id;
  final String playerId;
  final String? matchId;
  final RecognitionMode recognitionMode;
  final double confidenceScore;
  final double similarityScore;
  final String? photoPath;
  final Map<String, dynamic>? deviceInfo;
  final Map<String, dynamic>? locationData;
  final double? faceQualityScore;
  final int? processingTimeMs;
  final bool cacheHit;
  final String? operatorId;
  final DateTime localTimestamp;
  final DateTime? serverTimestamp;
  final SyncStatus syncStatus;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Attendance({
    this.id,
    required this.playerId,
    this.matchId,
    this.recognitionMode = RecognitionMode.quick,
    required this.confidenceScore,
    required this.similarityScore,
    this.photoPath,
    this.deviceInfo,
    this.locationData,
    this.faceQualityScore,
    this.processingTimeMs,
    this.cacheHit = false,
    this.operatorId,
    required this.localTimestamp,
    this.serverTimestamp,
    this.syncStatus = SyncStatus.synced,
    this.createdAt,
    this.updatedAt,
  });

  factory Attendance.fromJson(Map<String, dynamic> json) {
    return Attendance(
      id: json['id'],
      playerId: json['player_id'],
      matchId: json['match_id'],
      recognitionMode: _parseRecognitionMode(json['recognition_mode']),
      confidenceScore: (json['confidence_score'] as num).toDouble(),
      similarityScore: (json['similarity_score'] as num).toDouble(),
      photoPath: json['photo_path'],
      deviceInfo: json['device_info'],
      locationData: json['location_data'],
      faceQualityScore: json['face_quality_score'] != null 
          ? (json['face_quality_score'] as num).toDouble() 
          : null,
      processingTimeMs: json['processing_time_ms'],
      cacheHit: json['cache_hit'] ?? false,
      operatorId: json['operator_id'],
      localTimestamp: DateTime.parse(json['local_timestamp']),
      serverTimestamp: json['server_timestamp'] != null 
          ? DateTime.parse(json['server_timestamp']) 
          : null,
      syncStatus: _parseSyncStatus(json['sync_status']),
      createdAt: json['created_at'] != null 
          ? DateTime.parse(json['created_at']) 
          : null,
      updatedAt: json['updated_at'] != null 
          ? DateTime.parse(json['updated_at']) 
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'player_id': playerId,
      if (matchId != null) 'match_id': matchId,
      'recognition_mode': recognitionMode.name,
      'confidence_score': confidenceScore,
      'similarity_score': similarityScore,
      if (photoPath != null) 'photo_path': photoPath,
      if (deviceInfo != null) 'device_info': deviceInfo,
      if (locationData != null) 'location_data': locationData,
      if (faceQualityScore != null) 'face_quality_score': faceQualityScore,
      if (processingTimeMs != null) 'processing_time_ms': processingTimeMs,
      'cache_hit': cacheHit,
      if (operatorId != null) 'operator_id': operatorId,
      'local_timestamp': localTimestamp.toIso8601String(),
      // Note: server_timestamp is set automatically by the database, so we don't send it
      // if (serverTimestamp != null) 'server_timestamp': serverTimestamp!.toIso8601String(),
      'sync_status': syncStatus.name,
      // created_at and updated_at are handled by database triggers
      // if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
      // if (updatedAt != null) 'updated_at': updatedAt!.toIso8601String(),
    };
  }

  static RecognitionMode _parseRecognitionMode(String? mode) {
    switch (mode) {
      case 'verified':
        return RecognitionMode.verified;
      case 'quick':
      default:
        return RecognitionMode.quick;
    }
  }

  static SyncStatus _parseSyncStatus(String? status) {
    switch (status) {
      case 'pending':
        return SyncStatus.pending;
      case 'failed':
        return SyncStatus.failed;
      case 'synced':
      default:
        return SyncStatus.synced;
    }
  }

  // Factory constructor for creating a new attendance record
  factory Attendance.newRecord({
    required String playerId,
    String? matchId,
    RecognitionMode recognitionMode = RecognitionMode.quick,
    Map<String, dynamic>? deviceInfo,
  }) {
    return Attendance(
      playerId: playerId,
      matchId: matchId,
      recognitionMode: recognitionMode,
      confidenceScore: 1.0, // Perfect confidence for QR scan
      similarityScore: 1.0,  // Perfect similarity for QR scan
      localTimestamp: DateTime.now(),
      deviceInfo: deviceInfo ?? {
        'platform': 'flutter',
        'device': 'mobile',
        'app_version': '1.0.0',
        'scan_method': 'qr_code',
      },
      syncStatus: SyncStatus.pending,
    );
  }

  @override
  String toString() {
    return 'Attendance(id: $id, playerId: $playerId, matchId: $matchId, mode: ${recognitionMode.name})';
  }
}