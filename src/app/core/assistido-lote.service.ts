import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AssistidoLoteRequestDTO } from '../shared/models/assistido/AssistidoLoteRequestDTO';
import { ResultadoLinhaLoteDTO } from '../shared/models/assistido/ResultadoLinhaLoteDTO';

@Injectable({ providedIn: 'root' })
export class AssistidoLoteService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/assistidos/lote`;

  validar(itens: AssistidoLoteRequestDTO[]): Observable<ResultadoLinhaLoteDTO[]> {
    return this.http.post<ResultadoLinhaLoteDTO[]>(`${this.baseUrl}/validar`, itens);
  }
}
