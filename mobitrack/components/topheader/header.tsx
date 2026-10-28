import { LanguageSwitcher } from "../language/languageswitche";

import { View, StyleSheet, Text, Platform, Image, TouchableOpacity

} from "react-native";

import { useTranslation } from "react-i18next";
import { useOnboardingStore } from "@/hooks/onBoarding";
const logo = require('../../assets/images/logo.png');

export default function GuestHeader(){
    const completeOnboarding = useOnboardingStore((state) =>state.completeOnboarding);
    const {t} = useTranslation();

        const handleSkip = async () =>{
           await completeOnboarding();
        }
        return(
            <View style={styles.header}>
                <View style={styles.logoContainer}>
                    <View>
                    <Image source={logo} style={styles.logoImage} />
                    </View>
                    <Text style={styles.logoText}>
                        Pharmatrack
                    </Text>
                </View>
                <View style={styles.headerRight}>
                   <TouchableOpacity 
                   onPress={handleSkip}
                   >
                     <Text style={styles.skipText}>{t('welcome.skipText')}</Text>
                   </TouchableOpacity>
                    <LanguageSwitcher compact />
                </View>
            </View>
        );
}

const styles = StyleSheet.create({
    header:{
        flexDirection:'row',
        justifyContent:'space-between',
        paddingTop: Platform.OS === 'android' ? 40 :undefined,
        paddingHorizontal:24,
        alignItems:'center',
        paddingBottom:24
    },
    logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    backgroundColor: '#2A7B6F',
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F2926',
  },
  skipText: {
    color: '#667085',
    fontSize: 15,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  logoImage:{
        height:40,
        width:50
  },

});