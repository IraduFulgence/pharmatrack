import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FamilyService } from './family.service.js';

const membership = (over: Partial<Record<string, unknown>> = {}) => ({
  family_id: 1,
  family_name: 'Mugisha family',
  created_by: 10,
  patient_id: 10,
  relationship: 'HEAD',
  can_manage: true,
  is_managed_profile: false,
  ...over,
});

describe('FamilyService', () => {
  let service: FamilyService;
  let db: any;
  let jwt: any;
  let client: any;

  beforeEach(() => {
    client = { query: vi.fn() };
    db = { query: vi.fn(), transaction: vi.fn((cb: any) => cb(client)) };
    jwt = { sign: vi.fn().mockReturnValue('acting-token') };
    service = new FamilyService(db, jwt);
  });

  describe('createFamily', () => {
    it('refuses another adult (only a head or spouse creates a family)', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ patient_id: 10, full_name: 'Eric Mugisha', household_role: 'OTHER_ADULT' }] });
      await expect(service.createFamily(10, {})).rejects.toThrow(ForbiddenException);
      expect(db.transaction).not.toHaveBeenCalled();
    });

    it('makes a patient without a household role the head', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ patient_id: 10, full_name: 'Eric Mugisha', household_role: null }] });
      client.query
        .mockResolvedValueOnce({ rows: [] }) // not in a family
        .mockResolvedValueOnce({ rows: [{ family_id: 4 }] }) // family
        .mockResolvedValue({ rows: [] });

      const res = await service.createFamily(10, {});
      expect(res.data).toEqual({ familyId: 4, familyName: 'Mugisha family', relationship: 'HEAD' });
      expect(client.query.mock.calls[2][1]).toEqual([4, 10, 'HEAD']); // manager row
      expect(client.query.mock.calls[3][0]).toMatch(/household_role = 'FAMILY_HEAD'/);
    });

    it('refuses a second family', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ patient_id: 10, full_name: 'Eric', household_role: 'FAMILY_HEAD' }] });
      client.query.mockResolvedValueOnce({ rows: [membership()] });
      await expect(service.createFamily(10, {})).rejects.toThrow(ConflictException);
    });
  });

  describe('addDependent', () => {
    const child = { fullName: 'Keza Mugisha', dateOfBirth: '2016-04-12', gender: 'Female' as const, relationship: 'CHILD' as const };

    it('only lets managers add members', async () => {
      db.query.mockResolvedValueOnce({ rows: [membership({ patient_id: 12, relationship: 'CHILD', can_manage: false })] });
      await expect(service.addDependent(12, child)).rejects.toThrow(ForbiddenException);
    });

    it('creates a child profile with no login and no phone of their own', async () => {
      db.query.mockResolvedValueOnce({ rows: [membership()] }); // manager
      client.query
        .mockResolvedValueOnce({ rows: [{ patient_id: 55 }] }) // patient
        .mockResolvedValueOnce({ rows: [] }); // member

      const res = await service.addDependent(10, child);
      const patientInsert = client.query.mock.calls[0];
      expect(patientInsert[0]).toMatch(/password_hash, is_active, household_role\)/);
      expect(patientInsert[0]).toMatch(/\$6, NULL, TRUE, NULL\)/); // no password
      expect(patientInsert[1][4]).toBeNull();
      expect(client.query.mock.calls[1][1]).toEqual([1, 55, 'CHILD', 10]);
      expect(res.data).toMatchObject({ patientId: 55, isManagedProfile: true, canManage: false });
    });

    it('rejects a future date of birth', async () => {
      db.query.mockResolvedValueOnce({ rows: [membership()] });
      await expect(service.addDependent(10, { ...child, dateOfBirth: '2999-01-01' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateDependent', () => {
    it("can't change the personal details of a member with their own account", async () => {
      db.query
        .mockResolvedValueOnce({ rows: [membership()] })
        .mockResolvedValueOnce({ rows: [{ patient_id: 20, relationship: 'SPOUSE', is_managed_profile: false, full_name: 'Aline' }] });
      await expect(service.updateDependent(10, 20, { fullName: 'Someone Else' })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('removeMember', () => {
    it('keeps the creator from leaving while others remain', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [membership()] })
        .mockResolvedValueOnce({ rows: [{ n: 2 }] });
      await expect(service.removeMember(10, 10)).rejects.toThrow(/Remove the other members/);
    });

    it('lets only the creator remove another manager', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [membership({ patient_id: 20, relationship: 'SPOUSE' })] }) // spouse, not creator
        .mockResolvedValueOnce({ rows: [{ patient_id: 30, relationship: 'SPOUSE', can_manage: true, full_name: 'Other' }] });
      await expect(service.removeMember(20, 30)).rejects.toThrow(/Only the person who created/);
    });
  });

  describe('invitations', () => {
    it('explains when no account uses that number', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [membership()] })
        .mockResolvedValueOnce({ rows: [] });
      await expect(service.invite(10, { identifier: '+250788999999', relationship: 'SPOUSE' })).rejects.toThrow(NotFoundException);
    });

    it('refuses someone already in a family', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [membership()] })
        .mockResolvedValueOnce({ rows: [{ patient_id: 20, full_name: 'Aline' }] })
        .mockResolvedValueOnce({ rows: [membership({ family_id: 2, patient_id: 20 })] });
      await expect(service.invite(10, { identifier: 'aline@example.com', relationship: 'SPOUSE' })).rejects.toThrow(/already belongs/);
    });

    it('accepting as a spouse makes them a manager', async () => {
      client.query
        .mockResolvedValueOnce({ rows: [{ invitation_id: 7, family_id: 1, relationship: 'SPOUSE', family_name: 'Mugisha family' }] })
        .mockResolvedValueOnce({ rows: [] }) // not in a family
        .mockResolvedValue({ rows: [] });

      const res = await service.respondToInvitation(20, 7, true);
      expect(res.message).toBe('You joined Mugisha family.');
      const insert = client.query.mock.calls[2];
      expect(insert[0]).toMatch(/\$3 = 'SPOUSE'/); // can_manage
      expect(insert[1]).toEqual([1, 20, 'SPOUSE', 7]);
    });
  });

  describe('actAs', () => {
    it('gives a manager a session for a family member, recording who acts', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [membership()] })
        .mockResolvedValueOnce({ rows: [{ patient_id: 55, relationship: 'CHILD', full_name: 'Keza', email: null, phone_number: '+250788000001' }] });

      const res = await service.actAs({ sub: 10, email: 'eric@example.com', role: 'PATIENT' }, 55);
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 55, role: 'PATIENT', actedBy: 10 }),
        expect.objectContaining({ expiresIn: '12h' }),
      );
      expect(res.data.token).toBe('acting-token');
    });

    it("refuses someone outside the manager's family", async () => {
      db.query
        .mockResolvedValueOnce({ rows: [membership()] })
        .mockResolvedValueOnce({ rows: [] });
      await expect(service.actAs({ sub: 10, email: '', role: 'PATIENT' }, 99)).rejects.toThrow(NotFoundException);
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('refuses acting from an acting session (no chains)', async () => {
      await expect(service.actAs({ sub: 55, email: '', role: 'PATIENT', actedBy: 10 }, 56)).rejects.toThrow(/Switch back/);
      expect(db.query).not.toHaveBeenCalled();
    });

    it('refuses members who are not managers', async () => {
      db.query.mockResolvedValueOnce({ rows: [membership({ patient_id: 12, relationship: 'CHILD', can_manage: false })] });
      await expect(service.actAs({ sub: 12, email: '', role: 'PATIENT' }, 10)).rejects.toThrow(ForbiddenException);
    });
  });
});
