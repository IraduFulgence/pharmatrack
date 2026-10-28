
import { LanguageSwitcher } from "@/components/language/languageswitche";
import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";

import { View, StyleSheet, Text, Platform, SafeAreaView, Image

} from "react-native";

import { useTranslation } from "react-i18next";
const logo = require('../../assets/images/logo.png');
export default function SecondScreen(){

    const {t} = useTranslation();

    return(
        <SafeAreaView style={styles.container}>
           {/* start of header section */}
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
                    <Text style={styles.skipText}>{t('welcome.skipText')}</Text>
                    <LanguageSwitcher compact />
                </View>
            </View>
           {/* end of header section */}

            {/* start of hero card */}
            <View style={styles.herocontainer}>
               <View style={styles.featureCard}>
                <View style={styles.checkcontainer}>
                    <FontAwesome5 name="check" size={24} color='white'/>
                    
               </View>
               <Text style={styles.nameTitle}>Pharmatrack</Text>
               </View>
               {/* start of stats card */}
                    <View style={styles.statsCard}>
                        <View style={styles.statItems}>
                            <View style={styles.bullet} />
                            <Text style={styles.statText}>Quick</Text>
                        </View>
                        <View style={styles.statItems}>
                            <View style={styles.bullet} />
                            <Text style={styles.statText}>Reliable</Text>
                        </View>
                        <View style={styles.statItems}>
                            <View style={styles.bullet} />
                            <Text style={styles.statText}>Track</Text>
                        </View>
                    </View>
               {/* end of stats card */}
               <View style={styles.searchDiv}>
                    <FontAwesome5 name="clock" size={18} />
                    <Text style={styles.searchBadgeText}>Search for  medicines in less than 3min </Text>
               </View>
            </View>
            {/* end of hero card */}


        </SafeAreaView>
    );
}


const styles = StyleSheet.create({

    container:{
        flex:1,
        backgroundColor:'#FFFFFF'

    },
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

  herocontainer:{
    backgroundColor:'#2A4E44',
    height:'38%',
    overflow:'hidden',
    paddingHorizontal:24,
    position:'relative',
    borderRadius:30,
    marginRight:20,
    marginLeft:20,
   
  },
   featureCard: {
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 22,
    
  },
  checkcontainer:{
   width: 61,
    height: 61,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    backgroundColor: '#176B57'

  },
  
 nameTitle:{
    color:'#FFFFFF',
    fontWeight:'900',
    fontSize:18
 },
 statsCard:{
    flexDirection:'row',
    width:'75%',
    alignItems:'center',
    marginBottom:30,
    justifyContent:'space-between',
    marginLeft:35
 },
 statItems:{
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
 },
 bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor:'white',
  },
  statText: {
    fontSize: 15,
    color: 'white',
  },

// search text division
searchDiv:{
    
    width: '80%',
    height:'15%',
    borderRadius: 11,
    backgroundColor: '#DDF7E9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 10,
   
    marginLeft:20,
    
   
},
 searchBadgeText: {
    fontSize: 10,
    color: '#176B57',
    flexShrink: 1,
  },

})