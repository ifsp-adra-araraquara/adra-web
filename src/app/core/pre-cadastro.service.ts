import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  PreCadastroRequestDTO,
  PreCadastroResponseDTO,
  PreCadastroResumoDTO,
  StatusPreCadastro,
} from '../shared/models/precadastro/PreCadastro';
import { AssistidoRequestDTO } from '../shared/models/assistido/AssistidoRequestDTO';

@Injectable({ providedIn: 'root' })
export class PreCadastroService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/api/pre-cadastro`;

  /** Devolve o número de protocolo (id do pré-cadastro). */
  async registrarPublico(dto: PreCadastroRequestDTO): Promise<number | null> {
    const resposta = await firstValueFrom(this.http.post<{ preCadastroId: number | null }>(this.api, dto));
    return resposta?.preCadastroId ?? null;
  }

  listar(status: StatusPreCadastro): Promise<PreCadastroResumoDTO[]> {
    return firstValueFrom(this.http.get<PreCadastroResumoDTO[]>(this.api, { params: { status } }));
  }

  buscar(preCadastroId: number): Promise<PreCadastroResponseDTO> {
    return firstValueFrom(this.http.get<PreCadastroResponseDTO>(`${this.api}/${preCadastroId}`));
  }

  rascunhoAssistido(preCadastroId: number): Promise<AssistidoRequestDTO> {
    return firstValueFrom(this.http.get<AssistidoRequestDTO>(`${this.api}/${preCadastroId}/rascunho-assistido`));
  }

  aprovar(preCadastroId: number, dto: AssistidoRequestDTO): Promise<PreCadastroResponseDTO> {
    return firstValueFrom(this.http.post<PreCadastroResponseDTO>(`${this.api}/${preCadastroId}/aprovar`, dto));
  }

  reprovar(preCadastroId: number, motivo: string): Promise<PreCadastroResponseDTO> {
    return firstValueFrom(this.http.patch<PreCadastroResponseDTO>(`${this.api}/${preCadastroId}/reprovar`, { motivo }));
  }
}
