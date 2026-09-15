import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ResponsavelRequestDTO } from '../shared/models/responsavel/ResponsavelRequestDTO';
import { ResponsavelResponseDTO } from '../shared/models/responsavel/ResponsavelResponseDTO';

@Injectable({ providedIn: 'root' })
export class ResponsavelService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/responsaveis`;

  cadastrar(dto: ResponsavelRequestDTO): Observable<ResponsavelResponseDTO> {
    return this.http.post<ResponsavelResponseDTO>(this.baseUrl, dto);
  }

  atualizar(id: number, dto: ResponsavelRequestDTO): Observable<ResponsavelResponseDTO> {
    return this.http.put<ResponsavelResponseDTO>(`${this.baseUrl}/${id}`, dto);
  }

  listar(): Observable<ResponsavelResponseDTO[]> {
    return this.http.get<ResponsavelResponseDTO[]>(this.baseUrl);
  }

  buscarPorId(id: number): Observable<ResponsavelResponseDTO> {
    return this.http.get<ResponsavelResponseDTO>(`${this.baseUrl}/${id}`);
  }

  /** 404 quando nao existe - tratar como "nao encontrado", nao como erro de fato. */
  buscarPorCpf(cpf: string): Observable<ResponsavelResponseDTO> {
    return this.http.get<ResponsavelResponseDTO>(`${this.baseUrl}/cpf/${cpf}`);
  }
}