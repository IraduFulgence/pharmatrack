import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, SafeAreaView, ActivityIndicator, Platform
} from 'react-native';
import { Ionicons, FontAwesome5, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLocation } from '@/hooks/useLocation';
import { pharmacyService } from '@/src/api/pharmacy/pharmacyService';
import { useTranslation } from 'react-i18next';

// Haversine distance helper
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default function SearchScreen() {
  const { t } = useTranslation();
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
      
      const rawData = response.data || response;
      const rawResults = Array.isArray(rawData) ? rawData : [rawData];
      
      const processed = rawResults.map((item: any) => {
        const medicineName = item.medicine?.medicine_name || item.medicine_name || query;
        const rawPharmacies = item.pharmacies || item.inventory || [];
        
        const pharmaciesWithDistance = rawPharmacies
          .map((pharmacy: any) => {
            const phLat = Number(pharmacy.latitude || pharmacy.pharmacy?.latitude);
            const phLng = Number(pharmacy.longitude || pharmacy.pharmacy?.longitude);
            let distanceKm = 0;
            
            if (location && !isNaN(phLat) && !isNaN(phLng)) {
              distanceKm = calculateDistance(location.coords.latitude, location.coords.longitude, phLat, phLng);
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

        return { ...item, medicineName, pharmacies: pharmaciesWithDistance };
      });

      setResults(processed);
    } catch (error: any) {
      console.error("Search Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

 
  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#0F2926" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('searchScreen.searchText', 'Search')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <View style={styles.iconCircle}>
            <Feather name="map-pin" size={32} color="#007a55" />
          </View>
          <Text style={styles.messageTitle}>{t('locationrequired.title', 'Location Needed')}</Text>
          <Text style={styles.messageText}>{t('locationrequired.message', 'We need your location to find the nearest pharmacies with this medicine.')}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={requestlocation}>
            <Text style={styles.primaryButtonText}>{t('locationrequired.allow', 'Allow Location')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Render each medicine result
  
  const renderResult = ({ item }: { item: any }) => {
    const pharmacies = item.pharmacies || [];
    
    return (
      <View style={styles.resultCard}>
        {/* Medicine Header */}
        <View style={styles.medicineHeader}>
          <View style={styles.pillIcon}>
            <FontAwesome5 name="pills" size={18} color="#007a55" />
          </View>
          <Text style={styles.medicineName}>{item.medicineName}</Text>
        </View>

        {/* Pharmacies List */}
        {pharmacies.length === 0 ? (
          <View style={styles.emptyResult}>
            <Ionicons name="sad-outline" size={20} color="#98A2B3" />
            <Text style={styles.emptyText}>{t('searchScreen.NotFound', 'Not available in any nearby pharmacy.')}</Text>
          </View>
        ) : (
          pharmacies.map((pharmacy: any, index: number) => (
            <TouchableOpacity 
              key={index} 
              style={styles.pharmacyRow}
              onPress={() => router.push({
                pathname: `/pharmacy/${pharmacy.pharmacy_id || pharmacy.id || pharmacy.pharmacyId}`,
                params: {
                  name: pharmacy.pharmacyName,
                  address: pharmacy.location_address || pharmacy.locationAddress,
                  latitude: pharmacy.latitude,
                  longitude: pharmacy.longitude,
                }
              })}
              activeOpacity={0.7}
            >
              <View style={styles.pharmacyInfo}>
                <Text style={styles.pharmacyName}>{pharmacy.pharmacyName}</Text>
                <View style={styles.pharmacyMeta}>
                  <Feather name="map-pin" size={12} color="#98A2B3" />
                  <Text style={styles.pharmacyAddress}>
                    {pharmacy.location_address || pharmacy.locationAddress || 'Kigali'}
                  </Text>
                </View>
              </View>

              <View style={styles.rightInfo}>
                <Text style={styles.price}>
                  {(pharmacy.unit_price || pharmacy.price || 0).toLocaleString()} RWF
                </Text>
                <View style={styles.distanceBadge}>
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
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F2926" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('searchScreen.searchText', 'Search Medicine')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color="#98A2B3" style={{ marginRight: 10 }} />
          <TextInput
            placeholder={t('searchScreen.search', 'Search by name (e.g., Paracetamol)')}
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
      </View>

      {/* Results */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007a55" />
          <Text style={styles.loadingText}>{t('searchScreen.searchMessage', 'Searching pharmacies...')}</Text>
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
                <View style={styles.iconCircle}>
                  <Ionicons name="search-outline" size={32} color="#98A2B3" />
                </View>
                <Text style={styles.messageTitle}>{t('searchScreen.NotFound', 'No results found')}</Text>
                <Text style={styles.messageText}>{t('searchScreen.tryMessage', 'Try a different spelling or medicine name.')}</Text>
              </View>
            ) : (
              <View style={styles.center}>
                <View style={styles.iconCircle}>
                  <FontAwesome5 name="pills" size={28} color="#007a55" />
                </View>
                <Text style={styles.messageTitle}>{t('searchScreen.startTitle', 'Find your medicine')}</Text>
                <Text style={styles.messageText}>{t('searchScreen.startMessage', 'Type the name of the medicine to see which pharmacies have it in stock.')}</Text>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9F9' },
  
  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: '#EAECF0',
    paddingTop: Platform.OS === 'android' ? 40 : 16,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F2926' },

  /* Search Bar */
  searchWrapper: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF0',
  },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8F9F9', borderWidth: 1, borderColor: '#EAECF0',
    borderRadius: 14, paddingHorizontal: 16, height: 50,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#101828' },

  /* Results List */
  listContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

  resultCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#F2F4F7',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, elevation: 2,
  },
  medicineHeader: { 
    flexDirection: 'row', alignItems: 'center', 
    marginBottom: 16, paddingBottom: 12, 
    borderBottomWidth: 1, borderBottomColor: '#F2F4F7' 
  },
  pillIcon: { 
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#e6f4ef', 
    justifyContent: 'center', alignItems: 'center', marginRight: 12 
  },
  medicineName: { fontSize: 18, fontWeight: '700', color: '#0F2926' },

  emptyResult: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  emptyText: { fontSize: 13, color: '#98A2B3', fontStyle: 'italic' },

  pharmacyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F2F4F7',
  },
  pharmacyInfo: { flex: 1 },
  pharmacyName: { fontSize: 15, fontWeight: '600', color: '#0F2926', marginBottom: 4 },
  pharmacyMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pharmacyAddress: { fontSize: 12, color: '#667085' },

  rightInfo: { alignItems: 'flex-end', marginLeft: 8 },
  price: { fontSize: 15, fontWeight: '800', color: '#007a55', marginBottom: 6 },
  distanceBadge: { 
    backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 4, 
    borderRadius: 8, borderWidth: 1, borderColor: '#DCFCE7' 
  },
  distanceText: { fontSize: 11, color: '#166534', fontWeight: '700' },

  /* States */
  center: { alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 24 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#e6f4ef',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: { marginTop: 16, color: '#667085', fontWeight: '600', fontSize: 15 },
  messageTitle: { fontSize: 20, fontWeight: '800', color: '#0F2926', marginTop: 16, textAlign: 'center' },
  messageText: { fontSize: 14, color: '#667085', textAlign: 'center', marginTop: 8, lineHeight: 22 },
  
  primaryButton: { 
    backgroundColor: '#007a55', paddingVertical: 14, paddingHorizontal: 32, 
    borderRadius: 14, marginTop: 24,
    shadowColor: '#007a55', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, elevation: 4
  },
  primaryButtonText: { color: 'white', fontWeight: '700', fontSize: 16 },
});