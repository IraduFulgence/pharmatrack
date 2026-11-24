import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, Platform,
  FlatList, ActivityIndicator, RefreshControl, useWindowDimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  CatalogueMedicine, formatRwf, marketplaceService,
} from '@/src/api/marketplace/marketplaceService';
import ProductImage from '@/components/marketplace/ProductImage';

const PAGE_SIZE = 40;
const GAP = 12;
const SIDE = 16;

export default function MarketplaceScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const cardWidth = (width - SIDE * 2 - GAP) / 2;

  const [query, setQuery] = useState('');
  const [medicines, setMedicines] = useState<CatalogueMedicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);

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

  const openProduct = (item: CatalogueMedicine) =>
    router.push({ pathname: '/product/[id]', params: { id: String(item.medicine_id) } });

  const renderCard = ({ item }: { item: CatalogueMedicine }) => {
    const count = Number(item.pharmacy_count || 0);
    return (
      <TouchableOpacity style={[styles.card, { width: cardWidth }]} activeOpacity={0.85} onPress={() => openProduct(item)}>
        <View>
          <ProductImage path={item.image_url} style={styles.cardImage} />
          {item.requires_prescription && (
            <View style={styles.rxBadge}><Text style={styles.rxText}>Rx</Text></View>
          )}
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={2}>
            {item.medicine_name}{item.strength && !item.medicine_name.includes(item.strength) ? ` ${item.strength}` : ''}
          </Text>
          {item.dosage_form ? <Text style={styles.cardMeta} numberOfLines={1}>{item.dosage_form}</Text> : null}
          <Text style={styles.cardPrice}>
            {t('marketplace.from', 'From')} {formatRwf(item.lowest_price)}
          </Text>
          <Text style={styles.cardMeta}>
            {count === 1 ? t('marketplace.onePharmacy', '1 pharmacy') : t('marketplace.nPharmacies', '{{count}} pharmacies', { count })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

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

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#007a55" /></View>
      ) : (
        <FlatList
          data={medicines}
          keyExtractor={(m) => String(m.medicine_id)}
          renderItem={renderCard}
          numColumns={2}
          columnWrapperStyle={{ gap: GAP, paddingHorizontal: SIDE }}
          contentContainerStyle={[{ gap: GAP, paddingTop: 4, paddingBottom: 24 }, medicines.length === 0 && { flexGrow: 1 }]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => { setIsRefreshing(true); loadMedicines(query); loadCartCount(); }}
              colors={['#007a55']}
              tintColor="#007a55"
            />
          }
          ListHeaderComponent={error ? <Text style={styles.errorText}>{error}</Text> : null}
          ListEmptyComponent={
            error ? null : (
              <View style={styles.center}>
                <MaterialCommunityIcons name="pill" size={44} color="#D0D5DD" />
                <Text style={styles.emptyText}>
                  {query
                    ? t('marketplace.noResults', 'No medicines found.')
                    : t('marketplace.nothingAvailable', 'No pharmacy has medicines available online yet.')}
                </Text>
              </View>
            )
          }
        />
      )}
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
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: SIDE, marginVertical: 12,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 6,
    backgroundColor: 'white', borderRadius: 14, borderWidth: 1, borderColor: '#EAECF0',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#0F2926' },

  card: {
    backgroundColor: 'white', borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#EAECF0',
  },
  cardImage: { width: '100%', aspectRatio: 1 },
  rxBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: '#FEF3F2', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  rxText: { color: '#B42318', fontSize: 11, fontWeight: '800' },
  cardBody: { padding: 10, gap: 2 },
  cardName: { fontSize: 14, fontWeight: '700', color: '#0F2926', minHeight: 36 },
  cardMeta: { fontSize: 12, color: '#667085' },
  cardPrice: { fontSize: 14, fontWeight: '800', color: '#007a55', marginTop: 4 },

  errorText: { color: '#B42318', marginHorizontal: SIDE, marginBottom: 8 },
  emptyText: { marginTop: 12, color: '#667085', textAlign: 'center' },
});
