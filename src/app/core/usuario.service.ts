import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Role } from '../shared/enum/role.enum';
import { UsuarioResponse } from '../shared/models/usuarios/UsuarioResponse';

export interface NovoUsuario {
  nomeCompleto: string;
  email: string;
  nivelPermissao: Role;
  cargoFuncao: string | null;
  telefone: string | null;
}

export interface MeuPerfilRequest {
  nomeCompleto: string;
  telefone: string | null;
}

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/api/usuarios`;

  cadastrar(usuario: NovoUsuario): Observable<UsuarioResponse> {
    return this.http.post<UsuarioResponse>(this.api, usuario);
  }

  buscarMeuPerfil(): Observable<UsuarioResponse> {
    return this.http.get<UsuarioResponse>(`${this.api}/me`);
  }

  atualizarMeuPerfil(dados: MeuPerfilRequest): Observable<UsuarioResponse> {
    return this.http.put<UsuarioResponse>(`${this.api}/me`, dados);
  }
}
