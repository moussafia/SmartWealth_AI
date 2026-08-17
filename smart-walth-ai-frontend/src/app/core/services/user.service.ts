import { Injectable, computed, inject } from '@angular/core';
import { CommandResult, OK, ProfileDraft, fail } from '../../models';
import { AppStateService } from '../state/app-state.service';
import { nowIso } from '../util/id.util';
import { LanguageService } from './language.service';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Blueprint F1.2 / F1.3 — profile, KYC status and the role used for access control. */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly state = inject(AppStateService);
  private readonly language = inject(LanguageService);

  readonly me = this.state.user;
  readonly isAdmin = this.state.isAdmin;

  readonly fullName = computed(() => {
    const user = this.me();
    return user ? `${user.firstName} ${user.lastName}` : '';
  });

  readonly initials = computed(() => {
    const user = this.me();
    return user ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}` : '';
  });

  /** Equivalent of PUT /api/users/me. */
  updateProfile(draft: ProfileDraft): CommandResult {
    const user = this.me();
    if (!user) return fail('error.userMissing');
    if (!EMAIL_PATTERN.test(draft.email)) return fail('error.emailInvalid');

    this.state.setUser({
      ...user,
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      email: draft.email.trim().toLowerCase(),
      updatedAt: nowIso(),
    });

    this.state.publish({
      eventType: 'USER_REGISTERED',
      topic: 'user-events',
      severity: 'SUCCESS',
      title: this.language.instant('event.profileTitle'),
      message: this.language.instant('event.profileUpdated'),
    });

    return OK;
  }

  /** Moves KYC to VERIFIED, the only transition the blueprint's enum allows. */
  submitKyc(): CommandResult {
    const user = this.me();
    if (!user) return fail('error.userMissing');
    if (user.kycStatus === 'VERIFIED') return fail('error.kycAlreadyVerified');

    this.state.setUser({ ...user, kycStatus: 'VERIFIED', updatedAt: nowIso() });
    this.state.publish({
      eventType: 'USER_REGISTERED',
      topic: 'user-events',
      severity: 'SUCCESS',
      title: this.language.instant('event.profileTitle'),
      message: this.language.instant('event.kycVerified'),
    });
    return OK;
  }

  /** Demo affordance for F1.3: lets the reviewer see the app from both roles. */
  toggleRole(): CommandResult {
    const user = this.me();
    if (!user) return fail('error.userMissing');

    this.state.setUser({
      ...user,
      role: user.role === 'ADMIN' ? 'USER' : 'ADMIN',
      updatedAt: nowIso(),
    });
    return OK;
  }

  /** Resets KYC so the verification flow can be replayed in a demo. */
  resetKyc(): CommandResult {
    const user = this.me();
    if (!user) return fail('error.userMissing');

    this.state.setUser({ ...user, kycStatus: 'PENDING', updatedAt: nowIso() });
    return OK;
  }
}
