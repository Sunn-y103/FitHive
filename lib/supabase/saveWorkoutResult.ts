import { supabase } from '../supabase';

export interface WorkoutResult {
  id: string;
  user_id: string;
  exercise: string;
  reps: number;
  created_at: string;
}

/**
 * Save workout result to Supabase
 * 
 * @param reps Number of repetitions completed
 * @param exercise Exercise type: 'pushup', 'curl', or 'squat'
 * @param userId User ID from authentication
 * @returns Saved workout result or null if error
 */
export async function saveWorkoutResult(
  reps: number,
  exercise: string,
  userId: string
): Promise<WorkoutResult | null> {
  try {
    const { data, error } = await supabase
      .from('workouts')
      .insert([
        {
          user_id: userId,
          exercise: exercise,
          reps: reps,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving workout result:', error);
      return null;
    }

    console.log('✅ Workout result saved successfully:', data);
    return data;
  } catch (error) {
    console.error('❌ Unexpected error saving workout result:', error);
    return null;
  }
}

/**
 * Fetch user's workout history
 * 
 * @param userId User ID
 * @param limit Optional limit for number of results
 * @returns Array of workout results
 */
export async function fetchWorkoutHistory(
  userId: string,
  limit: number = 10
): Promise<WorkoutResult[]> {
  try {
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Error fetching workout history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Unexpected error fetching workout history:', error);
    return [];
  }
}

