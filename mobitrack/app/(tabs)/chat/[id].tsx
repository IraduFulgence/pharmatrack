import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView,
  Platform, FlatList, KeyboardAvoidingView, Image
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

// Mock Messages
const INITIAL_MESSAGES = [
  { id: '1', text: 'Hello, do you have Amoxicillin 500mg in stock?', sender: 'patient', time: '10:28 AM' },
  { id: '2', text: 'Yes, we have 50 units available. Do you have a prescription?', sender: 'pharmacy', time: '10:29 AM' },
  { id: '3', text: 'Yes, I will upload it now.', sender: 'patient', time: '10:30 AM' },
];

export default function ChatRoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  
  const pharmacyName = params.name || 'Pharmacy';
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'patient',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages([...messages, newMessage]);
    setInputText('');
    
    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const renderMessage = ({ item }: { item: typeof INITIAL_MESSAGES[0] }) => {
    const isPatient = item.sender === 'patient';
    
    return (
      <View style={[styles.messageRow, isPatient ? styles.messageRowRight : styles.messageRowLeft]}>
        {!isPatient && (
          <View style={styles.pharmacyAvatar}>
            <Feather name="briefcase" size={16} color="#007a55" />
          </View>
        )}
        <View style={[styles.bubble, isPatient ? styles.bubbleRight : styles.bubbleLeft]}>
          <Text style={[styles.messageText, isPatient ? styles.messageTextRight : styles.messageTextLeft]}>
            {item.text}
          </Text>
          <Text style={[styles.timeText, isPatient ? styles.timeTextRight : styles.timeTextLeft]}>
            {item.time}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F2926" />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.pharmacyName}>{pharmacyName}</Text>
          <Text style={styles.onlineStatus}>● Online</Text>
        </View>
        
        <TouchableOpacity style={styles.callButton}>
          <Ionicons name="call-outline" size={22} color="#0F2926" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="add" size={24} color="#98A2B3" />
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#98A2B3"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          
          <TouchableOpacity 
            style={[styles.sendButton, !inputText.trim() && { opacity: 0.5 }]} 
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={18} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9F9' },
  
  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: '#EAECF0',
    paddingTop: Platform.OS === 'android' ? 40 : 16,
  },
  backButton: { padding: 4 },
  headerInfo: { flex: 1, alignItems: 'center' },
  pharmacyName: { fontSize: 16, fontWeight: '700', color: '#0F2926' },
  onlineStatus: { fontSize: 12, color: '#007a55', fontWeight: '500', marginTop: 2 },
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
  
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  bubbleLeft: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: '#EAECF0',
  },
  bubbleRight: {
    backgroundColor: '#007a55',
    borderBottomRightRadius: 4,
  },
  
  messageText: { fontSize: 15, lineHeight: 20 },
  messageTextLeft: { color: '#0F2926' },
  messageTextRight: { color: 'white' },
  
  timeText: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  timeTextLeft: { color: '#98A2B3' },
  timeTextRight: { color: 'rgba(255,255,255,0.7)' },

  /* Input Bar */
  inputBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: 'white',
    borderTopWidth: 1, borderTopColor: '#EAECF0',
    gap: 12,
  },
  attachButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F2F4F7',
    justifyContent: 'center', alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#F2F4F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10, paddingBottom: 10,
    fontSize: 15,
    color: '#0F2926',
    maxHeight: 100,
  },
  sendButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#007a55',
    justifyContent: 'center', alignItems: 'center',
  },
});