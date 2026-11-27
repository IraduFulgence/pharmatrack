import * as SecureStore from 'expo-secure-store';
import { ApiRequest } from '../config';

// A patient's family. Family heads and spouses manage it: they add dependents,
// invite adults who have an account, and can act as any member in the app.

export type MemberRelationship = 'SPOUSE' | 'CHILD' | 'PARENT' | 'SIBLING' | 'OTHER';
export type Relationship = 'HEAD' | MemberRelationship;

export interface FamilyMember {
  patientId: number;
  fullName: string;
  relationship: Relationship;
  dateOfBirth: string | null;
  age: number | null;
  gender: string;
  phoneNumber: string | null;
  nationalId: string | null;
  canManage: boolean;
  /** No login of their own: run entirely by the family's managers. */
  isManagedProfile: boolean;
  joinedAt: string;
}

export interface ReceivedInvitation {
  invitationId: number;
  relationship: MemberRelationship;
  familyName: string | null;
  invitedByName: string | null;
  createdAt: string;
}

export interface SentInvitation {
  invitationId: number;
  relationship: MemberRelationship;
  fullName: string;
  phoneNumber: string | null;
  createdAt: string;
}

export interface FamilyData {
  family: { familyId: number; familyName: string | null; createdBy: number } | null;
  me?: { patientId: number; relationship: Relationship; canManage: boolean; isCreator: boolean };
  householdRole: 'FAMILY_HEAD' | 'SPOUSE' | 'OTHER_ADULT' | null;
  canCreate?: boolean;
  members?: FamilyMember[];
  sentInvitations?: SentInvitation[];
  receivedInvitations: ReceivedInvitation[];
}

export interface DependentInput {
  fullName: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  relationship: MemberRelationship;
  phoneNumber?: string;
  nationalId?: string;
}

export const RELATIONSHIP_LABEL: Record<Relationship, string> = {
  HEAD: 'Head of family',
  SPOUSE: 'Spouse',
  CHILD: 'Child',
  PARENT: 'Parent',
  SIBLING: 'Sibling',
  OTHER: 'Other relative',
};

export const familyService = {
  getFamily: (): Promise<{ data: FamilyData }> => ApiRequest('/family', { method: 'GET' }),

  createFamily: (familyName?: string) =>
    ApiRequest('/family', { method: 'POST', body: JSON.stringify(familyName ? { familyName } : {}) }),

  addDependent: (input: DependentInput) =>
    ApiRequest('/family/members', { method: 'POST', body: JSON.stringify(input) }),

  updateMember: (patientId: number, changes: Partial<DependentInput>) =>
    ApiRequest(`/family/members/${patientId}`, { method: 'PATCH', body: JSON.stringify(changes) }),

  /** Remove a member, or leave the family when patientId is your own. */
  removeMember: (patientId: number) => ApiRequest(`/family/members/${patientId}`, { method: 'DELETE' }),

  invite: (identifier: string, relationship: MemberRelationship) =>
    ApiRequest('/family/invitations', { method: 'POST', body: JSON.stringify({ identifier, relationship }) }),

  cancelInvitation: (invitationId: number) =>
    ApiRequest(`/family/invitations/${invitationId}`, { method: 'DELETE' }),

  respondToInvitation: (invitationId: number, accept: boolean) =>
    ApiRequest(`/family/invitations/${invitationId}/${accept ? 'accept' : 'decline'}`, { method: 'POST' }),

  actAs: (patientId: number): Promise<{ data: { token: string; user: any; actedBy: number } }> =>
    ApiRequest(`/family/members/${patientId}/act`, { method: 'POST' }),
};


// Acting as a family member: the manager's own session is put aside and restored later.

const OWNER_TOKEN = 'ownerToken';
const OWNER_USER = 'ownerUser';
const ACTING_FOR = 'actingFor';

export const actingSession = {
  /** Switch the app to a family member. Everything you do is done for them. */
  start: async (member: { patientId: number; fullName: string }) => {
    const res = await familyService.actAs(member.patientId);
    // Keep your own session only the first time (never overwrite it with an acting one).
    if (!(await SecureStore.getItemAsync(OWNER_TOKEN))) {
      const token = await SecureStore.getItemAsync('token');
      const user = await SecureStore.getItemAsync('user');
      if (token) await SecureStore.setItemAsync(OWNER_TOKEN, token);
      if (user) await SecureStore.setItemAsync(OWNER_USER, user);
    }
    await SecureStore.setItemAsync('token', res.data.token);
    await SecureStore.setItemAsync('user', JSON.stringify(res.data.user));
    await SecureStore.setItemAsync(ACTING_FOR, JSON.stringify({ patientId: member.patientId, fullName: member.fullName }));
  },

  /** Back to your own account. */
  stop: async () => {
    const token = await SecureStore.getItemAsync(OWNER_TOKEN);
    const user = await SecureStore.getItemAsync(OWNER_USER);
    if (token) await SecureStore.setItemAsync('token', token);
    if (user) await SecureStore.setItemAsync('user', user);
    await SecureStore.deleteItemAsync(OWNER_TOKEN);
    await SecureStore.deleteItemAsync(OWNER_USER);
    await SecureStore.deleteItemAsync(ACTING_FOR);
  },

  /** Who you're acting for, or null when using your own account. */
  current: async (): Promise<{ patientId: number; fullName: string } | null> => {
    const raw = await SecureStore.getItemAsync(ACTING_FOR);
    if (!raw || !(await SecureStore.getItemAsync(OWNER_TOKEN))) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },

  
  clear: async () => {
    await SecureStore.deleteItemAsync(OWNER_TOKEN);
    await SecureStore.deleteItemAsync(OWNER_USER);
    await SecureStore.deleteItemAsync(ACTING_FOR);
  },
};
