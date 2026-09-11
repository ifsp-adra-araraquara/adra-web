import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { avaliarForcaSenha } from '../../utils/senha-forca';

@Component({
  selector: 'app-senha-forca',
  standalone: true,
  templateUrl: './senha-forca.html',
  styleUrl: './senha-forca.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SenhaForca {
  senha = input.required<string>();

  resultado = computed(() => avaliarForcaSenha(this.senha()));
  segmentos = computed(() => [0, 1, 2, 3]);
}