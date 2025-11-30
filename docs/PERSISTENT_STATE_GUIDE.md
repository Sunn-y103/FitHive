# Persistent State Management Guide

This app uses a comprehensive persistent state management system with AsyncStorage integration.

## Architecture

### Components

1. **Storage Utilities** (`utils/storage.ts`)
   - Helper functions for AsyncStorage operations
   - Key management
   - User data clearing utilities

2. **AppStateContext** (`contexts/AppStateContext.tsx`)
   - Global state management with reducer pattern
   - Automatic AsyncStorage persistence
   - Debounced saves to optimize performance

3. **Persistent State Hook** (`hooks/usePersistentState.ts`)
   - Custom hooks for screen-level state persistence
   - Two variants: debounced and immediate

4. **Provider Setup** (`App.tsx`)
   - AppStateProvider wraps the entire app
   - Works alongside AuthProvider

## Usage

### Basic Usage

```typescript
import { usePersistentState } from '../hooks/usePersistentState';

const MyScreen = () => {
  // Automatically saves to AsyncStorage
  const [name, setName] = usePersistentState<string>('screen_name', 'default');
  
  return (
    <TextInput
      value={name}
      onChangeText={setName} // Saved automatically!
    />
  );
};
```

### Complex Objects

```typescript
interface Profile {
  name: string;
  age: number;
  email: string;
}

const [profile, setProfile] = usePersistentState<Profile>(
  'user_profile',
  { name: '', age: 0, email: '' }
);
```

### Arrays

```typescript
const [items, setItems] = usePersistentState<string[]>(
  'my_items',
  []
);

// Add item
setItems(prev => [...prev, newItem]);
```

### Immediate Persistence

For critical data that needs instant saving:

```typescript
import { useImmediatePersistentState } from '../hooks/usePersistentState';

const [critical, setCritical] = useImmediatePersistentState<string>(
  'critical_key',
  ''
);
```

## Logout Implementation

### ProfileScreen Logout

The logout functionality in `ProfileScreen.tsx`:

1. Signs out from Supabase
2. Clears all user-specific data from AsyncStorage
3. Resets navigation stack to prevent back navigation
4. Navigates to Login screen

```typescript
const handleLogout = async () => {
  await signOut(); // Supabase sign out
  await Storage.clearUserData(); // Clear AsyncStorage
  navigation.reset({
    index: 0,
    routes: [{ name: 'Login' }],
  });
};
```

## Storage Keys

All storage keys are defined in `utils/storage.ts`:

- `APP_STATE` - Global app state
- `USER_PROFILE` - User profile data
- `USER_SETTINGS` - User preferences
- `WATER_INTAKE` - Water tracking data
- `SLEEP_DATA` - Sleep tracking data
- `PERIOD_CYCLE` - Period cycle data
- `HEALTH_DATA` - General health data

## Best Practices

1. **Use unique keys**: Prefix keys with screen/feature name
   - ✅ `profile_name`
   - ✅ `settings_notifications`
   - ❌ `name` (too generic)

2. **Type safety**: Always specify TypeScript types
   ```typescript
   const [value, setValue] = usePersistentState<MyType>('key', defaultValue);
   ```

3. **Default values**: Always provide sensible defaults
   ```typescript
   const [count, setCount] = usePersistentState<number>('count', 0);
   ```

4. **Critical data**: Use `useImmediatePersistentState` for:
   - Payment information
   - Form progress
   - Important user selections

5. **Non-critical data**: Use `usePersistentState` for:
   - User preferences
   - UI state
   - Cached data

## How It Works

1. **On App Start**:
   - AppStateProvider loads saved state from AsyncStorage
   - All screens restore their previous state

2. **On State Change**:
   - State updates trigger AsyncStorage save
   - Debounced saves (300ms) prevent excessive writes
   - Immediate saves happen instantly

3. **On Logout**:
   - User data cleared from AsyncStorage
   - Navigation stack reset
   - User redirected to Login

## Examples

See `examples/PersistentStateExample.tsx` for comprehensive examples.

