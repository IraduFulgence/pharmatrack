import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, FlatList,
  ActivityIndicator, Alert, TextInput, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Cart, CartItem, MobileMoneyProvider, PaymentMethod, formatRwf, marketplaceService,
} from '@/src/api/marketplace/marketplaceService';

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

  const placeOrder = async () => {
    if (paymentMethod === 'MOBILE_MONEY' && momoPhone.trim().length < 9) {
      Alert.alert(t('cart.momoPhoneTitle', 'Mobile Money number'), t('cart.momoPhoneBody', 'Enter the phone number to pay from.'));
      return;
    }
    setIsPlacing(true);
    try {
      const res = await marketplaceService.placeOrder(
        paymentMethod === 'MOBILE_MONEY'
          ? { paymentMethod, mobileMoneyProvider: provider, paymentPhoneNumber: momoPhone.trim() }
          : { paymentMethod },
      );
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
            <Text style={styles.rxNote}>
              {t('cart.rxNote', 'Your order has prescription-only medicine. Bring your prescription (or its SMS code) when you pick it up.')}
            </Text>
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
  rxNote: { marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: '#FEF3F2', color: '#B42318', fontSize: 13 },

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
