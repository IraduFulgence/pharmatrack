import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  Platform, FlatList, ActivityIndicator
} from 'react-native';
import { Ionicons, FontAwesome5, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

const MOCK_ORDERS = [
  {
    id: 'ORD-8842',
    pharmacyName: 'Divine Pharmacy',
    date: '2026-11-15T10:30:00Z',
    status: 'READY', 
    total: 4500,
    items: [
      { name: 'Amoxicillin 500mg', qty: 2 },
      { name: 'Paracetamol 250mg', qty: 1 }
    ],
  },
  {
    id: 'ORD-8841',
    pharmacyName: 'Ineza Pharmacy',
    date: '2026-11-12T14:15:00Z',
    status: 'COMPLETED',
    total: 12000,
    items: [
      { name: 'Vitamin C 1000mg', qty: 1 },
    ],
  },
  {
    id: 'ORD-8840',
    pharmacyName: 'WellCare Pharmacy',
    date: '2026-11-10T09:00:00Z',
    status: 'PENDING',
    total: 3500,
    items: [
      { name: 'Ibuprofen 400mg', qty: 3 },
    ],
  }
];

export default function OrdersScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [orders] = useState(MOCK_ORDERS);
  const [isLoading, setIsLoading] = useState(false);
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PENDING': return { bg: '#FEF3C7', text: '#B45309', label: 'Pending' };
      case 'PROCESSING': return { bg: '#DBEAFE', text: '#1D4ED8', label: 'Processing' };
      case 'READY': return { bg: '#D1FAE5', text: '#047857', label: 'Ready for Pickup' };
      case 'COMPLETED': return { bg: '#F3F4F6', text: '#374151', label: 'Completed' };
      case 'CANCELLED': return { bg: '#FEE2E2', text: '#B91C1C', label: 'Cancelled' };
      default: return { bg: '#F3F4F6', text: '#374151', label: status };
    }
  };

  // Progress Bar Component
  const OrderProgress = ({ status }: { status: string }) => {
    const steps = ['PENDING', 'PROCESSING', 'READY', 'COMPLETED'];
    const currentIndex = steps.indexOf(status);
    if (status === 'CANCELLED') return null;

    return (
      <View style={styles.progressContainer}>
        {steps.map((step, index) => {
          const isCompleted = index <= currentIndex;
          const isActive = index === currentIndex;
          
          return (
            <React.Fragment key={step}>
              <View style={styles.progressStep}>
                <View style={[
                  styles.progressDot, 
                  isCompleted && styles.progressDotActive,
                  isActive && styles.progressDotCurrent
                ]}>
                  {isCompleted && <Ionicons name="checkmark" size={10} color="white" />}
                </View>
              </View>
              {index < steps.length - 1 && (
                <View style={[
                  styles.progressLine, 
                  isCompleted && index < currentIndex && styles.progressLineActive
                ]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    );
  };

  const renderOrder = ({ item }: { item: typeof MOCK_ORDERS[0] }) => {
    const statusStyle = getStatusStyle(item.status);
    const formattedDate = new Date(item.date).toLocaleDateString('en-GB', { 
      day: 'numeric', month: 'short', year: 'numeric' 
    });

    return (
      <TouchableOpacity style={styles.orderCard} activeOpacity={0.8} onPress={()=> router.push({
        pathname:`/(tabs)/orders/${item.id}`,
       
      })}>
        {/* Order Header */}
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>{item.id}</Text>
            <Text style={styles.orderDate}>{formattedDate}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
          </View>
        </View>

        {/* Pharmacy Info */}
        <View style={styles.pharmacyRow}>
          <View style={styles.pharmacyIcon}>
            <FontAwesome5 name="clinic-medical" size={14} color="#007a55" />
          </View>
          <Text style={styles.pharmacyName}>{item.pharmacyName}</Text>
        </View>

        {/* Visual Progress Tracker */}
        <OrderProgress status={item.status} />

        {/* Items Summary */}
        <View style={styles.itemsSummary}>
          <Text style={styles.itemsLabel}>
            {item.items.length} {item.items.length === 1 ? 'item' : 'items'} • {item.total.toLocaleString()} RWF
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F2926" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('orders.title', 'My Orders')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007a55" />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="package" size={48} color="#D0D5DD" />
              <Text style={styles.emptyText}>No orders yet</Text>
              <Text style={styles.emptySubtext}>Your order history will appear here.</Text>
              <TouchableOpacity 
                style={styles.shopButton}
                onPress={() => router.push('/')}
              >
                <Text style={styles.shopButtonText}>Start Shopping</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
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
  
  listContent: { padding: 20 },

  /* Order Card */
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EAECF0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderId: { fontSize: 16, fontWeight: '800', color: '#0F2926', marginBottom: 2 },
  orderDate: { fontSize: 12, color: '#667085' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

  /* Pharmacy Info */
  pharmacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F4F7',
  },
  pharmacyIcon: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#e6f4ef',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
  },
  pharmacyName: { fontSize: 14, fontWeight: '600', color: '#344054' },

  /* Progress Bar */
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  progressStep: {
    alignItems: 'center',
  },
  progressDot: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#EAECF0',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'white',
  },
  progressDotActive: {
    backgroundColor: '#007a55',
  },
  progressDotCurrent: {
    borderColor: '#D1FAE5',
    borderWidth: 3,
    shadowColor: '#007a55',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#EAECF0',
    marginHorizontal: 4,
  },
  progressLineActive: {
    backgroundColor: '#007a55',
  },

  /* Items Summary */
  itemsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9F9',
    padding: 12,
    borderRadius: 12,
  },
  itemsLabel: { fontSize: 13, fontWeight: '600', color: '#344054' },

  /* Empty State */
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#0F2926', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#667085', marginTop: 8, marginBottom: 24 },
  shopButton: {
    backgroundColor: '#007a55',
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
  },
  shopButtonText: { color: 'white', fontWeight: '700', fontSize: 14 },
  
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});