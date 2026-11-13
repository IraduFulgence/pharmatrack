import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, SafeAreaView, ActivityIndicator, Alert, Platform
} from 'react-native';
import { Ionicons, FontAwesome5, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLocation } from '@/hooks/useLocation';
import { pharmacyService } from '@/src/api/pharmacy/pharmacyService';
import { useTranslation } from 'react-i18next';
// Haversine formula to calculate distance between 2 points in km
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default function SearchScreen() {
  const {t} = useTranslation();
  const router = useRouter();
  const { location, hasPermission, requestlocation } = useLocation();

  // State
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (query.trim().length > 2) {
        handleSearch();
      } else {
        setResults([]);
        setHasSearched(false);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [query]);

  const handleSearch = async () => {
    if (!query.trim()) return;

    try {
      setIsLoading(true);
      setHasSearched(true);

   
      const response = await pharmacyService.searchMedicine(query.trim());
      //console.log(response);     
      const rawData = response.data || response;
      
      
      const rawResults = Array.isArray(rawData) ? rawData : [rawData];

      
      const processed = rawResults.map((item: any) => {
        const medicineName = item.medicine?.medicine_name || item.medicine_name || query;
        const rawPharmacies = item.pharmacies || item.inventory || [];
        //console.log(rawPharmacies);
       
        const pharmaciesWithDistance = rawPharmacies
          .map((pharmacy: any) => {
            
            const phLat = Number(pharmacy.latitude || pharmacy.pharmacy?.latitude);
            const phLng = Number(pharmacy.longitude || pharmacy.pharmacy?.longitude);

            let distanceKm = 0;
            if (location && !isNaN(phLat) && !isNaN(phLng)) {
              distanceKm = calculateDistance(
                location.coords.latitude,
                location.coords.longitude,
                phLat,
                phLng
              );
            }

            return {
              ...pharmacy,
              pharmacyName: pharmacy.pharmacy_name || pharmacy.pharmacyName || pharmacy.pharmacy?.name,
              latitude: phLat,
              longitude: phLng,
              distanceKm,
            };
          })
          .sort((a, b) => a.distanceKm - b.distanceKm); 

        return {
          ...item,
          medicineName,
          pharmacies: pharmaciesWithDistance,
        };
      });

      setResults(processed);
    } catch (error: any) {
      console.error("Search Error:", error);
      // Alert.alert("Error", "Failed to search medicines.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle missing location permission
  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('searchScreen.searchText')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <Feather name="map-pin" size={48} color="#D0D5DD" />
          <Text style={styles.messageTitle}>{t('locationrequired.title')}</Text>
          <Text style={styles.messageText}>{t('locationrequired.message')}</Text>
          <TouchableOpacity style={styles.button} onPress={requestlocation}>
            <Text style={styles.buttonText}>{t('locationrequired.allow')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Render each result
  const renderResult = ({ item }: { item: any }) => {
    const pharmacies = item.pharmacies || [];
    
    return (
      <View style={styles.resultCard}>
        <View style={styles.medicineHeader}>
          <View style={styles.pillIcon}>
            <FontAwesome5 name="pills" size={16} color="#007a55" />
          </View>
          <Text style={styles.medicineName}>{item.medicineName}</Text>
        </View>

        {pharmacies.length === 0 ? (
          <Text style={styles.emptyText}>{t('searchScreen.NotFound')}</Text>
        ) : (
          pharmacies.map((pharmacy: any, index: number) => (
            <TouchableOpacity 
              key={index} 
              style={styles.pharmacyRow}
              
            >
              <View style={styles.pharmacyInfo}>
                <Text style={styles.pharmacyName}>{pharmacy.pharmacyName}</Text>
                <Text style={styles.pharmacyAddress}>
                  {pharmacy.location_address || pharmacy.locationAddress || 'Kigali'}
                </Text>
                <View style={styles.stockBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#166534" />
                  <Text style={styles.stockText}>
                    {t('searchScreen.inStock')} • {pharmacy.quantity_available || pharmacy.quantity || 0} 
                  </Text>
                </View>
              </View>
              <View style={styles.rightInfo}>
                <Text style={styles.price}>
                  {(pharmacy.unit_price || pharmacy.price || 0).toLocaleString()} RWF
                </Text>
                <View style={styles.distanceBadge}>
                  <Feather name="map-pin" size={10} color="#007a55" />
                  <Text style={styles.distanceText}>{pharmacy.distanceKm.toFixed(1)} km</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F2926" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('searchScreen.searchText')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchContainer}>
        <Feather name="search" size={20} color="#98A2B3" style={{ marginRight: 8 }} />
        <TextInput
          placeholder={t('searchScreen.search')}
          placeholderTextColor="#98A2B3"
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={20} color="#98A2B3" />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007a55" />
          <Text style={styles.loadingText}>{t('searchScreen.searchMessage')}</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderResult}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            hasSearched && query.length > 2 ? (
              <View style={styles.center}>
                <Ionicons name="search-outline" size={48} color="#D0D5DD" />
                <Text style={styles.messageTitle}>{t('searchScreen.noresult')}</Text>
                <Text style={styles.messageText}>{t('searchScreen.tryMessage')}</Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9F9' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: '#EAECF0',
    paddingTop: Platform.OS === 'android' ? 40 : 16,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F2926' },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', borderWidth: 1, borderColor: '#EAECF0',
    borderRadius: 14, paddingHorizontal: 16, height: 54,
    marginHorizontal: 20, marginTop: 16, marginBottom: 8,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#101828' },
  listContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  center: { alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 20 },
  loadingText: { marginTop: 12, color: '#667085', fontWeight: '500' },
  messageTitle: { fontSize: 18, fontWeight: '700', color: '#0F2926', marginTop: 16 },
  messageText: { fontSize: 14, color: '#667085', textAlign: 'center', marginTop: 8 },
  button: { backgroundColor: '#007a55', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, marginTop: 24 },
  buttonText: { color: 'white', fontWeight: '700' },
  
  resultCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04,
    borderWidth: 1, borderColor: '#F2F4F7',
  },
  medicineHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#EAECF0', paddingBottom: 12 },
  pillIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#e6f4ef', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  medicineName: { fontSize: 18, fontWeight: '700', color: '#0F2926' },
  emptyText: { fontSize: 13, color: '#98A2B3', fontStyle: 'italic' },
  pharmacyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F2F4F7',
  },
  pharmacyInfo: { flex: 1 },
  pharmacyName: { fontSize: 15, fontWeight: '600', color: '#0F2926' },
  pharmacyAddress: { fontSize: 12, color: '#667085', marginTop: 2 },
  stockBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 6 },
  stockText: { fontSize: 10, color: '#166534', fontWeight: '600', marginLeft: 4 },
  rightInfo: { alignItems: 'flex-end', marginLeft: 8 },
  price: { fontSize: 15, fontWeight: '800', color: '#007a55' },
  distanceBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  distanceText: { fontSize: 11, color: '#667085', fontWeight: '500' },
});