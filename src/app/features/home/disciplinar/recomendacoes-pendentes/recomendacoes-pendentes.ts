import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { NIVEIS_DISCIPLINARES } from '../../../../shared/enum/NivelDisciplinar';
import { RegistroDisciplinarDTO } from '../../../../shared/models/disciplinar/Disciplinar';
import {
  dataBr,
  nivelRecomendado,
  pendenciaDoRegistro,
  textoRecomendacao,
} from '../../../../shared/utils/disciplinar.util';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { Badge } from '../../../../shared/components/badge/badge';
import { Button } from '../../../../shared/components/button/button';

/**
 * FT-22: recomendações pendentes da tela Disciplinar. No celular, um cartão
 * por atendido com as ações; a partir do iPad, lista à esquerda e detalhe
 * da recomendação escolhida à direita.
 */
@Component({
  selector: 'app-recomendacoes-pendentes',
  imports: [NgTemplateOutlet, Avatar, Badge, Button],
  templateUrl: './recomendacoes-pendentes.html',
  styleUrl: './recomendacoes-pendentes.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecomendacoesPendentes {
  registros = input.required<RegistroDisciplinarDTO[]>();
  /** Só o Coordenador gera ou dispensa. */
  podeAgir = input(false);
  gerar = output<RegistroDisciplinarDTO>();
  dispensar = output<RegistroDisciplinarDTO>();

  readonly dataBr = dataBr;
  readonly texto = textoRecomendacao;
  readonly rotuloPendencia = pendenciaDoRegistro;

  private readonly selecionadoId = signal<number | null>(null);
  readonly selecionado = computed<RegistroDisciplinarDTO | null>(
    () => this.registros().find((r) => r.registroId === this.selecionadoId()) ?? this.registros()[0] ?? null,
  );

  nivel(r: RegistroDisciplinarDTO) {
    return NIVEIS_DISCIPLINARES[r.nivel];
  }

  selecionar(r: RegistroDisciplinarDTO): void {
    this.selecionadoId.set(r.registroId);
  }

  rotuloGerar(r: RegistroDisciplinarDTO): string {
    const nivel = nivelRecomendado(r.consequencia);
    return nivel ? `Gerar ${NIVEIS_DISCIPLINARES[nivel].rotulo.toLowerCase()}` : '';
  }
}
