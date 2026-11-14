import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLanguageStore, Language } from '@/src/stores/language';

interface Props {
  textColor?: string; 
  variant?: 'light' | 'dark'; 
}

export function LanguageSwitcher({ textColor = '#fff', variant = 'dark' }: Props) {
  const { i18n } = useTranslation();
  const { language, setLanguage } = useLanguageStore();

  const options: { code: Language; label: string;  }[] = [
    { code: 'en', label: 'English'},
    { code: 'rw', label: 'Kinyarwanda' },
  ];

  const handleChange = (code: Language) => {
    setLanguage(code);
    i18n.changeLanguage(code);
  };

  const isDark = variant === 'dark';

  return (
    <View style={styles.container}>
      {options.map((opt) => {
        const isActive = language === opt.code;
        
        return (
          <TouchableOpacity
            key={opt.code}
            style={[
              styles.button,
              isActive && styles.buttonActive,
              !isActive && (isDark ? styles.buttonInactiveDark : styles.buttonInactiveLight)
            ]}
            onPress={() => handleChange(opt.code)}
          >
          
            <Text style={[
              styles.label, 
              { color: isActive ? '#007a55' : textColor },
              isActive && { fontWeight: '800' }
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  buttonActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  buttonInactiveDark: {
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'transparent',
  },
  buttonInactiveLight: {
    borderColor: '#D0D5DD',
    backgroundColor: '#F9FAFB',
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});