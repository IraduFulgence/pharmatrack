import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, Platform,
  Modal, FlatList, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  CatalogueMedicine, PharmacyOffer, formatRwf, marketplaceService,
} from '@/src/api/marketplace/marketplaceService';

const PAGE_SIZE = 30;

export default function MarketplaceScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [query, setQuery] = useState('');
  const [medicines, setMedicines] = useState<CatalogueMedicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);

  // Pharmacy picker for one medicine
  const [selected, setSelected] = useState<CatalogueMedicine | null>(null);
  const [offers, setOffers] = useState<PharmacyOffer[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [addingTo, setAddingTo] = useState<number | null>(null);

  const loadMedicines = useCallback(async (q: string) => {
    try {
      const res = await marketplaceService.getMedicines(q, PAGE_SIZE, 0);
      setMedicines(Array.isArray(res.data) ? res.data : []);
      setError(null);
    } catch (err: any) {
      setError(err?.message || t('marketplace.loadError', 'Could not load medicines.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [t]);

  const loadCartCount = useCallback(async () => {
    try {
      const res = await marketplaceService.getCart();
      setCartCount((res.data?.items || []).reduce((sum, i) => sum + Number(i.quantity), 0));
    } catch {
      // badge only
    }
  }, []);

  // Search as the patient types (debounced).
  useEffect(() => {
    const timer = setTimeout(() => loadMedicines(query), 350);
    return () => clearTimeout(timer);
  }, [query, loadMedicines]);

  useFocusEffect(useCallback(() => { loadCartCount(); }, [loadCartCount]));

  const openMedicine = async (medicine: CatalogueMedicine) => {
    setSelected(medicine);
    setOffers([]);
    setQuantities({});
    setIsLoadingOffers(true);
    try {
      const res = await marketplaceService.getMedicinePharmacies(medicine.medicine_id);
      setOffers(res.data?.pharmacies || []);
    } catch (err: any) {
      Alert.alert(t('marketplace.errorTitle', 'Something went wrong'), err?.message || '');
    } finally {
      setIsLoadingOffers(false);
    }
  };

  const changeQty = (offer: PharmacyOffer, delta: number) => {
    setQuantities((q) => {
      const current = q[offer.pharmacy_id] || 1;
      const next = Math.max(1, Math.min(Number(offer.available_quantity), current + delta));
      return { ...q, [offer.pharmacy_id]: next };
    });
  };

  const addToCart = async (offer: PharmacyOffer) => {
    if (!selected) return;
    const quantity = quantities[offer.pharmacy_id] || 1;
    setAddingTo(offer.pharmacy_id);
    try {
      await marketplaceService.addToCart(offer.pharmacy_id, selected.medicine_id, quantity);
      await loadCartCount();
      setSelected(null);
      Alert.alert(
        t('marketplace.addedTitle', 'Added to cart'),
        `${selected.medicine_name} × ${quantity}`,
        [
          { text: t('marketplace.keepShopping', 'Keep shopping'), style: 'cancel' },
          { text: t('marketplace.viewCart', 'View cart'), onPress: () => router.push('/cart') },
        ],
      );
    } catch (err: any) {
      const message = err?.message || '';
      if (/another pharmacy/i.test(message)) {
        Alert.alert(
          t('marketplace.otherPharmacyTitle', 'One pharmacy per order'),
          t('marketplace.otherPharmacyBody', 'Your cart has medicines from another pharmacy. Order those first, or empty your cart to switch pharmacy.'),
          [
            { text: t('common.cancel', 'Cancel'), style: 'cancel' },
            { text: t('marketplace.viewCart', 'View cart'), onPress: () => { setSelected(null); router.push('/cart'); } },
          ],
        );
      } else {
        Alert.alert(t('marketplace.addFailed', 'Could not add to cart'), message);
      }
    } finally {
      setAddingTo(null);
    }
  };

  const renderMedicine = ({ item }: { item: CatalogueMedicine }) => (
    <TouchableOpacity style={styles.medicineRow} activeOpacity={0.7} onPress={() => openMedicine(item)}>
      <View style={styles.medicineIcon}>
        <MaterialCommunityIcons name="pill" size={22} color="#007a55" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.medicineName} numberOfLines={1}>
          {item.medicine_name}{item.strength ? ` ${item.strength}` : ''}
        </Text>
        <Text style={styles.medicineMeta} numberOfLines={1}>
          {[item.generic_name, item.dosage_form].filter(Boolean).join(' · ') || ' '}
        </Text>
      </View>
      {item.requires_prescription && (
        <View style={styles.rxBadge}><Text style={styles.rxText}>Rx</Text></View>
      )}
      <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('marketplace.title', 'Order medicines')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push('/orders')} style={styles.iconButton}>
            <Ionicons name="receipt-outline" size={22} color="#0F2926" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/cart')} style={styles.iconButton}>
            <Ionicons name="cart-outline" size={24} color="#0F2926" />
            {cartCount > 0 && (
              <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cartCount}</Text></View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#98A2B3" />
        <TextInput
          style={styles.searchInput}
          placeholder={t('marketplace.search', 'Search medicines')}
          placeholderTextColor="#98A2B3"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}><Ionicons name="close-circle" size={18} color="#98A2B3" /></TouchableOpacity>
        )}
      </View>

      <Text style={styles.pickupNote}>
        {t('marketplace.pickupNote', 'Order from one pharmacy and pick up when it is ready. Prescription (Rx) medicines need your prescription at pickup.')}
      </Text>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#007a55" /></View>
      ) : (
        <FlatList
          data={medicines}
          keyExtractor={(m) => String(m.medicine_id)}
          renderItem={renderMedicine}
          contentContainerStyle={[{ paddingBottom: 24 }, medicines.length === 0 && { flexGrow: 1 }]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); loadMedicines(query); loadCartCount(); }} colors={['#007a55']} tintColor="#007a55" />
          }
          ListHeaderComponent={error ? <Text style={styles.errorText}>{error}</Text> : null}
          ListEmptyComponent={
            error ? null : (
              <View style={styles.center}>
                <MaterialCommunityIcons name="pill" size={44} color="#D0D5DD" />
                <Text style={styles.emptyText}>{t('marketplace.noResults', 'No medicines found.')}</Text>
              </View>
            )
          }
        />
      )}

      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle} numberOfLines={2}>
                  {selected?.medicine_name}{selected?.strength ? ` ${selected.strength}` : ''}
                </Text>
                {selected?.requires_prescription && (
                  <Text style={styles.sheetRx}>{t('marketplace.rxNote', 'Prescription needed at pickup')}</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setSelected(null)}><Ionicons name="close" size={24} color="#667085" /></TouchableOpacity>
            </View>

            {isLoadingOffers ? (
              <View style={{ padding: 32 }}><ActivityIndicator color="#007a55" /></View>
            ) : offers.length === 0 ? (
              <Text style={styles.noOffers}>{t('marketplace.noStock', 'No pharmacy has this in stock right now.')}</Text>
            ) : (
              <FlatList
                data={offers}
                keyExtractor={(o) => String(o.pharmacy_id)}
                style={{ maxHeight: 420 }}
                renderItem={({ item: offer }) => {
                  const qty = quantities[offer.pharmacy_id] || 1;
                  return (
                    <View style={styles.offerRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.offerName} numberOfLines={1}>{offer.pharmacy_name || t('marketplace.pharmacy', 'Pharmacy')}</Text>
                        {offer.location_address ? <Text style={styles.offerMeta} numberOfLines={1}>{offer.location_address}</Text> : null}
                        <Text style={styles.offerPrice}>
                          {formatRwf(offer.lowest_price)} <Text style={styles.offerMeta}>· {offer.available_quantity} {t('marketplace.inStock', 'in stock')}</Text>
                        </Text>
                      </View>
                      <View style={styles.offerActions}>
                        <View style={styles.stepper}>
                          <TouchableOpacity onPress={() => changeQty(offer, -1)} style={styles.stepperBtn}><Ionicons name="remove" size={16} color="#0F2926" /></TouchableOpacity>
                          <Text style={styles.stepperValue}>{qty}</Text>
                          <TouchableOpacity onPress={() => changeQty(offer, 1)} style={styles.stepperBtn}><Ionicons name="add" size={16} color="#0F2926" /></TouchableOpacity>
                        </View>
                        <TouchableOpacity
                          style={[styles.addButton, addingTo === offer.pharmacy_id && { opacity: 0.6 }]}
                          onPress={() => addToCart(offer)}
                          disabled={addingTo !== null}
                        >
                          {addingTo === offer.pharmacy_id
                            ? <ActivityIndicator size="small" color="white" />
                            : <Text style={styles.addButtonText}>{t('marketplace.add', 'Add')}</Text>}
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9F9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: '#EAECF0',
    paddingTop: Platform.OS === 'android' ? 40 : 16,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0F2926' },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconButton: { padding: 6 },
  cartBadge: {
    position: 'absolute', top: 0, right: 0, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#007a55', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  cartBadgeText: { color: 'white', fontSize: 10, fontWeight: '800' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, margin: 16, marginBottom: 8,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 6,
    backgroundColor: 'white', borderRadius: 14, borderWidth: 1, borderColor: '#EAECF0',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#0F2926' },
  pickupNote: { marginHorizontal: 16, marginBottom: 8, fontSize: 12, color: '#667085' },

  medicineRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16,
    backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F2F4F7',
  },
  medicineIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#e6f4ef', alignItems: 'center', justifyContent: 'center' },
  medicineName: { fontSize: 15, fontWeight: '700', color: '#0F2926' },
  medicineMeta: { fontSize: 12, color: '#667085', marginTop: 2 },
  rxBadge: { backgroundColor: '#FEF3F2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  rxText: { color: '#B42318', fontSize: 11, fontWeight: '800' },
  errorText: { color: '#B42318', margin: 16 },
  emptyText: { marginTop: 12, color: '#667085' },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 20, borderBottomWidth: 1, borderBottomColor: '#F2F4F7' },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#0F2926' },
  sheetRx: { marginTop: 4, fontSize: 12, color: '#B42318', fontWeight: '600' },
  noOffers: { padding: 24, textAlign: 'center', color: '#667085' },
  offerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F2F4F7' },
  offerName: { fontSize: 15, fontWeight: '700', color: '#0F2926' },
  offerMeta: { fontSize: 12, color: '#667085', fontWeight: '400' },
  offerPrice: { fontSize: 14, fontWeight: '700', color: '#007a55', marginTop: 4 },
  offerActions: { alignItems: 'flex-end', gap: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F4F7', borderRadius: 10 },
  stepperBtn: { padding: 6 },
  stepperValue: { minWidth: 24, textAlign: 'center', fontWeight: '700', color: '#0F2926' },
  addButton: { backgroundColor: '#007a55', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 10, minWidth: 64, alignItems: 'center' },
  addButtonText: { color: 'white', fontWeight: '700' },
});
