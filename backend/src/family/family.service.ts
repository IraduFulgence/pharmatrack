import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service.js';
import type { ApiResponse } from '../common/interfaces/api-response.interface.js';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import { ageOn, birthYearFromRwandanNid, isRealDate, todayIso } from '../common/utils/age.js';
import type { AddDependentDto, CreateFamilyDto, InviteMemberDto, UpdateDependentDto } from './dto/family.dto.js';

/** How long a manager's "act as a family member" session lasts. */
const ACT_AS_EXPIRY = process.env.FAMILY_ACT_AS_EXPIRATION || '12h';

interface Membership {
  family_id: number;
  family_name: string | null;
  created_by: number;
  patient_id: number;
  relationship: string;
  can_manage: boolean;
  is_managed_profile: boolean;
}

type Queryable = { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }> };

const toMember = (r: any) => {
  const dob = r.date_of_birth || null;
  return {
    patientId: Number(r.patient_id),
    fullName: r.full_name,
    relationship: r.relationship,
    dateOfBirth: dob,
    age: dob ? ageOn(dob) : r.age != null ? Number(r.age) : null,
    gender: r.gender,
    phoneNumber: r.phone_number,
    nationalId: r.national_id || null,
    canManage: !!r.can_manage,
    // Managed profiles have no login of their own: the family's managers run them.
    isManagedProfile: !!r.is_managed_profile,
    joinedAt: r.joined_at,
  };
};

