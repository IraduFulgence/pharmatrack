import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, 
  Platform, ActivityIndicator, Alert, ScrollView, Linking
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, FontAwesome5, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLocation } from '@/hooks/useLocation';


const GOOGLE_MAPS_APIKEY = 'YOUR_GOOGLE_MAPS_API_KEY_HERE'; 

export default function PharmacyDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { location: userLocation, hasPermission, requestlocation } = useLocation();
  const mapRef = useRef<MapView>(null);

  // Retrieve data passed
  const params = useLocalSearchParams();
  const pharmacy = {
    id: params.id as string,
    name: (params.name as string) || 'Pharmacy',
    address: (params.address as string) || 'Kigali',
    latitude: Number(params.latitude),
    longitude: Number(params.longitude),
  };

  // State
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [showRoute, setShowRoute] = useState(true);

  if (!userLocation || !hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007a55" />
          <Text style={styles.loadingText}>{t('pharmacy.gettingLocation', 'Getting your location...')}</Text>
          {!hasPermission && (
             <TouchableOpacity style={styles.permissionButton} onPress={requestlocation}>
               <Text style={styles.permissionButtonText}>Allow Location</Text>
             </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const origin = {
    latitude: userLocation.coords.latitude,
    longitude: userLocation.coords.longitude,
  };

  const destination = {
    latitude: pharmacy.latitude,
    longitude: pharmacy.longitude,
  };

  // Auto-fit the map to show both markers
  useEffect(() => {
    if (isMapReady && mapRef.current) {
      mapRef.current.fitToSuppliedMarkers(['origin', 'destination'], {
        edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
        animated: true,
      });
    }
  }, [isMapReady, userLocation, pharmacy]);

  // Handle external navigation (if user really wants to open Google Maps)
  const openExternalNavigation = () => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${pharmacy.latitude},${pharmacy.longitude}`;
    const label = pharmacy.name;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });
    if (url) Linking.openURL(url);
  };

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

          {/* Route Line */}
          {showRoute && (
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
              }}
              onError={(errorMessage) => {
                console.error("Directions Error:", errorMessage);
                setShowRoute(false); // Fallback: just show markers if route fails
              }}
            />
          )}
        </MapView>

        {/* Back Button  */}
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#0F2926" />
        </TouchableOpacity>
      </View>

      {/* Bottom Info Sheet */}
      <View style={styles.bottomSheet}>
        
        {/* Header Row */}
        <View style={styles.sheetHeader}>
          <View style={styles.pharmacyInfo}>
            <Text style={styles.pharmacyName}>{pharmacy.name}</Text>
            <View style={styles.addressRow}>
              <Feather name="map-pin" size={14} color="#667085" />
              <Text style={styles.pharmacyAddress} numberOfLines={1}>{pharmacy.address}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.chatButton} onPress={() => router.push(`/chat/${pharmacy.id}`)}>
            <Feather name="message-circle" size={22} color="#007a55" />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Route Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statValue}>{routeInfo ? routeInfo.distance : '-- km'}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Drive Time</Text>
            <Text style={styles.statValue}>{routeInfo ? routeInfo.duration : '-- min'}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Status</Text>
            <Text style={[styles.statValue, { color: '#007a55' }]}>Open</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => {
              if (mapRef.current) {
                mapRef.current.fitToSuppliedMarkers(['origin', 'destination'], {
                  edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
                  animated: true,
                });
              }
            }}
          >
            <Feather name="navigation" size={20} color="white" />
            <Text style={styles.primaryButtonText}>Show Route</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={openExternalNavigation}
          >
            <MaterialCommunityIcons name="google-maps" size={22} color="#007a55" />
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
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'white',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  },

  /* Back Button */
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 20,
    backgroundColor: 'white',
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
  },

  /* Bottom Sheet */
  bottomSheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 20,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 16,
  },
  pharmacyInfo: { flex: 1, marginRight: 16 },
  pharmacyName: { fontSize: 22, fontWeight: '800', color: '#0F2926', marginBottom: 6 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pharmacyAddress: { fontSize: 14, color: '#667085', flex: 1 },
  
  chatButton: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#e6f4ef',
    justifyContent: 'center', alignItems: 'center',
  },
  
  divider: { height: 1, backgroundColor: '#F2F4F7', marginBottom: 16 },

  /* Stats Row */
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#F8F9F9', padding: 16, borderRadius: 16, marginBottom: 24,
  },
  statBox: { alignItems: 'center', flex: 1 },
  statLabel: { fontSize: 12, color: '#667085', fontWeight: '500', marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '800', color: '#0F2926' },

  /* Action Row */
  actionRow: { flexDirection: 'row', gap: 12 },
  primaryButton: {
    flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#007a55', paddingVertical: 18, borderRadius: 16, gap: 10,
    shadowColor: '#007a55', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, elevation: 5,
  },
  primaryButtonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    width: 58, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#e6f4ef', borderRadius: 16,
  },

  /* Loading State */
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#667085', fontWeight: '500' },
  permissionButton: { marginTop: 20, backgroundColor: '#007a55', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  permissionButtonText: { color: 'white', fontWeight: '700' },
});