import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { OficineiroHistoricoDTO } from '../../models/historico/OficineiroHistoricoDTO';
import { Badge } from '../badge/badge';

/**
 * Linha do tempo de oficineiros responsáveis por uma oficina ou turma
 * (GET /api/{recurso}/{id}/oficineiros-historico).
 *
 *   <app-historico-oficineiros recurso="oficinas" [id]="oficina.oficinaId" />
 */
@Component({
  selector: 'app-historico-oficineiros',
  imports: [DatePipe, Badge],
  templateUrl: './historico-oficineiros.html',
  styleUrl: './historico-oficineiros.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoricoOficineiros {
  private readonly http = inject(HttpClient);

  recurso = input.required<'oficinas' | 'turmas'>();
  id = input.required<number>();

  protected readonly historico = signal<OficineiroHistoricoDTO[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal(false);

  constructor() {
    effect((onCleanup) => {
      const url = `${environment.apiUrl}/api/${this.recurso()}/${this.id()}/oficineiros-historico`;
      this.carregando.set(true);
      this.erro.set(false);
      const sub = this.http.get<OficineiroHistoricoDTO[]>(url).subscribe({
        next: (lista) => {
          this.historico.set(lista);
          this.carregando.set(false);
        },
        error: () => {
          this.erro.set(true);
          this.carregando.set(false);
        },
      });
      onCleanup(() => sub.unsubscribe());
    });
  }
}
