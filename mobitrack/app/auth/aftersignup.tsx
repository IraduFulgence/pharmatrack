import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet, SafeAreaView, Image, Platform, TouchableOpacity, Alert } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { useLocation } from "@/hooks/useLocation";
import { useRouter } from "expo-router";
import { useEffect } from "react";
const logo = require('../../assets/images/logo.png');
export default function AfterSignupScreen(){

    const router = useRouter();
    const {t} = useTranslation();
    const {
        location,
        hasPermission,
        errorMessage,
        isLoading,
        requestlocation,
        openSetting
    } = useLocation();
   
    // check if location is set
    useEffect(()=>{
        if(errorMessage){
            Alert.alert(t('auth.after.locationRequired'), errorMessage,
                [
                    {text:t('auth.after.cancel'), style:'cancel'},
                    {text:t('auth.after.openSetting'), onPress:openSetting}
                ]
            );
        }
    },[errorMessage]);
//    get coordinates from granted location
        useEffect(() =>{
            if(location){
                console.log("User Location found:", location.coords);
            }
        },[location]);
        const handlerequest = async () =>{
            await requestlocation();
        }
    return(
        <SafeAreaView style={styles.container}>
            {/* logo section */}
            <View style={styles.logoContainer}>
                <Image source={logo} style={styles.logoImage} />
                <Text style={styles.logoText}>Pharmatrack</Text>
            </View>
            {/* end of logo section */}

            {/* checkbox container */}
               <View style={styles.featureCard}>
                    <View style={styles.checkcontainer}>
                    <FontAwesome5 name="check" size={30} style={{color:'#05743cff'}}/>
                                   
                    </View>
                   <Text style={styles.nameTitle}>{t('auth.after.header')}</Text>
             </View>
            {/* end of checkbox container */}
            {/* start of content section */}
            <View style={styles.contentContainer}>
                <Text style={styles.contentTitle}>{t('auth.after.subheader')}</Text>
                <Text style={styles.contentParagraph}>{t('auth.after.paragraph')} </Text>
            </View>
            {/* end of content section */}

            
                  <TouchableOpacity style={styles.LocationButton}>
                <Text style={styles.LocationButtonText} onPress={handlerequest}>
                    {t('auth.after.button')}
                </Text>
                <FontAwesome5 name="arrow-right" size={22} color="white" />
            </TouchableOpacity>
            
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container:{
        flex:1,
        backgroundColor:'#206B5F'
    },
    logoContainer:{
        flexDirection:'row',
        justifyContent:'space-between',
        alignContent:'center',
        alignItems:'center',
        alignSelf:'center',
        paddingTop: Platform.OS === 'android' ? 70 : undefined
        
    },
    logoText:{
        fontSize:18,
        fontWeight:'700',
        color: 'white',
        paddingHorizontal:8
      },
      logoImage:{
            height:40,
            width:50
      },
featureCard: {
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 22,
    paddingTop:110
    
  },
  checkcontainer:{
   width: 61,
    height: 61,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    backgroundColor: '#039472ff',


  },
  
 nameTitle:{
    color:'#09a95cff',
    fontWeight:'600',
    fontSize:15,
    paddingTop:15,
    textTransform:'uppercase'
 },

 contentContainer:{
    paddingHorizontal:30,
    paddingTop:20
 },
 contentTitle:{
    fontSize:27,
    color:'#FFFFFF',
    fontWeight:'600',
    lineHeight:42
 },
 contentParagraph:{
    fontSize:17,
    color:'#342f2fff',
    fontWeight:'400',
    paddingTop:20
 },
 LocationButton: {
    backgroundColor: '#027c68ff',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    marginTop:40,
    marginLeft:20,
    marginRight:20,
    gap:14
  },
  LocationButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
})

