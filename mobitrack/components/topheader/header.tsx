import { LanguageSwitcher } from "../language/languageswitche";
import { View, StyleSheet, Text, Platform, Image, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { useOnboardingStore } from "@/hooks/onBoarding";


const fullLogo = require('../../assets/images/Green-logo.png');

export default function GuestHeader(){
    const completeOnboarding = useOnboardingStore((state) => state.completeOnboarding);
    const { t } = useTranslation();

    const handleSkip = async () => {
        await completeOnboarding();
    }

    return(
        <View style={styles.header}>
          
            <View style={styles.logoContainer}>
                <Image 
                    source={fullLogo} 
                    style={styles.fullLogo} 
                    resizeMode="contain" 
                />
            </View>
            
            <View style={styles.headerRight}>
                <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                    <Text style={styles.skipText}>{t('welcome.skipText')}</Text>
                </TouchableOpacity>
                
               
                <LanguageSwitcher variant="light" textColor="#344054" />
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'android' ? 40 : 20, 
        paddingHorizontal: 24,
        alignItems: 'center',
        paddingBottom: 16,
        backgroundColor: '#F8F9F9', 
    },
    
    /* Logo */
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1, 
    },
    fullLogo: {
        width: 130, 
        height: 30,
    },

   
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12, 
    },
    
   
    skipButton: {
        paddingVertical: 4,
        paddingHorizontal: 4,
    },
    skipText: {
        color: '#667085',
        fontSize: 14,
        fontWeight: '600',
    },
});