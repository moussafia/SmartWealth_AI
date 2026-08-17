import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  ChartType,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { LanguageService } from '../../../core/services/language.service';
import { ThemeService } from '../../../core/services/theme.service';
import { formatMoney, formatNumberValue, formatPercent } from '../../../core/util/format.util';

Chart.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
);

export type ChartKind = Extract<ChartType, 'line' | 'bar' | 'doughnut'>;
export type ChartTone = 'positive' | 'negative' | 'info' | 'accent' | 'neutral' | 'warning';
export type ValueFormat = 'money' | 'percent' | 'number';

export interface ChartSeries {
  label: string;
  data: number[];
  /** A single tone for the whole series, or one tone per data point. */
  tone: ChartTone | ChartTone[];
}

/**
 * Thin Chart.js wrapper. Colours are resolved from the CSS custom properties at
 * render time, so the chart re-themes with the rest of the app instead of
 * carrying its own palette.
 */
@Component({
  selector: 'app-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chart" [style.height]="height()">
      <canvas #canvas [attr.aria-label]="ariaLabel()" role="img"></canvas>
    </div>
  `,
  styleUrl: './chart.component.scss',
})
export class ChartComponent {
  private readonly theme = inject(ThemeService);
  private readonly language = inject(LanguageService);
  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private chart?: Chart;

  readonly kind = input.required<ChartKind>();
  readonly labels = input.required<string[]>();
  readonly series = input.required<ChartSeries[]>();
  readonly height = input<string>('220px');
  readonly valueFormat = input<ValueFormat>('number');
  readonly currency = input<string>('USD');
  readonly showLegend = input<boolean>(false);
  readonly beginAtZero = input<boolean>(false);
  readonly ariaLabel = input<string>('');

  constructor() {
    inject(DestroyRef).onDestroy(() => this.chart?.destroy());

    effect(() => {
      const canvas = this.canvasRef()?.nativeElement;
      // Read the theme signal so a light/dark switch triggers a re-render.
      this.theme.theme();
      const config = this.buildConfig();

      if (!canvas) {
        return;
      }

      this.chart?.destroy();
      this.chart = new Chart(canvas, config);
    });
  }

  private buildConfig(): ChartConfiguration {
    const kind = this.kind();
    const grid = this.token('--color-border');
    const text = this.token('--color-text-secondary');
    const surface = this.token('--color-surface');
    const isDoughnut = kind === 'doughnut';

    return {
      type: kind,
      data: {
        labels: this.labels(),
        datasets: this.series().map((series) => this.buildDataset(series, kind)),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 150, easing: 'easeOutQuad' },
        interaction: { intersect: false, mode: isDoughnut ? 'nearest' : 'index' },
        plugins: {
          legend: {
            display: this.showLegend(),
            position: isDoughnut ? 'right' : 'top',
            labels: {
              color: text,
              boxWidth: 8,
              boxHeight: 8,
              usePointStyle: true,
              font: { family: this.token('--font-family-base'), size: 11 },
            },
          },
          tooltip: {
            backgroundColor: surface,
            borderColor: grid,
            borderWidth: 1,
            titleColor: this.token('--color-text-primary'),
            bodyColor: text,
            padding: 8,
            displayColors: false,
            titleFont: { family: this.token('--font-family-base'), size: 11 },
            bodyFont: { family: this.token('--font-family-mono'), size: 12 },
            callbacks: {
              label: (context) => {
                const raw = context.parsed as number | { y: number };
                const value = typeof raw === 'number' ? raw : raw.y;
                return `${context.dataset.label ?? ''} ${this.formatValue(value)}`.trim();
              },
            },
          },
        },
        scales: isDoughnut
          ? {}
          : {
              x: {
                grid: { display: false },
                border: { color: grid },
                ticks: { color: text, font: { family: this.token('--font-family-mono'), size: 10 } },
              },
              y: {
                beginAtZero: this.beginAtZero(),
                grid: { color: grid },
                border: { display: false },
                ticks: {
                  color: text,
                  font: { family: this.token('--font-family-mono'), size: 10 },
                  callback: (value) => this.formatTick(Number(value)),
                },
              },
            },
      },
    };
  }

  private buildDataset(series: ChartSeries, kind: ChartKind) {
    const tones = series.tone;
    const colors = Array.isArray(tones)
      ? tones.map((tone) => this.toneColor(tone))
      : this.toneColor(tones);
    const single = Array.isArray(colors) ? colors[0] : colors;

    if (kind === 'line') {
      return {
        label: series.label,
        data: series.data,
        borderColor: single,
        backgroundColor: this.toneColor(
          Array.isArray(tones) ? tones[0] : tones,
          true,
        ),
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 3,
        pointHoverBackgroundColor: single,
        tension: 0.25,
        fill: true,
      };
    }

    if (kind === 'doughnut') {
      return {
        label: series.label,
        data: series.data,
        backgroundColor: colors,
        borderColor: this.token('--color-surface'),
        borderWidth: 2,
        hoverOffset: 4,
      };
    }

    return {
      label: series.label,
      data: series.data,
      backgroundColor: colors,
      borderWidth: 0,
      borderRadius: 2,
      maxBarThickness: 28,
    };
  }

  private formatValue(value: number): string {
    switch (this.valueFormat()) {
      case 'money':
        return formatMoney(value, this.language.locale, this.currency());
      case 'percent':
        return formatPercent(value, this.language.locale);
      default:
        return String(value);
    }
  }

  /**
   * Axis ticks drop the currency symbol: its position varies by locale, which
   * collides with the `k` suffix (`$125k` vs `125 $k`).
   */
  private formatTick(value: number): string {
    if (this.valueFormat() === 'money' && Math.abs(value) >= 1000) {
      return `${formatNumberValue(value / 1000, this.language.locale, '1.0-0')}k`;
    }
    return this.formatValue(value);
  }

  private toneColor(tone: ChartTone, translucent = false): string {
    return this.token(translucent ? `--color-${tone}-bg` : `--color-${tone}`);
  }

  private token(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
}
