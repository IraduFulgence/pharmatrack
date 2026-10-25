import 
{
View,
Text,
TouchableOpacity,
StyleSheet
} from 'react-native';

import { useTranslation } from 'react-i18next';
import { Language, useLanguageStore } from '@/src/stores/language';

interface Props {
    compact?: boolean;
}

export function LanguageSwitcher({compact = false}: Props){
    const {t} = useTranslation();
    const {language, setLanguage} = useLanguageStore();

    const options:{code: Language; label:string}[] =[
        {code:'en',label:'EN'},
        {code:'rw', label:'RW'},
    ];

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {options.map((opt) => {
        const isActive = language === opt.code;
        return (
          <TouchableOpacity
            key={opt.code}
            style={[styles.option, isActive && styles.optionActive]}
            onPress={() => setLanguage(opt.code)}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>
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
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 4,
    alignSelf: 'center',
  },
  containerCompact: {
    alignSelf: 'flex-end',
  },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  optionActive: {
    backgroundColor: '#16A34A',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  labelActive: {
    color: '#FFFFFF',
  },
});