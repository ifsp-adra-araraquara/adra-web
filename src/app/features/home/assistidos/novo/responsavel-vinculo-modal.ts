import { ChangeDetectionStrategy, Component, effect, inject, input, model, output, signal, untracked } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { ResponsavelService } from '../../../../core/responsavel.service';
import { ResponsavelResponseDTO } from '../../../../shared/models/responsavel/ResponsavelResponseDTO';
import { Modal } from '../../../../shared/components/modal/modal';
import { Input } from '../../../../shared/components/input/input';
import { Select } from '../../../../shared/components/select/select';
import { Button } from '../../../../shared/components/button/button';
import { Icon } from '../../../../shared/components/icon/icon';
import { cpfValido, formatarCpf } from '../../../../shared/validators/cpf.validator';
import { formatarTelefone } from '../../../../shared/utils/mascara.util';
import { enderecoParaForm } from '../../../../shared/utils/endereco.util';
import { DadosComplementaresResponsavelForm } from '../../responsaveis/dados-complementares/dados-complementares-responsavel';
import { PARENTESCO_OPTIONS, ResponsavelPendente, responsavelVazio, validarResponsavel } from '../assistido-form.util';

/** cpf: busca; existente: CPF já cadastrado, só o vínculo; novo: cadastro completo. */
type Etapa = 'cpf' | 'existente' | 'novo';

/**
 * Adicionar/editar responsável no cadastro de assistido. Começa pelo CPF,
 * como a tela de Responsáveis: se a pessoa já tem cadastro, pede só os
 * dados do vínculo (parentesco, principal, emergência, retirada) e ela é
 * vinculada sem ser recadastrada; se não tem, abre o cadastro completo.
 * Nada é gravado aqui — o resultado volta por `confirmado` e vai para o
 * banco junto com o assistido.
 */
@Component({
  selector: 'app-responsavel-vinculo-modal',
  imports: [FormsModule, NgTemplateOutlet, Modal, Input, Select, Button, Icon, DadosComplementaresResponsavelForm],
  templateUrl: './responsavel-vinculo-modal.html',
  styles: `
    .resp-resumo {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 16px;
      margin: 0 0 8px; padding: 14px 16px; border: 1px solid var(--borda); border-radius: var(--radius);
      font-size: 14px;
    }
    .resp-resumo dt { font-size: 12px; color: var(--gray-600); }
    .resp-resumo dd { margin: 0; color: var(--gray-800); overflow-wrap: anywhere; }
    .hint { font-size: 12px; color: var(--gray-600); margin: 0; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResponsavelVinculoModal {
  private readonly responsavelService = inject(ResponsavelService);

  open = model(false);
  /** Responsável da lista sendo editado; null = incluindo um novo. */
  inicial = input<ResponsavelPendente | null>(null);
  /** CPFs já na lista (exceto o em edição), para não incluir a mesma pessoa duas vezes. */
  cpfsUsados = input<string[]>([]);
  confirmado = output<ResponsavelPendente>();

  readonly parentescoOptions = PARENTESCO_OPTIONS;
  readonly formatarCpf = formatarCpf;
  readonly formatarTelefone = formatarTelefone;

  etapa = signal<Etapa>('cpf');
  cpfBusca = signal('');
  buscando = signal(false);
  erro = signal<string | null>(null);
  form = signal<ResponsavelPendente>(responsavelVazio());

  constructor() {
    // Cada abertura começa do zero (ou do responsável em edição).
    effect(() => {
      if (!this.open()) return;
      untracked(() => this.iniciar(this.inicial()));
    });
  }

  get editando(): boolean {
    return this.inicial() != null;
  }

  private iniciar(inicial: ResponsavelPendente | null): void {
    this.erro.set(null);
    this.buscando.set(false);
    if (inicial) {
      this.form.set({ ...inicial, endereco: enderecoParaForm(inicial.endereco) });
      this.etapa.set(inicial.responsavelId ? 'existente' : 'novo');
    } else {
      this.form.set(responsavelVazio());
      this.cpfBusca.set('');
      this.etapa.set('cpf');
    }
  }

  buscar(): void {
    const cpf = this.cpfBusca();
    if (!cpfValido(cpf)) {
      this.erro.set('Informe um CPF válido.');
      return;
    }
    if (this.cpfsUsados().includes(cpf)) {
      this.erro.set('Este responsável já está na lista deste assistido.');
      return;
    }

    this.buscando.set(true);
    this.erro.set(null);
    this.responsavelService.buscarPorCpf(cpf).subscribe({
      next: (existente) => {
        this.buscando.set(false);
        this.form.set(this.doCadastro(existente));
        this.etapa.set('existente');
      },
      error: (resposta: HttpErrorResponse) => {
        this.buscando.set(false);
        if (resposta.status === 404) {
          this.form.set({ ...responsavelVazio(), cpf });
          this.etapa.set('novo');
        } else {
          this.erro.set('Não foi possível buscar o CPF. Tente novamente.');
        }
      },
    });
  }

  buscarOutroCpf(): void {
    this.erro.set(null);
    this.cpfBusca.set('');
    this.form.set(responsavelVazio());
    this.etapa.set('cpf');
  }

  atualizar(campo: keyof ResponsavelPendente, valor: string | boolean): void {
    this.form.update((f) => ({ ...f, [campo]: valor }));
    if (this.erro()) this.erro.set(null);
  }

  /** O sub-form de dados complementares edita o objeto inteiro. */
  atualizarComplementares(dados: ResponsavelPendente): void {
    this.form.set(dados);
  }

  confirmar(): void {
    if (this.etapa() === 'novo') {
      const erro = validarResponsavel(this.form());
      if (erro) {
        this.erro.set(erro);
        return;
      }
    }
    this.confirmado.emit(this.form());
    this.open.set(false);
  }

  private doCadastro(r: ResponsavelResponseDTO): ResponsavelPendente {
    return {
      ...responsavelVazio(),
      responsavelId: r.responsavelId,
      nomeCompleto: r.nomeCompleto,
      dataNascimento: r.dataNascimento ?? '',
      cpf: r.cpf,
      telefone: r.telefone ?? '',
      email: r.email ?? '',
      endereco: enderecoParaForm(r.endereco),
      observacoes: r.observacoes ?? '',
      escolaridade: r.escolaridade,
      estadoCivil: r.estadoCivil,
      profissao: r.profissao ?? '',
      renda: r.renda,
    };
  }
}
