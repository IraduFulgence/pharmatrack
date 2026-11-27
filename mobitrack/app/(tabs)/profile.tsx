import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  Platform, ActivityIndicator, ScrollView, Alert, Image, Modal, Pressable
} from 'react-native';
import { Ionicons, FontAwesome5, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { AuthService } from '@/src/api/auth/authService';
import { actingSession } from '@/src/api/family/familyService';

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Set while a family manager is acting for this member.
  const [actingFor, setActingFor] = useState<{ patientId: number; fullName: string } | null>(null);
  
  // Wallet States
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const [response, acting] = await Promise.all([AuthService.getProfile(), actingSession.current()]);
      setProfile(response.data || response);
      setActingFor(acting);
    } catch (error: any) {
      console.error("Profile Fetch Error:", error);
      Alert.alert(t('common.error', 'Error'), t('profile.loadError', 'Could not load profile.'));
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
            await actingSession.clear();
            router.replace('/auth/login');
          } 
        }
      ]
    );
  };

  const switchBack = async () => {
    await actingSession.stop();
    router.replace('/(tabs)/home');
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

 

  const pickImage = async () => {
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need access to your photos to upload your insurance card.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true, 
    });

    if (!result.canceled && result.assets[0].uri) {
      uploadInsuranceCard(result.assets[0].uri);
    }
  };

  const uploadInsuranceCard = async (uri: string) => {
    try {
      setIsUploading(true);
      // const formData = new FormData();
      // formData.append('insuranceCard', { uri, name: 'card.jpg', type: 'image/jpeg' } as any);
      // const response = await AuthService.uploadInsuranceCard(formData);
      
      // Simulating API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      
      setProfile((prev: any) => ({
        ...prev,
        insuranceCardImageUrl: uri 
      }));
      
      Alert.alert('Success', 'Digital insurance card saved successfully.');
    } catch (error) {
      console.error('Upload Error:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
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

  // Determine if insurance details are filled
  const hasInsurance = !!(profile?.insuranceName || profile?.insuranceCardNumber);

  return (
    <SafeAreaView style={styles.container}>
      
      {/* Header */}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {actingFor && (
          <View style={styles.actingBanner}>
            <Ionicons name="swap-horizontal" size={18} color="#175CD3" />
            <Text style={styles.actingText}>
              {t('family.actingFor', 'You are acting for {{name}}.', { name: actingFor.fullName })}
            </Text>
            <TouchableOpacity onPress={switchBack}>
              <Text style={styles.actingLink}>{t('family.switchBack', 'Switch back')}</Text>
            </TouchableOpacity>
          </View>
        )}

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
        </View>

       
        <View style={styles.infoCard}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="wallet-outline" size={20} color="#007a55" />
              <Text style={[styles.cardTitle, { marginBottom: 0 }]}>
                {t('profile.healthWallet', 'Health Wallet')}
              </Text>
            </View>
            <FontAwesome5 name="shield-alt" size={18} color="#007a55" />
          </View>
          
          <View style={styles.insuranceBox}>
            <Text style={styles.insuranceName}>
              {profile?.insuranceName || `${t('profile.notRegistered', 'Not Registered')}`}
            </Text>
            
            {hasInsurance ? (
              <>
                <Text style={styles.insuranceDetail}>
                  {profile?.insuranceCardNumber
                    ? t('profile.cardNumber', { defaultValue: 'Card: {{number}}', number: profile.insuranceCardNumber })
                    : t('profile.noCardNumber', 'No card number')}
                </Text>
                {profile?.coveragePercentage && (
                  <View style={styles.coverageBadge}>
                    <Text style={styles.coverageText}>{profile.coveragePercentage}% Coverage</Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.insuranceDetail}>
                {t('profile.addInsurance', 'Add your insurance details to speed up checkout.')}
              </Text>
            )}
          </View>

          {/* Digital Card Image Viewer/Uploader */}
          <View style={styles.digitalCardSection}>
            {profile?.insuranceCardImageUrl ? (
              <View style={styles.digitalCardWrapper}>
                {/* <Text style={styles.digitalCardLabel}>Digital Card / National ID</Text> */}
                <TouchableOpacity 
                  activeOpacity={0.8}
                  onPress={() => setIsImageModalVisible(true)}
                >
                  <Image 
                    source={{ uri: profile.insuranceCardImageUrl }} 
                    style={styles.cardImage} 
                    resizeMode="cover"
                  />
                  <View style={styles.imageOverlay}>
                    <Feather name="maximize" size={20} color="white" />
                    <Text style={styles.overlayText}>{t('profile.view')}</Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.replaceButton} onPress={pickImage} disabled={isUploading}>
                  {isUploading ? <ActivityIndicator size="small" color="#007a55" /> : (
                    <Text style={styles.replaceButtonText}>{t('profile.replace')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.uploadCardButton} 
                onPress={pickImage}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#007a55" />
                ) : (
                  <>
                    <Feather name="camera" size={20} color="#007a55" />
                    <Text style={styles.uploadCardText}>{t('profile.upmessage')}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
          
          <Text style={styles.walletHelperText}>
            {t('profile.messInsurance')}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/(tabs)/family')}>
            <View style={styles.actionLeft}>
              <MaterialCommunityIcons name="account-group-outline" size={20} color="#344054" />
              <View>
                <Text style={styles.actionText}>{t('profile.myFamily', 'My family')}</Text>
                <Text style={styles.actionHint}>
                  {profile?.canManageFamily
                    ? t('profile.familyHintManager', 'Add members and order for them')
                    : t('profile.familyHint', 'Family members and invitations')}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#98A2B3" />
          </TouchableOpacity>

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

      {/* Full Screen Image Modal */}
      <Modal visible={isImageModalVisible} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.modalCloseButton} 
            onPress={() => setIsImageModalVisible(false)}
          >
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          <Image 
            source={{ uri: profile?.insuranceCardImageUrl }} 
            style={styles.fullScreenImage} 
            resizeMode="contain" 
          />
        </View>
      </Modal>

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
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatarCircle: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: '#e6f4ef',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    borderWidth: 2, borderColor: '#007a55',
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#007a55' },
  userName: { fontSize: 22, fontWeight: '800', color: '#0F2926', marginBottom: 4 },
  
  infoCard: {
    backgroundColor: 'white', borderRadius: 20, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: '#EAECF0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F2926', marginBottom: 20 },
  cardHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoIcon: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: '#F8F9F9',
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  infoTextContainer: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#667085', fontWeight: '500', marginBottom: 2 },
  infoValue: { fontSize: 15, color: '#0F2926', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#F2F4F7', marginVertical: 16 },

  /* --- Health Wallet Styles --- */
  insuranceBox: {
    backgroundColor: '#e6f4ef', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#D1E7DD', marginBottom: 16,
  },
  insuranceName: { fontSize: 16, fontWeight: '700', color: '#007a55', marginBottom: 4 },
  insuranceDetail: { fontSize: 13, color: '#475569' },
  coverageBadge: {
    marginTop: 8, backgroundColor: '#007a55', alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  coverageText: { color: 'white', fontSize: 12, fontWeight: '700' },

  digitalCardSection: { marginBottom: 16 },
  digitalCardWrapper: { position: 'relative' },
  digitalCardLabel: { fontSize: 13, fontWeight: '600', color: '#0F2926', marginBottom: 8 },
  cardImage: { 
    width: '100%', height: 160, borderRadius: 12, borderWidth: 1, borderColor: '#EAECF0',
    backgroundColor: '#F8F9F9' 
  },
  imageOverlay: {
    position: 'absolute', bottom: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  overlayText: { color: 'white', fontSize: 12, fontWeight: '600' },
  replaceButton: {
    alignSelf: 'center', marginTop: 10, padding: 8,
  },
  replaceButtonText: { color: '#007a55', fontWeight: '600', fontSize: 14 },
  
  uploadCardButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#F8F9F9', borderWidth: 2, borderColor: '#D1E7DD',
    borderStyle: 'dashed', borderRadius: 12, paddingVertical: 24,
  },
  uploadCardText: { color: '#007a55', fontWeight: '700', fontSize: 14 },
  walletHelperText: {
    fontSize: 12, color: '#667085', lineHeight: 18, textAlign: 'center', fontStyle: 'italic'
  },

  /* Actions */
  actionsContainer: {
    backgroundColor: 'white', borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: '#EAECF0',
  },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#F2F4F7',
  },
  actionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionText: { fontSize: 15, fontWeight: '600', color: '#344054' },

  /* Loading */
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#667085', fontWeight: '500' },

  /* Modal */
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center' },
  modalCloseButton: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 },
  fullScreenImage: { width: '100%', height: '80%' },
  actingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EFF8FF',
    borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#B2DDFF', marginBottom: 16,
  },
  actingText: { flex: 1, color: '#175CD3', fontSize: 13, fontWeight: '600' },
  actingLink: { color: '#175CD3', fontWeight: '800' },
  actionHint: { fontSize: 12, color: '#667085', marginTop: 2 },
});