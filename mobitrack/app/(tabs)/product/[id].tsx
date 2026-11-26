import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  CatalogueMedicine, PharmacyOffer, distanceKm, formatDistance, formatRwf, marketplaceService,
} from '@/src/api/marketplace/marketplaceService';
import ProductImage from '@/components/marketplace/ProductImage';
import { useLocation } from '@/hooks/useLocation';

export default function ProductDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const medicineId = Array.isArray(params.id) ? params.id[0] : params.id;
  // Opened from a prescription: start at, and never go above, what the prescription still allows.
  const rawMax = Number(Array.isArray(params.qty) ? params.qty[0] : params.qty);
  const rxMax = Number.isInteger(rawMax) && rawMax > 0 ? rawMax : null;
  const maxFor = (offer: PharmacyOffer) =>
    Math.max(1, Math.min(Number(offer.available_quantity) || 1, rxMax ?? Infinity));
  const startQty = (offer: PharmacyOffer) => (rxMax !== null ? maxFor(offer) : 1);
  const { location, hasPermission, isLoading: isLocating, requestlocation } = useLocation();

  const [medicine, setMedicine] = useState<CatalogueMedicine | null>(null);
  const [offers, setOffers] = useState<PharmacyOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [addingTo, setAddingTo] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!medicineId) return;
    try {
      const res = await marketplaceService.getMedicinePharmacies(medicineId);
      setMedicine(res.data?.medicine || null);
      setOffers(res.data?.pharmacies || []);
      setError(null);
    } catch (err: any) {
      setError(err?.message || t('product.loadError', 'Could not load this product.'));
    } finally {
      setIsLoading(false);
    }
  }, [medicineId, t]);

  useFocusEffect(useCallback(() => { setIsLoading(true); setQuantities({}); load(); }, [load]));

  const here = location ? { latitude: location.coords.latitude, longitude: location.coords.longitude } : null;

  // Nearest first when we know where the patient is; otherwise cheapest first (API order).
  const sortedOffers = useMemo(() => {
    const withDistance = offers.map((o) => ({ ...o, km: distanceKm(here, o) }));
    if (!here) return withDistance;
    return withDistance.sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity));
  }, [offers, here?.latitude, here?.longitude]);

  const changeQty = (offer: PharmacyOffer, delta: number) => {
    const current = quantities[offer.pharmacy_id] || startQty(offer);
    if (delta > 0 && current >= maxFor(offer)) {
      Alert.alert(
        t('product.maxTitle', 'Maximum reached'),
        rxMax !== null && rxMax <= Number(offer.available_quantity)
          ? t('product.maxRx', 'Your prescription allows {{count}}.', { count: rxMax })
          : t('product.maxStock', 'This pharmacy has {{count}} available to order.', { count: offer.available_quantity }),
      );
      return;
    }
    const next = Math.max(1, Math.min(maxFor(offer), current + delta));
    setQuantities((q) => ({ ...q, [offer.pharmacy_id]: next }));
  };

  const addToCart = async (offer: PharmacyOffer) => {
    if (!medicine) return;
    const quantity = quantities[offer.pharmacy_id] || startQty(offer);
    setAddingTo(offer.pharmacy_id);
    try {
      await marketplaceService.addToCart(offer.pharmacy_id, medicine.medicine_id, quantity);
      Alert.alert(
        t('marketplace.addedTitle', 'Added to cart'),
        `${medicine.medicine_name} × ${quantity}`,
        [
          { text: t('marketplace.keepShopping', 'Keep shopping'), style: 'cancel', onPress: () => router.back() },
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
            { text: t('marketplace.viewCart', 'View cart'), onPress: () => router.push('/cart') },
          ],
        );
      } else {
        Alert.alert(t('marketplace.addFailed', 'Could not add to cart'), message);
      }
    } finally {
      setAddingTo(null);
    }
  };

  const openPharmacyMap = (offer: PharmacyOffer) => {
    if (offer.latitude == null || offer.longitude == null) return;
    router.push({
      pathname: '/pharmacy/[id]',
      params: {
        id: String(offer.pharmacy_id),
        name: offer.pharmacy_name || '',
        address: offer.location_address || '',
        latitude: String(offer.latitude),
        longitude: String(offer.longitude),
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F2926" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{t('product.title', 'Product details')}</Text>
        <TouchableOpacity onPress={() => router.push('/cart')} style={styles.backButton}>
          <Ionicons name="cart-outline" size={24} color="#0F2926" />
        </TouchableOpacity>
      </View>

      {isLoading && !medicine ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#007a55" /></View>
      ) : error && !medicine ? (
        <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>
      ) : medicine ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          <ProductImage path={medicine.image_url} style={styles.hero} iconSize={72} />

          <View style={styles.info}>
            <Text style={styles.name}>
              {medicine.medicine_name}{medicine.strength && !medicine.medicine_name.includes(medicine.strength) ? ` ${medicine.strength}` : ''}
            </Text>
            <Text style={styles.meta}>
              {[medicine.generic_name, medicine.brand_name, medicine.dosage_form].filter(Boolean).join(' · ')}
            </Text>
            {medicine.requires_prescription && (
              <View style={styles.rxNote}>
                <Ionicons name="document-text-outline" size={16} color="#B42318" />
                <Text style={styles.rxNoteText}>
                  {t('product.rxNote', 'Prescription-only. You\'ll add your prescription number or a photo of it when you place the order.')}
                </Text>
              </View>
            )}
            {medicine.description ? <Text style={styles.description}>{medicine.description}</Text> : null}

            {medicine.category_name || (medicine.indications || []).length > 0 ? (
              <View style={styles.tags}>
                {medicine.category_name ? (
                  <View style={[styles.tag, styles.categoryTag]}>
                    <Ionicons name="pricetag-outline" size={12} color="#175CD3" />
                    <Text style={[styles.tagText, { color: '#175CD3' }]}>{medicine.category_name}</Text>
                  </View>
                ) : null}
                {(medicine.indications || []).map((it) => (
                  <View key={it} style={styles.tag}><Text style={styles.tagText}>{it}</Text></View>
                ))}
              </View>
            ) : null}

            {medicine.min_age_years != null || medicine.max_age_years != null ? (
              <View style={styles.ageNote}>
                <Ionicons name="people-outline" size={16} color="#B54708" />
                <Text style={styles.ageNoteText}>
                  {medicine.min_age_years != null && medicine.max_age_years != null
                    ? t('product.ageRange', 'For ages {{min}} to {{max}} only.', { min: medicine.min_age_years, max: medicine.max_age_years })
                    : medicine.min_age_years != null
                      ? t('product.ageMin', 'Not for children under {{min}}.', { min: medicine.min_age_years })
                      : t('product.ageMax', 'Only for ages up to {{max}}.', { max: medicine.max_age_years })}
                </Text>
              </View>
            ) : null}

            {medicine.dosage_notes ? (
              <View style={styles.dosageBox}>
                <Text style={styles.dosageTitle}>{t('product.howToTake', 'How to take it')}</Text>
                <Text style={styles.dosageText}>{medicine.dosage_notes}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {t('product.availableAt', 'Available at')} ({sortedOffers.length})
            </Text>
            {hasPermission === false ? (
              <TouchableOpacity onPress={requestlocation}>
                <Text style={styles.link}>{t('product.useLocation', 'Show distance')}</Text>
              </TouchableOpacity>
            ) : isLocating ? (
              <ActivityIndicator size="small" color="#007a55" />
            ) : here ? (
              <Text style={styles.sortHint}>{t('product.nearestFirst', 'Nearest first')}</Text>
            ) : null}
          </View>

          {sortedOffers.length === 0 ? (
            <Text style={styles.noOffers}>{t('marketplace.noStock', 'No pharmacy has this in stock right now.')}</Text>
          ) : (
            sortedOffers.map((offer) => {
              const qty = quantities[offer.pharmacy_id] || startQty(offer);
              const distance = formatDistance(offer.km);
              return (
                <View key={offer.pharmacy_id} style={styles.offerCard}>
                  <TouchableOpacity style={styles.offerTop} onPress={() => openPharmacyMap(offer)} activeOpacity={0.7}>
                    <View style={styles.pharmacyIcon}><Ionicons name="storefront-outline" size={20} color="#007a55" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.offerName} numberOfLines={1}>{offer.pharmacy_name || t('marketplace.pharmacy', 'Pharmacy')}</Text>
                      {offer.location_address ? <Text style={styles.meta} numberOfLines={1}>{offer.location_address}</Text> : null}
                    </View>
                    {distance && (
                      <View style={styles.distancePill}>
                        <Ionicons name="navigate-outline" size={12} color="#175CD3" />
                        <Text style={styles.distanceText}>{distance}</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={styles.offerBottom}>
                    <View>
                      <Text style={styles.price}>{formatRwf(offer.lowest_price)}</Text>
                      <Text style={styles.meta}>{offer.available_quantity} {t('marketplace.inStock', 'in stock')}</Text>
                      {rxMax !== null ? (
                        <Text style={styles.meta}>{t('product.rxAllows', 'Prescription: up to {{count}}', { count: rxMax })}</Text>
                      ) : null}
                    </View>
                    <View style={styles.actions}>
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
                </View>
              );
            })
          )}
        </ScrollView>
      ) : null}
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
  backButton: { padding: 4 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#0F2926' },
  errorText: { color: '#B42318', textAlign: 'center' },

  hero: { width: '100%', height: 240 },
  info: { padding: 20, backgroundColor: 'white', gap: 6, borderBottomWidth: 1, borderBottomColor: '#EAECF0' },
  name: { fontSize: 22, fontWeight: '800', color: '#0F2926' },
  meta: { fontSize: 13, color: '#667085' },
  description: { fontSize: 14, color: '#344054', lineHeight: 20, marginTop: 6 },
  rxNote: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 8, padding: 12, borderRadius: 12, backgroundColor: '#FEF3F2' },
  rxNoteText: { flex: 1, color: '#B42318', fontSize: 13 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F2926' },
  sortHint: { fontSize: 12, color: '#667085' },
  link: { fontSize: 13, color: '#007a55', fontWeight: '700' },
  noOffers: { padding: 24, textAlign: 'center', color: '#667085' },

  offerCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#EAECF0', padding: 14, gap: 12 },
  offerTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pharmacyIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#e6f4ef', alignItems: 'center', justifyContent: 'center' },
  offerName: { fontSize: 15, fontWeight: '700', color: '#0F2926' },
  distancePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFF8FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  distanceText: { color: '#175CD3', fontSize: 12, fontWeight: '700' },
  offerBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 17, fontWeight: '800', color: '#007a55' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F4F7', borderRadius: 10 },
  stepperBtn: { padding: 8 },
  stepperValue: { minWidth: 24, textAlign: 'center', fontWeight: '700', color: '#0F2926' },
  addButton: { backgroundColor: '#007a55', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10, minWidth: 64, alignItems: 'center' },
  addButtonText: { color: 'white', fontWeight: '700' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECFDF3', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  categoryTag: { backgroundColor: '#EFF8FF' },
  tagText: { color: '#027A48', fontSize: 12, fontWeight: '700' },
  ageNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFAEB', borderRadius: 10, padding: 10, marginTop: 12 },
  ageNoteText: { flex: 1, color: '#B54708', fontSize: 13, fontWeight: '600' },
  dosageBox: { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#EAECF0' },
  dosageTitle: { fontSize: 13, fontWeight: '800', color: '#0F2926', marginBottom: 4 },
  dosageText: { fontSize: 13, color: '#344054', lineHeight: 19 },
});
