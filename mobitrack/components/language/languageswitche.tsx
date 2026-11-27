import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Modal, Platform 
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { useLanguageStore, Language } from '@/src/stores/language';

interface Props {
  textColor?: string;
  variant?: 'light' | 'dark';
  /** Small trigger (flag + EN/RW) for tight spaces like the app header. */
  compact?: boolean;
}

export function LanguageSwitcher({ textColor = '#344054', variant = 'light', compact = false }: Props) {
  const { i18n, t } = useTranslation();
  const { language, setLanguage } = useLanguageStore();
  const [isOpen, setIsOpen] = useState(false);

  const options: { code: Language; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'rw', label: 'Kinyarwanda', flag: '🇷🇼' },
  ];

  const currentOption = options.find(o => o.code === language) || options[0];

  const handleLanguageChange = (code: Language) => {
    setLanguage(code);
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  const isDark = variant === 'dark';
  const iconColor = isDark ? '#fff' : '#667085';
  const finalTextColor = isDark ? '#fff' : '#344054';
  const borderColor = isDark ? 'rgba(255,255,255,0.3)' : '#EAECF0';

  return (
    <View>
      {/* Trigger Button */}
      <TouchableOpacity 
        style={[styles.trigger, compact && styles.triggerCompact, { borderColor }]}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={t('language.change', { defaultValue: 'Language: {{name}}. Change language', name: currentOption.label })}
      >
        <Text style={[styles.flag, compact && { marginRight: 4 }]}>{currentOption.flag}</Text>
        <Text style={[styles.triggerText, { color: finalTextColor }]}>
          {compact ? currentOption.code.toUpperCase() : currentOption.label}
        </Text>
        {!compact && <Feather name="chevron-down" size={14} color={iconColor} style={{ marginLeft: 4 }} />}
      </TouchableOpacity>

      {/* Dropdown Modal */}
      <Modal 
        visible={isOpen} 
        transparent 
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>{t('language.choose', 'Choose language')}</Text>
            {options.map((opt) => (
              <TouchableOpacity 
                key={opt.code} 
                style={styles.menuItem}
                onPress={() => handleLanguageChange(opt.code)}
                activeOpacity={0.7}
                accessibilityRole="radio"
                accessibilityState={{ selected: language === opt.code }}
              >
                <View style={styles.menuItemLeft}>
                  <Text style={styles.menuFlag}>{opt.flag}</Text>
                  <Text style={styles.menuLabel}>{opt.label}</Text>
                </View>
                {language === opt.code && (
                  <Feather name="check" size={18} color="#007a55" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Trigger Button
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  triggerCompact: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  flag: {
    fontSize: 16,
    marginRight: 6,
  },
  triggerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  
  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menu: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
    width: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#667085',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuFlag: {
    fontSize: 22,
    marginRight: 12,
  },
  menuLabel: {
    fontSize: 16,
    color: '#0F2926',
    fontWeight: '500',
  },
});