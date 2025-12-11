# Network Request Failed - Debug Guide

## 🔍 Common Causes

### 1. Android Emulator Network Issues
- Emulator might not have internet access
- DNS resolution problems
- Firewall blocking requests

### 2. Supabase Connection Issues
- Invalid Supabase URL or key
- Supabase project paused or deleted
- Network timeout

### 3. React Native Configuration
- Missing network permissions
- Incorrect fetch polyfill
- CORS issues (less common in React Native)

## 🛠️ Debugging Steps

### Step 1: Check Network Connection

**In your app console, you should see:**
```
🔌 Supabase client initialized: { url: '...', hasKey: true }
🔐 Initializing auth...
```

If you see errors here, the Supabase client isn't initializing correctly.

### Step 2: Test Supabase Connection

Run this in your app console or add to a test screen:

```typescript
import { supabase } from './lib/supabase';

// Test connection
const testConnection = async () => {
  try {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase.from('profiles').select('count');
    if (error) {
      console.error('❌ Connection failed:', error);
    } else {
      console.log('✅ Connection successful');
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
};
```

### Step 3: Check Android Emulator Network

1. **Open Android Emulator Settings**
2. **Go to Settings → Network & Internet**
3. **Check if Wi-Fi is connected**
4. **Try opening a browser in the emulator** and visit `https://google.com`

If browser doesn't work, the emulator has network issues.

### Step 4: Check Supabase Project Status

1. Go to https://supabase.com/dashboard
2. Check if your project is active
3. Verify the URL and anon key match your code

### Step 5: Test with Real Device

If emulator fails, try on a real Android device:
```bash
expo start
# Then scan QR code with Expo Go app
```

## 🔧 Fixes Applied

### 1. Enhanced Error Handling

Added try-catch blocks around all Supabase calls to catch network errors gracefully.

### 2. Better Logging

Added console logs to track:
- When auth initializes
- When network errors occur
- What the error details are

### 3. Graceful Degradation

App won't hang if network fails - it will:
- Set loading to false
- Show appropriate error messages
- Allow user to retry

## 📱 Android-Specific Fixes

### If using Expo (Managed Workflow):

The network should work automatically. If not:

1. **Check Expo Go app version** - update if needed
2. **Restart Expo dev server**: `expo start --clear`
3. **Try different network** (Wi-Fi vs mobile data)

### If using Bare React Native:

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<application
  android:usesCleartextTraffic="true"
  ...>
  ...
</application>
```

## 🧪 Quick Test

Add this to your App.tsx temporarily:

```typescript
useEffect(() => {
  const test = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      console.log('Test result:', { data, error });
    } catch (e) {
      console.error('Test failed:', e);
    }
  };
  test();
}, []);
```

## ✅ Expected Console Output

**On Success:**
```
🔌 Supabase client initialized: { url: '...', hasKey: true }
🔐 Initializing auth...
✅ Auth initialized: No session
```

**On Network Error:**
```
🔌 Supabase client initialized: { url: '...', hasKey: true }
🔐 Initializing auth...
❌ Network error during auth init: {
  message: 'Network request failed',
  name: 'TypeError',
  code: undefined
}
```

## 🆘 Still Not Working?

1. **Check if Supabase URL is accessible:**
   - Open `https://skqcggiuulwrjiclaibw.supabase.co` in browser
   - Should show Supabase API page

2. **Check Android emulator network:**
   - Settings → Network & Internet → Wi-Fi
   - Should show connected

3. **Try different network:**
   - Switch from Wi-Fi to mobile hotspot
   - Or vice versa

4. **Restart everything:**
   ```bash
   # Stop Expo
   # Restart Android emulator
   # Clear Expo cache
   expo start --clear
   ```

