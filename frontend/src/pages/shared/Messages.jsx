import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Search, Send, Loader2, AlertCircle, MessageSquare, ArrowLeft, Phone, Lock, RefreshCw
} from 'lucide-react';
import { messagingService } from '../../services/messagingService';

const LIST_POLL_MS = 30000;
const THREAD_POLL_MS = 15000;
const MAX_LENGTH = 5000;

const parseDate = (value) => (value ? new Date(String(value).replace(' ', 'T')) : null);

const formatListTime = (value) => {
  const d = parseDate(value);
  if (!d || isNaN(d)) return '';
  const now = new Date();
  return d.toDateString() === now.toDateString()
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { day: 'numeric', month: 'short' });
};

const formatMessageTime = (value) => {
  const d = parseDate(value);
  return d && !isNaN(d) ? d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '';
};

const patientLabel = (c) => c?.patient_name || `Patient #${c?.patient_user_id ?? ''}`;

const initials = (name = '') => {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
};

const isClosed = (c) => String(c?.status || '').toUpperCase() === 'CLOSED';

// Shared between the pharmacy-admin dashboard and the staff dashboard.
const Messages = () => {
  const outlet = useOutletContext();
  const refreshBadges = outlet?.refreshBadges;

  const myUserId = useMemo(() => {
    try {
      return Number(JSON.parse(localStorage.getItem('user'))?.pharmacyUserId) || null;
    } catch {
      return null;
    }
  }, []);

  const [conversations, setConversations] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL | AWAITING

  const [activeId, setActiveId] = useState(null);
  const [thread, setThread] = useState({ conversation: null, messages: [] });
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState(null);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);

  const bottomRef = useRef(null);
  const lastMessageIdRef = useRef(null);

  const loadConversations = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setListLoading(true);
    try {
      const res = await messagingService.getConversations();
      setConversations(res.data?.conversations || []);
      setListError(null);
    } catch (err) {
      if (!silent) setListError(err.message || 'Failed to load conversations.');
    } finally {
      if (!silent) setListLoading(false);
    }
  }, []);

  const loadThread = useCallback(async (chatId, { silent = false } = {}) => {
    if (!silent) {
      setThreadLoading(true);
      setThreadError(null);
    }
    try {
      const res = await messagingService.getMessages(chatId);
      setThread({ conversation: res.data?.conversation || null, messages: res.data?.messages || [] });
      setThreadError(null);
    } catch (err) {
      if (!silent) setThreadError(err.message || 'Failed to load messages.');
    } finally {
      if (!silent) setThreadLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    const timer = setInterval(() => loadConversations({ silent: true }), LIST_POLL_MS);
    return () => clearInterval(timer);
  }, [loadConversations]);

  useEffect(() => {
    if (!activeId) return undefined;
    lastMessageIdRef.current = null;
    setThread({ conversation: null, messages: [] });
    loadThread(activeId);
    const timer = setInterval(() => loadThread(activeId, { silent: true }), THREAD_POLL_MS);
    return () => clearInterval(timer);
  }, [activeId, loadThread]);

  // Scroll to the newest message only when a new one arrives.
  useEffect(() => {
    const last = thread.messages[thread.messages.length - 1];
    if (last && last.message_id !== lastMessageIdRef.current) {
      lastMessageIdRef.current = last.message_id;
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [thread.messages]);

  const visibleConversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return conversations.filter((c) => {
      if (filter === 'AWAITING' && c.last_message_sender !== 'PATIENT') return false;
      if (!term) return true;
      return (
        patientLabel(c).toLowerCase().includes(term) ||
        String(c.patient_phone || '').toLowerCase().includes(term)
      );
    });
  }, [conversations, search, filter]);

  const awaitingCount = conversations.filter((c) => c.last_message_sender === 'PATIENT').length;
  const activeSummary = conversations.find((c) => c.chat_id === activeId) || null;
  const activeConversation = thread.conversation || activeSummary;
  const closed = isClosed(activeConversation);

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || sending || !activeId || closed) return;

    setSending(true);
    setSendError(null);
    try {
      const res = await messagingService.sendMessage(activeId, text);
      setDraft('');
      setThread((t) => ({ ...t, messages: [...t.messages, res.data] }));
      setConversations((list) =>
        list
          .map((c) =>
            c.chat_id === activeId
              ? { ...c, last_message: text, last_message_sender: 'PHARMACY', last_message_at: res.data?.created_at, updated_at: res.data?.created_at }
              : c,
          )
          .sort((a, b) => (parseDate(b.updated_at || b.created_at) || 0) - (parseDate(a.updated_at || a.created_at) || 0)),
      );
      refreshBadges?.();
    } catch (err) {
      setSendError(err.message || 'Message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const openConversation = (chatId) => {
    setActiveId(chatId);
    setDraft('');
    setSendError(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Patient Messages</h1>
          <p className="text-gray-500 dark:text-gray-400">Read and reply to messages patients send to your pharmacy.</p>
        </div>
        <button
          onClick={() => { loadConversations(); if (activeId) loadThread(activeId); }}
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
          title="Refresh" aria-label="Refresh"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex h-[calc(100vh-14rem)] min-h-[28rem]">
        {/* Conversation list */}
        <section className={`${activeId ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 shrink-0 flex-col border-r border-gray-200 dark:border-gray-800`}>
          <div className="p-3 space-y-2 border-b border-gray-200 dark:border-gray-800">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient name or phone..."
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-[#007a55] focus:outline-none dark:text-white"
              />
            </div>
            <div className="flex gap-2">
              {[
                { value: 'ALL', label: 'All' },
                { value: 'AWAITING', label: `Awaiting reply${awaitingCount ? ` (${awaitingCount})` : ''}` },
              ].map((f) => (
                <button
                  key={f.value} onClick={() => setFilter(f.value)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                    filter === f.value
                      ? 'bg-[#007a55] text-white border-[#007a55]'
                      : 'text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-grow overflow-y-auto">
            {listLoading ? (
              <div className="py-10 text-center"><Loader2 className="animate-spin inline text-[#007a55]" /></div>
            ) : listError ? (
              <div className="m-3 flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 text-sm">
                <AlertCircle size={16} className="shrink-0 mt-0.5" /> {listError}
              </div>
            ) : visibleConversations.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                {conversations.length === 0
                  ? 'No patient has messaged your pharmacy yet.'
                  : 'No conversations match your filters.'}
              </p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {visibleConversations.map((c) => {
                  const awaiting = c.last_message_sender === 'PATIENT';
                  const active = c.chat_id === activeId;
                  return (
                    <li key={c.chat_id}>
                      <button
                        onClick={() => openConversation(c.chat_id)}
                        className={`w-full text-left px-4 py-3 flex gap-3 transition-colors ${
                          active ? 'bg-[#e6f4ef] dark:bg-[#007a55]/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        <div className="w-10 h-10 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-bold flex items-center justify-center">
                          {initials(patientLabel(c))}
                        </div>
                        <div className="min-w-0 flex-grow">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`truncate text-sm ${awaiting ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-800 dark:text-gray-200'}`}>
                              {patientLabel(c)}
                            </p>
                            <span className="text-xs text-gray-400 shrink-0">{formatListTime(c.last_message_at || c.updated_at)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <p className={`truncate text-xs ${awaiting ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
                              {c.last_message
                                ? `${c.last_message_sender === 'PHARMACY' ? 'Pharmacy: ' : ''}${c.last_message}`
                                : 'No messages yet'}
                            </p>
                            {awaiting && <span className="w-2.5 h-2.5 shrink-0 rounded-full bg-[#007a55]" title="Awaiting reply" />}
                            {isClosed(c) && <Lock size={12} className="shrink-0 text-gray-400" />}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Thread */}
        <section className={`${activeId ? 'flex' : 'hidden md:flex'} flex-grow flex-col min-w-0`}>
          {!activeId ? (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-8 text-gray-500 dark:text-gray-400">
              <MessageSquare size={40} className="mb-3 text-gray-300 dark:text-gray-600" />
              <p className="font-medium">Select a conversation</p>
              <p className="text-sm">Choose a patient on the left to read and reply.</p>
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                <button onClick={() => setActiveId(null)} className="md:hidden p-1 -ml-1 text-gray-500" aria-label="Back to conversations">
                  <ArrowLeft size={20} />
                </button>
                <div className="w-9 h-9 shrink-0 rounded-full bg-[#e6f4ef] text-[#007a55] text-sm font-bold flex items-center justify-center">
                  {initials(patientLabel(activeConversation))}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{patientLabel(activeConversation)}</p>
                  {activeConversation?.patient_phone && (
                    <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={12} /> {activeConversation.patient_phone}</p>
                  )}
                </div>
                {closed && (
                  <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    <Lock size={12} /> Closed
                  </span>
                )}
              </header>

              <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-950">
                {threadLoading ? (
                  <div className="py-10 text-center"><Loader2 className="animate-spin inline text-[#007a55]" /></div>
                ) : threadError ? (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 text-sm">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" /> {threadError}
                  </div>
                ) : thread.messages.length === 0 ? (
                  <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">No messages in this conversation yet.</p>
                ) : (
                  thread.messages.map((m) => {
                    const fromPharmacy = m.sender_role === 'PHARMACY';
                    const mine = fromPharmacy && myUserId && Number(m.sender_user_id) === myUserId;
                    const author = !fromPharmacy
                      ? patientLabel(activeConversation)
                      : mine ? 'You' : (m.sender_name || 'Pharmacy');
                    return (
                      <div key={m.message_id} className={`flex ${fromPharmacy ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${
                          fromPharmacy
                            ? 'bg-[#007a55] text-white rounded-br-sm'
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-sm'
                        }`}>
                          <p className={`text-xs font-semibold mb-0.5 ${fromPharmacy ? 'text-green-100' : 'text-gray-500 dark:text-gray-400'}`}>{author}</p>
                          <p className="text-sm whitespace-pre-wrap break-words">{m.message}</p>
                          <p className={`text-[11px] mt-1 text-right ${fromPharmacy ? 'text-green-100' : 'text-gray-400'}`}>
                            {formatMessageTime(m.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={handleSend} className="border-t border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-900">
                {sendError && (
                  <p className="mb-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1"><AlertCircle size={12} /> {sendError}</p>
                )}
                {closed ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">This conversation is closed and can't receive new messages.</p>
                ) : (
                  <div className="flex items-end gap-2">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
                      onKeyDown={handleKeyDown}
                      rows={2}
                      placeholder="Write a reply… (Enter to send, Shift+Enter for a new line)"
                      className="flex-grow resize-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#007a55] focus:outline-none dark:text-white"
                    />
                    <button
                      type="submit" disabled={sending || !draft.trim()}
                      className="h-10 px-4 flex items-center gap-2 bg-[#007a55] text-white rounded-lg hover:bg-[#006645] text-sm font-semibold disabled:opacity-50"
                    >
                      {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send
                    </button>
                  </div>
                )}
                {!closed && draft.length > MAX_LENGTH - 500 && (
                  <p className="mt-1 text-right text-xs text-gray-400">{draft.length}/{MAX_LENGTH}</p>
                )}
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default Messages;
