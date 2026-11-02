import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AulaComDetalhesResponseDTO } from '../shared/models/aula/AulaComDetalhesResponseDTO';

@Injectable({ providedIn: 'root' })
export class AulaService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  /** Tela da chamada (FT-06): uma aula só, com turma, oficineiro e quantidade de alunos. */
  buscarComDetalhes(aulaId: number): Observable<AulaComDetalhesResponseDTO> {
    return this.http.get<AulaComDetalhesResponseDTO>(`${this.api}/api/aulas/${aulaId}/detalhes`);
  }
}
