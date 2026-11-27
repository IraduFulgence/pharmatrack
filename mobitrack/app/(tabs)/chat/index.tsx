import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  Platform, FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChatSummary, chatService, formatChatTime } from '@/src/api/chat/chatService';

const POLL_MS = 15000;

const initials = (name?: string) =>
  (name || 'P')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

export default function ChatListScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await chatService.getChats();
      setChats(Array.isArray(res.data) ? res.data : []);
      setError(null);
    } catch (err: any) {
      setError(err?.message || t('chat.loadError', 'Could not load your messages.'));
    } finally {
      hasLoaded.current = true;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [t]);

  // Refresh whenever the tab is shown, and keep polling while it stays open.
  useFocusEffect(
    useCallback(() => {
      if (!hasLoaded.current) setIsLoading(true);
      load();
      const timer = setInterval(load, POLL_MS);
      return () => clearInterval(timer);
    }, [load]),
  );

  const openChat = (item: ChatSummary) =>
    router.push({
      pathname: '/chat/[id]',
      params: { id: String(item.chat_id), name: item.pharmacy_name },
    });

  const renderChat = ({ item }: { item: ChatSummary }) => {
    const fromPharmacy = item.last_sender_role === 'PHARMACY';
    const preview = item.last_message
      ? `${item.last_sender_role === 'PATIENT' ? t('chat.youPrefix', 'You: ') : ''}${item.last_message}`
      : t('chat.noMessagesYet', 'No messages yet. Say hello!');

    return (
      <TouchableOpacity style={styles.chatRow} activeOpacity={0.7} onPress={() => openChat(item)}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(item.pharmacy_name)}</Text>
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.pharmacyName} numberOfLines={1}>{item.pharmacy_name}</Text>
            <Text style={styles.timeText}>{formatChatTime(item.last_message_at || item.updated_at)}</Text>
          </View>
          <View style={styles.chatFooter}>
            <Text
              style={[styles.lastMessage, fromPharmacy && styles.lastMessageNew]}
              numberOfLines={1}
            >
              {preview}
            </Text>
            {fromPharmacy && <View style={styles.newDot} />}
            {String(item.status || '').toUpperCase() === 'CLOSED' && (
              <Text style={styles.closedTag}>{t('chat.closed', 'Closed')}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007a55" />
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => String(item.chat_id)}
          renderItem={renderChat}
          contentContainerStyle={[styles.listContent, chats.length === 0 && { flexGrow: 1 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => { setIsRefreshing(true); load(); }}
              colors={['#007a55']}
              tintColor="#007a55"
            />
          }
          ListHeaderComponent={
            error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={18} color="#B42318" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            error ? null : (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={48} color="#D0D5DD" />
                <Text style={styles.emptyText}>{t('chat.emptyTitle', 'No messages yet')}</Text>
                <Text style={styles.emptySubtext}>
                  {t('chat.emptySubtitle', 'Open a pharmacy from Search and tap the chat button to ask a question.')}
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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: '#EAECF0',
    paddingTop: Platform.OS === 'android' ? 40 : 16,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F2926' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingVertical: 8 },

  chatRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: '#F2F4F7',
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    marginRight: 16, backgroundColor: '#e6f4ef',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#007a55', fontWeight: '800', fontSize: 18 },
  chatInfo: { flex: 1 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, gap: 8 },
  pharmacyName: { fontSize: 16, fontWeight: '700', color: '#0F2926', flex: 1 },
  timeText: { fontSize: 12, color: '#98A2B3' },
  chatFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { fontSize: 14, color: '#667085', flex: 1, marginRight: 8 },
  lastMessageNew: { color: '#0F2926', fontWeight: '600' },
  newDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#007a55' },
  closedTag: {
    fontSize: 11, color: '#667085', backgroundColor: '#F2F4F7',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginLeft: 6, overflow: 'hidden',
  },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, padding: 12, borderRadius: 12,
    backgroundColor: '#FEF3F2', borderWidth: 1, borderColor: '#FECDCA',
  },
  errorText: { color: '#B42318', fontSize: 14, flex: 1 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#0F2926', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#667085', marginTop: 8, textAlign: 'center' },
});
