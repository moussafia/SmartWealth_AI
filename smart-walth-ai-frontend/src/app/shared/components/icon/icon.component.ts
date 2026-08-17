import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type IconName = 'sun' | 'moon' | 'bell' | 'power';

/** Stroked 24x24 glyph set, inlined so icons never depend on font coverage. */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
      @for (d of paths(); track d) {
        <path [attr.d]="d" />
      }
      @if (name() === 'sun') {
        <circle cx="12" cy="12" r="4.2" />
      }
    </svg>
  `,
  styleUrl: './icon.component.scss',
})
export class IconComponent {
  readonly name = input.required<IconName>();

  readonly paths = computed<string[]>(() => {
    switch (this.name()) {
      case 'sun':
        return [
          'M12 2.6v2.6M12 18.8v2.6M2.6 12h2.6M18.8 12h2.6M5.4 5.4l1.8 1.8M16.8 16.8l1.8 1.8M18.6 5.4l-1.8 1.8M7.2 16.8l-1.8 1.8',
        ];
      case 'moon':
        return ['M20 14.4A8.4 8.4 0 1 1 9.6 4a6.9 6.9 0 0 0 10.4 10.4Z'];
      case 'bell':
        return ['M18 15.6V10a6 6 0 1 0-12 0v5.6L4.4 18h15.2Z', 'M9.8 18a2.2 2.2 0 0 0 4.4 0'];
      case 'power':
        return ['M12 3.4v7.2', 'M7.4 6.6a6.4 6.4 0 1 0 9.2 0'];
    }
  });
}
