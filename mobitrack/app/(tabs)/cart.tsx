import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, FlatList,
  ActivityIndicator, Alert, TextInput, ScrollView, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Cart, CartItem, MobileMoneyProvider, PaymentMethod, PickedImage, formatRwf, marketplaceService,
} from '@/src/api/marketplace/marketplaceService';
import ProductImage from '@/components/marketplace/ProductImage';

export default function CartScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyItem, setBusyItem] = useState<number | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH_ON_COLLECTION');
  const [provider, setProvider] = useState<MobileMoneyProvider>('MTN_MOMO');
  const [momoPhone, setMomoPhone] = useState('');
  const [isPlacing, setIsPlacing] = useState(false);

  // Prescription for prescription-only medicine: a number/SMS code, a photo, or both.
  const [rxReference, setRxReference] = useState('');
  const [rxImage, setRxImage] = useState<PickedImage | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await marketplaceService.getCart();
      setCart(res.data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || t('cart.loadError', 'Could not load your cart.'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { setIsLoading(true); load(); }, [load]));

  const changeQty = async (item: CartItem, next: number) => {
    if (next < 1) return removeItem(item);
    setBusyItem(item.item_id);
    try {
      await marketplaceService.updateCartItem(item.item_id, next);
      await load();
    } catch (err: any) {
      Alert.alert(t('cart.updateFailed', 'Could not change quantity'), err?.message || '');
    } finally {
      setBusyItem(null);
    }
  };

  const removeItem = async (item: CartItem) => {
    setBusyItem(item.item_id);
    try {
      await marketplaceService.removeCartItem(item.item_id);
      await load();
    } catch (err: any) {
      Alert.alert(t('cart.removeFailed', 'Could not remove item'), err?.message || '');
    } finally {
      setBusyItem(null);
    }
  };

  const pickPrescription = async (source: 'camera' | 'library') => {
    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert(
        t('cart.permissionTitle', 'Permission needed'),
        source === 'camera'
          ? t('cart.cameraPermission', 'Allow camera access to photograph your prescription.')
          : t('cart.libraryPermission', 'Allow photo access to choose your prescription.'),
      );
      return;
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    };
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      Alert.alert(t('cart.photoTooBig', 'Photo too large'), t('cart.photoTooBigBody', 'Choose a photo under 5 MB.'));
      return;
    }
    setRxImage({ uri: asset.uri, mimeType: asset.mimeType, fileName: asset.fileName });
  };

  const placeOrder = async () => {
    if (hasRx && !rxReference.trim() && !rxImage) {
      Alert.alert(
        t('cart.rxMissingTitle', 'Prescription needed'),
        t('cart.rxMissingBody', 'Add your prescription number (or SMS code), or a photo of the prescription, so the pharmacy can check it.'),
      );
      return;
    }
    if (paymentMethod === 'MOBILE_MONEY' && momoPhone.trim().length < 9) {
      Alert.alert(t('cart.momoPhoneTitle', 'Mobile Money number'), t('cart.momoPhoneBody', 'Enter the phone number to pay from.'));
      return;
    }
    setIsPlacing(true);
    try {
      const prescription = hasRx
        ? { prescriptionReference: rxReference.trim() || undefined, prescriptionImage: rxImage }
        : {};
      const res = await marketplaceService.placeOrder(
        paymentMethod === 'MOBILE_MONEY'
          ? { paymentMethod, mobileMoneyProvider: provider, paymentPhoneNumber: momoPhone.trim(), ...prescription }
          : { paymentMethod, ...prescription },
      );
      setRxReference('');
      setRxImage(null);
      const orderId = res.data?.order?.order_id;
      Alert.alert(
        t('cart.placedTitle', 'Order placed'),
        t('cart.placedBody', 'The pharmacy will confirm your order. We\'ll show it as ready for pickup when it is prepared.'),
      );
      if (orderId) router.replace({ pathname: '/orders/[id]', params: { id: String(orderId) } });
      else router.replace('/orders');
    } catch (err: any) {
      Alert.alert(t('cart.placeFailed', 'Could not place the order'), err?.message || '');
      load();
    } finally {
      setIsPlacing(false);
    }
  };

  const items = cart?.items || [];
  const hasRx = items.some((i) => i.requires_prescription);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F2926" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('cart.title', 'Your cart')}</Text>
        <View style={{ width: 32 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#007a55" /></View>
      ) : error ? (
        <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="cart-outline" size={48} color="#D0D5DD" />
          <Text style={styles.emptyTitle}>{t('cart.emptyTitle', 'Your cart is empty')}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.navigate('/marketplace')}>
            <Text style={styles.primaryButtonText}>{t('cart.browse', 'Browse medicines')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
          {cart?.cart?.pharmacy_address ? (
            <View style={styles.pharmacyCard}>
              <Ionicons name="storefront-outline" size={18} color="#007a55" />
              <View style={{ flex: 1 }}>
                <Text style={styles.pharmacyLabel}>{t('cart.pickupAt', 'Pick up at')}</Text>
                <Text style={styles.pharmacyAddress}>{cart.cart.pharmacy_address}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.card}>
            {items.map((item) => (
              <View key={item.item_id} style={styles.itemRow}>
                <ProductImage path={item.image_url} style={styles.thumb} iconSize={20} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>
                    {item.medicine_name}{item.strength ? ` ${item.strength}` : ''}
                    {item.requires_prescription ? <Text style={styles.rx}>  Rx</Text> : null}
                  </Text>
                  <Text style={styles.itemPrice}>{formatRwf(item.unit_price)} {t('cart.each', 'each')}</Text>
                </View>
                {busyItem === item.item_id ? (
                  <ActivityIndicator color="#007a55" />
                ) : (
                  <View style={styles.stepper}>
                    <TouchableOpacity onPress={() => changeQty(item, item.quantity - 1)} style={styles.stepperBtn}>
                      <Ionicons name={item.quantity === 1 ? 'trash-outline' : 'remove'} size={16} color="#0F2926" />
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{item.quantity}</Text>
                    <TouchableOpacity onPress={() => changeQty(item, item.quantity + 1)} style={styles.stepperBtn}>
                      <Ionicons name="add" size={16} color="#0F2926" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('cart.total', 'Total')}</Text>
              <Text style={styles.totalValue}>{formatRwf(cart?.total)}</Text>
            </View>
          </View>

          {hasRx && (
            <>
              <Text style={styles.sectionTitle}>{t('cart.prescription', 'Prescription')}</Text>
              <View style={styles.card}>
                <Text style={styles.rxIntro}>
                  {t('cart.rxIntro', 'Some medicines need a prescription. Add its number (or the SMS code) and/or a photo. The pharmacy checks it before preparing your order, and you show the original at pickup.')}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('cart.rxPlaceholder', 'Prescription number or SMS code')}
                  placeholderTextColor="#98A2B3"
                  autoCapitalize="characters"
                  value={rxReference}
                  onChangeText={setRxReference}
                  maxLength={100}
                />
                {rxImage ? (
                  <View style={styles.rxPreviewRow}>
                    <Image source={{ uri: rxImage.uri }} style={styles.rxPreview} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rxAttached}>{t('cart.photoAttached', 'Photo attached')}</Text>
                      <TouchableOpacity onPress={() => setRxImage(null)}>
                        <Text style={styles.rxRemove}>{t('cart.removePhoto', 'Remove')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.rxButtons}>
                    <TouchableOpacity style={styles.rxButton} onPress={() => pickPrescription('camera')}>
                      <Ionicons name="camera-outline" size={18} color="#007a55" />
                      <Text style={styles.rxButtonText}>{t('cart.takePhoto', 'Take photo')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rxButton} onPress={() => pickPrescription('library')}>
                      <Ionicons name="image-outline" size={18} color="#007a55" />
                      <Text style={styles.rxButtonText}>{t('cart.choosePhoto', 'Choose photo')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          )}

          <Text style={styles.sectionTitle}>{t('cart.payment', 'Payment')}</Text>
          <View style={styles.card}>
            {([
              ['CASH_ON_COLLECTION', t('cart.payAtPickup', 'Pay at pickup'), 'cash-outline'],
              ['MOBILE_MONEY', t('cart.mobileMoney', 'Mobile Money'), 'phone-portrait-outline'],
            ] as const).map(([value, label, icon]) => (
              <TouchableOpacity key={value} style={styles.optionRow} onPress={() => setPaymentMethod(value)}>
                <Ionicons name={icon} size={20} color="#0F2926" />
                <Text style={styles.optionLabel}>{label}</Text>
                <Ionicons name={paymentMethod === value ? 'radio-button-on' : 'radio-button-off'} size={20} color="#007a55" />
              </TouchableOpacity>
            ))}
            {paymentMethod === 'MOBILE_MONEY' && (
              <View style={{ paddingTop: 8, gap: 10 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {([['MTN_MOMO', 'MTN MoMo'], ['AIRTEL_MONEY', 'Airtel Money']] as const).map(([value, label]) => (
                    <TouchableOpacity
                      key={value}
                      onPress={() => setProvider(value)}
                      style={[styles.chip, provider === value && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, provider === value && styles.chipTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="07XXXXXXXX"
                  placeholderTextColor="#98A2B3"
                  keyboardType="phone-pad"
                  value={momoPhone}
                  onChangeText={setMomoPhone}
                />
                <Text style={styles.hint}>{t('cart.momoHint', 'The pharmacy confirms the payment when you pick up.')}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {items.length > 0 && !isLoading && (
        <View style={styles.footer}>
          <TouchableOpacity style={[styles.primaryButton, { flex: 1 }, isPlacing && { opacity: 0.6 }]} onPress={placeOrder} disabled={isPlacing}>
            {isPlacing
              ? <ActivityIndicator color="white" />
              : <Text style={styles.primaryButtonText}>{t('cart.placeOrder', 'Place order')} · {formatRwf(cart?.total)}</Text>}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9F9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: '#EAECF0',
    paddingTop: Platform.OS === 'android' ? 40 : 16,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F2926' },
  errorText: { color: '#B42318', textAlign: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#0F2926' },

  pharmacyCard: { flexDirection: 'row', gap: 10, alignItems: 'center', margin: 16, marginBottom: 0, padding: 14, backgroundColor: '#e6f4ef', borderRadius: 14 },
  pharmacyLabel: { fontSize: 12, color: '#667085' },
  pharmacyAddress: { fontSize: 14, fontWeight: '600', color: '#0F2926' },

  card: { margin: 16, marginBottom: 0, padding: 16, backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#EAECF0' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F2F4F7' },
  itemName: { fontSize: 15, fontWeight: '700', color: '#0F2926' },
  rx: { color: '#B42318', fontSize: 12, fontWeight: '800' },
  itemPrice: { fontSize: 12, color: '#667085', marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F4F7', borderRadius: 10 },
  stepperBtn: { padding: 8 },
  stepperValue: { minWidth: 24, textAlign: 'center', fontWeight: '700', color: '#0F2926' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#0F2926' },
  totalValue: { fontSize: 16, fontWeight: '800', color: '#007a55' },
  thumb: { width: 44, height: 44, borderRadius: 10 },
  rxIntro: { fontSize: 13, color: '#475467', marginBottom: 10, lineHeight: 18 },
  rxButtons: { flexDirection: 'row', gap: 10, marginTop: 10 },
  rxButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 12, backgroundColor: '#e6f4ef' },
  rxButtonText: { color: '#007a55', fontWeight: '700' },
  rxPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  rxPreview: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#F2F4F7' },
  rxAttached: { fontSize: 14, fontWeight: '600', color: '#0F2926' },
  rxRemove: { fontSize: 13, color: '#B42318', fontWeight: '600', marginTop: 4 },

  sectionTitle: { marginHorizontal: 16, marginTop: 20, fontSize: 14, fontWeight: '700', color: '#344054' },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  optionLabel: { flex: 1, fontSize: 15, color: '#0F2926' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#D0D5DD' },
  chipActive: { backgroundColor: '#007a55', borderColor: '#007a55' },
  chipText: { color: '#344054', fontWeight: '600' },
  chipTextActive: { color: 'white' },
  input: { backgroundColor: '#F2F4F7', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0F2926' },
  hint: { fontSize: 12, color: '#667085' },

  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row',
    padding: 16, paddingBottom: Platform.OS === 'ios' ? 28 : 16, backgroundColor: 'white',
    borderTopWidth: 1, borderTopColor: '#EAECF0',
  },
  primaryButton: { backgroundColor: '#007a55', borderRadius: 14, paddingVertical: 15, paddingHorizontal: 24, alignItems: 'center' },
  primaryButtonText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
