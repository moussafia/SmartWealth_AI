import { KafkaTopicName } from './notification.model';

export type ServiceStatus = 'UP' | 'DEGRADED' | 'DOWN';
export type ProbeResult = 'PASS' | 'FAIL';

export interface MicroserviceHealth {
  id: string;
  name: string;
  responsibility: string;
  database: string | null;
  port: number;
  status: ServiceStatus;
  instances: number;
  uptimePercent: number;
  avgLatencyMs: number;
  liveness: ProbeResult;
  readiness: ProbeResult;
}

export interface InfrastructureComponent {
  id: string;
  name: string;
  technology: string;
  role: string;
  status: ServiceStatus;
}

export interface KafkaTopicHealth {
  name: KafkaTopicName;
  producer: string;
  consumers: string[];
  consumerLag: number;
  messagesPerMinute: number;
  deadLetterCount: number;
}

/** Shape of `assets/data/admin-health.json` — the F5.5 admin dashboard. */
export interface AdminHealth {
  generatedAt: string;
  services: MicroserviceHealth[];
  infrastructure: InfrastructureComponent[];
  kafkaTopics: KafkaTopicHealth[];
}
