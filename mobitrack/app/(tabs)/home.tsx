import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  SafeAreaView, Platform, ActivityIndicator, Image, Alert, ScrollView, Modal
} from 'react-native';
import { Ionicons, FontAwesome5, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocation } from '@/hooks/useLocation';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Pharmacy, pharmacyService } from '@/src/api/pharmacy/pharmacyService';
import { useTranslation } from 'react-i18next';

const logo = require('../../assets/images/White Logo.png');

export default function HomeScreen() {
  const { location } = useLocation();
  const router = useRouter();
  const { t } = useTranslation();
  
  // State
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userInitials, setUserInitials] = useState('U');
  const [userName, setUserName] = useState('there');
  const [isMenuVisible, setIsMenuVisible] = useState(false); 

  useEffect(() => {
    loadUser();
    fetchPharmacies();
  }, []);

  const loadUser = async () => {
    try {
      const userString = await SecureStore.getItemAsync('user');
      if (userString) {
        const user = JSON.parse(userString);
        const name = user.fullName || 'User';
        const firstName = name.split(' ')[0];
        setUserName(firstName);
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
      const pharmacyList = response.data?.pharmacies || [];
      const approved = pharmacyList.filter(
        (p: Pharmacy) => p.verificationStatus === 'APPROVED' || p.verification_status === 'APPROVED'
      );
      setPharmacies(approved);
    } catch (error: any) {
      console.error("Fetch Error:", error);
      Alert.alert("Connection Error", "Could not load pharmacies.");
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

  const handleMenuItemPress = (action: string) => {
    setIsMenuVisible(false);
    switch (action) {
      case 'profile':
        Alert.alert("Coming Soon", "Profile page coming soon.");
        break;
      case 'orders':
        Alert.alert("Coming Soon", "Order history coming soon.");
        break;
      case 'logout':
        handleLogout();
        break;
    }
  };

  // Quick Action Card
  const QuickAction = ({ icon, title, subtitle, bgColor, onPress }: any) => (
    <TouchableOpacity style={styles.quickActionCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.quickActionIcon, { backgroundColor: bgColor }]}>
        {icon}
      </View>
      <Text style={styles.quickActionTitle}>{title}</Text>
      <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );

  // Pharmacy Card
  const renderPharmacy = ({ item }: { item: Pharmacy }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.7}>
      <View style={styles.cardIconContainer}>
        <FontAwesome5 name="clinic-medical" size={20} color="white" />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.pharmacyName || (item as any).pharmacy_name}</Text>
        <View style={styles.statusRow}>
          <View style={styles.openDot} />
          <Text style={styles.openText}>Open</Text>
          <Text style={styles.hoursText}> • {item.locationAddress || 'Kigali'}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#98A2B3" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Image source={logo} style={styles.headerLogo} resizeMode="contain" />
          
         
          <TouchableOpacity onPress={() => setIsMenuVisible(true)} style={styles.avatar}>
            <Text style={styles.avatarText}>{userInitials}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.locationSection}>
          <Text style={styles.locationLabel}>YOUR LOCATION</Text>
          <TouchableOpacity style={styles.locationRow}>
            <Text style={styles.locationText}>Kigali, Rwanda</Text>
          </TouchableOpacity>
        </View>
      </View>

    
      <Modal
        visible={isMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsMenuVisible(false)}
        >
          <View style={styles.dropdownContainer}>
            
           
            <View style={styles.dropdownHeader}>
              <View style={styles.dropdownAvatar}>
                <Text style={styles.dropdownAvatarText}>{userInitials}</Text>
              </View>
              <View>
                <Text style={styles.dropdownName}>{userName}</Text>
               
              </View>
            </View>

            <View style={styles.dropdownDivider} />

           
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItemPress('profile')}>
              <Ionicons name="person-outline" size={20} color="#344054" />
              <Text style={styles.menuItemText}>My Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItemPress('orders')}>
              <Ionicons name="receipt-outline" size={20} color="#344054" />
              <Text style={styles.menuItemText}>My Orders</Text>
            </TouchableOpacity>

            <View style={styles.dropdownDivider} />

            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItemPress('logout')}>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>


      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.greetingSection}>
          <Text style={styles.greetingTitle}>Hello, {userName} </Text>
          <Text style={styles.greetingSubtitle}>How can we help you today?</Text>
        </View>

        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color="#98A2B3" style={{ marginRight: 8 }} />
          <TextInput 
            placeholder="Search medicine or pharmacy..." 
            placeholderTextColor="#98A2B3"
            style={styles.searchInput}
          />
        </View>

        <View style={styles.quickActionRow}>
          <QuickAction
            icon={<Ionicons name="camera-outline" size={26} color="#007a55" />}
            title="Upload"
            subtitle="Prescription"
            bgColor="#e6f4ef"
            onPress={() => Alert.alert("Coming Soon", "Prescription upload will be available shortly.")}
          />
          <QuickAction
            icon={<Ionicons name="medical-outline" size={26} color="#007bff" />}
            title="Find"
            subtitle="Pharmacies"
            bgColor="#e6f0ff"
            onPress={() => { /* Scroll to list */ }}
          />
          <QuickAction
            icon={<MaterialCommunityIcons name="package-variant-closed" size={26} color="#ff8c00" />}
            title="My"
            subtitle="Orders"
            bgColor="#fff4e5"
            onPress={() => Alert.alert("Coming Soon", "Order history coming soon.")}
          />
        </View>

      
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pharmacies near you</Text>
          <Text style={styles.sectionSubtitle}>{pharmacies.length} found</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#007a55" style={{ marginTop: 30 }} />
        ) : pharmacies.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={48} color="#D0D5DD" />
            <Text style={styles.emptyText}>No pharmacies found</Text>
            <Text style={styles.emptySubtext}>Try again later</Text>
          </View>
        ) : (
          pharmacies.map((pharmacy) => (
            <View key={pharmacy.id}>
              {renderPharmacy({ item: pharmacy })}
            </View>
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9F9' },

  header: {
    backgroundColor: '#007a55', 
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLogo: { 
    height: 30, 
    width: 140 
  },
  avatar: {
    width: 42, 
    height: 42, 
    borderRadius: 21,
    backgroundColor: 'white',
    justifyContent: 'center',
    
  alignItems: 'center',
    borderWidth: 2, 
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: { 
    fontWeight: '700',
     color: '#007a55', 
     fontSize: 14 
    },
  locationSection: { 
    marginTop: 4 
  },
  locationLabel: { 
    color: 'rgba(255,255,255,0.7)', 
    fontSize: 11, 
    fontWeight: '700', 
    letterSpacing: 1 
  },
  locationRow: { 
    flexDirection: 'row',
     alignItems: 'center',
      marginTop: 6 
    },
  locationText: { 
    color: 'white',
     fontSize: 16, 
     fontWeight: '600'
     },


  scrollContent: {
     paddingHorizontal: 20,
      paddingTop: 24, 
      paddingBottom: 40 
    },

  greetingSection: { 
    marginBottom: 20
   },
  greetingTitle: { 
    fontSize: 26, 
    fontWeight: '800', 
    color: '#0F2926', 
    marginBottom: 4 
  },
  greetingSubtitle: { 
    fontSize: 15, 
    color: '#667085' 
  },

  searchContainer: {
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: 'white', 
    borderWidth: 1, 
    borderColor: '#EAECF0',
    borderRadius: 14, 
    paddingHorizontal: 16, 
    height: 54,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.04, 
    elevation: 2,
    marginBottom: 24,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#101828' },


  quickActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 12, 
  },
  quickActionCard: {
    flex: 1, 
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8, 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.04,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F2F4F7',
    minHeight: 130, 
  },
  quickActionIcon: {
    width: 48, height: 48,
    borderRadius: 12,
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionTitle: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#0F2926', 
    textAlign: 'center',
    marginBottom: 2,
  },
  quickActionSubtitle: { 
    fontSize: 11, 
    color: '#667085', 
    textAlign: 'center',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  sectionTitle: { 
    fontSize: 18,
    fontWeight: '700',
    color: '#0F2926' 
  },
  sectionSubtitle: {
     fontSize: 13, 
     color: '#667085',
      fontWeight: '500' 
    },


  card: {
    flexDirection: 'row',
     alignItems: 'center',
    backgroundColor: 'white',
     borderRadius: 16, 
     padding: 16, 
     marginBottom: 12,
    shadowColor: '#000',
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.03, 
     elevation: 2,
    borderWidth: 1, 
    borderColor: '#F2F4F7',
  },
  cardIconContainer: {
    width: 44, height: 44,
     borderRadius: 12,
    backgroundColor: '#007a55',
    justifyContent: 'center', 
    alignItems: 'center',
     marginRight: 16,
  },
  cardContent: { 
    flex: 1 
  },
  cardTitle: { 
    fontSize: 16,
     fontWeight: '600', 
     color: '#0F2926',
      marginBottom: 4 
    },
  statusRow: { 
    flexDirection: 'row', 
    alignItems: 'center'
   },
  openDot: { 
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#12B76A', 
      marginRight: 6 
    },
  openText: {
     color: '#007a55', 
     fontSize: 13, 
     fontWeight: '500'
     },
  hoursText: { 
    color: '#98A2B3', 
    fontSize: 13 
  },

 
  emptyState: { 
     alignItems: 'center',
     justifyContent: 'center', 
     marginTop: 40
     },
  emptyText: { 
    fontSize: 16, 
    fontWeight: '600',
     color: '#344054', 
     marginTop: 12 
    },
  emptySubtext: { 
    fontSize: 14,
     color: '#98A2B3',
      marginTop: 4 
    },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingTop: Platform.OS === 'android' ? 80 : 60,
    paddingRight: 24,
    alignItems: 'flex-end',
  },
  dropdownContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: 220,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    elevation: 10,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 12,
  },
  dropdownAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#e6f4ef',
    justifyContent: 'center', alignItems: 'center',
  },
  dropdownAvatarText: {
    color: '#007a55',
    fontWeight: '700',
    fontSize: 13,
  },
  dropdownName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F2926',
  },
  dropdownEmail: {
    fontSize: 11,
    color: '#667085',
    marginTop: 2,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#EAECF0',
    marginVertical: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 10,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#344054',
  },
});