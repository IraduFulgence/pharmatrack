import { LanguageSwitcher } from "../language/languageswitche";
import { View, Text, Image, StyleSheet, Platform, SafeAreaView } from "react-native";
import { useTranslation } from "react-i18next";

const fullLogo = require('../../assets/images/White Logo.png');

export default function AuthHeader(){
    const {t} = useTranslation();
    return(
        <View style={styles.header}>
            <SafeAreaView>
                
                
                <View style={styles.topRow}>
                    
                    {/* Logo */}
                    <Image 
                        source={fullLogo} 
                        style={styles.fullLogo} 
                        resizeMode="contain" 
                    />
                    
                    {/* Language Switcher */}
                    <LanguageSwitcher variant="dark" textColor="#fff" />
                     
                </View>

                
                <View style={styles.headerTextContainer}>
                    <Text style={styles.overline}>
                        {t('auth.signup.header')}
                    </Text>
                    <Text style={styles.title}>
                        {t('auth.signup.subheader')}
                    </Text>
                </View>

            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        backgroundColor: '#007a55',
        height: '32%',
        paddingHorizontal: 20,
        position: 'relative',
        overflow: 'hidden',
    },
    
   
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between', 
        marginTop: Platform.OS === 'android' ? 40 : 40,
        width: '100%',
    },
    
   
    fullLogo: {
        width: 140,   
        height: 35,
    },

   
    headerTextContainer: {
        marginTop: 40, 
    },
    overline: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    title: {
        fontSize: 30,
        fontWeight: '700',
        color: 'white',
        lineHeight: 42,
    },
});