import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AssistidoRequestDTO } from '../shared/models/assistido/AssistidoRequestDTO';
import { AssistidoResponseDTO } from '../shared/models/assistido/AssistidoResponseDTO';

@Injectable({ providedIn: 'root' })
export class AssistidoService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/assistidos`;

  /** Cria o assistido e salva foto e documentos na mesma transação. */
  cadastrar(dados: AssistidoRequestDTO, foto: File | null, documentos: File[]): Observable<AssistidoResponseDTO> {
    const formData = new FormData();
    formData.append('dados', new Blob([JSON.stringify(dados)], { type: 'application/json' }));
    if (foto) formData.append('foto', foto);
    documentos.forEach((documento) => formData.append('documentos', documento));
    return this.http.post<AssistidoResponseDTO>(this.baseUrl, formData);
  }

  /** 404 quando o CPF não tem cadastro — é o caso de seguir com um cadastro novo. */
  buscarPorCpf(cpf: string): Observable<AssistidoResponseDTO> {
    return this.http.get<AssistidoResponseDTO>(`${this.baseUrl}/cpf/${cpf}`);
  }
}
