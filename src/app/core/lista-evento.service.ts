import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { AtendidoListaEventoDTO } from '../shared/models/lista/ListaEvento';

/** Lista de evento/passeio: atendidos ativos hoje nos grupos escolhidos (só o Coordenador). */
@Injectable({ providedIn: 'root' })
export class ListaEventoService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/api/listas/evento`;

  atendidos(turmaIds: number[], comResponsavel: boolean): Promise<AtendidoListaEventoDTO[]> {
    return firstValueFrom(
      this.http.get<AtendidoListaEventoDTO[]>(this.api, {
        params: { turmaIds: turmaIds.join(','), comResponsavel: String(comResponsavel) },
      }),
    );
  }
}
