import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, EventEmitter, Input as InputDecorator, OnChanges, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ResponsavelService } from '../../../../core/responsavel.service';
import { AlertaCpfDuplicadoDTO } from '../../../../shared/models/responsavel/AlertaCpfDuplicadoDTO';
import { ResponsavelResponseDTO } from '../../../../shared/models/responsavel/ResponsavelResponseDTO';
import { cpfValidator } from '../../../../shared/validators/cpf.validator';
import { errosPorCampo } from '../../../../shared/utils/erro-http.util';
import { Input } from '../../../../shared/components/input/input';
import { Button } from '../../../../shared/components/button/button';
import { Select } from '../../../../shared/components/select/select';
import { EnderecoForm } from '../../../../shared/components/endereco-form/endereco-form';
import { EnderecoDTO } from '../../../../shared/models/endereco/EnderecoDTO';
import { ResponsavelRequestDTO } from '../../../../shared/models/responsavel/ResponsavelRequestDTO';
import { Escolaridade } from '../../../../shared/enum/Escolaridade';
import { EstadoCivil } from '../../../../shared/enum/EstadoCivil';
import { enderecoParaForm, enderecoParaPayload } from '../../../../shared/utils/endereco.util';
import { ESCOLARIDADE_OPTIONS, ESTADO_CIVIL_OPTIONS } from '../dados-complementares/dados-complementares-responsavel';

type EtapaForm = 'buscaCpf' | 'formulario';

