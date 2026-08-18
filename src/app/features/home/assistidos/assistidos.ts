import {
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';

import { StatusGeral } from '../../../shared/enum/StatusGeral';


import { AssistidoRequestDTO } from '../../../shared/models/assistido/AssistidoRequestDTO'

import { AssistidoResponseDTO } from '../../../shared/models/assistido/AssistidoResponseDTO';
import { AssistidoStatusRequestDTO } from '../../../shared/models/assistido/AssistidoStatusRequestDTO';

import { ResponsavelRequestDTO } from '../../../shared/models/responsavel/ResponsavelRequestDTO';
import { ResponsavelResponseDTO } from '../../../shared/models/responsavel/ResponsavelResponseDTO';

import { VinculoFamiliarRequestDTO } from '../../../shared/models/vinculoFamiliar/VinculoFamiliarRequestDTO';
import { VinculoFamiliarComResponsavelRequestDTO } from '../../../shared/models/vinculoFamiliar/VinculoFamiliarComResponsavelRequestDTO';

/*
 * Responsável ainda não salvo no backend — vive só no
 * estado local do modal até o assistido ser criado.
 * Junta os campos do ResponsavelRequestDTO com os campos
 * do vínculo familiar (que só existem depois que o
 * responsável e o assistido têm ID).
 */
interface ResponsavelPendente extends ResponsavelRequestDTO {
  parentesco: string;
  responsavelPrincipal: boolean;
  contatoEmergencia: boolean;
  autorizadoRetirada: boolean;
}


@Component({
  selector: 'app-assistidos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './assistidos.html',
  styleUrl: './assistidos.css'
})
export class Assistidos implements OnInit {

  private http = inject(HttpClient);

  StatusGeral = StatusGeral;

  private readonly apiAssistidos = `${environment.apiUrl}/api/assistidos`;
  private readonly apiResponsaveis = `${environment.apiUrl}/api/responsaveis`;


  /* Listagem */
  assistidos = signal<AssistidoResponseDTO[]>([]);
  carregando = signal(false);

  abaAtiva = signal<'todos' | 'ativos' | 'acomp'>('todos');
  abaVerAssistido = signal<'dados' | 'fam' | 'cham' | 'disc' | 'prn'>('dados');


  trocarAbaVerAssistido(aba: 'dados' | 'fam' | 'cham' | 'disc' | 'prn') {
    this.abaVerAssistido.set(aba);
  }

  mostrarFormNovoResponsavelVinculado = signal(false);
  salvandoResponsavelVinculado = signal(false);
  erroResponsavelVinculado = signal<string | null>(null);
  novoResponsavelVinculado: ResponsavelPendente = this.responsavelVazio();




  /* Modal novo assistido */

  mostrarModalNovo = signal(false);
salvando = signal(false);
erroSalvar = signal<string | null>(null);

novoAssistido: AssistidoRequestDTO = this.assistidoVazio();

assistidoIdCriado = signal<number | null>(null);

/* Responsáveis já salvos e vinculados (não mais "pendentes" — são reais, já no backend) */
responsaveisVinculados = signal<ResponsavelPendente[]>([]);
salvandoResponsavel = signal(false);
erroResponsavel = signal<string | null>(null);


/* Sub-fluxo de responsáveis dentro do modal */
responsaveisPendentes = signal<ResponsavelPendente[]>([]); // ← precisa vir ANTES

novoResponsavel: ResponsavelPendente = this.responsavelVazio(); // ← agora funciona

  ngOnInit(): void {

    this.carregarAssistidos();

  }

  abrirFormNovoResponsavelVinculado(): void {
    this.novoResponsavelVinculado = this.responsavelVazio();
    this.erroResponsavelVinculado.set(null);
    this.mostrarFormNovoResponsavelVinculado.set(true);
  }

  fecharFormNovoResponsavelVinculado(): void {
    this.mostrarFormNovoResponsavelVinculado.set(false);
  }

  atualizarCampoResponsavelVinculado(
    campo: keyof ResponsavelPendente,
    valor: string | boolean
  ): void {
    this.novoResponsavelVinculado = { ...this.novoResponsavelVinculado, [campo]: valor };
  }





  /*
   * ============================================================
   * LISTAR
   * ============================================================
   */
  carregarAssistidos(): void {

    this.carregando.set(true);

    this.http
      .get<AssistidoResponseDTO[]>(this.apiAssistidos)
      .subscribe({

        next: (lista) => {

          this.assistidos.set(lista);
          this.carregando.set(false);

        },

        error: (erro) => {

          console.error('Erro ao carregar assistidos:', erro);
          this.carregando.set(false);

        }

      });

  }


  get assistidosFiltrados(): AssistidoResponseDTO[] {

    const lista = this.assistidos();

    if (this.abaAtiva() === 'ativos') {
      return lista.filter(a => a.status === StatusGeral.ATIVO);
    }

    // 'acomp' (em acompanhamento) depende de dado clínico/sociopedagógico
    // que ainda não existe no AssistidoResponseDTO — fica igual a 'todos'
    // até esse endpoint existir.
    return lista;

  }


  calcularIdade(dataNascimento: string): number {

    const nasc = new Date(dataNascimento);
    const hoje = new Date();

    let idade = hoje.getFullYear() - nasc.getFullYear();
    const aindaNaoFezAniversario =
      hoje.getMonth() < nasc.getMonth() ||
      (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate());

    if (aindaNaoFezAniversario) {
      idade--;
    }

    return idade;

  }


  /*
   * ============================================================
   * MODAL: NOVO ASSISTIDO
   * ============================================================
   */
  private assistidoVazio(): AssistidoRequestDTO {

    return {
      nomeCompleto: '',
      dataNascimento: '',
      cpf: '',
      dataEntrada: '',
      necessidadesEspecificas: '',
      observacoes: '',
      confirmarApesarDeDuplicidade: false
    };

  }


  private responsavelVazio(): ResponsavelPendente {
  return {
    nomeCompleto: '',
    dataNascimento: '',
    cpf: '',
    telefone: '',
    email: '',
    endereco: '',
    observacoes: '',
    parentesco: '',
    responsavelPrincipal: false, // default fixo, sem depender de signal
    contatoEmergencia: false,
    autorizadoRetirada: false
  };
}


  abrirModalNovoAssistido(): void {
  this.novoAssistido = this.assistidoVazio();
  this.assistidoIdCriado.set(null);
  this.responsaveisVinculados.set([]);
  this.novoResponsavel = this.responsavelVazio();
  this.erroSalvar.set(null);
  this.erroResponsavel.set(null);
  this.mostrarModalNovo.set(true);
}

fecharModalNovoAssistido(): void {
  this.mostrarModalNovo.set(false);
}

atualizarCampoResponsavel(
  campo: keyof ResponsavelPendente,
  valor: string | boolean
): void {
  this.novoResponsavel = { ...this.novoResponsavel, [campo]: valor };
}


  atualizarCampoAssistido(
    campo: keyof AssistidoRequestDTO,
    valor: string | boolean
  ): void {

    this.novoAssistido = { ...this.novoAssistido, [campo]: valor };

  }

  /*
   * ============================================================
   * ADICIONAR / REMOVER RESPONSÁVEL PENDENTE
   * (só vira request de verdade quando o assistido for salvo)
   * ============================================================
   */
adicionarResponsavelPendente(): void {

  if (!this.novoResponsavel.nomeCompleto.trim()) {
    return;
  }

  const ehPrimeiro = this.responsaveisPendentes().length === 0;

  const responsavel: ResponsavelPendente = {
    ...this.novoResponsavel,
    responsavelPrincipal: ehPrimeiro ? true : this.novoResponsavel.responsavelPrincipal
  };

  this.responsaveisPendentes.update(lista => [...lista, responsavel]);

  this.novoResponsavel = this.responsavelVazio();

}


  removerResponsavelPendente(index: number): void {

    this.responsaveisPendentes.update(lista => lista.filter((_, i) => i !== index));

  }


  /*
   * ============================================================
   * SALVAR
   * ============================================================
   * 1) POST /api/assistidos
   * 2) Para cada responsável pendente:
   *    a) POST /api/responsaveis
   *    b) POST /api/assistidos/{id}/responsaveis (vínculo)
   */
async salvarAssistido(): Promise<void> {

  if (this.salvando()) {
    return;
  }

  if (!this.novoAssistido.nomeCompleto.trim() || !this.novoAssistido.dataNascimento) {
    this.erroSalvar.set('Preencha nome completo e data de nascimento.');
    return;
  }

  this.salvando.set(true);
  this.erroSalvar.set(null);

  try {

    // Se já existe (usuário salvou um responsável antes), reaproveita o ID.
    // Só cria o assistido do zero se ainda não foi criado nesta sessão do modal.
    await this.garantirAssistidoCriado();

    this.salvando.set(false);
    this.fecharModalNovoAssistido();
    this.carregarAssistidos();

  } catch (erro: any) {

    console.error('Erro ao salvar assistido:', erro);
    this.erroSalvar.set(
      erro?.message ?? 'Não foi possível salvar. Verifique os dados e tente novamente.'
    );
    this.salvando.set(false);

  }

}
  


  /*
   * ============================================================
   * ALTERAR STATUS (encerramento/reativação)
   * ============================================================
   */
  alterarStatus(
    assistido: AssistidoResponseDTO,
    novoStatus: StatusGeral
  ): void {

    const dto: AssistidoStatusRequestDTO = { status: novoStatus };

    this.http
      .patch<AssistidoResponseDTO>(
        `${this.apiAssistidos}/${assistido.assistidoId}/status`,
        dto
      )
      .subscribe({

        next: () => this.carregarAssistidos(),

        error: (erro) => console.error('Erro ao alterar status:', erro)

      });

  }


  // ============================================================
// MODAL: VISUALIZAR ASSISTIDO
// ============================================================

mostrarModalVisualizar = signal(false);

assistidoSelecionado = signal<AssistidoResponseDTO | null>(null);

responsaveisDoAssistido = signal<any[]>([]);

carregandoResponsaveis = signal(false);

erroResponsaveis = signal<string | null>(null);


abrirModalVisualizarAssistido(assistido: AssistidoResponseDTO): void {
  this.abaVerAssistido.set('dados'); // reset

  this.assistidoSelecionado.set(assistido);

  this.responsaveisDoAssistido.set([]);

  this.erroResponsaveis.set(null);

  this.mostrarModalVisualizar.set(true);

  this.carregarResponsaveis(assistido.assistidoId);
}


fecharModalVisualizarAssistido(): void {

  this.mostrarModalVisualizar.set(false);

  this.assistidoSelecionado.set(null);

  this.responsaveisDoAssistido.set([]);

  this.erroResponsaveis.set(null);
}


carregarResponsaveis(assistidoId: number): void {

  this.carregandoResponsaveis.set(true);

  this.http
    .get<any[]>(
      `${this.apiAssistidos}/${assistidoId}/responsaveis`
    )
    .subscribe({

      next: (responsaveis) => {

        this.responsaveisDoAssistido.set(responsaveis);

        this.carregandoResponsaveis.set(false);

      },

      error: (erro) => {

        console.error(
          'Erro ao carregar responsáveis:',
          erro
        );

        this.erroResponsaveis.set(
          'Não foi possível carregar os responsáveis deste assistido.'
        );

        this.carregandoResponsaveis.set(false);

      }

    });
}


calcularIdadeResponsavel(dataNascimento?: string): string {

  if (!dataNascimento) {
    return 'Não informado';
  }

  return `${this.calcularIdade(dataNascimento)} anos`;
}


/**
 * Garante que o assistido já foi persistido no backend.
 * Se ainda não foi (usuário está adicionando o 1º responsável
 * antes de clicar em "Salvar assistido"), cria o assistido agora
 * e guarda o ID pra reaproveitar nos próximos responsáveis.
 */
private async garantirAssistidoCriado(): Promise<number> {

  const idJaCriado = this.assistidoIdCriado();
  if (idJaCriado) {
    return idJaCriado;
  }

  if (!this.novoAssistido.nomeCompleto.trim() || !this.novoAssistido.dataNascimento) {
    throw new Error('Preencha nome completo e data de nascimento do assistido antes de adicionar um responsável.');
  }

  const assistidoCriado = await firstValueFrom(
    this.http.post<AssistidoResponseDTO>(this.apiAssistidos, this.novoAssistido)
  );

  this.assistidoIdCriado.set(assistidoCriado.assistidoId);
  return assistidoCriado.assistidoId;

}

async salvarResponsavel(): Promise<void> {

  if (this.salvandoResponsavel()) {
    return;
  }

  if (!this.novoResponsavel.nomeCompleto.trim()) {
    this.erroResponsavel.set('Informe o nome do responsável.');
    return;
  }

  this.salvandoResponsavel.set(true);
  this.erroResponsavel.set(null);
  this.erroSalvar.set(null);

  try {

    const assistidoId = await this.garantirAssistidoCriado();

    const dto: VinculoFamiliarComResponsavelRequestDTO = {
      nomeCompleto: this.novoResponsavel.nomeCompleto,
      dataNascimento: this.novoResponsavel.dataNascimento || undefined,
      cpf: this.novoResponsavel.cpf || undefined,
      telefone: this.novoResponsavel.telefone || undefined,
      email: this.novoResponsavel.email || undefined,
      endereco: this.novoResponsavel.endereco || undefined,
      observacoes: this.novoResponsavel.observacoes || undefined,
      parentesco: this.novoResponsavel.parentesco || undefined,
      responsavelPrincipal: this.responsaveisVinculados().length === 0
        ? true
        : this.novoResponsavel.responsavelPrincipal,
      contatoEmergencia: this.novoResponsavel.contatoEmergencia,
      autorizadoRetirada: this.novoResponsavel.autorizadoRetirada
    };

    await firstValueFrom(
      this.http.post(
        `${this.apiAssistidos}/${assistidoId}/responsaveis/cadastrar-vincular`,
        dto
      )
    );

    // reflete na tabela do modal que esse responsável já está salvo e vinculado
    this.responsaveisVinculados.update(lista => [...lista, { ...this.novoResponsavel, responsavelPrincipal: dto.responsavelPrincipal }]);

    this.novoResponsavel = this.responsavelVazio();
    this.salvandoResponsavel.set(false);

  } catch (erro: any) {

    console.error('Erro ao salvar responsável:', erro);
    this.erroResponsavel.set(
      erro?.message ?? 'Não foi possível salvar o responsável. Tente novamente.'
    );
    this.salvandoResponsavel.set(false);

  }

}



async salvarResponsavelVinculado(): Promise<void> {

  const assistido = this.assistidoSelecionado();
  if (!assistido || this.salvandoResponsavelVinculado()) {
    return;
  }

  if (!this.novoResponsavelVinculado.nomeCompleto.trim()) {
    this.erroResponsavelVinculado.set('Informe o nome do responsável.');
    return;
  }

  this.salvandoResponsavelVinculado.set(true);
  this.erroResponsavelVinculado.set(null);

  const dto: VinculoFamiliarComResponsavelRequestDTO = {
    nomeCompleto: this.novoResponsavelVinculado.nomeCompleto,
    dataNascimento: this.novoResponsavelVinculado.dataNascimento || undefined,
    cpf: this.novoResponsavelVinculado.cpf || undefined,
    telefone: this.novoResponsavelVinculado.telefone || undefined,
    email: this.novoResponsavelVinculado.email || undefined,
    endereco: this.novoResponsavelVinculado.endereco || undefined,
    observacoes: this.novoResponsavelVinculado.observacoes || undefined,
    parentesco: this.novoResponsavelVinculado.parentesco || undefined,
    responsavelPrincipal: this.novoResponsavelVinculado.responsavelPrincipal,
    contatoEmergencia: this.novoResponsavelVinculado.contatoEmergencia,
    autorizadoRetirada: this.novoResponsavelVinculado.autorizadoRetirada
  };

  try {

    await firstValueFrom(
      this.http.post(
        `${this.apiAssistidos}/${assistido.assistidoId}/responsaveis/cadastrar-vincular`,
        dto
      )
    );

    this.mostrarFormNovoResponsavelVinculado.set(false);
    this.salvandoResponsavelVinculado.set(false);

    // recarrega a lista de responsáveis do modal aberto
    this.carregarResponsaveis(assistido.assistidoId);

  } catch (erro) {

    console.error('Erro ao vincular responsável:', erro);
    this.erroResponsavelVinculado.set('Não foi possível salvar o responsável.');
    this.salvandoResponsavelVinculado.set(false);

  }

}

}


