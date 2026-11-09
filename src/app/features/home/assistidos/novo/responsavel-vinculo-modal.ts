import { ChangeDetectionStrategy, Component, computed, effect, inject, input, model, output, signal, untracked } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ResponsavelService } from '../../../../core/responsavel.service';
import { ResponsavelResponseDTO } from '../../../../shared/models/responsavel/ResponsavelResponseDTO';
import { Modal } from '../../../../shared/components/modal/modal';
import { Input } from '../../../../shared/components/input/input';
import { Select } from '../../../../shared/components/select/select';
import { Button } from '../../../../shared/components/button/button';
import { Icon } from '../../../../shared/components/icon/icon';
import { formatarCpf, somenteDigitos } from '../../../../shared/validators/cpf.validator';
import { formatarTelefone } from '../../../../shared/utils/mascara.util';
import { normalizar } from '../../../../shared/utils/nome.util';
import { enderecoParaForm } from '../../../../shared/utils/endereco.util';
import { DadosComplementaresResponsavelForm } from '../../responsaveis/dados-complementares/dados-complementares-responsavel';
import { PARENTESCO_OPTIONS, ResponsavelPendente, responsavelVazio, validarResponsavel } from '../assistido-form.util';

/** busca: nome ou CPF; existente: já cadastrado, só o vínculo; novo: cadastro completo. */
type Etapa = 'busca' | 'existente' | 'novo';

const TAMANHO_MINIMO_BUSCA = 2;

/**
 * Adicionar/editar responsável no cadastro de assistido. Começa pela busca
 * por nome ou CPF: se a pessoa já tem cadastro, pede só os dados do vínculo (parentesco, principal, emergência, retirada) e ela é
 * vinculada sem ser recadastrada; se não tem, abre o cadastro completo.
 * Nada é gravado aqui: o resultado volta por `confirmado`.
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
    .resp-resultados { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    .resp-resultado {
      width: 100%; display: flex; flex-direction: column; gap: 2px; padding: 10px 14px;
      border: 1px solid var(--borda); border-radius: var(--radius);
      background: none; font: inherit; text-align: left; cursor: pointer;
    }
    .resp-resultado:hover { background: var(--gray-50); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResponsavelVinculoModal {
  private readonly responsavelService = inject(ResponsavelService);

  open = model(false);
  /** Responsável da lista sendo editado; null = incluindo um novo. */
  inicial = input<ResponsavelPendente | null>(null);
  /** Responsáveis já na lista (exceto o em edição), para não incluir a mesma pessoa duas vezes. */
  usados = input<Pick<ResponsavelPendente, 'responsavelId' | 'cpf'>[]>([]);
  confirmado = output<ResponsavelPendente>();

  readonly parentescoOptions = PARENTESCO_OPTIONS;
  readonly formatarCpf = formatarCpf;
  readonly formatarTelefone = formatarTelefone;

  etapa = signal<Etapa>('busca');
  termo = signal('');
  carregando = signal(false);
  erro = signal<string | null>(null);
  form = signal<ResponsavelPendente>(responsavelVazio());
  private readonly cadastrados = signal<ResponsavelResponseDTO[]>([]);

  buscou = computed(() => this.termo().trim().length >= TAMANHO_MINIMO_BUSCA);
  resultados = computed(() => {
    if (!this.buscou()) return [];
    const termo = normalizar(this.termo().trim());
    const digitos = somenteDigitos(termo);
    return this.cadastrados().filter(
      (r) =>
        !this.jaEstaNaLista(r) &&
        (normalizar(r.nomeCompleto).includes(termo) || (!!digitos && !!r.cpf?.includes(digitos))),
    );
  });

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
    this.termo.set('');
    this.carregarCadastrados();
    if (inicial) {
      this.form.set({ ...inicial, endereco: enderecoParaForm(inicial.endereco) });
      this.etapa.set(inicial.responsavelId ? 'existente' : 'novo');
    } else {
      this.form.set(responsavelVazio());
      this.etapa.set('busca');
    }
  }

  private carregarCadastrados(): void {
    this.carregando.set(true);
    this.responsavelService.listar().subscribe({
      next: (lista) => {
        this.cadastrados.set(lista);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Não foi possível carregar os responsáveis. Tente novamente.');
        this.carregando.set(false);
      },
    });
  }

  selecionar(responsavel: ResponsavelResponseDTO): void {
    this.erro.set(null);
    this.form.set(this.doCadastro(responsavel));
    this.etapa.set('existente');
  }

  cadastrarNovo(): void {
    const termo = this.termo().trim();
    const dadosDaBusca = /^[\d.\-\s]+$/.test(termo) ? { cpf: somenteDigitos(termo) } : { nomeCompleto: termo };
    this.erro.set(null);
    this.form.set({ ...responsavelVazio(), ...dadosDaBusca });
    this.etapa.set('novo');
  }

  voltarParaBusca(): void {
    this.erro.set(null);
    this.termo.set('');
    this.form.set(responsavelVazio());
    this.etapa.set('busca');
  }

  descricao(responsavel: ResponsavelResponseDTO): string {
    return [
      responsavel.cpf ? `CPF ${formatarCpf(responsavel.cpf)}` : 'Sem CPF',
      responsavel.telefone ? formatarTelefone(responsavel.telefone) : 'Sem telefone',
      `${responsavel.totalAssistidos ?? 0} atendido(s)`,
    ].join(' · ');
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
      const erro = validarResponsavel(this.form()) ?? this.erroCpfRepetido();
      if (erro) {
        this.erro.set(erro);
        return;
      }
      const cpf = this.form().cpf;
      const existente = cpf ? this.cadastrados().find((r) => r.cpf === cpf) : null;
      if (existente) {
        this.selecionar(existente);
        return;
      }
    }
    this.confirmado.emit(this.form());
    this.open.set(false);
  }

  private erroCpfRepetido(): string | null {
    const cpf = this.form().cpf;
    return cpf && this.usados().some((u) => u.cpf === cpf) ? 'Este responsável já está na lista deste atendido.' : null;
  }

  private jaEstaNaLista(r: ResponsavelResponseDTO): boolean {
    return this.usados().some((u) => u.responsavelId === r.responsavelId || (!!r.cpf && u.cpf === r.cpf));
  }

  private doCadastro(r: ResponsavelResponseDTO): ResponsavelPendente {
    return {
      ...this.form(),
      responsavelId: r.responsavelId,
      nomeCompleto: r.nomeCompleto,
      dataNascimento: r.dataNascimento ?? '',
      cpf: r.cpf ?? '',
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
