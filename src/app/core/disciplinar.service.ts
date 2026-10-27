import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  FichaDisciplinarDTO,
  FiltroRegistrosDisciplinares,
  MotivoDisciplinarDTO,
  MotivoDisciplinarRequestDTO,
  PaginaRegistrosDisciplinares,
  PendenciasDisciplinaresDTO,
  RegistroDisciplinarDTO,
  RegistroDisciplinarRequestDTO,
  SinalizacaoDisciplinarDTO,
} from '../shared/models/disciplinar/Disciplinar';

/** FT-04: sistema disciplinar (ocorrência → advertência → suspensão, mais uniforme). */
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

  /** Devolve o registro lançado e, depois, os gerados pela progressão. */
  registrar(assistidoId: number, dto: RegistroDisciplinarRequestDTO): Promise<RegistroDisciplinarDTO[]> {
    return firstValueFrom(
      this.http.post<RegistroDisciplinarDTO[]>(`${this.api}/assistidos/${assistidoId}/disciplinar`, dto),
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

  buscarSinalizacoes(assistidoIds: number[], data?: string): Promise<SinalizacaoDisciplinarDTO[]> {
    if (assistidoIds.length === 0) return Promise.resolve([]);
    let params = new HttpParams().set('assistidoIds', assistidoIds.join(','));
    if (data) params = params.set('data', data);
    return firstValueFrom(
      this.http.get<SinalizacaoDisciplinarDTO[]>(`${this.api}/disciplinar/sinalizacoes`, { params }),
    );
  }
}
