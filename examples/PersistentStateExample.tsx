/**
 * EXAMPLE: Persistent State Usage in Screens
 * 
 * This file demonstrates how to use persistent state in your screens.
 * Copy these patterns to any screen that needs to save and restore user data.
 */

import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';
import { usePersistentState, useImmediatePersistentState } from '../hooks/usePersistentState';

// ============================================
// EXAMPLE 1: Basic Text Input with Persistence
// ============================================
export const ExampleTextInput: React.FC = () => {
  // Automatically saves to AsyncStorage whenever the user types
  const [name, setName] = usePersistentState<string>('user_name', '');

  return (
    <View>
      <TextInput
        style={styles.input}
        placeholder="Enter your name"
        value={name}
        onChangeText={(text) => setName(text)} // Automatically saved!
      />
      <Text>Saved name: {name}</Text>
    </View>
  );
};

// ============================================
// EXAMPLE 2: Complex Object State
// ============================================
interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
}

export const ExampleComplexState: React.FC = () => {
  // Complex objects are automatically serialized/deserialized
  const [preferences, setPreferences] = usePersistentState<UserPreferences>(
    'user_preferences',
    {
      theme: 'light',
      language: 'en',
      notifications: true,
    }
  );

  const toggleTheme = () => {
    setPreferences((prev) => ({
      ...prev,
      theme: prev.theme === 'light' ? 'dark' : 'light',
    }));
  };

  return (
    <View>
      <TouchableOpacity onPress={toggleTheme}>
        <Text>Current theme: {preferences.theme}</Text>
      </TouchableOpacity>
      <Switch
        value={preferences.notifications}
        onValueChange={(value) =>
          setPreferences((prev) => ({ ...prev, notifications: value }))
        }
      />
    </View>
  );
};

// ============================================
// EXAMPLE 3: Immediate Persistence (No Debounce)
// ============================================
export const ExampleImmediateSave: React.FC = () => {
  // Use this for critical data that needs instant saving
  // (like form progress, payment info, etc.)
  const [criticalData, setCriticalData] = useImmediatePersistentState<string>(
    'critical_data',
    ''
  );

  return (
    <TextInput
      value={criticalData}
      onChangeText={setCriticalData} // Saved immediately, no delay
      placeholder="This saves instantly"
    />
  );
};

// ============================================
// EXAMPLE 4: Array State with Persistence
// ============================================
interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export const ExampleArrayState: React.FC = () => {
  const [todos, setTodos] = usePersistentState<TodoItem[]>(
    'todo_list',
    []
  );

  const addTodo = (text: string) => {
    setTodos((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        text,
        completed: false,
      },
    ]);
  };

  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  return (
    <View>
      {todos.map((todo) => (
        <TouchableOpacity key={todo.id} onPress={() => toggleTodo(todo.id)}>
          <Text style={todo.completed ? styles.completed : undefined}>
            {todo.text}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ============================================
// EXAMPLE 5: Multiple Persistent States in One Screen
// ============================================
export const ExampleMultipleStates: React.FC = () => {
  // You can use multiple persistent states in the same screen
  const [email, setEmail] = usePersistentState<string>('profile_email', '');
  const [age, setAge] = usePersistentState<number>('profile_age', 0);
  const [isSubscribed, setIsSubscribed] = usePersistentState<boolean>(
    'subscription_status',
    false
  );

  return (
    <View>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
      />
      <TextInput
        value={age.toString()}
        onChangeText={(text) => setAge(parseInt(text) || 0)}
        keyboardType="number-pad"
        placeholder="Age"
      />
      <Switch value={isSubscribed} onValueChange={setIsSubscribed} />
    </View>
  );
};

// ============================================
// USAGE IN YOUR SCREENS:
// ============================================
/*
 * 1. Import the hook:
 *    import { usePersistentState } from '../hooks/usePersistentState';
 *
 * 2. Replace useState with usePersistentState:
 *    // Before:
 *    const [value, setValue] = useState(defaultValue);
 *    
 *    // After:
 *    const [value, setValue] = usePersistentState('unique_key', defaultValue);
 *
 * 3. Use it exactly like useState - it automatically saves!
 *    - Changes are saved to AsyncStorage automatically
 *    - State is restored when the screen loads
 *    - Works with any data type (string, number, object, array, boolean)
 *
 * 4. Use unique keys for each piece of data:
 *    - 'profile_name'
 *    - 'settings_notifications'
 *    - 'water_intake_today'
 *    - etc.
 *
 * 5. For critical data that needs instant saving, use:
 *    useImmediatePersistentState() instead of usePersistentState()
 */

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    margin: 10,
  },
  completed: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
});

