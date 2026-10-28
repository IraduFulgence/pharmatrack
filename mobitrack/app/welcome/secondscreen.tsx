import { FontAwesome5 } from "@expo/vector-icons";

import { View, StyleSheet, Text, Platform, SafeAreaView, ScrollView, TouchableOpacity

} from "react-native";
 import GuestHeader from "@/components/topheader/header";
import { useTranslation } from "react-i18next";
import { useOnboardingStore } from "@/hooks/onBoarding";

export default function SecondScreen(){

    const {t} = useTranslation();
    const completeonBoarding = useOnboardingStore((state)=> state.completeOnboarding);
    const handleContinue = async () =>{
        await completeonBoarding();
    }

    const handleSignIn = async ()=>{
        await completeonBoarding();
    }
    return(
        <SafeAreaView style={styles.container}>
           {/* start of header section */}
            <GuestHeader />
           {/* end of header section */}
        <ScrollView style={styles.scrollView}
         contentContainerStyle={styles.scrollcontent}
         showsVerticalScrollIndicator={false}
         bounces={false}
        >

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
                            <Text style={styles.statText}>{t('welcome.secondScreen.track')}</Text>
                        </View>
                        <View style={styles.statItems}>
                            <View style={styles.bullet} />
                            <Text style={styles.statText}>{t('welcome.secondScreen.quick')}</Text>
                        </View>
                        <View style={styles.statItems}>
                            <View style={styles.bullet} />
                            <Text style={styles.statText}>{t('welcome.secondScreen.reliable')}</Text>
                        </View>
                    </View>
               {/* end of stats card */}
               <View style={styles.searchDiv}>
                    <FontAwesome5 name="clock" size={18} />
                    <Text style={styles.searchBadgeText}>{t('welcome.secondScreen.medicineMessage')} </Text>
               </View>
            </View>
            {/* end of hero card */}
            {/* start of content area */}
                <View style={styles.contentContainer}>
                    <Text style={styles.headTitle}>{t('welcome.secondScreen.create')}</Text>
                    <Text style={styles.headerTitle}>{t('welcome.secondScreen.ready')}</Text>

                    <Text style={styles.description}>
                        {t('welcome.secondScreen.createMessage')}
            </Text>
                </View>
            {/* end of content area */}
            {/* start of bottom area */}
                <View style={styles.bottomSection}>
                    <TouchableOpacity style={styles.createButton}
                    onPress={handleContinue}
                    >
                        <Text style={styles.createButtonText}> {t('welcome.secondScreen.button')}</Text>

                        <FontAwesome5 name="arrow-right" color="white" size={21} />
                    </TouchableOpacity>

                    <View style={styles.signInRow}>
            <Text style={styles.signInText}>
              {t('welcome.secondScreen.buttomMessage')}{t(' ')}
            </Text>

            <TouchableOpacity
              onPress={handleSignIn}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Text style={styles.signInLink}>{t('welcome.secondScreen.signinMessage')}</Text>
            </TouchableOpacity>
          </View>
                </View>
            {/* end of bottom area */}
        </ScrollView>

        </SafeAreaView>
    );
}


const styles = StyleSheet.create({

    container:{
        flex:1,
        backgroundColor:'#FFFFFF'

    },
    scrollView:{
        flex:1
    },
    scrollcontent:{
        flexGrow:1,
        paddingBottom:10
    },

  herocontainer:{
    backgroundColor:'#2A4E44',
    height:'38%',
    overflow:'hidden',
    paddingHorizontal:24,
    position:'relative',
    borderRadius:30,
    marginRight:10,
    marginLeft:10,
   
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
contentContainer:{
    marginTop:Platform.OS ==='android' ? 40 : undefined
},
headTitle:{
    fontSize:13,
    color:'#176B57',
    fontWeight:'600',
    textTransform:'uppercase',
    marginLeft:17,
    marginBottom:17

},
headerTitle:{
    fontSize:27,
    color:'#000000',
    fontWeight:'700',
    lineHeight:42,
    letterSpacing: -0.6,
    marginBottom: 12,
    paddingHorizontal:20
    
},
 description: {
    fontSize: 18,
    lineHeight: 30,
    fontWeight: '500',
    paddingHorizontal: 14,
    letterSpacing: 0.5,
  },

   bottomSection: {
    paddingTop: 90,
    paddingBottom: 6,
  },

  createButton: {
    minHeight: 57,
    backgroundColor: '#176B57',
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginLeft:40,
    marginRight:40

  },

  createButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    marginBottom: 3,
  },

  signInText: {
    fontSize: 14,
    color: '#555555',
  },

  signInLink: {
    fontSize: 18,
    fontWeight: '600',
    color: '#176B57',
  },


})