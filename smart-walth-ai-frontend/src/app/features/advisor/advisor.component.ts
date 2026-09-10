import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../core/services/language.service';
import { AdvisorService } from '../../core/services/advisor.service';
import { formatDateTime } from '../../core/util/format.util';
import { AdvisorMode, ChatMessage } from '../../core/models/advisor.model';
import { CardComponent } from '../../shared/components/card/card.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

interface ModeOption {
  key: AdvisorMode;
  labelKey: string;
  hintKey: string;
  icon: string;
}

/** Blueprint F4 / F5.3 — assistant IA : conversation, agent à outils, base de connaissances. */
@Component({
  selector: 'app-advisor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, PageHeaderComponent, CardComponent, StatusChipComponent],
  templateUrl: './advisor.component.html',
  styleUrl: './advisor.component.scss',
})
export class AdvisorComponent {
  private readonly language = inject(LanguageService);
  private readonly advisor = inject(AdvisorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sanitizer = inject(DomSanitizer);

  readonly modes: readonly ModeOption[] = [
    { key: 'chat', labelKey: 'advisor.modeChat', hintKey: 'advisor.modeChatHint', icon: '💬' },
    { key: 'agent', labelKey: 'advisor.modeAgent', hintKey: 'advisor.modeAgentHint', icon: '🧠' },
    { key: 'knowledge', labelKey: 'advisor.modeKnowledge', hintKey: 'advisor.modeKnowledgeHint', icon: '📚' },
  ];

  /** Suggestions cliquables selon le mode actif. */
  readonly suggestions: Record<AdvisorMode, string[]> = {
    chat: ['advisor.suggestChat1', 'advisor.suggestChat2'],
    agent: ['advisor.suggestAgent1', 'advisor.suggestAgent2'],
    knowledge: ['advisor.suggestKnow1', 'advisor.suggestKnow2'],
  };

  readonly mode = signal<AdvisorMode>('chat');

  /** Une conversation SÉPARÉE par onglet. */
  private readonly threads = signal<Record<AdvisorMode, ChatMessage[]>>({
    chat: [],
    agent: [],
    knowledge: [],
  });

  readonly draft = signal('');
  readonly loading = signal(false);
  readonly errorKey = signal('');

  /** Messages de l'onglet actuellement sélectionné. */
  readonly messages = computed(() => this.threads()[this.mode()]);

  readonly activeMode = computed(
    () => this.modes.find((m) => m.key === this.mode()) ?? this.modes[0],
  );
  readonly canSend = computed(() => this.draft().trim().length > 0 && !this.loading());
  readonly isChat = computed(() => this.mode() === 'chat');
  readonly isEmpty = computed(() => this.messages().length === 0);
  readonly activeSuggestions = computed(() => this.suggestions[this.mode()]);

  constructor() {
    // Défile vers le bas à chaque nouveau message ou changement d'onglet.
    effect(() => {
      this.messages();
      queueMicrotask(() => {
        const el = document.querySelector('.thread');
        if (el) el.scrollTop = el.scrollHeight;
      });
    });
  }

  selectMode(mode: AdvisorMode): void {
    this.mode.set(mode);
    this.errorKey.set('');
    this.draft.set('');
  }

  onInput(event: Event): void {
    this.draft.set((event.target as HTMLTextAreaElement).value);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  useSuggestion(key: string): void {
    this.draft.set(this.language.instant(key));
  }

  send(): void {
    const text = this.draft().trim();
    if (!text || this.loading()) return;

    const currentMode = this.mode();
    this.pushMessage('user', text, currentMode);
    this.draft.set('');
    this.errorKey.set('');
    this.loading.set(true);

    const call$ =
      currentMode === 'agent'
        ? this.advisor.agent({ message: text })
        : currentMode === 'knowledge'
          ? this.advisor.knowledge({ message: text })
          : this.advisor.chat({ message: text });

    call$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.pushMessage('assistant', res.reply, currentMode);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorKey.set(err.status === 0 ? 'error.network' : 'error.generic');
      },
    });
  }

  /** Vide la mémoire backend + le thread de l'onglet conversation. */
  clearMemory(): void {
    this.advisor
      .clearMemory()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.threads.update((all) => ({ ...all, chat: [] })),
        error: () => this.threads.update((all) => ({ ...all, chat: [] })),
      });
  }

  /** Efface uniquement la conversation de l'onglet actif. */
  clearThread(): void {
    const current = this.mode();
    this.threads.update((all) => ({ ...all, [current]: [] }));
    this.errorKey.set('');
  }

  private pushMessage(role: 'user' | 'assistant', text: string, mode: AdvisorMode): void {
    const message: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role,
      text,
      at: new Date().toISOString(),
      mode,
    };
    this.threads.update((all) => ({
      ...all,
      [mode]: [...all[mode], message],
    }));
  }

  when(value: string): string {
    return formatDateTime(value, this.language.locale);
  }

  renderMarkdown(text: string): SafeHtml {
    const html = marked.parse(text, { async: false }) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
