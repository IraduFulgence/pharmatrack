import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView,
  Platform, FlatList, KeyboardAvoidingView, ActivityIndicator, Linking, Alert,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ChatConversation, ChatMessage, chatService, formatChatTime,
} from '@/src/api/chat/chatService';

const POLL_MS = 10000;
const MAX_LENGTH = 5000;

// A message the patient just sent that the server hasn't confirmed yet.
type PendingMessage = ChatMessage & { pending?: boolean; failed?: boolean };

const asString = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || '';

export default function ChatRoomScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const chatId = asString(params.id);

  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<PendingMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const lastCount = useRef(0);

  const pharmacyName = conversation?.pharmacy_name || asString(params.name) || t('chat.pharmacy', 'Pharmacy');
  const isClosed = String(conversation?.status || '').toUpperCase() === 'CLOSED';

  const load = useCallback(async () => {
    if (!chatId) return;
    try {
      const res = await chatService.getMessages(chatId);
      const serverMessages = Array.isArray(res.data) ? res.data : [];
      // Keep messages still being sent, or that failed so the patient can retry them.
      setMessages((prev) => [
        ...serverMessages,
        ...prev.filter((m) => (m.failed || m.pending) && !serverMessages.some((s) => s.message_id === m.message_id)),
      ]);
      if (res.conversation) setConversation(res.conversation);
      setError(null);
    } catch (err: any) {
      setError(err?.message || t('chat.loadMessagesError', 'Could not load this conversation.'));
    } finally {
      setIsLoading(false);
    }
  }, [chatId, t]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      setMessages([]);
      setConversation(null);
      lastCount.current = 0;
      load();
      const timer = setInterval(load, POLL_MS);
      return () => clearInterval(timer);
    }, [load]),
  );

  const send = async (text: string, retryOf?: PendingMessage) => {
    const clean = text.trim();
    if (!clean || isSending || isClosed) return;

    const temp: PendingMessage = retryOf
      ? { ...retryOf, failed: false, pending: true }
      : {
          message_id: -Date.now(),
          chat_id: Number(chatId),
          sender_user_id: 0,
          sender_role: 'PATIENT',
          message: clean,
          created_at: new Date().toISOString(),
          edited_at: null,
          pending: true,
        };

    setMessages((prev) =>
      retryOf ? prev.map((m) => (m.message_id === retryOf.message_id ? temp : m)) : [...prev, temp],
    );
    if (!retryOf) setInputText('');
    setIsSending(true);

    try {
      const res = await chatService.sendMessage(chatId, clean);
      setMessages((prev) => {
        const rest = prev.filter((m) => m.message_id !== temp.message_id);
        return rest.some((m) => m.message_id === res.data.message_id) ? rest : [...rest, res.data];
      });
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) => (m.message_id === temp.message_id ? { ...m, pending: false, failed: true } : m)),
      );
      Alert.alert(t('chat.sendFailedTitle', 'Message not sent'), err?.message || '');
    } finally {
      setIsSending(false);
    }
  };

  const callPharmacy = () => {
    if (conversation?.phone_number) Linking.openURL(`tel:${conversation.phone_number}`);
  };

  const renderMessage = ({ item }: { item: PendingMessage }) => {
    const isPatient = item.sender_role === 'PATIENT';
    return (
      <View style={[styles.messageRow, isPatient ? styles.messageRowRight : styles.messageRowLeft]}>
        {!isPatient && (
          <View style={styles.pharmacyAvatar}>
            <Feather name="briefcase" size={16} color="#007a55" />
          </View>
        )}
        <TouchableOpacity
          activeOpacity={item.failed ? 0.6 : 1}
          disabled={!item.failed}
          onPress={() => send(item.message, item)}
          style={[styles.bubble, isPatient ? styles.bubbleRight : styles.bubbleLeft, item.failed && styles.bubbleFailed]}
        >
          {!isPatient && item.sender_name ? (
            <Text style={styles.senderName}>{item.sender_name}</Text>
          ) : null}
          <Text style={[styles.messageText, isPatient ? styles.messageTextRight : styles.messageTextLeft]}>
            {item.message}
          </Text>
          <Text style={[styles.timeText, isPatient ? styles.timeTextRight : styles.timeTextLeft]}>
            {item.failed
              ? t('chat.tapToRetry', 'Not sent · tap to retry')
              : item.pending
                ? t('chat.sending', 'Sending…')
                : `${formatChatTime(item.created_at)}${item.edited_at ? ` · ${t('chat.edited', 'edited')}` : ''}`}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.navigate('/chat')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F2926" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.pharmacyName} numberOfLines={1}>{pharmacyName}</Text>
          {isClosed && <Text style={styles.closedStatus}>{t('chat.closed', 'Closed')}</Text>}
        </View>

        {conversation?.phone_number ? (
          <TouchableOpacity style={styles.callButton} onPress={callPharmacy}>
            <Ionicons name="call-outline" size={22} color="#0F2926" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#007a55" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => String(item.message_id)}
            renderItem={renderMessage}
            contentContainerStyle={[styles.messagesList, messages.length === 0 && { flexGrow: 1 }]}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              // Only jump to the bottom when something new arrived, not on every poll.
              if (messages.length !== lastCount.current) {
                lastCount.current = messages.length;
                flatListRef.current?.scrollToEnd({ animated: true });
              }
            }}
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
                  <Ionicons name="chatbubble-ellipses-outline" size={44} color="#D0D5DD" />
                  <Text style={styles.emptyText}>
                    {t('chat.startHint', 'Ask {{name}} about a medicine, price or availability.', { name: pharmacyName })}
                  </Text>
                </View>
              )
            }
          />
        )}

        {isClosed ? (
          <View style={styles.closedBar}>
            <Text style={styles.closedBarText}>
              {t('chat.closedNotice', 'This conversation has been closed by the pharmacy.')}
            </Text>
          </View>
        ) : (
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder={t('chat.placeholder', 'Type a message...')}
              placeholderTextColor="#98A2B3"
              value={inputText}
              onChangeText={setInputText}
              maxLength={MAX_LENGTH}
              multiline
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || isSending) && { opacity: 0.5 }]}
              onPress={() => send(inputText)}
              disabled={!inputText.trim() || isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="send" size={18} color="white" />
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9F9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: '#EAECF0',
    paddingTop: Platform.OS === 'android' ? 40 : 16,
  },
  backButton: { padding: 4 },
  headerInfo: { flex: 1, alignItems: 'center', marginHorizontal: 12 },
  pharmacyName: { fontSize: 16, fontWeight: '700', color: '#0F2926' },
  closedStatus: { fontSize: 12, color: '#667085', fontWeight: '500', marginTop: 2 },
  callButton: { padding: 8 },

  /* Messages List */
  messagesList: { paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 20 },

  messageRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  messageRowLeft: { justifyContent: 'flex-start' },
  messageRowRight: { justifyContent: 'flex-end' },

  pharmacyAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#e6f4ef',
    justifyContent: 'center', alignItems: 'center', marginRight: 8,
  },

  bubble: { maxWidth: '80%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  bubbleLeft: {
    backgroundColor: 'white', borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: '#EAECF0',
  },
  bubbleRight: { backgroundColor: '#007a55', borderBottomRightRadius: 4 },
  bubbleFailed: { backgroundColor: '#B42318' },

  senderName: { fontSize: 12, fontWeight: '700', color: '#007a55', marginBottom: 4 },
  messageText: { fontSize: 15, lineHeight: 20 },
  messageTextLeft: { color: '#0F2926' },
  messageTextRight: { color: 'white' },

  timeText: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  timeTextLeft: { color: '#98A2B3' },
  timeTextRight: { color: 'rgba(255,255,255,0.75)' },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 16, padding: 12, borderRadius: 12,
    backgroundColor: '#FEF3F2', borderWidth: 1, borderColor: '#FECDCA',
  },
  errorText: { color: '#B42318', fontSize: 14, flex: 1 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyText: { fontSize: 14, color: '#667085', marginTop: 12, textAlign: 'center' },

  /* Input Bar */
  inputBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#EAECF0', gap: 12,
  },
  input: {
    flex: 1, backgroundColor: '#F2F4F7', borderRadius: 20,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
    fontSize: 15, color: '#0F2926', maxHeight: 100,
  },
  sendButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#007a55',
    justifyContent: 'center', alignItems: 'center',
  },

  closedBar: {
    padding: 16, paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: '#F2F4F7', borderTopWidth: 1, borderTopColor: '#EAECF0',
  },
  closedBarText: { textAlign: 'center', color: '#667085', fontSize: 14 },
});
