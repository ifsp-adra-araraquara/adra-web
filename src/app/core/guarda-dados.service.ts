import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { DescarteDTO, OrfaosDTO, PreviaDescarteDTO } from '../shared/models/guarda/GuardaDados';

/** Prazo de guarda dos dados e limpeza do armazenamento (só o Coordenador). */
@Injectable({ providedIn: 'root' })
export class GuardaDadosService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/api/guarda-dados`;

  previa(): Promise<PreviaDescarteDTO> {
    return firstValueFrom(this.http.get<PreviaDescarteDTO>(`${this.api}/previa`));
  }

  descartar(): Promise<DescarteDTO> {
    return firstValueFrom(this.http.post<DescarteDTO>(`${this.api}/descartar`, null));
  }

  descartes(): Promise<DescarteDTO[]> {
    return firstValueFrom(this.http.get<DescarteDTO[]>(`${this.api}/descartes`));
  }

  orfaos(): Promise<OrfaosDTO> {
    return firstValueFrom(this.http.get<OrfaosDTO>(`${this.api}/orfaos`));
  }

  removerOrfaos(): Promise<OrfaosDTO> {
    return firstValueFrom(this.http.post<OrfaosDTO>(`${this.api}/orfaos/remover`, null));
  }
}
