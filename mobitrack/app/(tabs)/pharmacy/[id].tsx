import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Ionicons,
  FontAwesome5,
  Feather,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLocation } from '@/hooks/useLocation';
import { chatService } from '@/src/api/chat/chatService';


const GOOGLE_MAPS_APIKEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

export default function PharmacyDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    location: userLocation,
    hasPermission,
    requestlocation,
    openSetting,
    isLoading: isLocating,
  } = useLocation();

  const mapRef = useRef<MapView>(null);

  const params = useLocalSearchParams();

  const getString = (v: string | string[] | undefined, fallback = '') =>
    Array.isArray(v) ? v[0] ?? fallback : v ?? fallback;

  const pharmacy = useMemo(
    () => ({
      id: getString(params.id),
      name: getString(params.name, 'Pharmacy'),
      address: getString(params.address, 'Kigali'),
      latitude: Number(getString(params.latitude)),
      longitude: Number(getString(params.longitude)),
    }),
    [
      params.id,
      params.name,
      params.address,
      params.latitude,
      params.longitude,
    ]
  );

  const hasValidCoords =
    Number.isFinite(pharmacy.latitude) && Number.isFinite(pharmacy.longitude);

     const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    duration: string;
  } | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [showRoute, setShowRoute] = useState(true);
  const [routeError, setRouteError] = useState(false);
  const [isOpeningChat, setIsOpeningChat] = useState(false);

  // Opens (or reuses) this patient's conversation with the pharmacy, then shows it.
  const openChat = async () => {
    const pharmacyId = Number(pharmacy.id);
    if (!Number.isInteger(pharmacyId) || pharmacyId <= 0 || isOpeningChat) return;
    setIsOpeningChat(true);
    try {
      const res = await chatService.startChat(pharmacyId);
      router.push({
        pathname: '/chat/[id]',
        params: { id: String(res.data.chat_id), name: res.data.pharmacy_name || pharmacy.name },
      });
    } catch (err: any) {
      Alert.alert(t('chat.openFailedTitle', 'Could not open chat'), err?.message || '');
    } finally {
      setIsOpeningChat(false);
    }
  };

  const origin = userLocation
    ? {
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
      }
    : null;

  const destination = hasValidCoords
    ? { latitude: pharmacy.latitude, longitude: pharmacy.longitude }
    : null;

  
  useEffect(() => {
    if (!isMapReady || !mapRef.current || !origin || !destination) return;
    mapRef.current.fitToCoordinates([origin, destination], {
      edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
      animated: true,
    });
  }, [isMapReady, origin?.latitude, origin?.longitude, destination?.latitude, destination?.longitude]);

 
  const openExternalNavigation = () => {
    if (!destination) return;
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${destination.latitude},${destination.longitude}`;
    const label = pharmacy.name;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });
    if (url) Linking.openURL(url);
  };
  if (!hasValidCoords) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
          <Text style={styles.loadingText}>
            {t('pharmacy.invalidCoords', 'Invalid pharmacy location.')}
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={() => router.back()}
          >
            <Text style={styles.permissionButtonText}>
              {t('common.goBack', 'Go back')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === null || (hasPermission && !userLocation) || isLocating) {
    // Permission is still being determined, or granted but locating
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007a55" />
          <Text style={styles.loadingText}>
            {t('pharmacy.gettingLocation', 'Getting your location...')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    // Explicitly denied (or GPS disabled)
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="location-outline" size={40} color="#F59E0B" />
          <Text style={styles.loadingText}>
            {t(
              'pharmacy.locationDenied',
              'Location permission is required to show the route.'
            )}
          </Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestlocation}
            >
              <Text style={styles.permissionButtonText}>
                {t('pharmacy.retry', 'Try again')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.permissionButton, { backgroundColor: '#344054' }]}
              onPress={openSetting}
            >
              <Text style={styles.permissionButtonText}>
                {t('pharmacy.openSettings', 'Open settings')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!origin || !destination) return null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Map View */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: origin.latitude,
            longitude: origin.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          onMapReady={() => setIsMapReady(true)}
          showsUserLocation={true}
          showsMyLocationButton={false}
        >
          
          <Marker identifier="origin" coordinate={origin} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.userDot} />
          </Marker>

          {/* Destination Marker */}
          <Marker
            identifier="destination"
            coordinate={destination}
            title={pharmacy.name}
            description={pharmacy.address}
          >
            <View style={styles.markerContainer}>
              <FontAwesome5 name="clinic-medical" size={20} color="white" />
            </View>
          </Marker>

          {/* Route Line (Google directions) */}
          {showRoute && GOOGLE_MAPS_APIKEY ? (
            <MapViewDirections
              origin={origin}
              destination={destination}
              apikey={GOOGLE_MAPS_APIKEY}
              strokeWidth={5}
              strokeColor="#007a55"
              mode="DRIVING"
              onReady={(result) => {
                setRouteInfo({
                  distance: result.distance.toFixed(1) + ' km',
                  duration: result.duration.toFixed(0) + ' min',
                });
                setRouteError(false);
              }}
              onError={(errorMessage) => {
                console.error('Directions Error:', errorMessage);
                setShowRoute(false);
                setRouteError(true);
              }}
            />
          ) : (
            // Fallback straight line when we have no API key or directions failed
            <Polyline
              coordinates={[origin, destination]}
              strokeWidth={4}
              strokeColor="#007a55"
              lineDashPattern={[8, 6]}
            />
          )}
        </MapView>

      </View>

      {/* Bottom Info Sheet */}
      <View style={styles.bottomSheet}>
        {/* Header Row */}
        <View style={styles.sheetHeader}>
          <View style={styles.pharmacyInfo}>
            <Text style={styles.pharmacyName}>{pharmacy.name}</Text>
            <View style={styles.addressRow}>
              <Feather name="map-pin" size={14} color="#667085" />
              <Text style={styles.pharmacyAddress} numberOfLines={1}>
                {pharmacy.address}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={openChat}
            disabled={isOpeningChat}
          >
            {isOpeningChat ? (
              <ActivityIndicator size="small" color="#007a55" />
            ) : (
              <Feather name="message-circle" size={22} color="#007a55" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Route Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>{t('pharmacy.distance', 'Distance')}</Text>
            <Text style={styles.statValue}>
              {routeInfo ? routeInfo.distance : '-- km'}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>{t('pharmacy.driveTime', 'Drive time')}</Text>
            <Text style={styles.statValue}>
              {routeInfo ? routeInfo.duration : '-- min'}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>{t('pharmacy.status', 'Status')}</Text>
            <Text style={[styles.statValue, { color: '#007a55' }]}>{t('pharmacy.open', 'Open')}</Text>
          </View>
        </View>

        {routeError && (
          <Text style={styles.routeErrorText}>
            {t(
              'pharmacy.routeUnavailable',
              'Live route unavailable — showing straight line. Check your Google Maps API key.'
            )}
          </Text>
        )}

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              if (mapRef.current && origin && destination) {
                mapRef.current.fitToCoordinates([origin, destination], {
                  edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
                  animated: true,
                });
              }
            }}
          >
            <Feather name="navigation" size={20} color="white" />
            <Text style={styles.primaryButtonText}>{t('pharmacy.showRoute', 'Show route')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={openExternalNavigation}
          >
            <MaterialCommunityIcons
              name="google-maps"
              size={22}
              color="#007a55"
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9F9' },
  mapContainer: { flex: 1 },
  map: { width: '100%', height: '100%' },

  /* Custom Marker */
  markerContainer: {
    backgroundColor: '#007a55',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  userDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2563EB',
    borderWidth: 3,
    borderColor: 'white',
  },

  /* Back Button */
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 20,
    backgroundColor: 'white',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },

  /* Bottom Sheet */
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  pharmacyInfo: { flex: 1, marginRight: 16 },
  pharmacyName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F2926',
    marginBottom: 6,
  },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pharmacyAddress: { fontSize: 14, color: '#667085', flex: 1 },

  chatButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e6f4ef',
    justifyContent: 'center',
    alignItems: 'center',
  },

  divider: { height: 1, backgroundColor: '#F2F4F7', marginBottom: 16 },

  /* Stats Row */
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9F9',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  statBox: { alignItems: 'center', flex: 1 },
  statLabel: {
    fontSize: 12,
    color: '#667085',
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: { fontSize: 16, fontWeight: '800', color: '#0F2926' },

  routeErrorText: {
    fontSize: 12,
    color: '#B45309',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    textAlign: 'center',
  },

  /* Action Row */
  actionRow: { flexDirection: 'row', gap: 12 },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007a55',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#007a55',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    elevation: 5,
  },
  primaryButtonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    width: 58,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e6f4ef',
    borderRadius: 16,
  },

  /* Loading State */
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: {
    marginTop: 12,
    color: '#667085',
    fontWeight: '500',
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#007a55',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionButtonText: { color: 'white', fontWeight: '700' },
});