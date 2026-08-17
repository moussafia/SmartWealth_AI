/** Kafka event names published by the services (blueprint §4.3). */
export type KafkaEventType =
  | 'USER_REGISTERED'
  | 'TRANSACTION_COMPLETED'
  | 'PORTFOLIO_UPDATED'
  | 'ANOMALY_DETECTED';

export type KafkaTopicName =
  | 'user-events'
  | 'transaction-events'
  | 'portfolio-events'
  | 'alert-events';

export type NotificationChannel = 'PUSH' | 'EMAIL';
export type NotificationSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';

/** Shape of `assets/data/notifications.json` — the F5.3 event feed. */
export interface AppNotification {
  id: string;
  eventType: KafkaEventType;
  topic: KafkaTopicName;
  channel: NotificationChannel;
  severity: NotificationSeverity;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}
