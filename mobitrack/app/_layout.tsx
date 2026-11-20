import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import '../src/i18n';
import { syncLanguageWithI18n } from '@/src/i18n/sync';
import { useLanguageStore } from '@/src/stores/language';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

export const unstable_settings = {
  initialRouteName: 'welcome',
};

export default function RootLayout() {
  const hydrate = useLanguageStore((state) => state.hydrate);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      // Load saved language from SecureStore
      await hydrate(); 
      setIsReady(true);
    };
    init();

    // Start listening for language changes
    const unsubscribe = syncLanguageWithI18n();
    return () => unsubscribe();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loading}> 
        <ActivityIndicator size='large' color='#2A7B6F' />
      </View>
    );
  }
  
  return (
    <Stack screenOptions={{ headerShown: false }}>
       <Stack.Screen name="welcome" />
       <Stack.Screen name="auth" />
       <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});