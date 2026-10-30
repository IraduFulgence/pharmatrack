import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  FlatList, SafeAreaView, Platform, ActivityIndicator,Image
} from 'react-native';
import { Ionicons, FontAwesome5, Feather } from '@expo/vector-icons';
import { useLocation } from '@/hooks/useLocation';
import { useState } from 'react';
// Mock data for the pharmacies
const MOCK_PHARMACIES = [
  { id: '1', name: 'WellCare Pharmacy', status: 'Open', hours: 'Closes 9 PM', color: '#206B5F' },
  { id: '2', name: 'Ineza Pharmacy', status: 'Open', hours: 'Closes 9 PM', color: '#1D3557' },
  { id: '3', name: 'Divine Pharmacy', status: 'Open', hours: 'Closes 9 PM', color: '#7B4A2D' },
];

const logo = require('../../assets/images/logo.png');

export default function HomeScreen() {
  const {location} = useLocation();
    const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');
   const [isFetchingAddress, setIsFetchingAddress] = useState(false);
    // render pharmacies
    const renderPharmacy = ({ item }: { item: typeof MOCK_PHARMACIES[0] }) => (
    <View style={styles.card}>
      <View style={[styles.cardIconContainer, { backgroundColor: item.color }]}>
        <FontAwesome5 name="plus" size={16} color="white" />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <View style={styles.statusRow}>
          <Text style={styles.openText}>{item.status}</Text>
          <Text style={styles.hoursText}> {item.hours}</Text>
        </View>
      </View>
      <TouchableOpacity>
        <Ionicons name="heart-outline" size={24} color="#98A2B3" />
      </TouchableOpacity>
    </View>
  );
  
    return (
      <SafeAreaView style={styles.container}>
      
      {/* --- Header section --- */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoContainer}>
           <Image source={logo} style={styles.logoImage} />
            <Text style={styles.logoText}>Pharmatrack</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>DI</Text>
          </View>
        </View>

        <View style={styles.locationSection}>
          <Text style={styles.locationLabel}>YOUR LOCATION</Text>
          {isFetchingAddress ? (
            <ActivityIndicator size="small" color="white" style={{ alignSelf: 'flex-start', marginTop: 4 }} />
          ) : (
            <TouchableOpacity style={styles.locationRow}>
              <Text style={styles.locationText}>Muhima</Text>
              
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* --- Content section --- */}
      <View style={styles.content}>
        <Text style={styles.title}>Pharmacies near you</Text>
        <Text style={styles.subtitle}>18 trusted pharmacies found</Text>

        {/* Search & Filter */}
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#98A2B3" style={{ marginRight: 8 }} />
            <TextInput 
              placeholder="Medicine or pharmacy" 
              placeholderTextColor="#98A2B3"
              style={styles.searchInput}
            />
          </View>
          {/* <TouchableOpacity style={styles.filterButton}>
            <Feather name="sliders" size={20} color="white" />
          </TouchableOpacity> */}
        </View>

        {/* either map or list choice tab */}
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

        {/* List pharmacies */}
        <FlatList
          data={MOCK_PHARMACIES}
          keyExtractor={(item) => item.id}
          renderItem={renderPharmacy}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
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
   logoImage:{
        height:40,
        width:50
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
   
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  logoText: { color: 'white', fontWeight: '600', marginLeft: 8 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontWeight: '700', color: '#206B5F' },
  locationSection: { marginTop: 8 },
  locationLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
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
    borderRadius: 12, paddingHorizontal: 16, height: 48,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#101828' },
  filterButton: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: '#206B5F',
    justifyContent: 'center', alignItems: 'center',
  },

 
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
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#667085' },
  toggleTextActive: { color: '#0F2926' },


  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: '#F2F4F7',
  },
  cardIconContainer: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#0F2926', marginBottom: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  openText: { color: '#206B5F', fontSize: 13, fontWeight: '500' },
  hoursText: {

 color: '#98A2B3', fontSize: 13 },
});


