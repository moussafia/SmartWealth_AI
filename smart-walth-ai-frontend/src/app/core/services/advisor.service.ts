import { Injectable, computed, inject } from '@angular/core';
import { ChatMessage, ChatSession, CommandResult, OK, StepStatus, fail } from '../../models';
import { AnalysisRun, AppStateService } from '../state/app-state.service';
import { newId, nowIso } from '../util/id.util';
import { ANALYSIS_TOOLS, AdvisorEngineService } from './advisor-engine.service';
import { LanguageService } from './language.service';

/** Per-step latency of the simulated tool calls, in milliseconds. */
const STEP_DURATIONS = [198, 276, 331, 412, 1204];
/** How long the agent "thinks" before a chat reply lands. */
const REPLY_DELAY_MS = 650;

/**
 * Blueprint F4 + F5.4 — the agent's conversation, reasoning trace, report and alerts.
 *
 * Content comes from {@link AdvisorEngineService}, which derives every figure
 * from live state; this store owns the interaction and progress bookkeeping.
 */
@Injectable({ providedIn: 'root' })
export class AdvisorService {
  private readonly state = inject(AppStateService);
  private readonly engine = inject(AdvisorEngineService);
  private readonly language = inject(LanguageService);

  private stepTimers: ReturnType<typeof setTimeout>[] = [];
  private replyTimer: ReturnType<typeof setTimeout> | null = null;

  readonly session = this.state.chat;
  readonly analysis = this.engine.analysis;
  readonly report = this.engine.report;
  readonly alerts = this.engine.alerts;
  readonly activeAlerts = this.engine.activeAlerts;
  readonly hasTriagedAlerts = this.engine.hasTriagedAlerts;
  readonly knowledge = this.state.knowledge;

  readonly messages = computed(() => this.session()?.messages ?? []);
  readonly memoryTurns = computed(
    () => this.messages().filter((message) => message.role === 'USER').length,
  );

  /** True while the agent is composing a reply, so the composer can lock. */
  readonly thinking = computed(() => this.pendingReply());
  private readonly pendingReply = computed(() => {
    const messages = this.messages();
    return messages.length > 0 && messages[messages.length - 1].role === 'USER';
  });

  readonly analysisRunning = computed(() => {
    const run = this.state.analysisRun();
    return run !== null && run.completedAt === null;
  });

  // --- F5.4 chat ----------------------------------------------------------

  /** Appends the question, then answers from live state after a short delay. */
  send(question: string): CommandResult {
    const text = question.trim();
    if (!text) return fail('error.messageEmpty');

    const session = this.session();
    if (!session) return fail('error.sessionMissing');

    const userMessage: ChatMessage = {
      id: newId(),
      role: 'USER',
      content: text,
      createdAt: nowIso(),
      toolCalls: [],
    };

    this.setSession(session, [...session.messages, userMessage]);

    if (this.replyTimer !== null) clearTimeout(this.replyTimer);
    this.replyTimer = setTimeout(() => {
      this.replyTimer = null;
      this.appendReply(text);
    }, REPLY_DELAY_MS);

    return OK;
  }

  /** Blueprint F1.4 analogue for the agent: drops the conversational memory. */
  clearMemory(): CommandResult {
    const session = this.session();
    if (!session) return fail('error.sessionMissing');

    if (this.replyTimer !== null) {
      clearTimeout(this.replyTimer);
      this.replyTimer = null;
    }

    this.state.setChat({
      ...session,
      sessionId: newId(),
      startedAt: nowIso(),
      memoryTurns: 0,
      messages: [],
    });
    return OK;
  }

  private appendReply(question: string): void {
    const session = this.session();
    if (!session) return;

    const { content, tools } = this.engine.replyTo(question);

    const agentMessage: ChatMessage = {
      id: newId(),
      role: 'AGENT',
      content,
      createdAt: nowIso(),
      toolCalls: tools.map((tool, index) => ({
        tool,
        status: 'DONE' as StepStatus,
        durationMs: STEP_DURATIONS[index] ?? 200,
      })),
    };

    this.setSession(session, [...session.messages, agentMessage]);
  }

  private setSession(session: ChatSession, messages: ChatMessage[]): void {
    this.state.setChat({
      ...session,
      messages,
      memoryTurns: messages.filter((message) => message.role === 'USER').length,
    });
  }

  // --- §5.1 multi-step analysis ------------------------------------------

  /** Walks the tool sequence, flipping each step to DONE on its own timer. */
  runAnalysis(query: string): CommandResult {
    const text = query.trim();
    if (!text) return fail('error.queryEmpty');
    if (this.analysisRunning()) return fail('error.analysisRunning');

    this.clearStepTimers();

    const run: AnalysisRun = {
      id: newId(),
      query: text,
      startedAt: nowIso(),
      completedAt: null,
      stepStatuses: ANALYSIS_TOOLS.map((_, index) => (index === 0 ? 'RUNNING' : 'PENDING')),
      stepDurations: ANALYSIS_TOOLS.map((_, index) => STEP_DURATIONS[index] ?? 200),
    };
    this.state.setAnalysisRun(run);

    let elapsed = 0;
    ANALYSIS_TOOLS.forEach((_, index) => {
      elapsed += run.stepDurations[index];
      this.stepTimers.push(
        setTimeout(() => {
          this.state.patchAnalysisRun({
            stepStatuses: ANALYSIS_TOOLS.map((__, position) => {
              if (position < index + 1) return 'DONE';
              if (position === index + 1) return 'RUNNING';
              return 'PENDING';
            }),
          });

          if (index === ANALYSIS_TOOLS.length - 1) {
            this.state.patchAnalysisRun({ completedAt: nowIso() });
          }
        }, elapsed),
      );
    });

    return OK;
  }

  // --- Report and alerts -------------------------------------------------

  /** Re-stamps the report so its period and figures follow current state. */
  regenerateReport(): CommandResult {
    this.state.stampReport();
    this.state.publish({
      eventType: 'PORTFOLIO_UPDATED',
      topic: 'alert-events',
      severity: 'INFO',
      title: this.language.instant('event.reportTitle'),
      message: this.language.instant('event.reportMessage', {
        score: this.engine.healthScore(),
      }),
    });
    return OK;
  }

  acknowledge(id: string): CommandResult {
    this.state.acknowledgeAlert(id);
    return OK;
  }

  dismiss(id: string): CommandResult {
    this.state.dismissAlert(id);
    return OK;
  }

  /** Clears the user's triage so every rule-produced alert is visible again. */
  restoreAlerts(): CommandResult {
    this.state.restoreAlerts();
    return OK;
  }

  searchKnowledge(query: string) {
    return this.engine.searchKnowledge(query);
  }

  private clearStepTimers(): void {
    for (const timer of this.stepTimers) clearTimeout(timer);
    this.stepTimers = [];
  }
}
