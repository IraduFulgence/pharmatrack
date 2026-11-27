import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, Platform } from 'react-native';
import Animated, { 
  FadeIn, FadeInDown, FadeInUp, 
  useSharedValue, useAnimatedStyle, withTiming, withDelay 
} from 'react-native-reanimated';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/language/languageswitche';

const logo = require('../../assets/images/Green-logo.png'); 

export default function SplashScreen() {
  const { t } = useTranslation();
  const opacity = useSharedValue(1);

  useEffect(() => {
    // Fade out animation
    opacity.value = withDelay(3500, withTiming(0, { duration: 500 }));

    const timer = setTimeout(async () => {
      // Check if user is already logged in
      const token = await SecureStore.getItemAsync('token');
      
      if (token) {
        // Logged in
        router.replace('/(tabs)/home');
      } else {
        // Not logged in
        router.replace('/auth/login');
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.container, animatedContainerStyle]}>
      
      <Animated.View entering={FadeIn.delay(200)} style={styles.topBar}>
        <View style={{ flex: 1 }} /> 
        <LanguageSwitcher variant="light" textColor="#0F172A" />
      </Animated.View>

      <View style={styles.centerContent}>
        <Animated.View entering={FadeInDown.delay(400).springify().damping(15)}>
          <Image source={logo} style={styles.brandLogo} resizeMode="contain" />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(1000).springify()}>
          <Text style={styles.slogan}>
            {t('welcome.slogan', 'The pharmacy is in your palm.')}
          </Text>
        </Animated.View>
      </View>

      <Animated.View entering={FadeIn.delay(1500)} style={styles.footer}>
        <Text style={styles.footerText}>{t('welcome.powered')}</Text>
      </Animated.View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 10,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLogo: {
    width: 260,
    height: 80,
    marginBottom: 24,
  },
  slogan: {
    fontSize: 22,
    fontWeight: '700',
    color: '#007a55',
    textAlign: 'center',
    lineHeight: 32,
    paddingHorizontal: 20,
  },
  footer: {
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#98A2B3',
    fontWeight: '500',
  },
});