import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, 
  Platform, FlatList, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

// Mock Chat List
const MOCK_CHATS = [
  {
    id: '1',
    pharmacyName: 'Divine Pharmacy',
    lastMessage: 'Your prescription is ready for pickup.',
    time: '10:30 AM',
    unread: 2,
    image: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?q=80&w=100&auto=format&fit=crop',
  },
  {
    id: '2',
    pharmacyName: 'Ineza Pharmacy',
    lastMessage: 'Do you need the generic or brand version?',
    time: 'Yesterday',
    unread: 0,
    image: 'https://images.unsplash.com/photo-1576671081837-49000212a370?q=80&w=100&auto=format&fit=crop',
  },
];

export default function ChatListScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const renderChat = ({ item }: { item: typeof MOCK_CHATS[0] }) => (
    <TouchableOpacity 
      style={styles.chatRow}
      activeOpacity={0.7}
      onPress={() => router.push(`/chat/${item.id}`)}
    >
      <Image source={{ uri: item.image }} style={styles.avatar} />
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.pharmacyName}>{item.pharmacyName}</Text>
          <Text style={styles.timeText}>{item.time}</Text>
        </View>
        <View style={styles.chatFooter}>
          <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F2926" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('chat.title', 'Messages')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={MOCK_CHATS}
        keyExtractor={(item) => item.id}
        renderItem={renderChat}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color="#D0D5DD" />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start a conversation with a pharmacy.</Text>
          </View>
        }
      />
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
  
  listContent: { paddingVertical: 8 },
  
  chatRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: '#F2F4F7',
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    marginRight: 16, backgroundColor: '#EAECF0',
  },
  chatInfo: { flex: 1 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  pharmacyName: { fontSize: 16, fontWeight: '700', color: '#0F2926' },
  timeText: { fontSize: 12, color: '#98A2B3' },
  chatFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { fontSize: 14, color: '#667085', flex: 1, marginRight: 8 },
  unreadBadge: {
    backgroundColor: '#007a55', width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  unreadText: { color: 'white', fontSize: 11, fontWeight: '700' },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#0F2926', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#667085', marginTop: 8 },
});