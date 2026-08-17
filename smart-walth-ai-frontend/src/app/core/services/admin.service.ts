import { Injectable, computed, inject } from '@angular/core';
import { CommandResult, KafkaTopicName, OK, fail } from '../../models';
import { AppStateService } from '../state/app-state.service';
import { nowIso } from '../util/id.util';
import { sum } from '../util/portfolio.util';
import { LanguageService } from './language.service';
import { TransactionService } from './transaction.service';

/** Blueprint F5.5 — service, infrastructure and Kafka queue monitoring. */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly state = inject(AppStateService);
  private readonly transactions = inject(TransactionService);
  private readonly language = inject(LanguageService);

  readonly health = this.state.health;

  readonly services = computed(() => this.health()?.services ?? []);
  readonly infrastructure = computed(() => this.health()?.infrastructure ?? []);
  readonly kafkaTopics = computed(() => this.health()?.kafkaTopics ?? []);

  readonly servicesUp = computed(
    () => this.services().filter((service) => service.status === 'UP').length,
  );
  readonly serviceCount = computed(() => this.services().length);
  readonly totalLag = computed(() => sum(this.kafkaTopics().map((topic) => topic.consumerLag)));
  readonly deadLetterTotal = computed(() =>
    sum(this.kafkaTopics().map((topic) => topic.deadLetterCount)),
  );
  readonly throughput = computed(() =>
    sum(this.kafkaTopics().map((topic) => topic.messagesPerMinute)),
  );

  /** Re-polls the probes, standing in for a fresh `/actuator/health` scrape. */
  refresh(): CommandResult {
    const health = this.health();
    if (!health) return fail('error.healthMissing');

    this.state.setHealth({
      ...health,
      generatedAt: nowIso(),
      services: health.services.map((service) => ({
        ...service,
        avgLatencyMs: jitter(service.avgLatencyMs, 0.25, 1),
        uptimePercent: Math.min(100, round(service.uptimePercent + (Math.random() - 0.4) * 0.05, 2)),
      })),
      kafkaTopics: health.kafkaTopics.map((topic) => ({
        ...topic,
        consumerLag: Math.max(0, jitter(topic.consumerLag, 0.5, 0)),
        messagesPerMinute: jitter(topic.messagesPerMinute, 0.2, 0),
      })),
    });

    return OK;
  }

  /** Brings a degraded or down service back up, as a rolling restart would. */
  restartService(id: string): CommandResult {
    const health = this.health();
    if (!health) return fail('error.healthMissing');

    const service = health.services.find((entry) => entry.id === id);
    if (!service) return fail('error.serviceMissing');

    this.state.setHealth({
      ...health,
      generatedAt: nowIso(),
      services: health.services.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              status: 'UP',
              liveness: 'PASS',
              readiness: 'PASS',
              avgLatencyMs: Math.max(8, Math.round(entry.avgLatencyMs * 0.6)),
            }
          : entry,
      ),
    });

    this.state.publish({
      eventType: 'USER_REGISTERED',
      topic: 'user-events',
      severity: 'SUCCESS',
      title: this.language.instant('event.adminTitle'),
      message: this.language.instant('event.serviceRestarted', { name: service.name }),
    });

    return OK;
  }

  /**
   * Blueprint F3.4 — drains a dead letter topic. Replaying `transaction-events`
   * also re-submits the transactions that ended up in the failure path.
   */
  replayDeadLetters(topicName: KafkaTopicName): CommandResult {
    const health = this.health();
    if (!health) return fail('error.healthMissing');

    const topic = health.kafkaTopics.find((entry) => entry.name === topicName);
    if (!topic) return fail('error.topicMissing');
    if (topic.deadLetterCount === 0) return fail('error.noDeadLetters');

    const replayed = topic.deadLetterCount;

    this.state.setHealth({
      ...health,
      generatedAt: nowIso(),
      kafkaTopics: health.kafkaTopics.map((entry) =>
        entry.name === topicName ? { ...entry, deadLetterCount: 0 } : entry,
      ),
    });

    if (topicName === 'transaction-events') {
      for (const transaction of this.transactions.failed()) {
        this.transactions.retry(transaction.id);
      }
    }

    this.state.publish({
      eventType: 'TRANSACTION_COMPLETED',
      topic: topicName,
      severity: 'INFO',
      title: this.language.instant('event.adminTitle'),
      message: this.language.instant('event.deadLettersReplayed', {
        count: replayed,
        topic: topicName,
      }),
    });

    return OK;
  }

  /** Drops a topic's consumer lag back to zero, as scaling consumers would. */
  drainLag(topicName: KafkaTopicName): CommandResult {
    const health = this.health();
    if (!health) return fail('error.healthMissing');

    this.state.setHealth({
      ...health,
      generatedAt: nowIso(),
      kafkaTopics: health.kafkaTopics.map((entry) =>
        entry.name === topicName ? { ...entry, consumerLag: 0 } : entry,
      ),
    });
    return OK;
  }
}

function jitter(value: number, spread: number, digits: number): number {
  return round(value * (1 + (Math.random() - 0.5) * spread), digits);
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
