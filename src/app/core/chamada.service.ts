import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AulaService } from './aula.service';
import { StatusAula } from '../shared/enum/StatusAula';
import { StatusPresenca } from '../shared/enum/StatusPresenca';
import { PresencaRequestDTO } from '../shared/models/presenca/PresencaRequestDTO';
import { PresencaResponseDTO } from '../shared/models/presenca/PresencaResponseDTO';
import { FrequenciaAulaDTO } from '../shared/models/presenca/FrequenciaAulaDTO';
import { GradeFrequenciaTurmaDTO } from '../shared/models/presenca/GradeFrequenciaTurmaDTO';
import { LinhaChamada, linhaChamadaDePresenca, ordenarPorNome } from '../shared/utils/chamada.util';

/**
 * Única fonte de dado/escrita de chamada, usada tanto por `AulaModal`
 * quanto por `AulaCompleta` — ver `shared/utils/chamada.util.ts` pro porquê
 * disso existir.
 */
@Injectable({ providedIn: 'root' })
export class ChamadaService {
  private readonly http = inject(HttpClient);
  private readonly aulaService = inject(AulaService);
  private readonly api = environment.apiUrl;

  /**
   * Fonte única do roster: GET /api/chamadas/aula/{id} já devolve, por
   * assistido elegível na data da aula (CA-70.1/70.2 — filtro de desligados
   * feito no back), o status de presença inferido/lançado. Não busca em
   * /api/assistidos (isso duplicaria a fonte de roster com um filtro por
   * status ATUAL do assistido, que quebra a chamada de aulas passadas assim
   * que alguém é desligado — ver CA-70.2).
   */
  async carregarRoster(aulaId: number): Promise<LinhaChamada[]> {
    const presencas = await firstValueFrom(
      this.http.get<PresencaResponseDTO[]>(`${this.api}/api/chamadas/aula/${aulaId}`),
    );
    return ordenarPorNome(presencas.map(linhaChamadaDePresenca));
  }

  /**
   * Marca a aula como REALIZADA (se ainda não estiver) e grava as
   * presenças. Retorna o `statusAula` resultante pro chamador atualizar seu
   * próprio modelo local (campo simples no modal, signal na página).
   *
   * CA-65.3: o back só aceita lançar chamada em aula REALIZADA — e é a
   * própria chamada que marca a aula como realizada, então isso precisa
   * rodar ANTES do POST de presenças (senão o back rejeita).
   *
   * Marca via PATCH /api/aulas/{id} (AulaService.atualizarStatus) em vez do
   * PUT de /api/aulas/{id}: esse PUT é @PreAuthorize hasRole('COORDENADOR')
   * e o sociopedagógico (quem também faz chamada) tomava 403 nele. O PATCH
   * já é liberado pros dois perfis (ver AulaController).
   */
  async salvar(
    aulaId: number,
    statusAulaAtual: StatusAula,
    alunos: LinhaChamada[],
  ): Promise<StatusAula> {
    let statusAula = statusAulaAtual;

    if (statusAula !== StatusAula.REALIZADA) {
      const atualizada = await firstValueFrom(
        this.aulaService.atualizarStatus(aulaId, StatusAula.REALIZADA),
      );
      statusAula = atualizada.statusAula;
    }

    const presencas: PresencaRequestDTO[] = alunos.map((a) => ({
      aulaId,
      assistidoId: a.assistidoId,
      statusPresenca: a.statusPresenca!,
      motivoFalta: a.statusPresenca === StatusPresenca.FALTA_JUSTIFICADA ? a.motivoFalta : null,
      observacao:
        a.statusPresenca === StatusPresenca.FALTA_JUSTIFICADA && a.observacao?.trim()
          ? a.observacao.trim()
          : null,
    }));

    await firstValueFrom(
      this.http.post<PresencaResponseDTO[]>(`${this.api}/api/chamadas/aula/${aulaId}`, presencas),
    );

    return statusAula;
  }

  /** Histórico de frequência completo de um assistido — aba "Chamadas" do cadastro. */
  async carregarFrequencia(assistidoId: number): Promise<FrequenciaAulaDTO[]> {
    return firstValueFrom(
      this.http.get<FrequenciaAulaDTO[]>(`${this.api}/api/chamadas/assistido/${assistidoId}/frequencia`),
    );
  }

  /** "Ver grade da turma" — carregada só sob demanda, nunca no fluxo normal de chamada. */
  async carregarGradeTurma(turmaId: number): Promise<GradeFrequenciaTurmaDTO> {
    return firstValueFrom(
      this.http.get<GradeFrequenciaTurmaDTO>(`${this.api}/api/chamadas/turma/${turmaId}/grade`),
    );
  }
}
