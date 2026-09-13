import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ResponsavelService } from '../../../../core/responsavel.service';
import { AlertaCpfDuplicadoDTO } from '../../../../shared/models/responsavel/AlertaCpfDuplicadoDTO';
import { ResponsavelResponseDTO } from '../../../../shared/models/responsavel/ResponsavelResponseDTO';
import { cpfValidator, formatarCpf, somenteDigitos } from '../../../../shared/validators/cpf.validator';

type EtapaForm = 'buscaCpf' | 'formulario';

@Component({
  selector: 'app-responsavel-form',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './responsavel-form.html',
  styleUrl: './responsavel-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResponsavelForm implements OnChanges {
  private responsavelService = inject(ResponsavelService);
  private fb = inject(FormBuilder);

  /** Se vier preenchido, o form abre direto em modo edicao (pula a busca por CPF). */
  @Input() responsavelParaEditar: ResponsavelResponseDTO | null = null;

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
    telefone: ['', Validators.pattern(/^$|\d{10,11}/)],
    email: ['', Validators.email],
    endereco: [''],
    observacoes: [''],
  });

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

  onCpfBuscaInput(valor: string): void {
    this.cpfBusca.setValue(formatarCpf(valor), { emitEvent: false });
    this.cpfNaoEncontrado.set(false);
    this.responsavelEncontrado.set(null);
  }

  buscarPorCpf(): void {
    if (this.cpfBusca.invalid) {
      this.cpfBusca.markAsTouched();
      return;
    }

    const cpf = somenteDigitos(this.cpfBusca.value);
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
      endereco: responsavel.endereco ?? '',
      observacoes: responsavel.observacoes ?? '',
    });
    this.etapa.set('formulario');
  }

  onCpfFormInput(valor: string): void {
    this.form.patchValue({ cpf: formatarCpf(valor) }, { emitEvent: false });
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.salvando.set(true);
    this.limparMensagens();

    const dto = { ...this.form.getRawValue(), cpf: somenteDigitos(this.form.getRawValue().cpf) };
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

    const detalhes: string[] = resposta.error?.detalhes ?? [];
    if (detalhes.length) {
      const porCampo: Record<string, string> = {};
      for (const detalhe of detalhes) {
        const [campo, ...resto] = detalhe.split(':');
        porCampo[campo.trim()] = resto.join(':').trim();
      }
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