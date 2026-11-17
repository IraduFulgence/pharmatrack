import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  Platform, ActivityIndicator, ScrollView, Alert
} from 'react-native';
import { Ionicons, FontAwesome5, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import { AuthService } from '@/src/api/auth/authService';

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await AuthService.getProfile();
      setProfile(response.data || response);
    } catch (error: any) {
      console.error("Profile Fetch Error:", error);
      Alert.alert("Error", "Could not load profile.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      `${t('profile.pSignout')}`,
      `${t('profile.pSignoutMessage')}`,
      [
        { text: `${t('profile.textCancel')}`, style: "cancel" },
        { 
          text: `${t('profile.textSignout')}`, 
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

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007a55" />
          <Text style={styles.loadingText}>{t('profile.textLoading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F2926" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.title', 'My Profile')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getInitials(profile?.fullName)}</Text>
          </View>
          <Text style={styles.userName}>{profile?.fullName || 'Patient Name'}</Text>
          
        </View>

        {/* Personal Information Card */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>{t('profile.personalInfo', 'Personal Information')}</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="person-outline" size={20} color="#007a55" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>{t('profile.fullName', 'Full Name')}</Text>
              <Text style={styles.infoValue}>{profile?.fullName || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="call-outline" size={20} color="#007a55" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>{t('profile.phone', 'Phone Number')}</Text>
              <Text style={styles.infoValue}>{profile?.phoneNumber || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="mail-outline" size={20} color="#007a55" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>{t('profile.email', 'Email Address')}</Text>
              <Text style={styles.infoValue}>{profile?.email || 'Not provided'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="calendar-outline" size={20} color="#007a55" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>{t('profile.dob', 'Date of Birth')}</Text>
              <Text style={styles.infoValue}>{profile?.dateOfBirth || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="male-female-outline" size={20} color="#007a55" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>{t('profile.gender', 'Gender')}</Text>
              <Text style={styles.infoValue}>{profile?.gender || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Health Insurance Card */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>{t('profile.insurance', 'Health Insurance')}</Text>
            <FontAwesome5 name="shield-alt" size={18} color="#007a55" />
          </View>
          
          <View style={styles.insuranceBox}>
            <Text style={styles.insuranceName}>{profile?.insuranceName || `${t('profile.notRegistered')}`}</Text>
            <Text style={styles.insuranceDetail}>
              {profile?.insuranceCardNumber ? `Card: ${profile.insuranceCardNumber}` : `${t('profile.addInsurance')}`}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/(tabs)/orders')}>
            <View style={styles.actionLeft}>
              <Ionicons name="receipt-outline" size={20} color="#344054" />
              <Text style={styles.actionText}>{t('profile.myOrders', 'My Orders')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#98A2B3" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow}>
            <View style={styles.actionLeft}>
              <Ionicons name="settings-outline" size={20} color="#344054" />
              <Text style={styles.actionText}>{t('profile.settings', 'Settings')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#98A2B3" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow} onPress={handleLogout}>
            <View style={styles.actionLeft}>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text style={[styles.actionText, { color: '#EF4444' }]}>{t('profile.textSignout', 'Sign Out')}</Text>
            </View>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
     backgroundColor: '#F8F9F9' 
    },
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
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#0F2926' 
},
  
  scrollContent: { 
    paddingHorizontal: 20, 
    paddingTop: 24, 
    paddingBottom: 40
 },

  
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarCircle: {
    width: 90, 
    height: 90, 
    borderRadius: 45,
    backgroundColor: '#e6f4ef',
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2, 
    borderColor: '#007a55',
  },
  avatarText: {
    fontSize: 32, 
    fontWeight: '800', 
    color: '#007a55',
  },
  userName: {
    fontSize: 22, 
    fontWeight: '800', 
    color: '#0F2926', 
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#667085',
    fontWeight: '500',
  },

  
  infoCard: {
     backgroundColor: 'white',
     borderRadius: 20, 
     padding: 20, 
     marginBottom: 20,
     borderWidth: 1,
     borderColor: '#EAECF0',
     shadowColor: '#000', 
     shadowOffset: { width: 0, height: 2 }, 
     shadowOpacity: 0.03, 
     elevation: 2,
  },
  cardTitle: {
    fontSize: 16, 
    fontWeight: '700', 
    color: '#0F2926',
    marginBottom: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', 
    marginBottom: 20,
  },
  
 
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    width: 40, 
    height: 40, 
    borderRadius: 10, 
    backgroundColor: '#F8F9F9',
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 16,
  },
  infoTextContainer: { 
    flex: 1 
},
  infoLabel: { 
    fontSize: 12, 
    color: '#667085', 
    fontWeight: '500', 
    marginBottom: 2
 },
  infoValue: { 
    fontSize: 15, 
    color: '#0F2926', 
    fontWeight: '600' 
},
  divider: { 
    height: 1, 
    backgroundColor: '#F2F4F7', 
    marginVertical: 16 
},

  
  insuranceBox: {
    backgroundColor: '#e6f4ef', 
    borderRadius: 12, 
    padding: 16,
    borderWidth: 1,
     borderColor: '#D1E7DD',
  },
  insuranceName: {
    fontSize: 16, 
    fontWeight: '700',
     color: '#007a55', 
     marginBottom: 4,
  },
  insuranceDetail: {
    fontSize: 13,
     color: '#475569',
  },

  /* Actions */
  actionsContainer: {
    backgroundColor: 'white', 
    borderRadius: 20, 
    overflow: 'hidden',
    borderWidth: 1,
     borderColor: '#EAECF0',
  },
  actionRow: {
    flexDirection: 'row',
     alignItems: 'center', 
     justifyContent: 'space-between',
    paddingVertical: 16, 
    paddingHorizontal: 20,
    borderBottomWidth: 1, 
    borderBottomColor: '#F2F4F7',
  },
  actionLeft: {
    flexDirection: 'row',
     alignItems: 'center',
      gap: 12,
  },
  actionText: {
    fontSize: 15, 
    fontWeight: '600',
     color: '#344054',
  },

  /* Loading */
  center: { 
    flex: 1,
     justifyContent: 'center', 
     alignItems: 'center' 
    },
  loadingText: { 
    marginTop: 12,
     color: '#667085',
      fontWeight: '500' 
    },
});