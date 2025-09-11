import 'dart:io';
import 'dart:typed_data';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'api_service.dart';

class PhotoService {
  static final ImagePicker _picker = ImagePicker();

  // Request camera permission
  static Future<bool> requestCameraPermission() async {
    final status = await Permission.camera.request();
    return status.isGranted;
  }

  // Request photo library permission
  static Future<bool> requestPhotoPermission() async {
    final status = await Permission.photos.request();
    return status.isGranted;
  }

  // Take photo from camera
  static Future<File?> takePhoto() async {
    try {
      final hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        print('Camera permission denied');
        return null;
      }

      final XFile? image = await _picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 80,
        maxWidth: 1024,
        maxHeight: 1024,
      );

      return image != null ? File(image.path) : null;
    } catch (e) {
      print('Error taking photo: $e');
      return null;
    }
  }

  // Pick photo from gallery
  static Future<File?> pickPhotoFromGallery() async {
    try {
      final hasPermission = await requestPhotoPermission();
      if (!hasPermission) {
        print('Photo library permission denied');
        return null;
      }

      final XFile? image = await _picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 80,
        maxWidth: 1024,
        maxHeight: 1024,
      );

      return image != null ? File(image.path) : null;
    } catch (e) {
      print('Error picking photo from gallery: $e');
      return null;
    }
  }

  // Upload photo for player
  static Future<bool> uploadPlayerPhoto(String playerId, File photoFile) async {
    try {
      final bytes = await photoFile.readAsBytes();
      final fileName = 'photo_${DateTime.now().millisecondsSinceEpoch}.jpg';
      
      return await ApiService.uploadPlayerPhoto(playerId, Uint8List.fromList(bytes), fileName);
    } catch (e) {
      print('Error uploading player photo: $e');
      return false;
    }
  }

  // Show photo source selection
  static Future<File?> showPhotoSourceSelection() async {
    // This would typically show a dialog in the UI
    // For now, we'll default to camera
    return await takePhoto();
  }
}