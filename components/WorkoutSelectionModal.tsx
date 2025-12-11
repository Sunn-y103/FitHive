import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExerciseType } from '../hooks/useExercisePose';

interface WorkoutSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: ExerciseType) => void;
}

const WorkoutSelectionModal: React.FC<WorkoutSelectionModalProps> = ({
  visible,
  onClose,
  onSelectExercise,
}) => {
  const exercises: Array<{ type: ExerciseType; name: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = [
    { type: 'pushup', name: 'Push-Ups', icon: 'body', color: '#A992F6' },
    { type: 'curl', name: 'Bicep Curls', icon: 'barbell', color: '#FF6B6B' },
    { type: 'squat', name: 'Squats', icon: 'fitness', color: '#4CAF50' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <SafeAreaView>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Select Exercise</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#1E3A5F" />
              </TouchableOpacity>
            </View>

            <View style={styles.exercisesContainer}>
              {exercises.map((exercise) => (
                <TouchableOpacity
                  key={exercise.type}
                  style={[styles.exerciseCard, { borderLeftColor: exercise.color }]}
                  onPress={() => {
                    onSelectExercise(exercise.type);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.exerciseIconContainer, { backgroundColor: `${exercise.color}20` }]}>
                    <Ionicons name={exercise.icon} size={32} color={exercise.color} />
                  </View>
                  <View style={styles.exerciseContent}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseDescription}>
                      {exercise.type === 'pushup' && 'Track your push-up form and count reps'}
                      {exercise.type === 'curl' && 'Monitor bicep curl repetitions'}
                      {exercise.type === 'squat' && 'Count your squat repetitions'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#C0C0C0" />
                </TouchableOpacity>
              ))}
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exercisesContainer: {
    paddingHorizontal: 20,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7FA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  exerciseIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  exerciseContent: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 4,
  },
  exerciseDescription: {
    fontSize: 14,
    color: '#6F6F7B',
    lineHeight: 20,
  },
});

export default WorkoutSelectionModal;