@Component({
  selector: 'app-responsavel-form',
  imports: [ReactiveFormsModule, Input, Button, Select, EnderecoForm],
  templateUrl: './responsavel-form.html',
  styleUrl: './responsavel-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResponsavelForm implements OnChanges {
  private responsavelService = inject(ResponsavelService);
  private fb = inject(FormBuilder);

  /** Se vier preenchido, o form abre direto em modo edicao (pula a busca por CPF). */
  @InputDecorator() responsavelParaEditar: ResponsavelResponseDTO | null = null;

  @Output() salvo = new EventEmitter<ResponsavelResponseDTO>();
  @Output() cancelado = new EventEmitter<void>();

  etapa = signal<EtapaForm>('buscaCpf');
  modoEdicao = signal(false);
  responsavelIdEmEdicao = signal<number | null>(null);

  buscandoCpf = signal(false);
  cpfNaoEncontrado = signal(false);
  responsavelEncontrado = signal<ResponsavelResponseDTO | null>(null);

  salvando = signal(false);
  erro = signal<string | null>(null);
  errosPorCampo = signal<Record<string, string>>({});

  cpfBusca = this.fb.nonNullable.control('', [Validators.required, cpfValidator()]);

  form = this.fb.nonNullable.group({
    nomeCompleto: ['', [Validators.required, Validators.maxLength(180)]],
    dataNascimento: [''],
    cpf: ['', [Validators.required, cpfValidator()]],
    telefone: ['', Validators.pattern(/^$|^\d{10,11}$/)],
    email: ['', Validators.email],
    endereco: [enderecoParaForm(null) as EnderecoDTO],
    observacoes: [''],
    escolaridade: [null as Escolaridade | null],
    estadoCivil: [null as EstadoCivil | null],
    profissao: ['', Validators.maxLength(120)],
    renda: [null as number | null, Validators.min(0)],
  });

  protected readonly escolaridadeOptions = ESCOLARIDADE_OPTIONS;
  protected readonly estadoCivilOptions = ESTADO_CIVIL_OPTIONS;

  protected erroRenda = (): string | null => {
    if (this.form.controls.renda.touched && this.form.controls.renda.invalid) return 'A renda não pode ser negativa.';
    return this.errosPorCampo()['renda'] ?? null;
  };

  protected erroCpfBusca = () =>
    this.cpfBusca.touched && this.cpfBusca.invalid ? 'CPF inválido.' : null;

  protected erroNome = () => this.errosPorCampo()['nomeCompleto'] ?? null;
  protected erroDataNascimento = () => this.errosPorCampo()['dataNascimento'] ?? null;

  protected erroCpfForm = (): string | null => {
    if (this.form.controls.cpf.touched && this.form.controls.cpf.invalid) return 'CPF inválido.';
    return this.errosPorCampo()['cpf'] ?? null;
  };

  protected erroTelefone = (): string | null => {
    if (this.form.controls.telefone.touched && this.form.controls.telefone.invalid) {
      return 'Telefone deve ter DDD + número (10 ou 11 dígitos).';
    }
    return this.errosPorCampo()['telefone'] ?? null;
  };

  protected erroEmail = (): string | null => {
    if (this.form.controls.email.touched && this.form.controls.email.invalid) {
      return 'Informe um e-mail válido.';
    }
    return this.errosPorCampo()['email'] ?? null;
  };

  /** Usado no [max] do input de data, para impedir escolher data futura no seletor do navegador. */
  get dataMaxima(): string {
    return new Date().toISOString().split('T')[0];
  }

  ngOnChanges(): void {
    if (this.responsavelParaEditar) {
      this.iniciarEdicao(this.responsavelParaEditar);
    } else {
      this.reiniciar();
    }
  }

  /* ===== Etapa 1: busca por CPF (CA-A01.2) ===== */

  buscarPorCpf(): void {
    if (this.cpfBusca.invalid) {
      this.cpfBusca.markAsTouched();
      return;
    }

    const cpf = this.cpfBusca.value;
    this.buscandoCpf.set(true);
    this.cpfNaoEncontrado.set(false);
    this.responsavelEncontrado.set(null);

    this.responsavelService.buscarPorCpf(cpf).subscribe({
      next: (responsavel) => {
        this.responsavelEncontrado.set(responsavel);
        this.buscandoCpf.set(false);
      },
      error: (resposta: HttpErrorResponse) => {
        if (resposta.status === 404) {
          this.cpfNaoEncontrado.set(true);
          this.iniciarCadastroComCpf(cpf);
        } else {
          this.erro.set('Nao foi possivel buscar o CPF. Tente novamente.');
        }
        this.buscandoCpf.set(false);
      },
    });
  }

  /** Usuario decide reaproveitar o registro encontrado em vez de criar um novo. */
  usarResponsavelEncontrado(): void {
    const responsavel = this.responsavelEncontrado();
    if (responsavel) {
      this.iniciarEdicao(responsavel);
    }
  }

  buscarOutroCpf(): void {
    this.responsavelEncontrado.set(null);
    this.cpfNaoEncontrado.set(false);
    this.cpfBusca.reset('');
  }

  private iniciarCadastroComCpf(cpf: string): void {
    this.modoEdicao.set(false);
    this.responsavelIdEmEdicao.set(null);
    this.form.reset();
    this.form.patchValue({ cpf });
    this.etapa.set('formulario');
  }

  /* ===== Etapa 2: formulario (cadastro novo ou edicao) ===== */

  private iniciarEdicao(responsavel: ResponsavelResponseDTO): void {
    this.modoEdicao.set(true);
    this.responsavelIdEmEdicao.set(responsavel.responsavelId);
    this.form.reset({
      nomeCompleto: responsavel.nomeCompleto,
      dataNascimento: responsavel.dataNascimento ?? '',
      cpf: responsavel.cpf,
      telefone: responsavel.telefone ?? '',
      email: responsavel.email ?? '',
      endereco: enderecoParaForm(responsavel.endereco),
      observacoes: responsavel.observacoes ?? '',
      escolaridade: responsavel.escolaridade,
      estadoCivil: responsavel.estadoCivil,
      profissao: responsavel.profissao ?? '',
      renda: responsavel.renda,
    });
    this.etapa.set('formulario');
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.salvando.set(true);
    this.limparMensagens();

    const valores = this.form.getRawValue();
    const dto: ResponsavelRequestDTO = {
      ...valores,
      endereco: enderecoParaPayload(valores.endereco),
      profissao: valores.profissao.trim() || null,
    };
    const id = this.responsavelIdEmEdicao();

    const operacao = this.modoEdicao() && id
      ? this.responsavelService.atualizar(id, dto)
      : this.responsavelService.cadastrar(dto);

    operacao.subscribe({
      next: (responsavel) => {
        this.salvando.set(false);
        this.salvo.emit(responsavel);
        this.reiniciar();
      },
      error: (resposta: HttpErrorResponse) => {
        this.tratarErro(resposta);
        this.salvando.set(false);
      },
    });
  }

  /** CA-A01.4: cancelar nao persiste nada - so reseta estado local, sem chamada ao backend. */
  cancelar(): void {
    this.reiniciar();
    this.cancelado.emit();
  }

  private tratarErro(resposta: HttpErrorResponse): void {
    if (resposta.status === 409 && resposta.error?.responsavelExistente) {
      const alerta = resposta.error as AlertaCpfDuplicadoDTO;
      this.responsavelEncontrado.set(alerta.responsavelExistente);
      this.erro.set(alerta.mensagem);
      this.etapa.set('buscaCpf');
      return;
    }

    const porCampo = errosPorCampo(resposta);
    if (Object.keys(porCampo).length) {
      this.errosPorCampo.set(porCampo);
      return;
    }

    this.erro.set(resposta.error?.mensagem ?? 'Nao foi possivel salvar. Tente novamente.');
  }

  private limparMensagens(): void {
    this.erro.set(null);
    this.errosPorCampo.set({});
  }

  private reiniciar(): void {
    this.etapa.set('buscaCpf');
    this.modoEdicao.set(false);
    this.responsavelIdEmEdicao.set(null);
    this.cpfBusca.reset('');
    this.cpfNaoEncontrado.set(false);
    this.responsavelEncontrado.set(null);
    this.form.reset();
    this.limparMensagens();
  }
}
