import { View, Text, StyleSheet, Image,TouchableOpacity, SafeAreaView,Dimensions,Platform } from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { LanguageSwitcher } from "@/components/language/languageswitche";
import { useTranslation } from "react-i18next";

import { useOnboardingStore } from "@/hooks/onBoarding";
const {width, height} = Dimensions.get('window');



export default function FirstScreen(){
const rwanda = require('../../assets/images/rwanda.webp');
const completeOnboarding = useOnboardingStore((state) =>state.completeOnboarding);

const handleContinue = async () =>{
  await completeOnboarding();
}
const {t} = useTranslation();
    return (
        <SafeAreaView style={styles.container}>
      {/* --- header --- */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <FontAwesome5 name="plus" size={14} color="white" />
          </View>
          <Text style={styles.logoText}>Pharmatrack</Text>
        </View>
        <View style={styles.headerRight}>
            <TouchableOpacity>
          <Text style={styles.skipText}>{t('welcome.skipText')}</Text>
        </TouchableOpacity>
        <LanguageSwitcher compact />
        </View>
      </View>
      {/* end of header section */}

      {/* --- map section --- */}
        <View style={styles.mapSection}>
              <View style={styles.mapContainer}>
       
        <Image 
          source={rwanda} 
          style={styles.mapImage} 
        />
        
        {/* Map Pin */}
        <View style={styles.pinContainer}>
          <View style={styles.pinShadow} />
          <View style={styles.pin}>
            <Ionicons name="location" size={24} color="white" />
          </View>
        </View>

        {/* Floating Pharmacy Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <FontAwesome5 name="plus" size={16} color="white" />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.pharmacyName}>Ineza Pharmacy</Text>
              <View style={styles.statusRow}>
                <Text style={styles.openText}>{t('welcome.Open')}</Text>
                <Text style={styles.closesText}> • {t('welcome.Close')} 9 PM</Text>
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statText}>4.8 <Text style={{color: '#FFC107'}}>★</Text></Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statText}>0.4 km</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statText}>5 min</Text>
            </View>
          </View>
        </View>
      </View>
        </View>

      {/* --- TEXT CONTENT SECTION --- */}
      <View style={styles.contentContainer}>
        <Text style={styles.overline}>{t('welcome.nearYou')}</Text>
        <Text style={styles.title}>{t('welcome.heading')}</Text>
        <Text style={styles.subtitle}>
          {t('welcome.paragraph')}
        </Text>

        {/* Bottom Button */}
        <TouchableOpacity onPress={handleContinue} style={styles.button}>
          <Text style={styles.buttonText}>{t('welcome.button')}</Text>
          <Ionicons name="arrow-forward" size={18} color="white" style={styles.buttonIcon} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9F9', 
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 40: 10,
    paddingBottom: 20,
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
  mapSection:{
    flex:1.2,
    paddingHorizontal:20,
  },
  mapContainer: {
    minHeight: 300,
   
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#E8F3F1',
    position: 'relative',
  },
  mapImage: {
    width: '100%',
    height: '100%',
    opacity: 0.4, 
  },
  pinContainer: {
    position: 'absolute',
    top: '35%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  pin: {
    backgroundColor: '#2A7B6F',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  pinShadow: {
    position: 'absolute',
    bottom: -10,
    width: 30,
    height: 10,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 15,
    transform: [{ scaleY: 0.5 }],
  },
  card: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIconContainer: {
    backgroundColor: '#2A7B6F',
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  pharmacyName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F2926',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  openText: {
    color: '#2A7B6F',
    fontSize: 12,
  },
  closesText: {
    color: '#98A2B3',
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    backgroundColor: '#F8F9F9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: '#667085',
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  overline: {
    fontSize: 12,
    fontWeight: '700',
    color: '#667085',
    letterSpacing: 1,
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0F2926',
    lineHeight: 40,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 15,
    color: '#667085',
    lineHeight: 22,
    marginBottom: 30,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D0D5DD',
    width: 6,
    marginRight: 6,
  },
  activeDot: {
    width: 24,
    backgroundColor: '#2A7B6F',
  },
  button: {
    backgroundColor: '#206B5F',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginLeft: 8,
  },


});

