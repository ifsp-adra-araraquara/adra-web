import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AvisoDTO } from '../shared/models/aviso/Aviso';

/** FT-18: avisos do usuário logado — /api/avisos. Recarregado a cada navegação (some quando resolvido). */
@Injectable({ providedIn: 'root' })
export class AvisoService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/api/avisos`;

  readonly avisos = signal<AvisoDTO[]>([]);

  async carregar(): Promise<void> {
    try {
      this.avisos.set(await firstValueFrom(this.http.get<AvisoDTO[]>(this.api)));
    } catch {
      this.avisos.set([]);
    }
  }
}
