import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { SemanarioRequestDTO } from '../shared/models/semanario/SemanarioRequestDTO';
import { SemanarioResponseDTO } from '../shared/models/semanario/SemanarioResponseDTO';
import { PaginaResponse } from '../shared/models/PaginaResponse';

export interface FiltrosSemanario {
  /** Segunda-feira da semana; null = todas as semanas. */
  semana: string | null;
  turmaId: number | null;
  oficinaId: number | null;
  busca: string;
  pagina: number;
  tamanho: number;
}

@Injectable({ providedIn: 'root' })
export class SemanarioService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/api/semanarios`;

  /** Envia o semanário da semana; enviar de novo na mesma semana atualiza o plano. */
  enviar(semanario: SemanarioRequestDTO): Promise<SemanarioResponseDTO> {
    return firstValueFrom(this.http.post<SemanarioResponseDTO>(this.api, semanario));
  }

  remover(semanarioId: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.api}/${semanarioId}`));
  }

  /** Semanários de todas as oficinas, paginados e filtrados no back (só a coordenação). */
  listar(filtros: FiltrosSemanario): Promise<PaginaResponse<SemanarioResponseDTO>> {
    let params = new HttpParams().set('pagina', filtros.pagina).set('tamanho', filtros.tamanho);
    if (filtros.semana) params = params.set('semana', filtros.semana);
    if (filtros.turmaId !== null) params = params.set('turmaId', filtros.turmaId);
    if (filtros.oficinaId !== null) params = params.set('oficinaId', filtros.oficinaId);
    if (filtros.busca.trim()) params = params.set('busca', filtros.busca.trim());
    return firstValueFrom(this.http.get<PaginaResponse<SemanarioResponseDTO>>(this.api, { params }));
  }

  listarMeus(): Promise<SemanarioResponseDTO[]> {
    return firstValueFrom(this.http.get<SemanarioResponseDTO[]>(`${this.api}/meus`));
  }

  listarPorOficina(oficinaId: number): Promise<SemanarioResponseDTO[]> {
    return firstValueFrom(this.http.get<SemanarioResponseDTO[]>(`${this.api}/oficina/${oficinaId}`));
  }
}
