import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import '../src/i18n';
import { syncLanguageWithI18n } from '@/src/i18n/sync';
import { useLanguageStore } from '@/src/stores/language';


export const unstable_settings = {
  initialRouteName: 'welcome',
};
export default function RootLayout() {
 

  return (
    <Stack screenOptions={{headerShown:false}}>
       <Stack.Screen name="welcome" />
       <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
