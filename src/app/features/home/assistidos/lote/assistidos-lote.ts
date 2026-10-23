import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, WritableSignal, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AssistidoLoteService } from '../../../../core/assistido-lote.service';
import { AssistidoService } from '../../../../core/assistido.service';
import { Badge } from '../../../../shared/components/badge/badge';
import { Button } from '../../../../shared/components/button/button';
import { FotoPerfil } from '../../../../shared/components/foto-perfil/foto-perfil';
import { Icon } from '../../../../shared/components/icon/icon';
import { Input } from '../../../../shared/components/input/input';
import { StatCard } from '../../../../shared/components/stat-card/stat-card';
import { TooltipDirective } from '../../../../shared/components/tooltip/tooltip';
import { UploadDocumento } from '../../../../shared/components/upload-documento/upload-documento';
import { AssistidoLoteRequestDTO } from '../../../../shared/models/assistido/AssistidoLoteRequestDTO';
import { AssistidoRequestDTO } from '../../../../shared/models/assistido/AssistidoRequestDTO';
import { ResultadoLinhaLoteDTO } from '../../../../shared/models/assistido/ResultadoLinhaLoteDTO';
import { BadgeVariant } from '../../../../shared/utils/badge-status.util';
import {
  AssistidoLinhaLote,
  ResponsavelLinhaLote,
  decodificarCsv,
  gerarCsvAssistidos,
  modeloCsvAssistidos,
  paraDataIso,
  parseCsvAssistidos,
} from '../../../../shared/utils/csv-assistidos.util';
import { mensagemErro } from '../../../../shared/utils/erro-http.util';
import { cpfValido, telefoneValido } from '../../../../shared/validators/cpf.validator';
import { MENSAGEM_SEM_DOCUMENTO } from '../mensagens-cadastro';

type ResponsavelForm = FormGroup<{
  nomeCompleto: FormControl<string>;
  cpf: FormControl<string>;
  parentesco: FormControl<string>;
  telefone: FormControl<string>;
  email: FormControl<string>;
  contatoEmergencia: FormControl<boolean>;
  autorizadoRetirada: FormControl<boolean>;
}>;

type AssistidoForm = FormGroup<{
  nomeCompleto: FormControl<string>;
  dataNascimento: FormControl<string>;
  cpf: FormControl<string>;
  responsaveis: FormArray<ResponsavelForm>;
}>;

interface LinhaLote {
  form: AssistidoForm;
  foto: WritableSignal<File | null>;
  documentos: WritableSignal<File[]>;
  resultado: WritableSignal<ResultadoLinhaLoteDTO | null>;
  expandida: WritableSignal<boolean>;
}

type Filtro = 'todos' | 'erro' | 'prontas';

const LIMITE_LINHAS = 50;

const NOMES_CAMPOS: Record<string, string> = {
  nomeCompleto: 'Nome',
  dataNascimento: 'Nascimento',
  cpf: 'CPF',
  telefone: 'Telefone',
  email: 'E-mail',
  parentesco: 'Parentesco',
  responsaveis: 'Responsáveis',
};

function cpfValidator(control: AbstractControl<string>): ValidationErrors | null {
  return !control.value || cpfValido(control.value) ? null : { cpf: true };
}

function dataNascimentoValidator(control: AbstractControl<string>): ValidationErrors | null {
  if (!control.value) return null;
  const iso = paraDataIso(control.value);
  return iso && new Date(iso) < new Date() ? null : { data: true };
}

function telefoneValidator(control: AbstractControl<string>): ValidationErrors | null {
  return telefoneValido(control.value ?? '') ? null : { telefone: true };
}

// Recalcula os validadores locais, descartando erros vindos da API.
function revalidar(controle: AbstractControl): void {
  if (controle instanceof FormGroup || controle instanceof FormArray) Object.values(controle.controls).forEach(revalidar);
  controle.updateValueAndValidity({ onlySelf: true, emitEvent: false });
}

