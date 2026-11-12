import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { FaixaEtariaDTO, FaixaEtariaRequestDTO } from '../shared/models/faixa-etaria/FaixaEtaria';

@Injectable({ providedIn: 'root' })
export class FaixaEtariaService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/api/faixas-etarias`;

  listar(incluirInativas = false): Promise<FaixaEtariaDTO[]> {
    const params = new HttpParams().set('incluirInativas', incluirInativas);
    return firstValueFrom(this.http.get<FaixaEtariaDTO[]>(this.api, { params }));
  }

  criar(dto: FaixaEtariaRequestDTO): Promise<FaixaEtariaDTO> {
    return firstValueFrom(this.http.post<FaixaEtariaDTO>(this.api, dto));
  }

  atualizar(faixaEtariaId: number, dto: FaixaEtariaRequestDTO): Promise<FaixaEtariaDTO> {
    return firstValueFrom(this.http.put<FaixaEtariaDTO>(`${this.api}/${faixaEtariaId}`, dto));
  }
}
