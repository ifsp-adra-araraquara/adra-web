import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { StatusPresenca } from '../shared/enum/StatusPresenca';
import { FrequenciaDiaDTO } from '../shared/models/presenca/FrequenciaDiaDTO';
import { GradeMensalTurmaDTO } from '../shared/models/presenca/GradeMensalTurmaDTO';
import {
  ChamadaGrupoDTO,
  ChamadasDoDiaDTO,
  PresencaChamadaRequestDTO,
  StatusChamadaDiaDTO,
} from '../shared/models/chamada/ChamadaGrupo';
import { LinhaChamada } from '../shared/utils/chamada.util';

/** Única fonte de dado/escrita de chamada (por grupo e dia). */
@Injectable({ providedIn: 'root' })
export class ChamadaService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  /** FT-12: grupos com chamada no dia (`data` em yyyy-MM-dd). */
  async carregarDia(data: string): Promise<ChamadasDoDiaDTO> {
    return firstValueFrom(this.http.get<ChamadasDoDiaDTO>(`${this.api}/api/chamadas/dia`, { params: { data } }));
  }

  async carregarGrupo(turmaId: number, data: string): Promise<ChamadaGrupoDTO> {
    return firstValueFrom(this.http.get<ChamadaGrupoDTO>(this.urlGrupo(turmaId, data)));
  }

  /** Lançadas e pendentes do período (yyyy-MM-dd, inclusive), da mais recente para a mais antiga. */
  async carregarStatus(inicio: string, fim: string): Promise<StatusChamadaDiaDTO[]> {
    return firstValueFrom(
      this.http.get<StatusChamadaDiaDTO[]>(`${this.api}/api/chamadas/status`, { params: { inicio, fim } }),
    );
  }

  /** Grava a chamada inteira do grupo no dia; regravar atualiza a mesma chamada. */
  async salvarGrupo(turmaId: number, data: string, atendidos: LinhaChamada[]): Promise<ChamadaGrupoDTO> {
    const presencas: PresencaChamadaRequestDTO[] = atendidos.map((a) => {
      const justificada = a.statusPresenca === StatusPresenca.FALTA_JUSTIFICADA;
      return {
        assistidoId: a.assistidoId,
        statusPresenca: a.statusPresenca!,
        motivoFalta: justificada ? a.motivoFalta : null,
        observacao: justificada && a.observacao?.trim() ? a.observacao.trim() : null,
      };
    });
    return firstValueFrom(this.http.put<ChamadaGrupoDTO>(this.urlGrupo(turmaId, data), presencas));
  }

  private urlGrupo(turmaId: number, data: string): string {
    return `${this.api}/api/chamadas/turma/${turmaId}/dia/${data}`;
  }

  /** Histórico de frequência completo de um assistido — aba "Chamadas" do cadastro. */
  async carregarFrequencia(assistidoId: number): Promise<FrequenciaDiaDTO[]> {
    return firstValueFrom(
      this.http.get<FrequenciaDiaDTO[]>(`${this.api}/api/chamadas/assistido/${assistidoId}/frequencia`),
    );
  }

  /** Grade mensal da turma (estilo planilha) — `mes` no formato yyyy-MM. Carregada só sob demanda. */
  async carregarGradeMensal(turmaId: number, mes: string): Promise<GradeMensalTurmaDTO> {
    return firstValueFrom(
      this.http.get<GradeMensalTurmaDTO>(`${this.api}/api/chamadas/turma/${turmaId}/grade`, {
        params: { mes },
      }),
    );
  }
}
