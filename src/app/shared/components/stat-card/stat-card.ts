import { Component, input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  templateUrl: './stat-card.html'
})
export class StatCard {
  iconClass = input.required<string>();   // ex: 'ico-green'
  value = input.required<string>();
  label = input.required<string>();
  trend = input<string>('');
  trendClass = input<string>('muted');    // 't-up' | 't-down' | 'muted'
}