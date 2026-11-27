import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, ScrollView, TextInput,
  ActivityIndicator, Alert, Modal, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  DependentInput, FamilyData, FamilyMember, MemberRelationship, RELATIONSHIP_LABEL,
  actingSession, familyService,
} from '@/src/api/family/familyService';

const RELATIONSHIPS: MemberRelationship[] = ['SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER'];
const GENDERS: DependentInput['gender'][] = ['Male', 'Female', 'Other'];
const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const initials = (name: string) =>
  (name || '?').split(' ').filter(Boolean).map((n) => n[0]).join('').substring(0, 2).toUpperCase();

type MemberForm = {
  fullName: string; dateOfBirth: string; gender: DependentInput['gender'];
  relationship: MemberRelationship; phoneNumber: string; nationalId: string;
};
const EMPTY_FORM: MemberForm = {
  fullName: '', dateOfBirth: '', gender: 'Male', relationship: 'CHILD', phoneNumber: '', nationalId: '',
};

function Chips<T extends string>({ options, value, onChange, label }: {
  options: T[]; value: T; onChange: (v: T) => void; label: (v: T) => string;
}) {
  return (
    <View style={styles.chips}>
      {options.map((o) => (
        <TouchableOpacity key={o} style={[styles.chip, value === o && styles.chipOn]} onPress={() => onChange(o)}>
          <Text style={[styles.chipText, value === o && styles.chipTextOn]}>{label(o)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function FamilyScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const rel = (r: string) => t(`family.rel_${r}`, RELATIONSHIP_LABEL[r as keyof typeof RELATIONSHIP_LABEL] || r);

  const [data, setData] = useState<FamilyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // key of the action in progress
  const [actingFor, setActingFor] = useState<{ patientId: number; fullName: string } | null>(null);

  const [familyName, setFamilyName] = useState('');

  // Add / edit dependent
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FamilyMember | null>(null);
  const [form, setForm] = useState<MemberForm>(EMPTY_FORM);
  const [showDate, setShowDate] = useState(false);
  const [saving, setSaving] = useState(false);

  // Invite
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteId, setInviteId] = useState('');
  const [inviteRel, setInviteRel] = useState<MemberRelationship>('SPOUSE');

  const load = useCallback(async () => {
    try {
      const [res, acting] = await Promise.all([familyService.getFamily(), actingSession.current()]);
      setData(res.data);
      setActingFor(acting);
      setError(null);
    } catch (err: any) {
      setError(err?.message || t('family.loadError', 'Could not load your family.'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { setIsLoading(true); load(); }, [load]));

  const run = async (key: string, fn: () => Promise<any>, success?: string) => {
    setBusy(key);
    try {
      const res = await fn();
      if (success || res?.message) Alert.alert(success || res.message);
      await load();
    } catch (err: any) {
      Alert.alert(t('family.failed', 'Something went wrong'), err?.message || '');
    } finally {
      setBusy(null);
    }
  };

  // ----- Actions -----

  const createFamily = () => run('create', () => familyService.createFamily(familyName.trim() || undefined));

  const respond = (invitationId: number, accept: boolean, familyLabel: string) => {
    if (!accept) return run(`inv-${invitationId}`, () => familyService.respondToInvitation(invitationId, false));
    Alert.alert(
      t('family.joinTitle', 'Join {{name}}?', { name: familyLabel }),
      t('family.joinBody', "The family's head and spouse will have full access to your account: they can order medicines, see your prescriptions and act for you."),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        { text: t('family.join', 'Join'), onPress: () => run(`inv-${invitationId}`, () => familyService.respondToInvitation(invitationId, true)) },
      ],
    );
  };

  const actAs = (m: FamilyMember) =>
    Alert.alert(
      t('family.actTitle', 'Act for {{name}}?', { name: m.fullName }),
      t('family.actBody', 'Orders, prescriptions and messages will be for {{name}} until you switch back from your profile.', { name: m.fullName }),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('family.actConfirm', 'Switch'),
          onPress: async () => {
            setBusy(`act-${m.patientId}`);
            try {
              await actingSession.start(m);
              router.replace('/(tabs)/home');
            } catch (err: any) {
              Alert.alert(t('family.failed', 'Something went wrong'), err?.message || '');
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );

  const switchBack = async () => {
    await actingSession.stop();
    router.replace('/(tabs)/home');
  };

  const remove = (m: FamilyMember, isSelf: boolean) =>
    Alert.alert(
      isSelf ? t('family.leaveTitle', 'Leave this family?') : t('family.removeTitle', 'Remove {{name}}?', { name: m.fullName }),
      isSelf
        ? t('family.leaveBody', 'Its managers will no longer have access to your account.')
        : m.isManagedProfile
          ? t('family.removeManagedBody', "{{name}}'s pharmacy records are kept, but nobody in the family will manage them any more.", { name: m.fullName })
          : t('family.removeBody', '{{name}} keeps their own account.', { name: m.fullName }),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: isSelf ? t('family.leave', 'Leave') : t('family.remove', 'Remove'),
          style: 'destructive',
          onPress: () => run(`rm-${m.patientId}`, () => familyService.removeMember(m.patientId)),
        },
      ],
    );

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setFormOpen(true); };
  const openEdit = (m: FamilyMember) => {
    setEditing(m);
    setForm({
      fullName: m.fullName, dateOfBirth: m.dateOfBirth || '', gender: (m.gender as any) || 'Male',
      relationship: (m.relationship === 'HEAD' ? 'OTHER' : m.relationship) as MemberRelationship,
      phoneNumber: m.phoneNumber || '', nationalId: m.nationalId || '',
    });
    setFormOpen(true);
  };

  const saveMember = async () => {
    if (form.fullName.trim().length < 3) return Alert.alert(t('family.nameNeeded', 'Enter their full name (at least 3 characters).'));
    if (!form.dateOfBirth) return Alert.alert(t('family.dobNeeded', 'Choose their date of birth.'));
    if (form.phoneNumber.trim() && !/^\+[1-9]\d{1,14}$/.test(form.phoneNumber.trim())) {
      return Alert.alert(t('family.phoneFormat', 'Phone must be in international format, e.g. +250788123456.'));
    }
    if (form.nationalId.trim() && !/^\d{16}$/.test(form.nationalId.trim())) {
      return Alert.alert(t('family.nidFormat', 'National ID must be 16 digits.'));
    }
    const payload: DependentInput = {
      fullName: form.fullName.trim(),
      dateOfBirth: form.dateOfBirth,
      gender: form.gender,
      relationship: form.relationship,
      ...(form.phoneNumber.trim() ? { phoneNumber: form.phoneNumber.trim() } : {}),
      ...(form.nationalId.trim() ? { nationalId: form.nationalId.trim() } : {}),
    };
    setSaving(true);
    try {
      const res = editing
        ? await familyService.updateMember(editing.patientId, payload)
        : await familyService.addDependent(payload);
      setFormOpen(false);
      Alert.alert(res?.message || t('family.saved', 'Saved.'));
      await load();
    } catch (err: any) {
      Alert.alert(t('family.failed', 'Something went wrong'), err?.message || '');
    } finally {
      setSaving(false);
    }
  };

  const sendInvite = async () => {
    if (!inviteId.trim()) return Alert.alert(t('family.inviteNeeded', 'Enter their phone number or email.'));
    setSaving(true);
    try {
      const res = await familyService.invite(inviteId.trim(), inviteRel);
      setInviteOpen(false);
      setInviteId('');
      Alert.alert(res?.message || t('family.invited', 'Invitation sent.'));
      await load();
    } catch (err: any) {
      Alert.alert(t('family.failed', 'Something went wrong'), err?.message || '');
    } finally {
      setSaving(false);
    }
  };

  // ----- Render -----

  const me = data?.me;
  const canManage = !!me?.canManage && !actingFor;

  const renderMember = (m: FamilyMember) => {
    const isSelf = m.patientId === me?.patientId;
    return (
      <View key={m.patientId} style={styles.memberCard}>
        <View style={styles.memberTop}>
          <View style={[styles.avatar, m.isManagedProfile && styles.avatarManaged]}>
            <Text style={styles.avatarText}>{initials(m.fullName)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.memberName}>
              {m.fullName}{isSelf ? ` (${t('family.you', 'you')})` : ''}
            </Text>
            <Text style={styles.memberMeta}>
              {rel(m.relationship)}{m.age !== null ? ` · ${t('family.age', '{{count}} yrs', { count: m.age })}` : ''}
            </Text>
            <View style={styles.badges}>
              {m.canManage && <Text style={[styles.badge, styles.badgeManager]}>{t('family.manager', 'Manager')}</Text>}
              <Text style={styles.badge}>
                {m.isManagedProfile ? t('family.managedProfile', 'Managed profile') : t('family.ownAccount', 'Own account')}
              </Text>
            </View>
          </View>
        </View>

        {canManage && !isSelf && (
          <View style={styles.memberActions}>
            <TouchableOpacity style={styles.actPrimary} onPress={() => actAs(m)} disabled={busy !== null}>
              {busy === `act-${m.patientId}`
                ? <ActivityIndicator size="small" color="white" />
                : <><Ionicons name="swap-horizontal" size={16} color="white" /><Text style={styles.actPrimaryText}>{t('family.actAs', 'Act for')}</Text></>}
            </TouchableOpacity>
            {m.isManagedProfile && (
              <TouchableOpacity style={styles.actSecondary} onPress={() => openEdit(m)}>
                <Ionicons name="create-outline" size={16} color="#007a55" />
                <Text style={styles.actSecondaryText}>{t('family.edit', 'Edit')}</Text>
              </TouchableOpacity>
            )}
            {m.patientId !== data?.family?.createdBy && (
              <TouchableOpacity style={styles.actDanger} onPress={() => remove(m, false)} disabled={busy !== null}>
                {busy === `rm-${m.patientId}`
                  ? <ActivityIndicator size="small" color="#B42318" />
                  : <Ionicons name="trash-outline" size={16} color="#B42318" />}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F2926" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('family.title', 'My family')}</Text>
        <View style={{ width: 32 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#007a55" /></View>
      ) : error ? (
        <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {actingFor && (
            <View style={styles.actingBanner}>
              <Ionicons name="swap-horizontal" size={18} color="#175CD3" />
              <Text style={styles.actingText}>{t('family.actingFor', 'You are acting for {{name}}.', { name: actingFor.fullName })}</Text>
              <TouchableOpacity onPress={switchBack}><Text style={styles.actingLink}>{t('family.switchBack', 'Switch back')}</Text></TouchableOpacity>
            </View>
          )}

          {(data?.receivedInvitations || []).map((inv) => (
            <View key={inv.invitationId} style={styles.inviteCard}>
              <MaterialCommunityIcons name="account-group-outline" size={22} color="#6941C6" />
              <View style={{ flex: 1 }}>
                <Text style={styles.inviteTitle}>
                  {t('family.invitedTo', '{{who}} invited you to {{family}}', { who: inv.invitedByName || 'Someone', family: inv.familyName || t('family.theirFamily', 'their family') })}
                </Text>
                <Text style={styles.memberMeta}>{t('family.asRel', 'As: {{rel}}', { rel: rel(inv.relationship) })}</Text>
                <View style={styles.inviteActions}>
                  <TouchableOpacity style={styles.actPrimary} onPress={() => respond(inv.invitationId, true, inv.familyName || '')} disabled={busy !== null}>
                    <Text style={styles.actPrimaryText}>{t('family.accept', 'Accept')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actSecondary} onPress={() => respond(inv.invitationId, false, '')} disabled={busy !== null}>
                    <Text style={styles.actSecondaryText}>{t('family.decline', 'Decline')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}

          {!data?.family ? (
            <View style={styles.card}>
              <MaterialCommunityIcons name="family-tree" size={36} color="#007a55" />
              {data?.canCreate ? (
                <>
                  <Text style={styles.cardTitle}>{t('family.createTitle', 'Set up your family')}</Text>
                  <Text style={styles.cardText}>
                    {t('family.createBody', 'Add your children and dependents, invite your spouse, and order medicines for any of them.')}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t('family.namePlaceholder', 'Family name (optional)')}
                    placeholderTextColor="#98A2B3"
                    value={familyName}
                    onChangeText={setFamilyName}
                    maxLength={100}
                  />
                  <TouchableOpacity style={styles.primaryButton} onPress={createFamily} disabled={busy !== null}>
                    {busy === 'create' ? <ActivityIndicator color="white" /> : <Text style={styles.primaryButtonText}>{t('family.create', 'Create family')}</Text>}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.cardTitle}>{t('family.notHeadTitle', 'Join your family')}</Text>
                  <Text style={styles.cardText}>
                    {t('family.notHeadBody', 'Only a family head or spouse can set up a family. Ask them to invite you with your phone number or email; the invitation will appear here.')}
                  </Text>
                </>
              )}
            </View>
          ) : (
            <>
              <View style={styles.familyHeader}>
                <Text style={styles.familyName}>{data.family.familyName || t('family.title', 'My family')}</Text>
                <Text style={styles.memberMeta}>
                  {t('family.memberCount', '{{count}} members', { count: data.members?.length || 0 })}
                </Text>
              </View>

              {(data.members || []).map(renderMember)}

              {canManage && (
                <View style={styles.addRow}>
                  <TouchableOpacity style={styles.addButton} onPress={openAdd}>
                    <Ionicons name="person-add-outline" size={18} color="#007a55" />
                    <Text style={styles.addText}>{t('family.addDependent', 'Add a child or dependent')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.addButton} onPress={() => setInviteOpen(true)}>
                    <Ionicons name="mail-outline" size={18} color="#007a55" />
                    <Text style={styles.addText}>{t('family.inviteAdult', 'Invite someone with an account')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {canManage && (data.sentInvitations || []).length > 0 && (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>{t('family.pending', 'Waiting for an answer')}</Text>
                  {data.sentInvitations!.map((inv) => (
                    <View key={inv.invitationId} style={styles.pendingRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memberName}>{inv.fullName}</Text>
                        <Text style={styles.memberMeta}>{rel(inv.relationship)}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => run(`cancel-${inv.invitationId}`, () => familyService.cancelInvitation(inv.invitationId))}
                        disabled={busy !== null}
                      >
                        <Text style={styles.dangerLink}>{t('family.cancelInvite', 'Cancel')}</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {!actingFor && me && (
                <TouchableOpacity
                  style={styles.leaveButton}
                  onPress={() => remove((data.members || []).find((m) => m.patientId === me.patientId)!, true)}
                >
                  <Text style={styles.dangerLink}>
                    {me.isCreator && (data.members?.length || 0) <= 1 ? t('family.close', 'Close this family') : t('family.leaveFamily', 'Leave this family')}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* Add / edit a dependent */}
      <Modal visible={formOpen} animationType="slide" transparent onRequestClose={() => setFormOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>
                {editing ? t('family.editTitle', 'Edit {{name}}', { name: editing.fullName }) : t('family.addTitle', 'Add a family member')}
              </Text>
              {!editing && (
                <Text style={styles.cardText}>
                  {t('family.addHint', 'For children and dependents who have no PharmaTrack account. You will manage their profile.')}
                </Text>
              )}

              <Text style={styles.label}>{t('family.fullName', 'Full name')}</Text>
              <TextInput style={styles.input} value={form.fullName} onChangeText={(v) => setForm({ ...form, fullName: v })} placeholderTextColor="#98A2B3" />

              <Text style={styles.label}>{t('family.dob', 'Date of birth')}</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowDate(true)}>
                <Text style={{ color: form.dateOfBirth ? '#0F2926' : '#98A2B3' }}>{form.dateOfBirth || 'YYYY-MM-DD'}</Text>
              </TouchableOpacity>
              {showDate && (
                <DateTimePicker
                  value={form.dateOfBirth ? new Date(`${form.dateOfBirth}T12:00:00`) : new Date(2015, 0, 1)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  onChange={(event: any, date?: Date) => {
                    if (Platform.OS === 'android') setShowDate(false);
                    if (event.type === 'set' && date) setForm((f) => ({ ...f, dateOfBirth: toIso(date) }));
                  }}
                  themeVariant="light"
                />
              )}
              {showDate && Platform.OS === 'ios' && (
                <TouchableOpacity onPress={() => setShowDate(false)}><Text style={styles.link}>{t('common.done', 'Done')}</Text></TouchableOpacity>
              )}

              <Text style={styles.label}>{t('family.gender', 'Gender')}</Text>
              <Chips options={GENDERS} value={form.gender} onChange={(v) => setForm({ ...form, gender: v })} label={(g) => t(`family.gender_${g}`, g)} />

              <Text style={styles.label}>{t('family.relationship', 'Relationship to the family')}</Text>
              <Chips options={RELATIONSHIPS} value={form.relationship} onChange={(v) => setForm({ ...form, relationship: v })} label={rel} />

              <Text style={styles.label}>{t('family.phoneOptional', 'Their own phone (optional)')}</Text>
              <TextInput
                style={styles.input} value={form.phoneNumber} onChangeText={(v) => setForm({ ...form, phoneNumber: v })}
                placeholder="+250..." placeholderTextColor="#98A2B3" keyboardType="phone-pad"
              />

              <Text style={styles.label}>{t('family.nidOptional', 'National ID (optional)')}</Text>
              <TextInput
                style={styles.input} value={form.nationalId} onChangeText={(v) => setForm({ ...form, nationalId: v.replace(/\D/g, '') })}
                placeholder="16 digits" placeholderTextColor="#98A2B3" keyboardType="number-pad" maxLength={16}
              />

              <View style={styles.sheetActions}>
                <TouchableOpacity style={styles.actSecondary} onPress={() => setFormOpen(false)}>
                  <Text style={styles.actSecondaryText}>{t('common.cancel', 'Cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryButton, { flex: 1, marginTop: 0 }]} onPress={saveMember} disabled={saving}>
                  {saving ? <ActivityIndicator color="white" /> : <Text style={styles.primaryButtonText}>{editing ? t('family.save', 'Save') : t('family.add', 'Add')}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Invite an adult with an account */}
      <Modal visible={inviteOpen} animationType="slide" transparent onRequestClose={() => setInviteOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('family.inviteTitle', 'Invite a family member')}</Text>
            <Text style={styles.cardText}>
              {t('family.inviteHint', 'For adults who already have a PharmaTrack account. They must accept before joining; once they do, the family managers get full access to their account.')}
            </Text>
            <Text style={styles.label}>{t('family.inviteId', 'Their phone number or email')}</Text>
            <TextInput
              style={styles.input} value={inviteId} onChangeText={setInviteId} autoCapitalize="none"
              placeholder="+250788123456" placeholderTextColor="#98A2B3"
            />
            <Text style={styles.label}>{t('family.relationship', 'Relationship to the family')}</Text>
            <Chips options={RELATIONSHIPS} value={inviteRel} onChange={setInviteRel} label={rel} />
            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.actSecondary} onPress={() => setInviteOpen(false)}>
                <Text style={styles.actSecondaryText}>{t('common.cancel', 'Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryButton, { flex: 1, marginTop: 0 }]} onPress={sendInvite} disabled={saving}>
                {saving ? <ActivityIndicator color="white" /> : <Text style={styles.primaryButtonText}>{t('family.sendInvite', 'Send invitation')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9F9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 16, backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: '#EAECF0',
    paddingTop: Platform.OS === 'android' ? 40 : 16,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F2926' },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  errorText: { color: '#B42318', textAlign: 'center' },

  actingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EFF8FF',
    borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#B2DDFF',
  },
  actingText: { flex: 1, color: '#175CD3', fontSize: 13, fontWeight: '600' },
  actingLink: { color: '#175CD3', fontWeight: '800' },

  inviteCard: {
    flexDirection: 'row', gap: 12, backgroundColor: '#F4F3FF', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#D9D6FE',
  },
  inviteTitle: { fontSize: 14, fontWeight: '700', color: '#0F2926' },
  inviteActions: { flexDirection: 'row', gap: 8, marginTop: 10 },

  card: { backgroundColor: 'white', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#EAECF0', gap: 8, alignItems: 'stretch' },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#0F2926' },
  cardText: { fontSize: 13, color: '#667085', lineHeight: 19, marginBottom: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0F2926' },

  familyHeader: { gap: 2 },
  familyName: { fontSize: 20, fontWeight: '800', color: '#0F2926' },

  memberCard: { backgroundColor: 'white', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#EAECF0', gap: 12 },
  memberTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#007a55', alignItems: 'center', justifyContent: 'center' },
  avatarManaged: { backgroundColor: '#7FBFA9' },
  avatarText: { color: 'white', fontWeight: '800', fontSize: 16 },
  memberName: { fontSize: 15, fontWeight: '700', color: '#0F2926' },
  memberMeta: { fontSize: 12, color: '#667085', marginTop: 2 },
  badges: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  badge: {
    fontSize: 11, fontWeight: '700', color: '#475467', backgroundColor: '#F2F4F7',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden',
  },
  badgeManager: { color: '#027A48', backgroundColor: '#ECFDF3' },
  memberActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },

  actPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#007a55',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, minWidth: 80, justifyContent: 'center',
  },
  actPrimaryText: { color: 'white', fontWeight: '800', fontSize: 13 },
  actSecondary: {
    flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#007a55',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, justifyContent: 'center',
  },
  actSecondaryText: { color: '#007a55', fontWeight: '800', fontSize: 13 },
  actDanger: { marginLeft: 'auto', padding: 8, borderRadius: 10, backgroundColor: '#FEF3F2' },

  addRow: { gap: 8 },
  addButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ECFDF3',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  addText: { color: '#007a55', fontWeight: '700', fontSize: 14 },

  pendingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F2F4F7' },
  dangerLink: { color: '#B42318', fontWeight: '700' },
  leaveButton: { alignItems: 'center', paddingVertical: 12 },
  link: { color: '#007a55', fontWeight: '800', textAlign: 'right', paddingVertical: 6 },

  primaryButton: {
    backgroundColor: '#007a55', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 4,
  },
  primaryButtonText: { color: 'white', fontWeight: '800', fontSize: 15 },
  input: {
    backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#D0D5DD',
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 10, fontSize: 15, color: '#0F2926',
  },
  label: { fontSize: 13, fontWeight: '700', color: '#344054', marginTop: 12, marginBottom: 6 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: 'white' },
  chipOn: { borderColor: '#007a55', backgroundColor: '#e6f4ef' },
  chipText: { color: '#344054', fontWeight: '600', fontSize: 13 },
  chipTextOn: { color: '#007a55' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(16,24,40,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 32, maxHeight: '90%',
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#0F2926', marginBottom: 6 },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
});
