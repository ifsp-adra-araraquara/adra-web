import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { TurmaResponseDTO } from '../../../../shared/models/turma/TurmaResponseDTO';
import { AssistidoResponseDTO } from '../../../../shared/models/assistido/AssistidoResponseDTO';
import { PaginaResponse } from '../../../../shared/models/PaginaResponse';
import { StatusGeral } from '../../../../shared/enum/StatusGeral';
import { Modal } from '../../../../shared/components/modal/modal';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { Icon } from '../../../../shared/components/icon/icon';
import { Button } from '../../../../shared/components/button/button';
import { formatarTelefone } from '../../../../shared/utils/mascara.util';

/** Mesma normalização da busca da API: sem acento e sem caixa. */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Visão rápida dos alunos ATUAIS de uma turma: foto, nome, responsável e
 * contato, com busca por nome. Clicar num aluno abre a ficha dele na tela de
 * Assistidos; "Ver lista completa" abre a listagem filtrada pela turma.
 *
 *   <app-alunos-turma-modal [turma]="turmaSelecionada()" (fechar)="turmaSelecionada.set(null)" />
 */
@Component({
  selector: 'app-alunos-turma-modal',
  imports: [Modal, Avatar, Icon, Button],
  templateUrl: './alunos-turma-modal.html',
  styleUrl: './alunos-turma-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlunosTurmaModal {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  turma = input<TurmaResponseDTO | null>(null);
  fechar = output<void>();

  protected readonly alunos = signal<AssistidoResponseDTO[]>([]);
  protected readonly carregando = signal(false);
  protected readonly erro = signal(false);
  protected readonly busca = signal('');

  protected readonly filtrados = computed(() => {
    const termo = normalizar(this.busca().trim());
    return termo ? this.alunos().filter((a) => normalizar(a.nomeCompleto).includes(termo)) : this.alunos();
  });

  constructor() {
    effect((onCleanup) => {
      const turma = this.turma();
      this.busca.set('');
      this.alunos.set([]);
      if (!turma) return;

      this.carregando.set(true);
      this.erro.set(false);
      const params = new HttpParams()
        .set('turmaId', turma.turmaId)
        .set('status', StatusGeral.ATIVO)
        .set('pagina', 0)
        .set('tamanho', 200);
      const sub = this.http
        .get<PaginaResponse<AssistidoResponseDTO>>(`${environment.apiUrl}/api/assistidos`, { params })
        .subscribe({
          next: (pagina) => {
            // A listagem por turma traz também quem já saiu — aqui só quem está hoje.
            this.alunos.set(pagina.conteudo.filter((a) => !a.dataSaidaTurma && a.turmaId === turma.turmaId));
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

  protected telefone(numero: string | null | undefined): string {
    return numero ? formatarTelefone(numero) : '';
  }

  protected linkTelefone(numero: string): string {
    return 'tel:+55' + numero.replace(/\D/g, '');
  }

  protected abrirAluno(aluno: AssistidoResponseDTO): void {
    const turma = this.turma();
    this.fechar.emit();
    this.router.navigate(['/assistidos'], {
      queryParams: { turmaId: turma?.turmaId, assistidoId: aluno.assistidoId },
    });
  }

  protected verListaCompleta(): void {
    const turma = this.turma();
    this.fechar.emit();
    this.router.navigate(['/assistidos'], { queryParams: { turmaId: turma?.turmaId } });
  }
}
