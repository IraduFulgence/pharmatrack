import { LanguageSwitcher } from "../language/languageswitche";
import { View, Text, Image, StyleSheet, Platform, SafeAreaView } from "react-native";
import { useTranslation } from "react-i18next";
const logo = require('../../assets/images/logo.png');


export default function AuthHeader(){
    const {t} = useTranslation();
        return(
            <View style={styles.header}>
                         <SafeAreaView>
                            <View style ={styles.logoContainer}>
                                <View style={styles.logoIcon}>
                                <Image source={logo} style={styles.logoImage} />
                                </View>
                                <Text style={styles.logoText}>
                                    Pharmatrack
                                </Text>
                                
                                <View style={styles.language}>
                                    <LanguageSwitcher compact />
                                </View>
                                 
                               
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
     // header styles
        header:{
            backgroundColor:'#206B5F',
            height:'30%',
            paddingHorizontal:20,
            position:'relative',
            overflow:'hidden',
         },
    
         language:{
            paddingLeft: Platform.OS ==='android' ? 100 :80,
         },
        
      logoContainer:{
        flexDirection: 'row',
        alignItems:'center',
        marginTop: Platform.OS === 'android' ? 40 :40,
      },
      logoIcon:{
        backgroundColor:'A8D5C8',
       width: 24,
        height: 24,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
      },
      logoText:{
        fontSize:18,
        fontWeight:'700',
        color: 'white',
        paddingHorizontal:8
      },
      headerTextContainer: {
        marginTop: 40,
      },
      overline: {
        fontSize: 18,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: 1.5,
        marginBottom: 8,
      },
      title: {
        fontSize: 30,
        fontWeight: '700',
        color: 'white',
        lineHeight: 42,
      },
       logoImage:{
            height:40,
            width:50
      },
})