import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  EncerramentoAnoDTO,
  EncerramentoPreviaDTO,
  PeriodoMatriculaDTO,
  PeriodoMatriculaRequestDTO,
} from '../shared/models/matricula/Matricula';

/** Período de matrícula e encerramento do ano (abrir, ajustar e encerrar são só do Coordenador). */
@Injectable({ providedIn: 'root' })
export class MatriculaService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/api/matriculas`;

  periodos(): Promise<PeriodoMatriculaDTO[]> {
    return firstValueFrom(this.http.get<PeriodoMatriculaDTO[]>(`${this.api}/periodos`));
  }

  salvarPeriodo(ano: number, dto: PeriodoMatriculaRequestDTO): Promise<PeriodoMatriculaDTO> {
    return firstValueFrom(this.http.put<PeriodoMatriculaDTO>(`${this.api}/periodos/${ano}`, dto));
  }

  /** Ano esperando encerramento, com a prévia; null quando não há (204). */
  async encerramentoPendente(): Promise<EncerramentoPreviaDTO | null> {
    return (await firstValueFrom(this.http.get<EncerramentoPreviaDTO | null>(`${this.api}/encerramento-pendente`))) ?? null;
  }

  encerrar(ano: number): Promise<EncerramentoAnoDTO> {
    return firstValueFrom(this.http.post<EncerramentoAnoDTO>(`${this.api}/${ano}/encerrar`, null));
  }
}
