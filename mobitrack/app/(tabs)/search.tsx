import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, SafeAreaView, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons, FontAwesome5, Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useLocation } from '@/hooks/useLocation';
import { pharmacyService } from '@/src/api/pharmacy/pharmacyService';
import { useTranslation } from 'react-i18next';

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

function normalizeResults(rawData: any): any[] {
  if (Array.isArray(rawData)) return rawData;
  if (!rawData || typeof rawData !== 'object') return [];
  return (
    rawData.medicines ??
    rawData.results ??
    rawData.items ??
    rawData.data ??   
    []
  );
}

export default function SearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { location, hasPermission, requestlocation } = useLocation();

  
  const { initialQuery } = useLocalSearchParams<{ initialQuery?: string }>();

  const [query, setQuery] = useState<string>(
    Array.isArray(initialQuery) ? initialQuery[0] ?? '' : initialQuery ?? ''
  );
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  
  const requestIdRef = useRef(0);

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;

    const myId = ++requestIdRef.current;
    try {
      setIsLoading(true);
      setHasSearched(true);

      const response = await pharmacyService.searchMedicine(q);
      if (myId !== requestIdRef.current) return; // query changed, drop

      const rawData = (response as any)?.data ?? response;
      const rawResults = normalizeResults(rawData);

      const processed = rawResults.map((item: any) => {
        const medicineName =
          item.medicine?.medicine_name || item.medicine_name || q;
        const rawPharmacies = item.pharmacies || item.inventory || [];

        const pharmaciesWithDistance = rawPharmacies
          .map((pharmacy: any) => {
            const phLat = Number(
              pharmacy.latitude ?? pharmacy.pharmacy?.latitude
            );
            const phLng = Number(
              pharmacy.longitude ?? pharmacy.pharmacy?.longitude
            );

            let distanceKm: number | undefined;
            if (
              location &&
              Number.isFinite(phLat) &&
              Number.isFinite(phLng)
            ) {
              distanceKm = calculateDistance(
                location.coords.latitude,
                location.coords.longitude,
                phLat,
                phLng
              );
            }

            return {
              ...pharmacy,
              pharmacyName:
                pharmacy.pharmacy_name ||
                pharmacy.pharmacyName ||
                pharmacy.pharmacy?.name,
              latitude: phLat,
              longitude: phLng,
              distanceKm,
            };
          })
          .sort(
            (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)
          );

        return { ...item, medicineName, pharmacies: pharmaciesWithDistance };
      });

      setResults(processed);
    } catch (error: any) {
      if (myId !== requestIdRef.current) return;
      console.error('Search Error:', error);
      setResults([]);
    } finally {
      if (myId === requestIdRef.current) setIsLoading(false);
    }
  }, [query, location]);

  useEffect(() => {
    if (hasPermission !== true) return;

    const timeout = setTimeout(() => {
      if (query.trim().length > 2) {
        handleSearch();
      } else {
        setResults([]);
        setHasSearched(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [query, handleSearch, hasPermission]);


  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#0F2926" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t('searchScreen.searchText', 'Search')}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007a55" />
          <Text style={styles.loadingText}>
            {t('searchScreen.checkingLocation', 'Checking location…')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#0F2926" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t('searchScreen.searchText', 'Search')}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <View style={styles.iconCircle}>
            <Feather name="map-pin" size={32} color="#007a55" />
          </View>
          <Text style={styles.messageTitle}>
            {t('locationrequired.title', 'Location Needed')}
          </Text>
          <Text style={styles.messageText}>
            {t(
              'locationrequired.message',
              'We need your location to find the nearest pharmacies with this medicine.'
            )}
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={requestlocation}
          >
            <Text style={styles.primaryButtonText}>
              {t('locationrequired.allow', 'Allow Location')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // -------- Render result rows --------

  const renderResult = ({ item }: { item: any }) => {
    const pharmacies = item.pharmacies || [];

    return (
      <View style={styles.resultCard}>
        <View style={styles.medicineHeader}>
          <View style={styles.pillIcon}>
            <FontAwesome5 name="pills" size={18} color="#007a55" />
          </View>
          <Text style={styles.medicineName}>{item.medicineName}</Text>
        </View>

        {pharmacies.length === 0 ? (
          <View style={styles.emptyResult}>
            <Ionicons name="sad-outline" size={20} color="#98A2B3" />
            <Text style={styles.emptyText}>
              {t(
                'searchScreen.NotFound',
                'Not available in any nearby pharmacy.'
              )}
            </Text>
          </View>
        ) : (
          pharmacies.map((pharmacy: any, index: number) => (
            <TouchableOpacity
              key={
                pharmacy.pharmacy_id ??
                pharmacy.id ??
                pharmacy.pharmacyId ??
                `row-${index}`
              }
              style={styles.pharmacyRow}
              onPress={() =>
                router.push({
                  pathname: `/pharmacy/${
                    pharmacy.pharmacy_id ||
                    pharmacy.id ||
                    pharmacy.pharmacyId
                  }`,
                  params: {
                    name: pharmacy.pharmacyName,
                    address:
                      pharmacy.location_address || pharmacy.locationAddress,
                    latitude: pharmacy.latitude,
                    longitude: pharmacy.longitude,
                  },
                })
              }
              activeOpacity={0.7}
            >
              <View style={styles.pharmacyInfo}>
                <Text style={styles.pharmacyName}>
                  {pharmacy.pharmacyName}
                </Text>
                <View style={styles.pharmacyMeta}>
                  <Feather name="map-pin" size={12} color="#98A2B3" />
                  <Text style={styles.pharmacyAddress}>
                    {pharmacy.location_address ||
                      pharmacy.locationAddress ||
                      'Kigali'}
                  </Text>
                </View>
              </View>

              <View style={styles.rightInfo}>
                <Text style={styles.price}>
                  {Number(
                    pharmacy.unit_price ?? pharmacy.price ?? 0
                  ).toLocaleString()}{' '}
                  RWF
                </Text>
                <View style={styles.distanceBadge}>
                  <Text style={styles.distanceText}>
                    {Number.isFinite(pharmacy.distanceKm)
                      ? `${(pharmacy.distanceKm as number).toFixed(1)} km`
                      : '—'}
                  </Text>
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
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#0F2926" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('searchScreen.searchText', 'Search Medicine')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Feather
            name="search"
            size={20}
            color="#98A2B3"
            style={{ marginRight: 10 }}
          />
          <TextInput
            placeholder={t(
              'searchScreen.search',
              'Search by name (e.g., Paracetamol)'
            )}
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
        <TouchableOpacity style={styles.rxLink} onPress={() => router.push('/prescription')} activeOpacity={0.8}>
          <Feather name="file-text" size={18} color="#007a55" />
          <Text style={styles.rxLinkText}>
            {t('searchScreen.haveRx', 'Have a prescription number? Find your medicines')}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#007a55" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007a55" />
          <Text style={styles.loadingText}>
            {t('searchScreen.searchMessage', 'Searching pharmacies...')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, index) =>
            String(
              item.id ??
                item.medicineId ??
                item.medicine?.medicine_name ??
                item.medicineName ??
                `idx-${index}`
            )
          }
          renderItem={renderResult}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            hasSearched && query.trim().length > 2 ? (
              <View style={styles.center}>
                <View style={styles.iconCircle}>
                  <Ionicons name="search-outline" size={32} color="#98A2B3" />
                </View>
                <Text style={styles.messageTitle}>
                  {t('searchScreen.NotFound', 'No results found')}
                </Text>
                <Text style={styles.messageText}>
                  {t(
                    'searchScreen.tryMessage',
                    'Try a different spelling or medicine name.'
                  )}
                </Text>
              </View>
            ) : (
              <View style={styles.center}>
                <View style={styles.iconCircle}>
                  <FontAwesome5 name="pills" size={28} color="#007a55" />
                </View>
                <Text style={styles.messageTitle}>
                  {t('searchScreen.startTitle', 'Find your medicine')}
                </Text>
                <Text style={styles.messageText}>
                  {t(
                    'searchScreen.startMessage',
                    'Type the name of the medicine to see which pharmacies have it in stock.'
                  )}
                </Text>
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF0',
    paddingTop: Platform.OS === 'android' ? 40 : 16,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F2926' },

  searchWrapper: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9F9',
    borderWidth: 1,
    borderColor: '#EAECF0',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 50,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#101828' },
  rxLink: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10,
    paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#ECFDF3', borderRadius: 12,
  },
  rxLinkText: { flex: 1, color: '#007a55', fontWeight: '700', fontSize: 13 },

  listContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

  resultCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F2F4F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    elevation: 2,
  },
  medicineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F4F7',
  },
  pillIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#e6f4ef',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medicineName: { fontSize: 18, fontWeight: '700', color: '#0F2926' },

  emptyResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  emptyText: { fontSize: 13, color: '#98A2B3', fontStyle: 'italic' },

  pharmacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F4F7',
  },
  pharmacyInfo: { flex: 1 },
  pharmacyName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F2926',
    marginBottom: 4,
  },
  pharmacyMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pharmacyAddress: { fontSize: 12, color: '#667085' },

  rightInfo: { alignItems: 'flex-end', marginLeft: 8 },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: '#007a55',
    marginBottom: 6,
  },
  distanceBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  distanceText: { fontSize: 11, color: '#166534', fontWeight: '700' },

  center: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e6f4ef',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 16,
    color: '#667085',
    fontWeight: '600',
    fontSize: 15,
  },
  messageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F2926',
    marginTop: 16,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 14,
    color: '#667085',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },

  primaryButton: {
    backgroundColor: '#007a55',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    marginTop: 24,
    shadowColor: '#007a55',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    elevation: 4,
  },
  primaryButtonText: { color: 'white', fontWeight: '700', fontSize: 16 },
});