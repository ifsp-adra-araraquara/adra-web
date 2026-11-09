import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  FichaDisciplinarDTO,
  FiltroRegistrosDisciplinares,
  GerarPelaRecomendacaoRequestDTO,
  MotivoDisciplinarDTO,
  MotivoDisciplinarRequestDTO,
  PaginaRegistrosDisciplinares,
  PendenciasDisciplinaresDTO,
  PeriodoSuspensaoDTO,
  RegistroCriadoDTO,
  RegistroDisciplinarDTO,
  RegistroDisciplinarRequestDTO,
  RegistroVariosRequestDTO,
  SinalizacaoDisciplinarDTO,
  ZerarContagemRequestDTO,
} from '../shared/models/disciplinar/Disciplinar';

/** FT-04/FT-22: sistema disciplinar (a 3ª do nível recomenda o próximo; o Coordenador gera ou dispensa). */
@Injectable({ providedIn: 'root' })
export class DisciplinarService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/api`;

  listarMotivos(incluirInativos = false): Promise<MotivoDisciplinarDTO[]> {
    const params = new HttpParams().set('incluirInativos', incluirInativos);
    return firstValueFrom(this.http.get<MotivoDisciplinarDTO[]>(`${this.api}/disciplinar/motivos`, { params }));
  }

  criarMotivo(dto: MotivoDisciplinarRequestDTO): Promise<MotivoDisciplinarDTO> {
    return firstValueFrom(this.http.post<MotivoDisciplinarDTO>(`${this.api}/disciplinar/motivos`, dto));
  }

  atualizarMotivo(motivoId: number, dto: MotivoDisciplinarRequestDTO): Promise<MotivoDisciplinarDTO> {
    return firstValueFrom(this.http.put<MotivoDisciplinarDTO>(`${this.api}/disciplinar/motivos/${motivoId}`, dto));
  }

  listar(filtro: FiltroRegistrosDisciplinares): Promise<PaginaRegistrosDisciplinares> {
    let params = new HttpParams()
      .set('pagina', filtro.pagina ?? 0)
      .set('tamanho', filtro.tamanho ?? 20)
      .set('somentePendencias', !!filtro.somentePendencias)
      .set('somenteRecomendacoes', !!filtro.somenteRecomendacoes)
      .set('incluirArquivados', !!filtro.incluirArquivados);
    if (filtro.busca?.trim()) params = params.set('busca', filtro.busca.trim());
    if (filtro.nivel) params = params.set('nivel', filtro.nivel);
    return firstValueFrom(
      this.http.get<PaginaRegistrosDisciplinares>(`${this.api}/disciplinar/registros`, { params }),
    );
  }

  buscarPendencias(): Promise<PendenciasDisciplinaresDTO> {
    return firstValueFrom(this.http.get<PendenciasDisciplinaresDTO>(`${this.api}/disciplinar/pendencias`));
  }

  buscarFicha(assistidoId: number): Promise<FichaDisciplinarDTO> {
    return firstValueFrom(this.http.get<FichaDisciplinarDTO>(`${this.api}/assistidos/${assistidoId}/disciplinar`));
  }

  buscarRegistro(registroId: number): Promise<RegistroDisciplinarDTO> {
    return firstValueFrom(this.http.get<RegistroDisciplinarDTO>(`${this.api}/disciplinar/${registroId}`));
  }

  registrar(assistidoId: number, dto: RegistroDisciplinarRequestDTO): Promise<RegistroCriadoDTO> {
    return firstValueFrom(
      this.http.post<RegistroCriadoDTO>(`${this.api}/assistidos/${assistidoId}/disciplinar`, dto),
    );
  }

  /** FT-22: um registro por atendido, tudo ou nada. */
  registrarVarios(dto: RegistroVariosRequestDTO): Promise<RegistroCriadoDTO[]> {
    return firstValueFrom(this.http.post<RegistroCriadoDTO[]>(`${this.api}/disciplinar/registros`, dto));
  }

  /** FT-22: só o Coordenador. Gera a advertência/suspensão recomendada pelo registro. */
  gerarPelaRecomendacao(registroId: number, dto: GerarPelaRecomendacaoRequestDTO): Promise<RegistroCriadoDTO> {
    return firstValueFrom(
      this.http.post<RegistroCriadoDTO>(`${this.api}/disciplinar/${registroId}/recomendacao`, dto),
    );
  }

  /** Período padrão de suspensão pelo fato na data: 3 dias de atividade do grupo, a partir do próximo dia de atividade. */
  sugerirPeriodoSuspensao(assistidoId: number, data: string): Promise<PeriodoSuspensaoDTO> {
    const params = new HttpParams().set('data', data);
    return firstValueFrom(
      this.http.get<PeriodoSuspensaoDTO>(`${this.api}/assistidos/${assistidoId}/disciplinar/periodo-suspensao`, { params }),
    );
  }

  marcarDocumentoDevolvido(registroId: number, arquivoId: number | null = null): Promise<RegistroDisciplinarDTO> {
    return firstValueFrom(
      this.http.patch<RegistroDisciplinarDTO>(`${this.api}/disciplinar/${registroId}/documento-devolvido`, {
        arquivoId,
      }),
    );
  }

  alterarPeriodoSuspensao(registroId: number, inicio: string, fim: string): Promise<RegistroDisciplinarDTO> {
    return firstValueFrom(
      this.http.patch<RegistroDisciplinarDTO>(`${this.api}/disciplinar/${registroId}/suspensao`, { inicio, fim }),
    );
  }

  resolverConsequencia(registroId: number, data: string, observacao: string): Promise<RegistroDisciplinarDTO> {
    return firstValueFrom(
      this.http.patch<RegistroDisciplinarDTO>(`${this.api}/disciplinar/${registroId}/consequencia`, {
        data,
        observacao,
      }),
    );
  }

  arquivar(registroId: number, motivo: string): Promise<RegistroDisciplinarDTO> {
    return firstValueFrom(
      this.http.patch<RegistroDisciplinarDTO>(`${this.api}/disciplinar/${registroId}/arquivar`, { motivo }),
    );
  }

  /** FT-24: só o Coordenador. Arquiva os registros ativos e devolve a ficha atualizada. */
  zerarContagem(assistidoId: number, dto: ZerarContagemRequestDTO): Promise<FichaDisciplinarDTO> {
    return firstValueFrom(
      this.http.post<FichaDisciplinarDTO>(`${this.api}/assistidos/${assistidoId}/disciplinar/zerar`, dto),
    );
  }

  buscarSinalizacoes(assistidoIds: number[], data?: string): Promise<SinalizacaoDisciplinarDTO[]> {
    if (assistidoIds.length === 0) return Promise.resolve([]);
    let params = new HttpParams().set('assistidoIds', assistidoIds.join(','));
    if (data) params = params.set('data', data);
    return firstValueFrom(
      this.http.get<SinalizacaoDisciplinarDTO[]>(`${this.api}/disciplinar/sinalizacoes`, { params }),
    );
  }
}
