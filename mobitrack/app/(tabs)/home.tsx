import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  SafeAreaView, Platform, ActivityIndicator, Image, Alert, ScrollView, Modal
} from 'react-native';
import { Ionicons, FontAwesome5, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useLocation } from '@/hooks/useLocation'; 
import { Pharmacy, pharmacyService } from '@/src/api/pharmacy/pharmacyService';
import { useTranslation } from 'react-i18next';

const logo = require('../../assets/images/Green-logo.png'); 


const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const NEARBY_RADIUS_KM = 5;

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { location, hasPermission, isLoading: isLocating, requestlocation } = useLocation();

  // State
  const [nearbyPharmacies, setNearbyPharmacies] = useState<(Pharmacy & { distanceKm?: number })[]>([]);
  const [otherPharmacies, setOtherPharmacies] = useState<(Pharmacy & { distanceKm?: number })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('there');
  const [userInitials, setUserInitials] = useState('U');
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userString = await SecureStore.getItemAsync('user');
        if (userString) {
          const user = JSON.parse(userString);
          const name = user.fullName || 'User';
          setUserName(name.split(' ')[0]);
          const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
          setUserInitials(initials || 'U');
        }
      } catch (e) { console.error(e); }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (hasPermission && location) {
      fetchNearbyPharmacies(location.coords.latitude, location.coords.longitude);
    } else if (hasPermission === false) {
      setNearbyPharmacies([]);
      setOtherPharmacies([]);
      setIsLoading(false);
    }
  }, [hasPermission, location]);

  const fetchNearbyPharmacies = async (latitude: number, longitude: number) => {
    try {
      setIsLoading(true);
      const response = await pharmacyService.getNearbyPharmacies(latitude, longitude);
      
      const pharmacyList = response.data?.pharmacies || response.pharmacies || [];
      
      const sortedPharmacies = pharmacyList
        .filter((p: Pharmacy) => 
          !p.verificationStatus || p.verificationStatus === 'APPROVED' || p.verification_status === 'APPROVED'
        )
        .map((p: Pharmacy) => ({
          ...p,
          latitude: Number(p.latitude),
          longitude: Number(p.longitude),
          distanceKm: calculateDistance(latitude, longitude, Number(p.latitude), Number(p.longitude))
        }))
        .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));

      const withinRadius = sortedPharmacies.filter(p => (p.distanceKm || 0) <= NEARBY_RADIUS_KM);
      const outsideRadius = sortedPharmacies.filter(p => (p.distanceKm || 0) > NEARBY_RADIUS_KM);

      setNearbyPharmacies(withinRadius);
      setOtherPharmacies(outsideRadius);
      
    } catch (error: any) {
      console.error("Fetch Error:", error);
      Alert.alert("Connection Error", "Could not load nearby pharmacies.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsMenuVisible(false);
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    router.replace('/auth/login');
  };

  
  const PharmacyCard = ({ item }: { item: Pharmacy & { distanceKm?: number } }) => (
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.7}
      onPress={() => router.push({
        pathname: `/pharmacy/${item.id}`,
        params: {
          name: item.pharmacyName || item.pharmacy_name,
          address: item.locationAddress || item.location_address,
          latitude: item.latitude,
          longitude: item.longitude,
        }
      })}
    >
      <View style={styles.cardIconContainer}>
        <FontAwesome5 name="clinic-medical" size={20} color="white" />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.pharmacyName || item.pharmacy_name}</Text>
        <View style={styles.statusRow}>
          
          <Text style={styles.hoursText}> {item.locationAddress || item.location_address || 'Kigali'}</Text>
        </View>
      </View>
      {item.distanceKm !== undefined && (
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceText}>{item.distanceKm.toFixed(1)} km</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      
     
      <View style={styles.header}>
        <View style={styles.headerTop}>
          
          <Image source={logo} style={styles.headerLogo} resizeMode="contain" />
          
          {/* Avatar */}
          <TouchableOpacity onPress={() => setIsMenuVisible(true)} style={styles.avatar}>
            <Text style={styles.avatarText}>{userInitials}</Text>
          </TouchableOpacity>
        </View>

        
      </View>

     
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Greeting */}
        {/* <View style={styles.greetingSection}>
          <Text style={styles.greetingTitle}>{t('home.greeting', 'Hello')}, {userName} 👋</Text>
          <Text style={styles.greetingSubtitle}>{t('home.subGreeting', 'Find your medicine quickly.')}</Text>
        </View> */}

        {/* Search Bar*/}
        <TouchableOpacity 
          style={styles.searchContainer}
          onPress={() => router.push('/search')}
          activeOpacity={0.8}
        >
          <Feather name="search" size={20} color="#98A2B3" style={{ marginRight: 8 }} />
          <Text style={styles.searchPlaceholder}>{t('homescreen.searchPlaceholder')}</Text>
        </TouchableOpacity>

        {/* Upload Prescription */}
        <TouchableOpacity 
          style={styles.uploadCard}
          onPress={() => Alert.alert("Coming Soon", "Prescription upload will be available shortly.")}
          activeOpacity={0.9}
        >
          <View style={styles.uploadContent}>
            <View style={styles.uploadIconContainer}>
              <Ionicons name="camera" size={28} color="white" />
            </View>
            <View style={styles.uploadTextContainer}>
              <Text style={styles.uploadTitle}>{t('homescreen.havePrescription', 'Have a prescription?')}</Text>
              <Text style={styles.uploadSubtitle}>{t('homescreen.preMessage', 'Upload it and we will find the medicine for you.')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#007a55" />
          </View>
        </TouchableOpacity>

        {/* 3. Pharmacies Section */}
        {isLoading || isLocating ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007a55" />
            <Text style={styles.loadingText}>{t('homescreen.loadingPharmacies', 'Finding pharmacies near you...')}</Text>
          </View>
        ) : (
          <>
            
            {nearbyPharmacies.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t('homescreen.PhaNear', 'Pharmacies near you')}</Text>
                  <Text style={styles.sectionSubtitle}>{nearbyPharmacies.length} {t('homescreen.Found', 'found')}</Text>
                </View>
                {nearbyPharmacies.map((pharmacy) => (
                  <PharmacyCard key={pharmacy.id} item={pharmacy} />
                ))}
              </>
            )}

            
            {nearbyPharmacies.length === 0 && (
              <View style={styles.noNearbyContainer}>
                <Ionicons name="information-circle-outline" size={28} color="#F59E0B" />
                <Text style={styles.noNearbyTitle}>
                  {t('homescreen.notFound', 'No pharmacies within 5 km')}
                </Text>
              </View>
            )}

            
            {otherPharmacies.length > 0 && (
              <>
                <View style={[styles.sectionHeader, { marginTop: nearbyPharmacies.length > 0 ? 24 : 0 }]}>
                  <Text style={styles.sectionTitle}>
                    {nearbyPharmacies.length > 0 ? t('homescreen.otherPharmacies', 'Other Pharmacies') : t('home.allPharmacies', 'All Pharmacies')}
                  </Text>
                  <Text style={styles.sectionSubtitle}>{otherPharmacies.length} {t('homescreen.Found', 'found')}</Text>
                </View>
                {otherPharmacies.map((pharmacy) => (
                  <PharmacyCard key={pharmacy.id} item={pharmacy} />
                ))}
              </>
            )}

            
            {nearbyPharmacies.length === 0 && otherPharmacies.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="business-outline" size={48} color="#D0D5DD" />
                <Text style={styles.emptyText}>{t('homescreen.notFound', 'No pharmacies found')}</Text>
                <Text style={styles.emptySubtext}>{t('homescreen.try', 'Please try again later')}</Text>
              </View>
            )}
          </>
        )}

        
        <TouchableOpacity 
          style={styles.marketplaceCard}
          onPress={() => Alert.alert("Coming Soon", "Marketplace is being built.")}
          activeOpacity={0.9}
        >
          <View style={styles.marketplaceContent}>
            <MaterialCommunityIcons name="shopping-outline" size={24} color="#007a55" />
            <View style={styles.marketplaceTextContainer}>
              <Text style={styles.marketplaceTitle}>{t('homescreen.explore', 'Explore Pharmacy Marketplace')}</Text>
              <Text style={styles.marketplaceSubtitle}>{t('homescreen.exploreMessage', 'Cosmetics, baby care, and health services.')}</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#007a55" />
          </View>
        </TouchableOpacity>

      </ScrollView>

      
      <Modal visible={isMenuVisible} transparent animationType="fade" onRequestClose={() => setIsMenuVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsMenuVisible(false)}>
          <View style={styles.dropdownContainer}>
            <View style={styles.dropdownHeader}>
              <View style={styles.dropdownAvatar}><Text style={styles.dropdownAvatarText}>{userInitials}</Text></View>
              <View>
                <Text style={styles.dropdownName}>{userName}</Text>
                
              </View>
            </View>
            <View style={styles.dropdownDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuVisible(false); router.push('/profile'); }}>
              <Ionicons name="person-outline" size={20} color="#344054" />
              <Text style={styles.menuItemText}>My Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuVisible(false); router.push('/orders'); }}>
              <Ionicons name="receipt-outline" size={20} color="#344054" />
              <Text style={styles.menuItemText}>My Orders</Text>
            </TouchableOpacity>
            <View style={styles.dropdownDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9F9' },
  
  /* Header */
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLogo: { height: 32, width: 150 },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#e6f4ef',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#D1E7DD',
  },
  avatarText: { fontWeight: '700', color: '#007a55', fontSize: 14 },
  
  /* Location Pill */
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F4F7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
  },
  locationText: { fontSize: 13, fontWeight: '600', color: '#344054' },

  /* Body */
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  
  greetingSection: { marginBottom: 20 },
  greetingTitle: { fontSize: 26, fontWeight: '800', color: '#0F2926', marginBottom: 4 },
  greetingSubtitle: { fontSize: 15, color: '#667085' },

  /* Search */
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', borderWidth: 1, borderColor: '#EAECF0',
    borderRadius: 14, paddingHorizontal: 16, height: 54,
    marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, elevation: 2,
  },
  searchPlaceholder: { flex: 1, fontSize: 15, color: '#98A2B3' },

  /* Upload Prescription Card */
  uploadCard: {
    backgroundColor: '#e6f4ef',
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#D1E7DD',
  },
  uploadContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadIconContainer: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: '#007a55',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 16,
  },
  uploadTextContainer: { flex: 1 },
  uploadTitle: { fontSize: 16, fontWeight: '700', color: '#0F2926', marginBottom: 4 },
  uploadSubtitle: { fontSize: 12, color: '#475569', lineHeight: 16 },

  /* Section Headers */
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0F2926' },
  sectionSubtitle: { fontSize: 13, color: '#667085', fontWeight: '500' },

  /* Pharmacy Cards */
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, elevation: 2,
    borderWidth: 1, borderColor: '#F2F4F7',
  },
  cardIconContainer: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#007a55',
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#0F2926', marginBottom: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  openDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#12B76A', marginRight: 6 },
  openText: { color: '#007a55', fontSize: 13, fontWeight: '500' },
  hoursText: { color: '#98A2B3', fontSize: 13 },
  distanceBadge: { backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#DCFCE7' },
  distanceText: { fontSize: 12, fontWeight: '700', color: '#166534' },

  /* No Nearby Fallback */
  noNearbyContainer: {
    backgroundColor: '#FFFBEB', borderRadius: 16, padding: 20, alignItems: 'center',
    borderWidth: 1, borderColor: '#FEF3C7', marginBottom: 24, marginTop: 10,
  },
  noNearbyTitle: { fontSize: 15, fontWeight: '700', color: '#B45309', marginTop: 10 },

  /* Empty State */
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#344054', marginTop: 12 },
  emptySubtext: { fontSize: 14, color: '#98A2B3', marginTop: 4 },

  /* Loading */
  loadingContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  loadingText: { marginTop: 12, color: '#667085', fontWeight: '500' },

  /* Marketplace Teaser */
  marketplaceCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 16, marginTop: 24,
    borderWidth: 1, borderColor: '#EAECF0',
  },
  marketplaceContent: { flexDirection: 'row', alignItems: 'center' },
  marketplaceTextContainer: { flex: 1, marginLeft: 16 },
  marketplaceTitle: { fontSize: 15, fontWeight: '700', color: '#0F2926', marginBottom: 4 },
  marketplaceSubtitle: { fontSize: 12, color: '#667085' },

  /* Profile Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', paddingTop: Platform.OS === 'android' ? 80 : 60, paddingRight: 24, alignItems: 'flex-end' },
  dropdownContainer: { backgroundColor: 'white', borderRadius: 16, width: 220, padding: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, elevation: 10 },
  dropdownHeader: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 12 },
  dropdownAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#e6f4ef', justifyContent: 'center', alignItems: 'center' },
  dropdownAvatarText: { color: '#007a55', fontWeight: '700', fontSize: 13 },
  dropdownName: { fontSize: 15, fontWeight: '700', color: '#0F2926' },
  dropdownEmail: { fontSize: 11, color: '#667085', marginTop: 2 },
  dropdownDivider: { height: 1, backgroundColor: '#EAECF0', marginVertical: 6 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 8, gap: 10 },
  menuItemText: { fontSize: 14, fontWeight: '500', color: '#344054' },
});