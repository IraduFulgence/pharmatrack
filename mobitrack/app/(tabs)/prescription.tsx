import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, ScrollView,
  TextInput, ActivityIndicator, Keyboard,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  PrescriptionLookup, formatRwf, marketplaceService, prescriptionDraftStore,
} from '@/src/api/marketplace/marketplaceService';
import ProductImage from '@/components/marketplace/ProductImage';

// Patient enters a prescription number (or SMS code) and sees the medicines on it.
// Tapping one opens its product page at the prescribed quantity; the number is
// remembered so the cart fills it in at checkout.
export default function PrescriptionLookupScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ reference?: string }>();

  const [reference, setReference] = useState(
    (Array.isArray(params.reference) ? params.reference[0] : params.reference) || prescriptionDraftStore.get() || '',
  );
  const [result, setResult] = useState<PrescriptionLookup | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookUp = async () => {
    const value = reference.trim();
    if (!value) return;
    Keyboard.dismiss();
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await marketplaceService.lookupPrescription(value);
      setResult(res.data);
      if (res.data.prescription.usable) prescriptionDraftStore.set(res.data.prescription.prescription_reference);
    } catch (err: any) {
      setError(err?.message || t('rxLookup.error', 'Could not find this prescription.'));
    } finally {
      setIsLoading(false);
    }
  };

  const openMedicine = (medicineId: number, quantity: number) =>
    router.push({ pathname: '/product/[id]', params: { id: String(medicineId), qty: String(quantity) } });

  const rx = result?.prescription;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F2926" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('rxLookup.title', 'My prescription')}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>{t('rxLookup.label', 'Prescription number or SMS code')}</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={reference}
            onChangeText={setReference}
            placeholder={t('rxLookup.placeholder', 'e.g. RX-2026-00123')}
            placeholderTextColor="#98A2B3"
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={lookUp}
            maxLength={100}
          />
          <TouchableOpacity
            style={[styles.findButton, (!reference.trim() || isLoading) && { opacity: 0.5 }]}
            onPress={lookUp}
            disabled={!reference.trim() || isLoading}
          >
            {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.findText}>{t('rxLookup.find', 'Find')}</Text>}
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>
          {t('rxLookup.hint', 'Only prescriptions issued to you can be found. No number? Add your medicines from the shop and attach a photo of the prescription at checkout.')}
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color="#B42318" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {rx ? (
          <>
            <View style={styles.rxCard}>
              <MaterialCommunityIcons name="file-document-outline" size={26} color="#007a55" />
              <View style={{ flex: 1 }}>
                <Text style={styles.rxRef}>{rx.prescription_reference}</Text>
                <Text style={styles.rxMeta}>{t('rxLookup.issued', 'Issued {{date}}', { date: rx.issued_date })}</Text>
              </View>
              <View style={[styles.statusPill, !rx.usable && styles.statusPillBad]}>
                <Text style={[styles.statusText, !rx.usable && styles.statusTextBad]}>
                  {rx.usable ? t('rxLookup.valid', 'Valid') : rx.status}
                </Text>
              </View>
            </View>

            {rx.problem ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={18} color="#B42318" />
                <Text style={styles.errorText}>{rx.problem}</Text>
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>{t('rxLookup.medicines', 'Prescribed medicines')}</Text>
            {result!.items.length === 0 ? (
              <Text style={styles.hint}>
                {t('rxLookup.noItems', 'This prescription does not list its medicines. Search for them in the shop; the number will be filled in at checkout.')}
              </Text>
            ) : (
              result!.items.map((item) => {
                const canOrder = rx.usable && item.in_stock;
                return (
                  <TouchableOpacity
                    key={item.medicine_id}
                    style={[styles.itemCard, !canOrder && { opacity: 0.6 }]}
                    onPress={() => openMedicine(item.medicine_id, item.quantity)}
                    disabled={!canOrder}
                    activeOpacity={0.85}
                  >
                    <ProductImage path={item.image_url} style={styles.thumb} iconSize={22} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.itemName}>
                        {item.medicine_name}{item.strength && !item.medicine_name.includes(item.strength) ? ` ${item.strength}` : ''}
                      </Text>
                      <Text style={styles.itemMeta}>
                        {t('rxLookup.qty', 'Quantity: {{count}}', { count: item.quantity })}
                      </Text>
                      {item.dosage_instructions ? <Text style={styles.itemMeta}>{item.dosage_instructions}</Text> : null}
                      {item.in_stock ? (
                        <Text style={styles.itemPrice}>
                          {t('marketplace.from', 'From')} {formatRwf(item.lowest_price)} · {item.pharmacy_count === 1
                            ? t('marketplace.onePharmacy', '1 pharmacy')
                            : t('marketplace.nPharmacies', '{{count}} pharmacies', { count: item.pharmacy_count })}
                        </Text>
                      ) : (
                        <Text style={styles.unavailable}>{t('rxLookup.notOnline', 'Not available online right now')}</Text>
                      )}
                    </View>
                    {canOrder ? <Ionicons name="chevron-forward" size={20} color="#98A2B3" /> : null}
                  </TouchableOpacity>
                );
              })
            )}

            {rx.usable ? (
              <Text style={styles.hint}>
                {t('rxLookup.checkoutHint', 'Tap a medicine to choose a pharmacy. Your prescription number will be filled in at checkout, and you can still attach a photo.')}
              </Text>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9F9' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 16, backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: '#EAECF0',
    paddingTop: Platform.OS === 'android' ? 40 : 16,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F2926' },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '700', color: '#344054' },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#D0D5DD',
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 8, fontSize: 15, color: '#0F2926',
  },
  findButton: {
    backgroundColor: '#007a55', borderRadius: 12, paddingHorizontal: 20,
    alignItems: 'center', justifyContent: 'center', minWidth: 76,
  },
  findText: { color: 'white', fontWeight: '800', fontSize: 15 },
  hint: { fontSize: 12, color: '#667085', lineHeight: 18 },
  errorBox: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#FEF3F2',
    borderRadius: 12, padding: 12,
  },
  errorText: { flex: 1, color: '#B42318', fontSize: 13 },
  rxCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'white',
    borderRadius: 14, borderWidth: 1, borderColor: '#EAECF0', padding: 14,
  },
  rxRef: { fontSize: 16, fontWeight: '800', color: '#0F2926' },
  rxMeta: { fontSize: 12, color: '#667085', marginTop: 2 },
  statusPill: { backgroundColor: '#ECFDF3', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillBad: { backgroundColor: '#FEF3F2' },
  statusText: { color: '#027A48', fontWeight: '800', fontSize: 12 },
  statusTextBad: { color: '#B42318' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0F2926', marginTop: 4 },
  itemCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'white',
    borderRadius: 14, borderWidth: 1, borderColor: '#EAECF0', padding: 12,
  },
  thumb: { width: 56, height: 56, borderRadius: 10 },
  itemName: { fontSize: 15, fontWeight: '700', color: '#0F2926' },
  itemMeta: { fontSize: 12, color: '#667085' },
  itemPrice: { fontSize: 13, fontWeight: '700', color: '#007a55', marginTop: 2 },
  unavailable: { fontSize: 12, fontWeight: '700', color: '#B54708', marginTop: 2 },
});
