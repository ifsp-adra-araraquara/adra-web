import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AulaComDetalhesResponseDTO } from '../../../shared/models/aula/AulaComDetalhesResponseDTO';
import { AulaModal } from '../../../shared/components/aula-modal/aula-modal';
import { calcularSituacaoAula, ehAulaDeHoje, hojeISO, podeAbrirAula } from '../../../shared/utils/aula.util';
import { Badge } from '../../../shared/components/badge/badge';
import { Input } from '../../../shared/components/input/input';
import { Button } from '../../../shared/components/button/button';

/**
 * Tela "Chamada" do sociopedagogico (também acessível ao coordenador):
 * mostra, por padrao, as aulas de hoje (de todas as turmas), com um filtro
 * de data em cima pra trocar o dia e encontrar aulas passadas ou futuras.
 * Reaproveita o mesmo <app-aula-modal> das outras telas de aula — pro
 * sociopedagogico, clicar numa aula abre a chamada.
 *
 * Não confundir com a tela "Aulas" (`features/home/aulas`): aquela é o
 * painel de acompanhamento do coordenador (turmas → aulas → alunos, sem
 * abrir aula); esta aqui é o fluxo do dia a dia pra efetivamente tomar
 * chamada.
 */
@Component({
  selector: 'app-chamada',
  standalone: true,
  imports: [FormsModule, AulaModal, Badge, Input, Button],
  templateUrl: './chamada.html',
  styleUrl: './chamada.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Chamada implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly aulas = signal<AulaComDetalhesResponseDTO[]>([]);
  readonly dataSelecionada = signal<string>(hojeISO());
  readonly aulaAberta = signal<AulaComDetalhesResponseDTO | null>(null);

  readonly hojeISO = hojeISO;

  ngOnInit(): void {
    this.carregarAulas();
  }

  onDataChange(valor: string): void {
    if (!valor) return;
    this.dataSelecionada.set(valor);
    this.carregarAulas();
  }

  irParaHoje(): void {
    this.onDataChange(hojeISO());
  }

  abrirAula(aula: AulaComDetalhesResponseDTO): void {
    if (!this.podeAbrir(aula)) return;
    this.aulaAberta.set(aula);
  }

  fecharAulaModal(): void {
    this.aulaAberta.set(null);
  }

  aoSalvarChamada(): void {
    this.carregarAulas();
  }

  podeAbrir(aula: AulaComDetalhesResponseDTO): boolean {
    return podeAbrirAula(aula.dataAula, aula.statusAula);
  }

  ehHoje(aula: AulaComDetalhesResponseDTO): boolean {
    return ehAulaDeHoje(aula.dataAula);
  }

  situacaoAula(aula: AulaComDetalhesResponseDTO) {
    return calcularSituacaoAula(aula.dataAula, aula.statusAula);
  }

  private async carregarAulas(): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    try {
      const aulas = await firstValueFrom(
        this.http.get<AulaComDetalhesResponseDTO[]>(`${this.api}/api/aulas/com-detalhes`, {
          params: { dataAula: this.dataSelecionada() },
        }),
      );
      this.aulas.set(
        [...aulas].sort((a, b) => (a.horarioInicio ?? '').localeCompare(b.horarioInicio ?? '')),
      );
    } catch {
      this.erro.set('Não foi possível carregar as aulas desta data.');
    } finally {
      this.carregando.set(false);
    }
  }
}