@Component({
  selector: 'app-assistidos-lote',
  imports: [ReactiveFormsModule, RouterLink, Input, Button, Badge, Icon, StatCard, TooltipDirective, FotoPerfil, UploadDocumento],
  templateUrl: './assistidos-lote.html',
  styleUrl: './assistidos-lote.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistidosLote {
  private readonly loteService = inject(AssistidoLoteService);
  private readonly assistidoService = inject(AssistidoService);

  readonly limite = LIMITE_LINHAS;
  readonly linhas = signal<LinhaLote[]>([]);
  readonly filtro = signal<Filtro>('todos');
  readonly enviando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);
  readonly progresso = signal('');

  readonly prontas = computed(() => this.linhas().filter((linha) => linha.resultado()?.status === 'VALIDA').length);
  readonly comErro = computed(() => this.linhas().filter((linha) => linha.resultado()?.status === 'INVALIDA').length);
  readonly todasProntas = computed(() => this.linhas().length > 0 && this.prontas() === this.linhas().length);
  readonly linhasVisiveis = computed(() => {
    const status = { todos: null, erro: 'INVALIDA', prontas: 'VALIDA' }[this.filtro()];
    return status ? this.linhas().filter((linha) => linha.resultado()?.status === status) : this.linhas();
  });

  adicionarLinha(dados?: AssistidoLinhaLote): void {
    this.linhas.update((linhas) => [...linhas, this.criarLinha(dados)]);
  }

  removerLinha(linha: LinhaLote): void {
    this.linhas.update((linhas) => linhas.filter((atual) => atual !== linha));
  }

  adicionarResponsavel(linha: LinhaLote): void {
    linha.form.controls.responsaveis.push(this.criarResponsavel());
  }

  removerResponsavel(linha: LinhaLote, indice: number): void {
    linha.form.controls.responsaveis.removeAt(indice);
  }

  tornarPrincipal(linha: LinhaLote, indice: number): void {
    const responsaveis = linha.form.controls.responsaveis;
    const responsavel = responsaveis.at(indice);
    responsaveis.removeAt(indice);
    responsaveis.insert(0, responsavel);
  }

  trocarFoto(linha: LinhaLote, foto: File | null): void {
    linha.foto.set(foto);
    linha.resultado.set(null);
  }

  trocarDocumentos(linha: LinhaLote, documentos: File[]): void {
    linha.documentos.set(documentos);
    linha.resultado.set(null);
  }

  alternarExpansao(linha: LinhaLote): void {
    linha.expandida.update((expandida) => !expandida);
  }

  expandirTodas(expandir: boolean): void {
    this.linhas().forEach((linha) => linha.expandida.set(expandir));
  }

  nomesResponsaveis(linha: LinhaLote): string[] {
    return linha.form.controls.responsaveis.controls.map((responsavel) => responsavel.controls.nomeCompleto.value.trim() || '—');
  }

  totalResponsaveis(): number {
    const cpfs = this.linhas().flatMap((linha) =>
      linha.form.controls.responsaveis.controls.map((responsavel) => responsavel.controls.cpf.value),
    );
    return new Set(cpfs.filter(Boolean)).size;
  }

  responsaveisJaCadastrados(): number {
    return new Set(this.linhas().flatMap((linha) => Object.keys(linha.resultado()?.responsaveisExistentes ?? {}))).size;
  }

  errosGerais(linha: LinhaLote): string[] {
    return (linha.resultado()?.erros ?? [])
      .filter((erro) => !this.controleDoErro(linha, erro))
      .map((erro) => this.formatarErro(erro));
  }

  async importarCsv(evento: Event): Promise<void> {
    const campo = evento.target as HTMLInputElement;
    const arquivo = campo.files?.[0];
    campo.value = '';
    if (!arquivo) return;

    this.erro.set(null);
    this.aviso.set(null);
    const importadas = parseCsvAssistidos(decodificarCsv(await arquivo.arrayBuffer()));
    if (!importadas.length) {
      this.erro.set('Nenhuma linha encontrada. Confira se o arquivo segue o modelo.');
      return;
    }
    if (this.linhas().length + importadas.length > LIMITE_LINHAS) {
      this.erro.set(`O lote aceita até ${LIMITE_LINHAS} assistidos. Divida o arquivo e importe em partes.`);
      return;
    }

    this.linhas.update((linhas) => [...linhas, ...importadas.map((dados) => this.criarLinha(dados))]);
    this.aviso.set(
      `${importadas.length} assistido(s) importado(s) de ${arquivo.name}. ` +
        'Adicione o RG ou CPF de cada um e clique em Validar.',
    );
  }

  baixarModelo(): void {
    this.baixar(modeloCsvAssistidos(), 'modelo-cadastro-assistidos.csv');
  }

  baixarPendencias(): void {
    const pendentes = this.linhas()
      .filter((linha) => linha.resultado()?.status !== 'VALIDA')
      .map((linha) => linha.form.getRawValue());
    this.baixar(gerarCsvAssistidos(pendentes), 'assistidos-pendentes.csv');
  }

  validar(): void {
    const enviadas = this.linhas();
    if (!enviadas.length) return;

    enviadas.forEach((linha) => linha.form.markAllAsTouched());
    this.erro.set(null);
    this.aviso.set(null);
    this.enviando.set(true);

    this.loteService.validar(enviadas.map((linha) => this.paraRequest(linha))).subscribe({
      next: (resultados) => {
        for (const resultado of resultados) {
          const linha = enviadas[resultado.indice];
          const erros = linha.documentos().length ? resultado.erros : [...resultado.erros, MENSAGEM_SEM_DOCUMENTO];
          this.aplicarResultado(linha, { ...resultado, status: erros.length ? 'INVALIDA' : 'VALIDA', erros });
        }
        this.enviando.set(false);
      },
      error: (resposta: HttpErrorResponse) => {
        this.erro.set(mensagemErro(resposta, 'Não foi possível validar o lote. Tente novamente.'));
        this.enviando.set(false);
      },
    });
  }

  // Uma linha por vez: irmãos reaproveitam o responsável criado pela linha anterior.
  async cadastrar(): Promise<void> {
    const prontas = this.linhas().filter((linha) => linha.resultado()?.status === 'VALIDA');
    if (!prontas.length) return;

    this.erro.set(null);
    this.aviso.set(null);
    this.enviando.set(true);

    let cadastradas = 0;
    for (const [posicao, linha] of prontas.entries()) {
      const resultado = linha.resultado();
      if (resultado?.status !== 'VALIDA' || !this.linhas().includes(linha)) continue;

      this.progresso.set(`Cadastrando ${posicao + 1} de ${prontas.length}…`);
      try {
        await firstValueFrom(this.assistidoService.cadastrar(this.paraCadastro(linha), linha.foto(), linha.documentos()));
        this.removerLinha(linha);
        cadastradas++;
      } catch (resposta) {
        this.aplicarResultado(linha, { ...resultado, status: 'INVALIDA', erros: this.errosDoCadastro(resposta as HttpErrorResponse) });
      }
    }

    this.progresso.set('');
    this.enviando.set(false);
    const pendentes = this.linhas().length;
    this.aviso.set(
      pendentes
        ? `${cadastradas} assistido(s) cadastrado(s). ${pendentes} linha(s) continuam na grade para correção.`
        : `${cadastradas} assistido(s) cadastrado(s).`,
    );
  }

  statusDaLinha(linha: LinhaLote): { label: string; variant: BadgeVariant } {
    const resultado = linha.resultado();
    if (resultado?.status === 'VALIDA') return { label: 'Pronta', variant: 'green' };
    if (resultado?.status === 'INVALIDA') {
      const total = resultado.erros.length;
      return { label: total === 1 ? '1 erro' : `${total} erros`, variant: 'red' };
    }
    return { label: 'Não validada', variant: 'gray' };
  }

  mensagemCampo(control: AbstractControl): string | null {
    if (!control.touched || !control.errors) return null;
    if (control.errors['required']) return 'Obrigatório';
    if (control.errors['cpf']) return 'CPF inválido';
    if (control.errors['data']) return 'Use dd/mm/aaaa, no passado';
    if (control.errors['telefone']) return 'DDD + número';
    if (control.errors['email']) return 'E-mail inválido';
    return control.errors['api'] ?? 'Valor inválido';
  }

  formatarErro(erro: string): string {
    const [caminho, ...resto] = erro.split(':');
    const mensagem = resto.join(':').trim();
    if (!mensagem) return erro;
    const campoResponsavel = /^responsaveis\[(\d+)\]\.(\w+)$/.exec(caminho.trim());
    const rotulo = campoResponsavel
      ? `Responsável ${Number(campoResponsavel[1]) + 1} · ${NOMES_CAMPOS[campoResponsavel[2]] ?? campoResponsavel[2]}`
      : NOMES_CAMPOS[caminho.trim()] ?? caminho.trim();
    return `${rotulo}: ${mensagem}`;
  }

  private aplicarResultado(linha: LinhaLote, resultado: ResultadoLinhaLoteDTO): void {
    linha.resultado.set(resultado);
    this.marcarErrosNosCampos(linha, resultado.erros);
    if (resultado.status === 'INVALIDA') linha.expandida.set(true);
  }

  private errosDoCadastro(resposta: HttpErrorResponse): string[] {
    const detalhes: string[] = resposta.error?.detalhes ?? [];
    return detalhes.length ? detalhes : [mensagemErro(resposta, 'Não foi possível cadastrar este assistido.')];
  }

  // Erros "campo: mensagem" da API ficam no próprio campo; os demais vão para o quadro da linha.
  private controleDoErro(linha: LinhaLote, erro: string): AbstractControl | null {
    const caminho = erro.split(':')[0].trim().replace(/\[(\d+)\]/g, '.$1');
    const controle = linha.form.get(caminho);
    return controle instanceof FormControl ? controle : null;
  }

  private marcarErrosNosCampos(linha: LinhaLote, erros: string[]): void {
    revalidar(linha.form);
    for (const erro of erros) {
      const controle = this.controleDoErro(linha, erro);
      if (!controle) continue;
      controle.setErrors({ ...controle.errors, api: erro.slice(erro.indexOf(':') + 1).trim() });
      controle.markAsTouched();
    }
  }

  private paraRequest(linha: LinhaLote): AssistidoLoteRequestDTO {
    const valor = linha.form.getRawValue();
    return {
      nomeCompleto: valor.nomeCompleto.trim(),
      dataNascimento: paraDataIso(valor.dataNascimento),
      cpf: valor.cpf || undefined,
      responsaveis: valor.responsaveis.map((responsavel, indice) => ({
        nomeCompleto: responsavel.nomeCompleto.trim(),
        cpf: responsavel.cpf,
        parentesco: responsavel.parentesco || undefined,
        telefone: responsavel.telefone || undefined,
        email: responsavel.email || undefined,
        responsavelPrincipal: indice === 0,
        contatoEmergencia: responsavel.contatoEmergencia,
        autorizadoRetirada: responsavel.autorizadoRetirada,
      })),
    };
  }

  private paraCadastro(linha: LinhaLote): AssistidoRequestDTO {
    const dados = this.paraRequest(linha);
    return { ...dados, dataNascimento: dados.dataNascimento ?? '' };
  }

  private criarLinha(dados?: AssistidoLinhaLote): LinhaLote {
    const responsaveis = dados?.responsaveis.length ? dados.responsaveis : [undefined];
    const form: AssistidoForm = new FormGroup({
      nomeCompleto: new FormControl(dados?.nomeCompleto ?? '', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(180)],
      }),
      dataNascimento: new FormControl(dados?.dataNascimento ?? '', {
        nonNullable: true,
        validators: [Validators.required, dataNascimentoValidator],
      }),
      cpf: new FormControl(dados?.cpf ?? '', { nonNullable: true, validators: [cpfValidator] }),
      responsaveis: new FormArray(
        responsaveis.map((responsavel) => this.criarResponsavel(responsavel)),
        Validators.minLength(1),
      ),
    });

    const linha: LinhaLote = {
      form,
      foto: signal(null),
      documentos: signal([]),
      resultado: signal(null),
      expandida: signal(true),
    };
    form.valueChanges.subscribe(() => {
      linha.resultado.set(null);
      revalidar(form);
    });
    return linha;
  }

  private criarResponsavel(dados?: ResponsavelLinhaLote): ResponsavelForm {
    return new FormGroup({
      nomeCompleto: new FormControl(dados?.nomeCompleto ?? '', { nonNullable: true, validators: [Validators.required] }),
      cpf: new FormControl(dados?.cpf ?? '', { nonNullable: true, validators: [Validators.required, cpfValidator] }),
      parentesco: new FormControl(dados?.parentesco ?? '', { nonNullable: true }),
      telefone: new FormControl(dados?.telefone ?? '', { nonNullable: true, validators: [telefoneValidator] }),
      email: new FormControl(dados?.email ?? '', { nonNullable: true, validators: [Validators.email] }),
      contatoEmergencia: new FormControl(dados?.contatoEmergencia ?? false, { nonNullable: true }),
      autorizadoRetirada: new FormControl(dados?.autorizadoRetirada ?? false, { nonNullable: true }),
    });
  }

  private baixar(conteudo: string, nomeArquivo: string): void {
    const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    link.click();
    URL.revokeObjectURL(url);
  }
}
