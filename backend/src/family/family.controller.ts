import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import { FamilyService } from './family.service.js';
import { AddDependentDto, CreateFamilyDto, InviteMemberDto, UpdateDependentDto } from './dto/family.dto.js';

// A patient's family. Family heads and spouses manage it and have full privileges
// over its members, including acting as them in the app.
@ApiTags('Family')
@ApiBearerAuth()
@Controller('api/family')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PATIENT')
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Get()
  @ApiOperation({ summary: 'My family, its members and pending invitations' })
  getFamily(@CurrentUser() user: JwtPayload) {
    return this.familyService.getFamily(Number(user.sub));
  }

  @Post()
  @ApiOperation({ summary: 'Create a family (family head or spouse)' })
  createFamily(@CurrentUser() user: JwtPayload, @Body() dto: CreateFamilyDto) {
    return this.familyService.createFamily(Number(user.sub), dto);
  }

  @Post('members')
  @ApiOperation({ summary: 'Add a dependent with no account of their own (e.g. a child)' })
  addDependent(@CurrentUser() user: JwtPayload, @Body() dto: AddDependentDto) {
    return this.familyService.addDependent(Number(user.sub), dto);
  }

  @Patch('members/:patientId')
  @ApiOperation({ summary: "Edit a dependent's details or a member's relationship" })
  updateMember(
    @CurrentUser() user: JwtPayload,
    @Param('patientId', ParseIntPipe) patientId: number,
    @Body() dto: UpdateDependentDto,
  ) {
    return this.familyService.updateDependent(Number(user.sub), patientId, dto);
  }

  @Delete('members/:patientId')
  @ApiOperation({ summary: 'Remove a member, or leave the family (your own ID)' })
  removeMember(@CurrentUser() user: JwtPayload, @Param('patientId', ParseIntPipe) patientId: number) {
    return this.familyService.removeMember(Number(user.sub), patientId);
  }

  @Post('members/:patientId/act')
  @ApiOperation({ summary: 'Get a session to act for a family member' })
  actAs(@CurrentUser() user: JwtPayload, @Param('patientId', ParseIntPipe) patientId: number) {
    return this.familyService.actAs(user, patientId);
  }

  @Post('invitations')
  @ApiOperation({ summary: 'Invite an adult who already has an account' })
  invite(@CurrentUser() user: JwtPayload, @Body() dto: InviteMemberDto) {
    return this.familyService.invite(Number(user.sub), dto);
  }

  @Delete('invitations/:invitationId')
  @ApiOperation({ summary: 'Cancel an invitation you sent' })
  cancelInvitation(@CurrentUser() user: JwtPayload, @Param('invitationId', ParseIntPipe) invitationId: number) {
    return this.familyService.cancelInvitation(Number(user.sub), invitationId);
  }

  @Post('invitations/:invitationId/accept')
  @ApiOperation({ summary: 'Accept an invitation to join a family' })
  accept(@CurrentUser() user: JwtPayload, @Param('invitationId', ParseIntPipe) invitationId: number) {
    return this.familyService.respondToInvitation(Number(user.sub), invitationId, true);
  }

  @Post('invitations/:invitationId/decline')
  @ApiOperation({ summary: 'Decline an invitation to join a family' })
  decline(@CurrentUser() user: JwtPayload, @Param('invitationId', ParseIntPipe) invitationId: number) {
    return this.familyService.respondToInvitation(Number(user.sub), invitationId, false);
  }
}
