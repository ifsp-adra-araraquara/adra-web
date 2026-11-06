import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth.service';
import { DisciplinarService } from '../../../../core/disciplinar.service';
import { Role } from '../../../../shared/enum/role.enum';
import { NIVEIS_DISCIPLINARES, ORDEM_NIVEIS } from '../../../../shared/enum/NivelDisciplinar';
import { FichaDisciplinarDTO, RegistroDisciplinarDTO } from '../../../../shared/models/disciplinar/Disciplinar';
import { ativosDoNivel, dataBr, rotuloSequencia, temDocumento } from '../../../../shared/utils/disciplinar.util';
import { mensagemErro } from '../../../../shared/utils/erro-http.util';
import { Badge } from '../../../../shared/components/badge/badge';
import { Button } from '../../../../shared/components/button/button';
import { Icon } from '../../../../shared/components/icon/icon';
import { ZerarContagemModal } from './zerar-contagem-modal';
import { AnexarAssinadoModal } from '../../../../shared/components/anexar-assinado-modal/anexar-assinado-modal';

/**
 * Aba Disciplinar da ficha do atendido: contagem ativa, histórico com os
 * documentos (imprimir; Coordenador anexa o assinado) e (Coordenador) zerar a contagem.
 */
@Component({
  selector: 'app-ficha-disciplinar-assistido',
  imports: [Badge, Button, Icon, ZerarContagemModal, AnexarAssinadoModal],
  templateUrl: './ficha-disciplinar-assistido.html',
  styleUrl: './ficha-disciplinar-assistido.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FichaDisciplinarAssistido implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly disciplinarService = inject(DisciplinarService);
  private readonly router = inject(Router);

  assistidoId = input.required<number>();
  nome = input.required<string>();

  readonly NIVEIS = NIVEIS_DISCIPLINARES;
  readonly ORDEM_NIVEIS = ORDEM_NIVEIS;
  readonly dataBr = dataBr;
  readonly rotuloSequencia = rotuloSequencia;
  readonly ativosDoNivel = ativosDoNivel;
  readonly temDocumento = temDocumento;

  readonly ficha = signal<FichaDisciplinarDTO | null>(null);
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly sucesso = signal<string | null>(null);
  readonly mostrarZerar = signal(false);
  readonly mostrarAnexar = signal(false);
  readonly registroAnexando = signal<RegistroDisciplinarDTO | null>(null);

  readonly ehCoordenador = computed(() => this.auth.currentProfile() === Role.COORD);
  readonly temAtivos = computed(() => this.ficha()?.registros.some((r) => !r.arquivado) ?? false);

  ngOnInit(): void {
    this.carregar();
  }

  aoZerar(ficha: FichaDisciplinarDTO): void {
    this.ficha.set(ficha);
    this.sucesso.set('Contagem zerada. Os registros continuam no histórico como arquivados.');
  }

  imprimir(r: RegistroDisciplinarDTO): void {
    this.router.navigate(['/disciplinar/documento', r.registroId]);
  }

  anexar(r: RegistroDisciplinarDTO): void {
    this.registroAnexando.set(r);
    this.mostrarAnexar.set(true);
  }

  aoAnexar(): void {
    this.sucesso.set('Documento assinado registrado.');
    this.carregar();
  }

  private async carregar(): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    try {
      this.ficha.set(await this.disciplinarService.buscarFicha(this.assistidoId()));
    } catch (e) {
      this.erro.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível carregar os registros disciplinares.'));
    } finally {
      this.carregando.set(false);
    }
  }
}
