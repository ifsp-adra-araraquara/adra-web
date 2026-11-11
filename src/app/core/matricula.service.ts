import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { PeriodoMatriculaDTO, PeriodoMatriculaRequestDTO } from '../shared/models/matricula/Matricula';

/** Período de matrícula de cada ano (abrir/ajustar é só do Coordenador). */
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
}
