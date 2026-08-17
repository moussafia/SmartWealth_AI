import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';

export type AppLanguage = 'fr' | 'en';

export const SUPPORTED_LANGUAGES: readonly AppLanguage[] = ['fr', 'en'] as const;

const STORAGE_KEY = 'smartwealth.lang';

/** Maps the UI language onto the locale used by CurrencyPipe / DatePipe. */
export const LOCALE_BY_LANGUAGE: Record<AppLanguage, string> = {
  fr: 'fr-FR',
  en: 'en-US',
};

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);
  private readonly current = signal<AppLanguage>('fr');
  /** Bumped once a language's dictionary is actually loaded. */
  private readonly revision = signal(0);

  readonly language = this.current.asReadonly();

  constructor() {
    this.translate.onLangChange
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.revision.update((value) => value + 1));
  }

  init(): void {
    this.use(this.restore());
  }

  /**
   * Reactive counterpart of `TranslateService.instant`, for the few labels that
   * have to be resolved in TypeScript (chart axes, series names). Reading
   * `revision` makes any `computed()` around it re-run after a language switch.
   */
  instant(key: string, params?: Record<string, unknown>): string {
    this.revision();
    return this.translate.instant(key, params) as string;
  }

  use(language: AppLanguage): void {
    this.current.set(language);
    this.translate.use(language);
    this.document.documentElement.lang = language;
    this.document.defaultView?.localStorage?.setItem(STORAGE_KEY, language);
  }

  toggle(): void {
    this.use(this.current() === 'fr' ? 'en' : 'fr');
  }

  get locale(): string {
    return LOCALE_BY_LANGUAGE[this.current()];
  }

  private restore(): AppLanguage {
    const stored = this.document.defaultView?.localStorage?.getItem(STORAGE_KEY);
    return SUPPORTED_LANGUAGES.includes(stored as AppLanguage) ? (stored as AppLanguage) : 'fr';
  }
}
