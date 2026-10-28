import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  PreCadastroRequestDTO,
  PreCadastroResponseDTO,
} from '../shared/models/precadastro/PreCadastro';

@Injectable({ providedIn: 'root' })
export class PreCadastroService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/api/pre-cadastro`;

  registrarPublico(dto: PreCadastroRequestDTO): Promise<void> {
    return firstValueFrom(this.http.post<void>(this.api, dto));
  }

  listarPendentes(): Promise<PreCadastroResponseDTO[]> {
    return firstValueFrom(this.http.get<PreCadastroResponseDTO[]>(`${this.api}/pendentes`));
  }

  descartar(preCadastroId: number, motivo?: string): Promise<PreCadastroResponseDTO> {
    return firstValueFrom(
      this.http.patch<PreCadastroResponseDTO>(`${this.api}/${preCadastroId}/descartar`, { motivo }),
    );
  }

  marcarConvertido(preCadastroId: number): Promise<PreCadastroResponseDTO> {
    return firstValueFrom(this.http.patch<PreCadastroResponseDTO>(`${this.api}/${preCadastroId}/converter`, {}));
  }
}
