import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AulaComDetalhesResponseDTO } from '../shared/models/aula/AulaComDetalhesResponseDTO';
import { AulaStatusPatchRequestDTO } from '../shared/models/aula/AulaStatusPatchRequestDTO';
import { CriacaoAulasRequestDTO } from '../shared/models/aula/CriacaoAulasRequestDTO';
import { GerarAulasResponseDTO } from '../shared/models/aula/GerarAulasResponseDTO';
import { AulaResponseDTO } from '../shared/models/aula/AulaResponseDTO';
import { StatusAula } from '../shared/enum/StatusAula';

/** Filtros do GET /api/aulas/com-detalhes — não existe DTO de filtro no back, fica local ao service. */
export interface FiltroListaAulas {
  turmaId?: number;
  oficinaId?: number;
  dataInicio?: string;
  dataFim?: string;
  nomeTurma?: string;
  titulo?: string;
  dataAula?: string;
}

@Injectable({ providedIn: 'root' })
export class AulaService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  // CA-64.4: signal local — atualizarStatus atualiza aqui sem refetch da lista inteira.
  readonly aulas = signal<AulaComDetalhesResponseDTO[]>([]);
  readonly carregando = signal(false);

  gerarAulas(payload: CriacaoAulasRequestDTO): Observable<GerarAulasResponseDTO> {
    return this.http.post<GerarAulasResponseDTO>(`${this.api}/api/aulas/gerar`, payload);
  }

  /** Requer o ajuste de backend (oficinaId/dataInicio/dataFim em /com-detalhes) descrito acima. */
  listarComDetalhes(filtro: FiltroListaAulas): Observable<AulaComDetalhesResponseDTO[]> {
    let params = new HttpParams();
    if (filtro.turmaId != null) params = params.set('turmaId', filtro.turmaId);
    if (filtro.oficinaId != null) params = params.set('oficinaId', filtro.oficinaId);
    if (filtro.dataInicio) params = params.set('dataInicio', filtro.dataInicio);
    if (filtro.dataFim) params = params.set('dataFim', filtro.dataFim);
    if (filtro.nomeTurma) params = params.set('nomeTurma', filtro.nomeTurma);
    if (filtro.titulo) params = params.set('titulo', filtro.titulo);
    if (filtro.dataAula) params = params.set('dataAula', filtro.dataAula);

    this.carregando.set(true);
    return this.http.get<AulaComDetalhesResponseDTO[]>(`${this.api}/api/aulas/com-detalhes`, { params }).pipe(
      tap((aulas) => {
        this.aulas.set(aulas);
        this.carregando.set(false);
      })
    );
  }

  // CA-64.4: PATCH real é /api/aulas/{id} (não /{id}/status).
  atualizarStatus(aulaId: number, novoStatus: StatusAula) {
    const payload: AulaStatusPatchRequestDTO = { statusAula: novoStatus };
    return this.http.patch<AulaResponseDTO>(`${this.api}/api/aulas/${aulaId}`, payload).pipe(
      tap((aulaAtualizada) => {
        this.aulas.update((lista) =>
          lista.map((a) => (a.aulaId === aulaId ? { ...a, statusAula: aulaAtualizada.statusAula } : a))
        );
      })
    );
  }
}