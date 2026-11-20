import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  Platform, ScrollView, Image, ActivityIndicator
} from 'react-native';
import { Ionicons, FontAwesome5, Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';


const MOCK_ORDER = {
  id: 'ORD-8842',
  pharmacy: {
    name: 'Divine Pharmacy',
    address: 'KG 11 Ave, Remera, Kigali',
    phone: '+250 788 123 456',
  },
  date: '2026-11-15T10:30:00Z',
  status: 'READY', 
  paymentMethod: 'MOBILE_MONEY',
  paymentStatus: 'PAID',
  items: [
    { id: '1', name: 'Amoxicillin 500mg', qty: 2, price: 2500 },
    { id: '2', name: 'Paracetamol 250mg', qty: 1, price: 7500 },
  ],
  subtotal: 12500,
  deliveryFee: 1000,
  total: 13500,
};

export default function OrderDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  
  
  const [order] = useState(MOCK_ORDER);
  const [isLoading] = useState(false);

  // Formatting Helpers
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PENDING': return { bg: '#FEF3C7', text: '#B45309', label: 'Pending Approval' };
      case 'PROCESSING': return { bg: '#DBEAFE', text: '#1D4ED8', label: 'Preparing your order' };
      case 'READY': return { bg: '#D1FAE5', text: '#047857', label: 'Ready for Pickup' };
      case 'COMPLETED': return { bg: '#F3F4F6', text: '#374151', label: 'Completed' };
      case 'CANCELLED': return { bg: '#FEE2E2', text: '#B91C1C', label: 'Cancelled' };
      default: return { bg: '#F3F4F6', text: '#374151', label: status };
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007a55" />
        </View>
      </SafeAreaView>
    );
  }

  const statusStyle = getStatusStyle(order.status);

  return (
    <SafeAreaView style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/orders')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F2926" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order {order.id}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Status Card */}
        <View style={[styles.statusCard, { backgroundColor: statusStyle.bg }]}>
          <View style={styles.statusIconContainer}>
            {order.status === 'READY' ? (
              <Feather name="check-circle" size={32} color={statusStyle.text} />
            ) : (
              <Feather name="clock" size={32} color={statusStyle.text} />
            )}
          </View>
          <Text style={[styles.statusTitle, { color: statusStyle.text }]}>{statusStyle.label}</Text>
          <Text style={styles.statusDate}>Order placed on {formatDate(order.date)}</Text>
        </View>

        {/* Pharmacy Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pharmacy Information</Text>
          <View style={styles.pharmacyRow}>
            <View style={styles.pharmacyIcon}>
              <FontAwesome5 name="clinic-medical" size={20} color="#007a55" />
            </View>
            <View style={styles.pharmacyInfo}>
              <Text style={styles.pharmacyName}>{order.pharmacy.name}</Text>
              <Text style={styles.pharmacyAddress}>{order.pharmacy.address}</Text>
            </View>
          </View>
          
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={styles.contactButton}
              onPress={() => router.push(`/chat/${order.id}`)} 
            >
              <Feather name="message-square" size={16} color="#007a55" />
              <Text style={styles.contactButtonText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactButton}>
              <Feather name="phone" size={16} color="#007a55" />
              <Text style={styles.contactButtonText}>Call</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Items</Text>
          {order.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemQty}>Qty: {item.qty}</Text>
              </View>
              <Text style={styles.itemPrice}>{(item.price * item.qty).toLocaleString()} RWF</Text>
            </View>
          ))}
        </View>

        {/* Payment Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{order.subtotal.toLocaleString()} RWF</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>{order.deliveryFee.toLocaleString()} RWF</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{order.total.toLocaleString()} RWF</Text>
          </View>

          <View style={styles.paymentMethodRow}>
            <Feather name="credit-card" size={16} color="#667085" />
            <Text style={styles.paymentMethodText}>
              Paid with {order.paymentMethod === 'MOBILE_MONEY' ? 'Mobile Money' : 'Cash'}
            </Text>
            <View style={styles.paidBadge}>
              <Text style={styles.paidBadgeText}>{order.paymentStatus}</Text>
            </View>
          </View>
        </View>

      </ScrollView>
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
  scrollContent: { padding: 20, paddingBottom: 40 },

  /* Status Card */
  statusCard: {
    borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 20,
  },
  statusIconContainer: { marginBottom: 12 },
  statusTitle: { fontSize: 22, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  statusDate: { fontSize: 13, color: '#344054', opacity: 0.8 },

  /* Cards */
  card: {
    backgroundColor: 'white', borderRadius: 20, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: '#EAECF0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F2926', marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#F2F4F7', marginVertical: 16 },

  /* Pharmacy Info */
  pharmacyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  pharmacyIcon: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#e6f4ef',
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  pharmacyInfo: { flex: 1 },
  pharmacyName: { fontSize: 16, fontWeight: '700', color: '#0F2926', marginBottom: 2 },
  pharmacyAddress: { fontSize: 13, color: '#667085' },
  
  actionRow: { flexDirection: 'row', gap: 12 },
  contactButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#e6f4ef', paddingVertical: 12, borderRadius: 12, gap: 8,
  },
  contactButtonText: { color: '#007a55', fontSize: 14, fontWeight: '600' },

  /* Items */
  itemRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F2F4F7',
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#0F2926', marginBottom: 4 },
  itemQty: { fontSize: 13, color: '#667085' },
  itemPrice: { fontSize: 15, fontWeight: '700', color: '#344054' },

  /* Summary */
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel: { fontSize: 14, color: '#667085' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#344054' },
  
  totalLabel: { fontSize: 18, fontWeight: '800', color: '#0F2926' },
  totalValue: { fontSize: 20, fontWeight: '800', color: '#007a55' },

  paymentMethodRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 16,
    paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F2F4F7',
  },
  paymentMethodText: { fontSize: 13, color: '#667085', marginLeft: 8, flex: 1 },
  paidBadge: {
    backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  paidBadgeText: { fontSize: 11, fontWeight: '700', color: '#047857' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});