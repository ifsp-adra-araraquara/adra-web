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

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private http = inject(HttpClient);

  cadastrar(usuario: NovoUsuario): Observable<UsuarioResponse> {
    return this.http.post<UsuarioResponse>(`${environment.apiUrl}/api/usuarios`, { ...usuario, administrador: false });
  }
}