import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { SemanarioRequestDTO } from '../shared/models/semanario/SemanarioRequestDTO';
import { SemanarioResponseDTO } from '../shared/models/semanario/SemanarioResponseDTO';

@Injectable({ providedIn: 'root' })
export class SemanarioService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/api/semanarios`;

  /** Envia o semanário da semana; enviar de novo na mesma semana atualiza o plano. */
  enviar(semanario: SemanarioRequestDTO): Promise<SemanarioResponseDTO> {
    return firstValueFrom(this.http.post<SemanarioResponseDTO>(this.api, semanario));
  }

  remover(semanarioId: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.api}/${semanarioId}`));
  }

  listarMeus(): Promise<SemanarioResponseDTO[]> {
    return firstValueFrom(this.http.get<SemanarioResponseDTO[]>(`${this.api}/meus`));
  }

  listarPorOficina(oficinaId: number): Promise<SemanarioResponseDTO[]> {
    return firstValueFrom(this.http.get<SemanarioResponseDTO[]>(`${this.api}/oficina/${oficinaId}`));
  }
}
