import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useExercisePose, ExerciseType } from '../hooks/useExercisePose';
import { saveWorkoutResult } from '../lib/supabase/saveWorkoutResult';
import { supabase } from '../lib/supabase';

// MediaPipe Pose types
interface MediaPipeLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

// Note: MediaPipe Pose WASM integration
// For Expo Go compatibility, you'll need to:
// 1. Install @mediapipe/pose or use a React Native compatible solution
// 2. Or use TensorFlow.js with a pose model
// This is a placeholder structure - replace with actual MediaPipe integration

type RootStackParamList = {
  WorkoutCamera: { exerciseType: ExerciseType };
  AllHealthData: undefined;
};

type WorkoutCameraScreenRouteProp = RouteProp<RootStackParamList, 'WorkoutCamera'>;
type WorkoutCameraScreenNavigationProp = StackNavigationProp<RootStackParamList, 'WorkoutCamera'>;

const COLORS = {
  primary: '#A992F6',
  navy: '#1E3A5F',
  white: '#FFFFFF',
  background: '#F7F7FA',
  textSecondary: '#6F6F7B',
  error: '#FF6B6B',
  success: '#4CAF50',
};

const WorkoutCameraScreen: React.FC = () => {
  const navigation = useNavigation<WorkoutCameraScreenNavigationProp>();
  const route = useRoute<WorkoutCameraScreenRouteProp>();
  const exerciseType = route.params?.exerciseType || 'pushup';
  
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  
  const {
    repCount,
    stage,
    percentage,
    leftArmPercentage,
    rightArmPercentage,
    updatePose,
    reset,
  } = useExercisePose(exerciseType);

  // Initialize pose detection when component mounts
  useEffect(() => {
    // TODO: Initialize MediaPipe Pose here
    // For now, this is a placeholder
    // You'll need to:
    // 1. Load MediaPipe Pose WASM model
    // 2. Set up frame processing
    console.log('📹 Camera screen mounted, exercise:', exerciseType);
  }, [exerciseType]);

  // Process camera frames
  const processFrame = async (frame: any) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      // TODO: Replace with actual MediaPipe Pose detection
      // Example structure:
      // const landmarks = await mediaPipePose.process(frame);
      // updatePose(landmarks);
      
      // Placeholder: Simulate pose detection
      // Remove this when implementing actual MediaPipe
      const mockLandmarks: MediaPipeLandmark[] | null = null;
      updatePose(mockLandmarks);
    } catch (error) {
      console.error('❌ Error processing frame:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEndWorkout = async () => {
    if (repCount === 0) {
      Alert.alert(
        'No Reps Completed',
        'You haven\'t completed any reps. Are you sure you want to end the workout?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'End Anyway', onPress: () => navigation.goBack() },
        ]
      );
      return;
    }

    Alert.alert(
      'End Workout',
      `You completed ${repCount} ${exerciseType}${repCount !== 1 ? 's' : ''}. Save this workout?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Don\'t Save',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
        {
          text: 'Save',
          onPress: async () => {
            setIsSaving(true);
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) {
                Alert.alert('Error', 'Please log in to save workouts');
                setIsSaving(false);
                return;
              }

              const result = await saveWorkoutResult(repCount, exerciseType, user.id);
              if (result) {
                Alert.alert('Success', 'Workout saved successfully!', [
                  { text: 'OK', onPress: () => navigation.navigate('AllHealthData') },
                ]);
              } else {
                Alert.alert('Error', 'Failed to save workout. Please try again.');
              }
            } catch (error) {
              console.error('❌ Error saving workout:', error);
              Alert.alert('Error', 'An unexpected error occurred.');
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={COLORS.textSecondary} />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need access to your camera to detect your pose and count reps.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const getExerciseName = () => {
    switch (exerciseType) {
      case 'pushup':
        return 'Push-Ups';
      case 'curl':
        return 'Bicep Curls';
      case 'squat':
        return 'Squats';
      default:
        return 'Exercise';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="front"
        onCameraReady={() => {
          console.log('📹 Camera ready');
          // TODO: Start MediaPipe Pose processing
        }}
      >
        {/* Overlay UI */}
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="close" size={28} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{getExerciseName()}</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Rep Counter Display */}
          <View style={styles.repCounterContainer}>
            <View style={styles.repCounterBox}>
              <Text style={styles.repLabel}>REPS</Text>
              <Text style={styles.repCount}>{repCount}</Text>
              <View style={[styles.stageIndicator, stage === 'down' && styles.stageIndicatorDown]}>
                <Text style={styles.stageText}>{stage.toUpperCase()}</Text>
              </View>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${percentage}%` },
                  percentage === 100 && styles.progressFillComplete,
                ]}
              />
            </View>
            <Text style={styles.progressText}>{Math.round(percentage)}%</Text>
          </View>

          {/* Dual Progress for Push-ups */}
          {exerciseType === 'pushup' && (
            <View style={styles.dualProgressContainer}>
              <View style={styles.armProgress}>
                <Text style={styles.armLabel}>Left</Text>
                <View style={styles.armProgressBar}>
                  <View
                    style={[
                      styles.armProgressFill,
                      { width: `${leftArmPercentage || 0}%` },
                    ]}
                  />
                </View>
                <Text style={styles.armPercentage}>{leftArmPercentage || 0}%</Text>
              </View>
              <View style={styles.armProgress}>
                <Text style={styles.armLabel}>Right</Text>
                <View style={styles.armProgressBar}>
                  <View
                    style={[
                      styles.armProgressFill,
                      { width: `${rightArmPercentage || 0}%` },
                    ]}
                  />
                </View>
                <Text style={styles.armPercentage}>{rightArmPercentage || 0}%</Text>
              </View>
            </View>
          )}

          {/* End Workout Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.endButton, isSaving && styles.endButtonDisabled]}
              onPress={handleEndWorkout}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="stop-circle" size={24} color={COLORS.white} />
                  <Text style={styles.endButtonText}>End Workout</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.navy,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerSpacer: {
    width: 44,
  },
  repCounterContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  repCounterBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    minWidth: 200,
  },
  repLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  repCount: {
    fontSize: 64,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 12,
  },
  stageIndicator: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  stageIndicatorDown: {
    backgroundColor: COLORS.error,
  },
  stageText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressContainer: {
    marginTop: 40,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressFillComplete: {
    backgroundColor: COLORS.success,
  },
  progressText: {
    marginTop: 8,
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '600',
  },
  dualProgressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 30,
    paddingHorizontal: 40,
  },
  armProgress: {
    alignItems: 'center',
    flex: 1,
  },
  armLabel: {
    fontSize: 12,
    color: COLORS.white,
    marginBottom: 8,
    fontWeight: '600',
  },
  armProgressBar: {
    width: '80%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  armProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  armPercentage: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  endButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: COLORS.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  endButtonDisabled: {
    opacity: 0.6,
  },
  endButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.navy,
    marginTop: 24,
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});

export default WorkoutCameraScreen;

