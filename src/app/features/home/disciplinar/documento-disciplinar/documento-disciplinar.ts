import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { DisciplinarService } from '../../../../core/disciplinar.service';
import { RegistroDisciplinarDTO } from '../../../../shared/models/disciplinar/Disciplinar';
import { dataPorExtenso } from '../../../../shared/utils/data-por-extenso.util';
import { Button } from '../../../../shared/components/button/button';
import { FolhaA4 } from '../../../../shared/components/folha-a4/folha-a4';
import { Icon } from '../../../../shared/components/icon/icon';
import { INSTITUICAO } from '../../../../shared/utils/instituicao';
import { textoDocumento } from './textos-documentos-disciplinares';

/**
 * FT-04/FT-25: documento do registro disciplinar no modelo da ADRA (carta de
 * advertência, termo de suspensão, comunicado de uniforme ou de ocorrência),
 * pronto para imprimir em A4 — o menu e os botões somem na impressão.
 */
@Component({
  selector: 'app-documento-disciplinar',
  imports: [Button, FolhaA4, Icon],
  templateUrl: './documento-disciplinar.html',
  styleUrl: './documento-disciplinar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentoDisciplinar implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly disciplinarService = inject(DisciplinarService);

  readonly INSTITUICAO = INSTITUICAO;

  readonly registro = signal<RegistroDisciplinarDTO | null>(null);
  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);

  readonly texto = computed(() => {
    const r = this.registro();
    return r ? textoDocumento(r) : null;
  });
  readonly data = computed(() => {
    const r = this.registro();
    return r ? dataPorExtenso(r.dataRegistro) : '';
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('registroId'));
    if (!id) {
      this.erro.set('Registro não encontrado.');
      this.carregando.set(false);
      return;
    }
    this.carregar(id);
  }

  voltar(): void {
    this.location.back();
  }

  private async carregar(id: number): Promise<void> {
    try {
      this.registro.set(await this.disciplinarService.buscarRegistro(id));
    } catch {
      this.erro.set('Não foi possível carregar o registro.');
    } finally {
      this.carregando.set(false);
    }
  }
}
