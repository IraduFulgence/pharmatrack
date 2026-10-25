
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import 'react-native-reanimated';
import '../src/i18n';
import { syncLanguageWithI18n } from '@/src/i18n/sync';
import { useLanguageStore } from '@/src/stores/language';



export const unstable_settings = {
  initialRouteName: 'welcome',
};
export default function RootLayout() {
  const hydrate = useLanguageStore((state) => state.hydrate);

  useEffect(() => {
    //Load saved language from SecureStore
    hydrate(); 
    
    //Start listening for language changes
    const unsubscribe = syncLanguageWithI18n();

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <Stack screenOptions={{headerShown:false}}>
       <Stack.Screen name="welcome" />
       <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
