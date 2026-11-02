import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  NotaCalendarioRequestDTO,
  NotaCalendarioResponseDTO,
} from '../shared/models/nota/NotaCalendarioDTO';

/** Notas/eventos globais do calendário — /api/notas-calendario. */
@Injectable({ providedIn: 'root' })
export class NotaCalendarioService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/api/notas-calendario`;

  readonly notas = signal<NotaCalendarioResponseDTO[]>([]);

  async carregar(): Promise<void> {
    try {
      this.notas.set(await firstValueFrom(this.http.get<NotaCalendarioResponseDTO[]>(this.api)));
    } catch {
      this.notas.set([]);
    }
  }

  async cadastrar(dto: NotaCalendarioRequestDTO): Promise<NotaCalendarioResponseDTO> {
    const criada = await firstValueFrom(this.http.post<NotaCalendarioResponseDTO>(this.api, dto));
    await this.carregar();
    return criada;
  }

  async atualizar(notaId: number, dto: NotaCalendarioRequestDTO): Promise<NotaCalendarioResponseDTO> {
    const atualizada = await firstValueFrom(
      this.http.put<NotaCalendarioResponseDTO>(`${this.api}/${notaId}`, dto),
    );
    await this.carregar();
    return atualizada;
  }

  async remover(notaId: number): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.api}/${notaId}`));
    this.notas.update((lista) => lista.filter((n) => n.notaId !== notaId));
  }
}
