import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <p class="text-xs font-bold uppercase tracking-widest text-slate-400">{{ title }}</p>
      <p class="mt-2 text-2xl font-extrabold" [ngClass]="valueClass">{{ value }}</p>
      <p class="text-xs text-slate-500">{{ subtitle }}</p>
    </article>
  `,
})
export class StatCardComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) value = '';
  @Input() subtitle = '';
  @Input() valueClass = 'text-primary';
}
