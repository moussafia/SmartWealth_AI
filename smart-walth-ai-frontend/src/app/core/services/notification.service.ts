import { Injectable, computed, inject } from '@angular/core';
import { AppStateService } from '../state/app-state.service';

/** Blueprint F5.3 — the Kafka-sourced event feed and its read/dismiss triage. */
@Injectable({ providedIn: 'root' })
export class NotificationFeedService {
  private readonly state = inject(AppStateService);

  readonly all = this.state.notifications;
  readonly unreadCount = this.state.unreadNotificationCount;

  readonly latest = computed(() => this.all().slice(0, 5));
  readonly hasUnread = computed(() => this.unreadCount() > 0);

  markRead(id: string): void {
    this.state.setNotifications(
      this.all().map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
  }

  toggleRead(id: string): void {
    this.state.setNotifications(
      this.all().map((item) => (item.id === id ? { ...item, read: !item.read } : item)),
    );
  }

  markAllRead(): void {
    this.state.setNotifications(this.all().map((item) => ({ ...item, read: true })));
  }

  dismiss(id: string): void {
    this.state.setNotifications(this.all().filter((item) => item.id !== id));
  }

  clearAll(): void {
    this.state.setNotifications([]);
  }
}
