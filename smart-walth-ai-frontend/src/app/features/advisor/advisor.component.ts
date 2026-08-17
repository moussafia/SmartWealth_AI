import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AdvisorService } from '../../core/services/advisor.service';
import { LanguageService } from '../../core/services/language.service';
import { PortfolioService } from '../../core/services/portfolio.service';
import {
  formatDateTime,
  formatDay,
  formatMoney,
  formatNumberValue,
  formatPercent,
} from '../../core/util/format.util';
import { AdvisorAlert, ReportMetric } from '../../models';
import { CardComponent } from '../../shared/components/card/card.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { DeltaChipComponent } from '../../shared/components/delta-chip/delta-chip.component';
import { MetricTileComponent } from '../../shared/components/metric-tile/metric-tile.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ScoreBarComponent } from '../../shared/components/score-bar/score-bar.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { priorityTone, riskLevelTone } from '../../shared/util/tone.util';

/** Questions offered as one-tap prompts, mapped to the agent's intents. */
const SUGGESTIONS = [
  'advisor.suggestDiversification',
  'advisor.suggestRisk',
  'advisor.suggestSpending',
  'advisor.suggestAdvice',
] as const;

/** Blueprint F4 + F5.4: agent chat, multi-step reasoning, report, alerts and RAG corpus. */
@Component({
  selector: 'app-advisor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    PageHeaderComponent,
    CardComponent,
    MetricTileComponent,
    DataTableComponent,
    DeltaChipComponent,
    StatusChipComponent,
    ScoreBarComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './advisor.component.html',
  styleUrl: './advisor.component.scss',
})
export class AdvisorComponent {
  private readonly fb = inject(FormBuilder);
  private readonly language = inject(LanguageService);
  private readonly advisor = inject(AdvisorService);
  private readonly portfolio = inject(PortfolioService);

  readonly session = this.advisor.session;
  readonly messages = this.advisor.messages;
  readonly memoryTurns = this.advisor.memoryTurns;
  readonly thinking = this.advisor.thinking;
  readonly analysis = this.advisor.analysis;
  readonly analysisRunning = this.advisor.analysisRunning;
  readonly report = this.advisor.report;
  readonly alerts = this.advisor.alerts;
  readonly activeAlerts = this.advisor.activeAlerts;
  readonly hasTriagedAlerts = this.advisor.hasTriagedAlerts;

  readonly priorityTone = priorityTone;
  readonly riskLevelTone = riskLevelTone;

  readonly suggestions = SUGGESTIONS;

  readonly chatForm = this.fb.nonNullable.group({
    message: ['', [Validators.required, Validators.maxLength(400)]],
  });

  readonly analysisForm = this.fb.nonNullable.group({
    query: ['', [Validators.required, Validators.maxLength(200)]],
  });

  /** Blueprint §5.3 — free-text lookup over the indexed RAG corpus. */
  readonly knowledgeQuery = signal('');
  readonly knowledge = computed(() => this.advisor.searchKnowledge(this.knowledgeQuery()));

  readonly pendingDismiss = signal<AdvisorAlert | null>(null);
  readonly confirmClearMemory = signal(false);

  readonly activeAlertCount = computed(() => this.activeAlerts().length);

  // --- Chat ---------------------------------------------------------------

  send(): void {
    if (this.chatForm.invalid || this.thinking()) {
      this.chatForm.markAllAsTouched();
      return;
    }

    const result = this.advisor.send(this.chatForm.controls.message.value);
    if (result.ok) this.chatForm.reset({ message: '' });
  }

  /** Fills the composer with a suggested question and sends it straight away. */
  ask(key: string): void {
    if (this.thinking()) return;
    this.chatForm.controls.message.setValue(this.language.instant(key));
    this.send();
  }

  requestClearMemory(): void {
    this.confirmClearMemory.set(true);
  }

  clearMemory(): void {
    this.advisor.clearMemory();
    this.confirmClearMemory.set(false);
  }

  // --- Analysis and report ------------------------------------------------

  runAnalysis(): void {
    if (this.analysisForm.invalid) {
      this.analysisForm.markAllAsTouched();
      return;
    }
    this.advisor.runAnalysis(this.analysisForm.controls.query.value);
  }

  regenerateReport(): void {
    this.advisor.regenerateReport();
  }

  // --- Alert triage -------------------------------------------------------

  acknowledge(id: string): void {
    this.advisor.acknowledge(id);
  }

  requestDismiss(alert: AdvisorAlert): void {
    this.pendingDismiss.set(alert);
  }

  cancelDismiss(): void {
    this.pendingDismiss.set(null);
  }

  dismissConfirmed(): void {
    const target = this.pendingDismiss();
    if (!target) return;
    this.advisor.dismiss(target.id);
    this.pendingDismiss.set(null);
  }

  restoreAlerts(): void {
    this.advisor.restoreAlerts();
  }

  // --- Knowledge base -----------------------------------------------------

  onKnowledgeSearch(event: Event): void {
    this.knowledgeQuery.set((event.target as HTMLInputElement).value);
  }

  clearKnowledgeSearch(): void {
    this.knowledgeQuery.set('');
  }

  // --- Formatting ---------------------------------------------------------

  metricValue(metric: ReportMetric): string {
    const locale = this.language.locale;
    switch (metric.unit) {
      case 'USD':
        return formatMoney(metric.value, locale, this.portfolio.currency());
      case 'PERCENT':
        return formatPercent(metric.value, locale);
      case 'MONTHS':
        return `${formatNumberValue(metric.value, locale, '1.0-1')} ${this.language.instant('common.months')}`;
    }
  }

  money(value: number): string {
    return formatMoney(value, this.language.locale, this.portfolio.currency());
  }

  seconds(durationMs: number): string {
    return `${formatNumberValue(durationMs / 1000, this.language.locale, '1.1-2')} s`;
  }

  day(value: string): string {
    return formatDay(value, this.language.locale);
  }

  when(value: string): string {
    return formatDateTime(value, this.language.locale);
  }

  percent(value: number): string {
    return formatPercent(value, this.language.locale);
  }
}
