import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, SafeAreaView, Platform, ActivityIndicator, Image, Alert
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useLocation } from '@/hooks/useLocation'; 
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

import { Pharmacy, pharmacyService } from '@/src/api/pharmacy/pharmacyService';
const logo = require('../../assets/images/logo.png');

export default function HomeScreen() {
  const { location } = useLocation();
  const router = useRouter();
  
  // State
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [filteredPharmacies, setFilteredPharmacies] = useState<Pharmacy[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');
  const [userInitials, setUserInitials] = useState('U');
  const [userName, setUserName] = useState('User');

  // Load User & Fetch Pharmacies
  useEffect(() => {
    loadUser();
    fetchPharmacies();
  }, []);

  // Client-side Search Filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPharmacies(pharmacies);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = pharmacies.filter(p => 
        p.pharmacyName.toLowerCase().includes(query) || 
        (p.locationAddress && p.locationAddress.toLowerCase().includes(query))
      );
      setFilteredPharmacies(filtered);
    }
  }, [searchQuery, pharmacies]);

  const loadUser = async () => {
    try {
      const userString = await SecureStore.getItemAsync('user');
      if (userString) {
        const user = JSON.parse(userString);
        const name = user.fullName || 'User';
        setUserName(name);
        // Extract initials (e.g., "John Doe" -> "JD")
        const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
        setUserInitials(initials || 'U');
      }
    } catch (e) {
      console.error("Failed to load user data");
    }
  };

  const fetchPharmacies = async () => {
    try {
      setIsLoading(true);
      const response = await pharmacyService.getAllPharmacies();
      console.log("PHARMACY RESPONSE:", JSON.stringify(response, null, 2));
      // Filter to show only APPROVED pharmacies to patients
      const approved = response.data.filter(
        (p: Pharmacy) => p.verificationStatus === 'APPROVED'
      );
      
      setPharmacies(approved);
      setFilteredPharmacies(approved);
    } catch (error: any) {
      Alert.alert("Connection Error", "Could not load pharmacies. Please check your internet.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sign Out", 
          style: "destructive", 
          onPress: async () => {
            await SecureStore.deleteItemAsync('token');
            await SecureStore.deleteItemAsync('user');
            router.replace('/auth/login');
          } 
        }
      ]
    );
  };

  // Render each pharmacy card
  const renderPharmacy = ({ item }: { item: Pharmacy }) => (
    <View style={styles.card}>
      <View style={styles.cardIconContainer}>
        <FontAwesome5 name="clinic-medical" size={18} color="white" />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.pharmacyName}</Text>
        <View style={styles.statusRow}>
          <View style={styles.openDot} />
          <Text style={styles.openText}>Open</Text>
          <Text style={styles.hoursText}> • {item.locationAddress || 'Kigali'}</Text>
        </View>
      </View>
      <TouchableOpacity>
        <Ionicons name="chevron-forward" size={20} color="#98A2B3" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      
      {/* --- Header section --- */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoContainer}>
            <Image source={logo} style={styles.logoImage} resizeMode="contain" />
            <Text style={styles.logoText}>Pharmatrack</Text>
          </View>
          
          {/* Avatar (Tap to Logout) */}
          <TouchableOpacity onPress={handleLogout} style={styles.avatar}>
            <Text style={styles.avatarText}>{userInitials}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.locationSection}>
          <Text style={styles.locationLabel}>YOUR LOCATION</Text>
          <TouchableOpacity style={styles.locationRow}>
            <Ionicons name="location" size={16} color="white" style={{ marginRight: 4 }} />
            <Text style={styles.locationText}>Kigali, Rwanda</Text>
          </TouchableOpacity>
        </View>
      </View>

      
      <View style={styles.content}>
        <Text style={styles.title}>Pharmacies near you</Text>
        <Text style={styles.subtitle}>
          {filteredPharmacies.length} trusted pharmacies found
        </Text>

        {/* Search */}
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#98A2B3" style={{ marginRight: 8 }} />
            <TextInput 
              placeholder="Search pharmacy or location..." 
              placeholderTextColor="#98A2B3"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#98A2B3" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* List/Map Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity 
            style={[styles.toggleButton, activeTab === 'list' && styles.toggleActive]}
            onPress={() => setActiveTab('list')}
          >
            <Text style={[styles.toggleText, activeTab === 'list' && styles.toggleTextActive]}>List</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleButton, activeTab === 'map' && styles.toggleActive]}
            onPress={() => setActiveTab('map')}
          >
            <Text style={[styles.toggleText, activeTab === 'map' && styles.toggleTextActive]}>Map</Text>
          </TouchableOpacity>
        </View>

        {/* Loading / List */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#206B5F" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filteredPharmacies}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderPharmacy}
            contentContainerStyle={{ paddingBottom: 100 }} 
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="business-outline" size={48} color="#D0D5DD" />
                <Text style={styles.emptyText}>No pharmacies found</Text>
                <Text style={styles.emptySubtext}>Try a different search or location</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9F9' },
  header: {
    backgroundColor: '#206B5F', 
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 24,
  },
  logoImage: { height: 32, width: 32, tintColor: 'white' },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  logoText: { color: 'white', fontWeight: '700', fontSize: 18, marginLeft: 8 },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'white',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarText: { fontWeight: '700', color: '#206B5F', fontSize: 14 },
  locationSection: { marginTop: 4 },
  locationLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  locationText: { color: 'white', fontSize: 16, fontWeight: '600' },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: { fontSize: 26, fontWeight: '700', color: '#0F2926', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#667085', marginBottom: 20 },
  
  searchRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  searchContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', borderWidth: 1, borderColor: '#EAECF0',
    borderRadius: 12, paddingHorizontal: 16, height: 50,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#101828' },

  toggleContainer: {
    flexDirection: 'row', 
    backgroundColor: '#F3F4F6',
    borderRadius: 12, 
    padding: 4, 
    marginBottom: 20,
  },
  toggleButton: {
    flex: 1, 
    paddingVertical: 10, 
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleActive: {
    backgroundColor: 'white',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, elevation: 2,
  },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#667085' },
  toggleTextActive: { color: '#0F2926' },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, elevation: 2,
    borderWidth: 1, borderColor: '#F2F4F7',
  },
  cardIconContainer: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#206B5F',
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#0F2926', marginBottom: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  openDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#12B76A', marginRight: 6,
  },
  openText: { color: '#206B5F', fontSize: 13, fontWeight: '500' },
  hoursText: { color: '#98A2B3', fontSize: 13 },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#344054',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#98A2B3',
    marginTop: 4,
  }
});