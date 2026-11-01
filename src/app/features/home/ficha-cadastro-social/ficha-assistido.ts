import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AssistidoResponseDTO } from '../../../shared/models/assistido/AssistidoResponseDTO';
import { VinculoFamiliarResponseDTO } from '../../../shared/models/vinculoFamiliar/VinculoFamiliarResponseDTO';
import { FolhaA4 } from '../../../shared/components/folha-a4/folha-a4';
import { mensagemErro } from '../../../shared/utils/erro-http.util';
import { FichaCadastroSocialDocumento } from './ficha-cadastro-social';
import { FichaCadastroSocial, deAssistido } from './ficha-cadastro-social.model';

/** /assistidos/:id/ficha-social — a mesma ficha, com os dados do cadastro do atendido (FT-26). */
@Component({
  selector: 'app-ficha-assistido',
  imports: [FolhaA4, FichaCadastroSocialDocumento],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (erro()) {
      <div class="notice notice-error no-print" role="alert">{{ erro() }}</div>
    } @else if (ficha(); as f) {
      <app-folha-a4 rotulo="Ficha de cadastro social"><app-ficha-cadastro-social [ficha]="f" /></app-folha-a4>
    } @else {
      <p class="muted no-print">Carregando ficha…</p>
    }
  `,
})
export class FichaAssistido implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  private readonly api = `${environment.apiUrl}/api/assistidos/${this.id}`;

  protected readonly ficha = signal<FichaCadastroSocial | null>(null);
  protected readonly erro = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const [assistido, vinculos] = await Promise.all([
        firstValueFrom(this.http.get<AssistidoResponseDTO>(this.api)),
        firstValueFrom(this.http.get<VinculoFamiliarResponseDTO[]>(`${this.api}/responsaveis`)),
      ]);
      this.ficha.set(deAssistido(assistido, vinculos));
    } catch (e) {
      this.erro.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível carregar a ficha.'));
    }
  }
}
