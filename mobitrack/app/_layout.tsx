
import { Stack , useRouter, useSegments} from 'expo-router';
import { useEffect } from 'react';
import 'react-native-reanimated';
import '../src/i18n';
import { syncLanguageWithI18n } from '@/src/i18n/sync';
import { useLanguageStore } from '@/src/stores/language';
import { useOnboardingStore } from '@/hooks/onBoarding';
import { ActivityIndicator, View, StyleSheet } from 'react-native';


export const unstable_settings = {
  initialRouteName: 'welcome',
};
export default function RootLayout() {
  const hydrate = useLanguageStore((state) => state.hydrate);
  const {hasSeenWelcome, isLoading, checkOnboardingStatus} = useOnboardingStore();
  
  const segments = useSegments();
  const router = useRouter();
  useEffect(() => {
    //Load saved language from SecureStore
    hydrate(); 
    // check if user has seen welcome secreen
    //checkOnboardingStatus();
    //Start listening for language changes
    const unsubscribe = syncLanguageWithI18n();

    return () => unsubscribe();
    
  }, []);


  // we check and route accordingly
    

    // useEffect(() =>{
    //   if(isLoading) return;

    //      const current = segments[0];

    //   const inWelcomeScreen = current === 'welcome';
    //   const inLoginScreen = current ==='auth'
    //   if (!hasSeenWelcome && !inWelcomeScreen) {
    //      router.replace('/welcome/firstscreen');
    //   } else if(hasSeenWelcome && inWelcomeScreen) {
    //     router.replace('/auth/login');
    //   }
    // },[hasSeenWelcome, isLoading, segments]);

    // if(isLoading){
    //   return (
    //     <View style={styles.loading}> 
    //       <ActivityIndicator size='large' color='#2A7B6F' />
    //     </View>
    //   )
    // }
  return (
    <Stack screenOptions={{headerShown:false}}>
       <Stack.Screen name="welcome" />
       <Stack.Screen name='auth' />
       <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading:{
    flex:1,
    justifyContent:'center',
    alignItems:'center',
    backgroundColor:'#FFFFFF'
  }
})