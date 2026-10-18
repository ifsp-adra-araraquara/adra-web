import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ExcecaoCalendarioRequestDTO,
  ExcecaoCalendarioResponseDTO,
} from '../shared/models/excecao/ExcecaoCalendarioDTO';

/** Dias sem aula (feriado, férias, ponto facultativo, evento/passeio...) — /api/excecoes-calendario. */
@Injectable({ providedIn: 'root' })
export class ExcecaoCalendarioService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/api/excecoes-calendario`;

  readonly excecoes = signal<ExcecaoCalendarioResponseDTO[]>([]);

  async carregar(): Promise<void> {
    try {
      this.excecoes.set(await firstValueFrom(this.http.get<ExcecaoCalendarioResponseDTO[]>(this.api)));
    } catch {
      this.excecoes.set([]);
    }
  }

  /** Cadastra (dia ou período). Aulas planejadas nesses dias são canceladas pelo back. */
  async cadastrar(dto: ExcecaoCalendarioRequestDTO): Promise<ExcecaoCalendarioResponseDTO[]> {
    const criadas = await firstValueFrom(this.http.post<ExcecaoCalendarioResponseDTO[]>(this.api, dto));
    await this.carregar();
    return criadas;
  }

  async remover(excecaoId: number): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.api}/${excecaoId}`));
    this.excecoes.update((lista) => lista.filter((e) => e.excecaoId !== excecaoId));
  }
}