@Injectable()
export class FamilyService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async membershipOf(patientId: number, q: Queryable = this.db, lock = false): Promise<Membership | null> {
    const res = await q.query(
      `SELECT f.family_id, f.family_name, f.created_by, fm.patient_id, fm.relationship, fm.can_manage, fm.is_managed_profile
       FROM public.family_members fm
       JOIN public.families f ON f.family_id = fm.family_id
       WHERE fm.patient_id = $1${lock ? ' FOR UPDATE OF fm' : ''}`,
      [patientId],
    );
    const r = res.rows[0];
    return r
      ? { ...r, family_id: Number(r.family_id), created_by: Number(r.created_by), patient_id: Number(r.patient_id) }
      : null;
  }

  private async requireManager(patientId: number, q: Queryable = this.db): Promise<Membership> {
    const m = await this.membershipOf(patientId, q);
    if (!m) throw new NotFoundException('You are not part of a family yet.');
    if (!m.can_manage) {
      throw new ForbiddenException('Only the family head or a spouse can manage the family.');
    }
    return m;
  }

  /** A member of the manager's own family (anyone else is "not found"). */
  private async requireMemberOf(manager: Membership, targetPatientId: number, q: Queryable = this.db) {
    const res = await q.query(
      `SELECT fm.patient_id, fm.relationship, fm.can_manage, fm.is_managed_profile,
              p.full_name, p.email, p.phone_number
       FROM public.family_members fm
       JOIN public.patients p ON p.patient_id = fm.patient_id
       WHERE fm.family_id = $1 AND fm.patient_id = $2`,
      [manager.family_id, targetPatientId],
    );
    if (res.rows.length === 0) throw new NotFoundException('This person is not in your family.');
    return res.rows[0];
  }

  private checkDateOfBirth(dateOfBirth: string, nationalId?: string | null) {
    const today = todayIso();
    if (!isRealDate(dateOfBirth)) throw new BadRequestException('Date of birth must be a real calendar date.');
    if (dateOfBirth > today) throw new BadRequestException('Date of birth cannot be in the future.');
    if (ageOn(dateOfBirth, today) > 130) throw new BadRequestException('Date of birth is not a valid human age.');
    const nidYear = birthYearFromRwandanNid(nationalId);
    if (nidYear !== null && nidYear !== Number(dateOfBirth.slice(0, 4))) {
      throw new BadRequestException(`The National ID shows ${nidYear} as the birth year. Check the date of birth or National ID.`);
    }
  }

  private async assertNationalIdFree(nationalId: string, exceptPatientId?: number) {
    const res = await this.db.query(
      'SELECT 1 FROM public.patients WHERE national_id = $1 AND ($2::BIGINT IS NULL OR patient_id <> $2) LIMIT 1',
      [nationalId, exceptPatientId ?? null],
    );
    if (res.rows.length > 0) throw new ConflictException('A patient with this National ID already exists.');
  }

  // ---------------------------------------------------------------------------
  // Reading
  // ---------------------------------------------------------------------------

  async getFamily(patientId: number): Promise<ApiResponse> {
    const [me, patientRes, received] = await Promise.all([
      this.membershipOf(patientId),
      this.db.query('SELECT household_role FROM public.patients WHERE patient_id = $1', [patientId]),
      this.db.query(
        `SELECT i.invitation_id, i.relationship, to_char(i.created_at, 'YYYY-MM-DD HH24:MI') AS created_at,
                f.family_name, inviter.full_name AS invited_by_name
         FROM public.family_invitations i
         JOIN public.families f ON f.family_id = i.family_id
         LEFT JOIN public.patients inviter ON inviter.patient_id = i.invited_by
         WHERE i.invited_patient_id = $1 AND i.status = 'PENDING'
         ORDER BY i.created_at DESC`,
        [patientId],
      ),
    ]);
    const householdRole = patientRes.rows[0]?.household_role ?? null;
    const receivedInvitations = received.rows.map((r: any) => ({
      invitationId: Number(r.invitation_id),
      relationship: r.relationship,
      familyName: r.family_name,
      invitedByName: r.invited_by_name,
      createdAt: r.created_at,
    }));

    if (!me) {
      return {
        success: true,
        message: 'You are not part of a family yet.',
        data: {
          family: null,
          householdRole,
          // Family heads and spouses create families; patients registered before roles existed may too.
          canCreate: householdRole === null || householdRole === 'FAMILY_HEAD' || householdRole === 'SPOUSE',
          receivedInvitations,
        },
      };
    }

    const membersRes = await this.db.query(
      `SELECT fm.patient_id, fm.relationship, fm.can_manage, fm.is_managed_profile,
              to_char(fm.created_at, 'YYYY-MM-DD') AS joined_at,
              p.full_name, to_char(p.date_of_birth, 'YYYY-MM-DD') AS date_of_birth, p.age, p.gender,
              p.phone_number, p.national_id
       FROM public.family_members fm
       JOIN public.patients p ON p.patient_id = fm.patient_id
       WHERE fm.family_id = $1
       ORDER BY CASE fm.relationship WHEN 'HEAD' THEN 0 WHEN 'SPOUSE' THEN 1 ELSE 2 END,
                p.date_of_birth ASC NULLS LAST, fm.family_member_id ASC`,
      [me.family_id],
    );

    let sentInvitations: any[] = [];
    if (me.can_manage) {
      const sent = await this.db.query(
        `SELECT i.invitation_id, i.relationship, to_char(i.created_at, 'YYYY-MM-DD HH24:MI') AS created_at,
                p.full_name, p.phone_number
         FROM public.family_invitations i
         JOIN public.patients p ON p.patient_id = i.invited_patient_id
         WHERE i.family_id = $1 AND i.status = 'PENDING'
         ORDER BY i.created_at DESC`,
        [me.family_id],
      );
      sentInvitations = sent.rows.map((r: any) => ({
        invitationId: Number(r.invitation_id),
        relationship: r.relationship,
        fullName: r.full_name,
        phoneNumber: r.phone_number,
        createdAt: r.created_at,
      }));
    }

    return {
      success: true,
      message: 'Family retrieved successfully.',
      data: {
        family: {
          familyId: me.family_id,
          familyName: me.family_name,
          createdBy: me.created_by,
        },
        me: {
          patientId,
          relationship: me.relationship,
          canManage: me.can_manage,
          isCreator: me.created_by === patientId,
        },
        householdRole,
        members: membersRes.rows.map(toMember),
        sentInvitations,
        receivedInvitations,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Creating and managing
  // ---------------------------------------------------------------------------

  async createFamily(patientId: number, dto: CreateFamilyDto): Promise<ApiResponse> {
    const patientRes = await this.db.query(
      'SELECT patient_id, full_name, household_role, password_hash IS NOT NULL AS has_login FROM public.patients WHERE patient_id = $1',
      [patientId],
    );
    const patient = patientRes.rows[0];
    if (!patient) throw new NotFoundException('Patient not found.');
    const role = patient.household_role as string | null;
    if (role === 'OTHER_ADULT') {
      throw new ForbiddenException('Only a family head or a spouse can create a family. Ask them to invite you instead.');
    }

    const familyName = dto.familyName?.trim() || `${String(patient.full_name).trim().split(/\s+/).pop()} family`;
    const relationship = role === 'SPOUSE' ? 'SPOUSE' : 'HEAD';

    const familyId = await this.db.transaction(async (client) => {
      if (await this.membershipOf(patientId, client)) {
        throw new ConflictException('You already belong to a family.');
      }
      const f = await client.query(
        `INSERT INTO public.families (family_name, created_by) VALUES ($1, $2) RETURNING family_id`,
        [familyName, patientId],
      );
      const id = Number(f.rows[0].family_id);
      try {
        await client.query(
          `INSERT INTO public.family_members (family_id, patient_id, relationship, can_manage, is_managed_profile, added_by)
           VALUES ($1, $2, $3, TRUE, FALSE, $2)`,
          [id, patientId, relationship],
        );
      } catch (err: any) {
        if (err?.code === '23505') throw new ConflictException('You already belong to a family.');
        throw err;
      }
      // Patients registered before household roles existed become the head.
      if (role === null) {
        await client.query(`UPDATE public.patients SET household_role = 'FAMILY_HEAD' WHERE patient_id = $1`, [patientId]);
      }
      // Pending invitations to join other families no longer apply.
      await client.query(
        `UPDATE public.family_invitations SET status = 'CANCELLED', responded_at = CURRENT_TIMESTAMP
         WHERE invited_patient_id = $1 AND status = 'PENDING'`,
        [patientId],
      );
      return id;
    });

    return { success: true, message: `${familyName} created.`, data: { familyId, familyName, relationship } };
  }

  /** Add a dependent with no account of their own (any age). */
  async addDependent(managerId: number, dto: AddDependentDto): Promise<ApiResponse> {
    const manager = await this.requireManager(managerId);
    this.checkDateOfBirth(dto.dateOfBirth, dto.nationalId);
    const nationalId = dto.nationalId?.trim() || null;
    if (nationalId) await this.assertNationalIdFree(nationalId);

    // Phone numbers are unique per patient, so a dependent only gets one if it's their own.
    const phone = dto.phoneNumber?.trim() || null;

    const member = await this.db.transaction(async (client) => {
      let inserted;
      try {
        inserted = await client.query(
          `INSERT INTO public.patients
             (national_id, full_name, age, date_of_birth, phone_number, email, gender, password_hash, is_active, household_role)
           VALUES ($1, $2, $3, $4, $5, NULL, $6, NULL, TRUE, NULL)
           RETURNING patient_id`,
          [nationalId, dto.fullName.trim(), ageOn(dto.dateOfBirth), dto.dateOfBirth, phone, dto.gender],
        );
      } catch (err: any) {
        if (err?.code === '23505') {
          throw new ConflictException(
            String(err.constraint || '').includes('phone')
              ? 'Another patient already uses this phone number. Leave it empty if the member has no phone of their own.'
              : 'A patient with this National ID already exists.',
          );
        }
        throw err;
      }
      const newId = Number(inserted.rows[0].patient_id);
      await client.query(
        `INSERT INTO public.family_members (family_id, patient_id, relationship, can_manage, is_managed_profile, added_by)
         VALUES ($1, $2, $3, FALSE, TRUE, $4)`,
        [manager.family_id, newId, dto.relationship, managerId],
      );
      return newId;
    });

    return {
      success: true,
      message: `${dto.fullName.trim()} added to your family.`,
      data: {
        patientId: member,
        fullName: dto.fullName.trim(),
        relationship: dto.relationship,
        dateOfBirth: dto.dateOfBirth,
        age: ageOn(dto.dateOfBirth),
        gender: dto.gender,
        phoneNumber: phone,
        nationalId,
        canManage: false,
        isManagedProfile: true,
      },
    };
  }

  /** Edit a dependent's details (members with their own account keep control of their own details). */
  async updateDependent(managerId: number, targetId: number, dto: UpdateDependentDto): Promise<ApiResponse> {
    const manager = await this.requireManager(managerId);
    const target = await this.requireMemberOf(manager, targetId);

    const fields: string[] = [];
    const values: unknown[] = [];
    const set = (col: string, v: unknown) => { values.push(v); fields.push(`${col} = $${values.length}`); };

    const touchesProfile = ['fullName', 'dateOfBirth', 'gender', 'phoneNumber', 'nationalId'].some(
      (k) => (dto as any)[k] !== undefined,
    );
    if (touchesProfile && !target.is_managed_profile) {
      throw new ForbiddenException(`${target.full_name} has their own account and keeps control of their personal details.`);
    }
    if (dto.dateOfBirth !== undefined || dto.nationalId !== undefined) {
      const cur = await this.db.query(
        `SELECT to_char(date_of_birth, 'YYYY-MM-DD') AS dob, national_id FROM public.patients WHERE patient_id = $1`,
        [targetId],
      );
      this.checkDateOfBirth(dto.dateOfBirth ?? cur.rows[0]?.dob, dto.nationalId ?? cur.rows[0]?.national_id);
    }
    if (dto.nationalId) await this.assertNationalIdFree(dto.nationalId.trim(), targetId);

    if (dto.fullName !== undefined) set('full_name', dto.fullName.trim());
    if (dto.dateOfBirth !== undefined) { set('date_of_birth', dto.dateOfBirth); set('age', ageOn(dto.dateOfBirth)); }
    if (dto.gender !== undefined) set('gender', dto.gender);
    if (dto.phoneNumber !== undefined) set('phone_number', dto.phoneNumber.trim());
    if (dto.nationalId !== undefined) set('national_id', dto.nationalId.trim() || null);

    if (dto.relationship !== undefined && target.relationship === 'HEAD') {
      throw new BadRequestException("The family head's relationship can't be changed.");
    }
    if (fields.length === 0 && dto.relationship === undefined) {
      throw new BadRequestException('Nothing to update.');
    }

    await this.db.transaction(async (client) => {
      if (fields.length > 0) {
        values.push(targetId);
        await client.query(
          `UPDATE public.patients SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE patient_id = $${values.length}`,
          values,
        );
      }
      if (dto.relationship !== undefined) {
        // A spouse with their own account also manages the family.
        await client.query(
          `UPDATE public.family_members
           SET relationship = $1,
               can_manage = CASE WHEN is_managed_profile THEN FALSE ELSE ($1 = 'SPOUSE' OR relationship = 'HEAD') END
           WHERE family_id = $2 AND patient_id = $3`,
          [dto.relationship, manager.family_id, targetId],
        );
      }
    });

    return { success: true, message: 'Family member updated.', data: { patientId: targetId } };
  }

  /**
   * Remove someone from the family, or leave it (target = yourself).
   * The creator can't leave while others remain; only the creator can remove another manager.
   * A removed dependent keeps their patient record (sales history), unlinked from the family.
   */
  async removeMember(actorId: number, targetId: number): Promise<ApiResponse> {
    const me = await this.membershipOf(actorId);
    if (!me) throw new NotFoundException('You are not part of a family.');

    if (targetId === actorId) {
      const others = await this.db.query(
        'SELECT COUNT(*)::INTEGER AS n FROM public.family_members WHERE family_id = $1 AND patient_id <> $2',
        [me.family_id, actorId],
      );
      const othersCount = Number(others.rows[0]?.n || 0);
      if (me.created_by === actorId && othersCount > 0) {
        throw new BadRequestException('You created this family. Remove the other members before leaving it.');
      }
      await this.db.transaction(async (client) => {
        await client.query('DELETE FROM public.family_members WHERE family_id = $1 AND patient_id = $2', [me.family_id, actorId]);
        if (othersCount === 0) {
          await client.query('DELETE FROM public.families WHERE family_id = $1', [me.family_id]);
        }
      });
      return { success: true, message: othersCount === 0 ? 'Family closed.' : 'You left the family.', data: null };
    }

    if (!me.can_manage) throw new ForbiddenException('Only the family head or a spouse can remove members.');
    const target = await this.requireMemberOf(me, targetId);
    if (Number(targetId) === me.created_by) throw new ForbiddenException("The family's creator can't be removed.");
    if (target.can_manage && me.created_by !== actorId) {
      throw new ForbiddenException('Only the person who created the family can remove another manager.');
    }
    await this.db.query('DELETE FROM public.family_members WHERE family_id = $1 AND patient_id = $2', [me.family_id, targetId]);
    return { success: true, message: `${target.full_name} was removed from your family.`, data: { patientId: targetId } };
  }

  // ---------------------------------------------------------------------------
  // Invitations (adults who already have an account)
  // ---------------------------------------------------------------------------

  async invite(managerId: number, dto: InviteMemberDto): Promise<ApiResponse> {
    const manager = await this.requireManager(managerId);
    const identifier = dto.identifier.trim();
    const res = await this.db.query(
      `SELECT patient_id, full_name FROM public.patients
       WHERE password_hash IS NOT NULL AND (phone_number = $1 OR LOWER(email) = LOWER($1))
       ORDER BY patient_id LIMIT 1`,
      [identifier],
    );
    const invitee = res.rows[0];
    if (!invitee) {
      throw new NotFoundException(
        'No PharmaTrack account uses that phone number or email. Children and dependents without an account can be added directly instead.',
      );
    }
    const inviteeId = Number(invitee.patient_id);
    if (inviteeId === managerId) throw new BadRequestException("You can't invite yourself.");
    if (await this.membershipOf(inviteeId)) {
      throw new ConflictException(`${invitee.full_name} already belongs to a family.`);
    }

    let inserted;
    try {
      inserted = await this.db.query(
        `INSERT INTO public.family_invitations (family_id, invited_patient_id, relationship, invited_by)
         VALUES ($1, $2, $3, $4) RETURNING invitation_id`,
        [manager.family_id, inviteeId, dto.relationship, managerId],
      );
    } catch (err: any) {
      if (err?.code === '23505') throw new ConflictException(`${invitee.full_name} already has a pending invitation.`);
      throw err;
    }
    return {
      success: true,
      message: `Invitation sent to ${invitee.full_name}. They'll see it in their profile.`,
      data: { invitationId: Number(inserted.rows[0].invitation_id), fullName: invitee.full_name },
    };
  }

  async cancelInvitation(managerId: number, invitationId: number): Promise<ApiResponse> {
    const manager = await this.requireManager(managerId);
    const res = await this.db.query(
      `UPDATE public.family_invitations SET status = 'CANCELLED', responded_at = CURRENT_TIMESTAMP
       WHERE invitation_id = $1 AND family_id = $2 AND status = 'PENDING'
       RETURNING invitation_id`,
      [invitationId, manager.family_id],
    );
    if (res.rows.length === 0) throw new NotFoundException('Pending invitation not found.');
    return { success: true, message: 'Invitation cancelled.', data: { invitationId } };
  }

  /**
   * Accept or decline an invitation. Accepting gives the family's managers full access
   * to your account (they can act as you), so it is always the invitee's own choice.
   */
  async respondToInvitation(patientId: number, invitationId: number, accept: boolean): Promise<ApiResponse> {
    return this.db.transaction(async (client) => {
      const res = await client.query(
        `SELECT i.invitation_id, i.family_id, i.relationship, f.family_name
         FROM public.family_invitations i
         JOIN public.families f ON f.family_id = i.family_id
         WHERE i.invitation_id = $1 AND i.invited_patient_id = $2 AND i.status = 'PENDING'
         FOR UPDATE OF i`,
        [invitationId, patientId],
      );
      const inv = res.rows[0];
      if (!inv) throw new NotFoundException('Pending invitation not found.');

      if (!accept) {
        await client.query(
          `UPDATE public.family_invitations SET status = 'DECLINED', responded_at = CURRENT_TIMESTAMP WHERE invitation_id = $1`,
          [invitationId],
        );
        return { success: true, message: 'Invitation declined.', data: { invitationId } };
      }

      if (await this.membershipOf(patientId, client)) {
        throw new ConflictException('You already belong to a family. Leave it before joining another.');
      }
      try {
        await client.query(
          `INSERT INTO public.family_members (family_id, patient_id, relationship, can_manage, is_managed_profile, added_by)
           SELECT $1, $2, $3, $3 = 'SPOUSE', FALSE, invited_by FROM public.family_invitations WHERE invitation_id = $4`,
          [inv.family_id, patientId, inv.relationship, invitationId],
        );
      } catch (err: any) {
        if (err?.code === '23505') throw new ConflictException('You already belong to a family.');
        throw err;
      }
      await client.query(
        `UPDATE public.family_invitations SET status = 'ACCEPTED', responded_at = CURRENT_TIMESTAMP WHERE invitation_id = $1`,
        [invitationId],
      );
      await client.query(
        `UPDATE public.family_invitations SET status = 'CANCELLED', responded_at = CURRENT_TIMESTAMP
         WHERE invited_patient_id = $1 AND status = 'PENDING'`,
        [patientId],
      );
      return { success: true, message: `You joined ${inv.family_name}.`, data: { familyId: Number(inv.family_id) } };
    });
  }

  // ---------------------------------------------------------------------------
  // Acting as a family member
  // ---------------------------------------------------------------------------

  /**
   * Gives a manager a session as a family member, so everything in the app (orders,
   * prescriptions, chats...) can be done for them. The token records who is acting.
   */
  async actAs(user: JwtPayload, targetId: number): Promise<ApiResponse> {
    if (user.actedBy) {
      throw new ForbiddenException('Switch back to your own account first.');
    }
    const managerId = Number(user.sub);
    if (targetId === managerId) throw new BadRequestException('You are already using your own account.');
    const manager = await this.requireManager(managerId);
    const target = await this.requireMemberOf(manager, targetId);

    const payload: JwtPayload = {
      sub: targetId,
      email: target.email || '',
      role: 'PATIENT',
      phoneNumber: target.phone_number,
      actedBy: managerId,
    };
    const token = this.jwtService.sign(payload, { expiresIn: ACT_AS_EXPIRY as any });
    return {
      success: true,
      message: `You are now acting for ${target.full_name}.`,
      data: {
        token,
        user: {
          id: targetId,
          fullName: target.full_name,
          email: target.email || null,
          phoneNumber: target.phone_number,
          role: 'PATIENT',
        },
        actedBy: managerId,
        expiresIn: ACT_AS_EXPIRY,
      },
    };
  }
}
