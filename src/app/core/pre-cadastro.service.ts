import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AnexosPreCadastro,
  PreCadastroRequestDTO,
  PreCadastroResponseDTO,
  PreCadastroResumoDTO,
  StatusPreCadastro,
} from '../shared/models/precadastro/PreCadastro';
import { AssistidoRequestDTO } from '../shared/models/assistido/AssistidoRequestDTO';
import { UrlArquivoDTO } from '../shared/models/arquivo/UrlArquivoDTO';
import { ComparacaoRematriculaDTO, InscricaoAbertaDTO } from '../shared/models/matricula/Matricula';

@Injectable({ providedIn: 'root' })
export class PreCadastroService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/api/pre-cadastro`;

  /** Multipart: "dados" em JSON + comprovante de endereço + foto e documentos opcionais. Devolve o protocolo (id do pré-cadastro). */
  async registrarPublico(dto: PreCadastroRequestDTO, anexos: AnexosPreCadastro, captcha: string): Promise<number | null> {
    const corpo = new FormData();
    corpo.append('dados', new Blob([JSON.stringify(dto)], { type: 'application/json' }));
    corpo.append('captcha', captcha);
    if (anexos.foto) corpo.append('foto', anexos.foto);
    anexos.documentosCrianca.forEach((arquivo) => corpo.append('documentosCrianca', arquivo));
    anexos.documentosResponsavel.forEach((arquivo) => corpo.append('documentosResponsavel', arquivo));
    anexos.comprovanteEndereco.forEach((arquivo) => corpo.append('comprovanteEndereco', arquivo));
    const resposta = await firstValueFrom(this.http.post<{ preCadastroId: number | null }>(this.api, corpo));
    return resposta?.preCadastroId ?? null;
  }

  /** {@code ano} null = inscrições de todos os anos. */
  listar(status: StatusPreCadastro, ano: number | null = null): Promise<PreCadastroResumoDTO[]> {
    const params: Record<string, string> = { status };
    if (ano != null) params['ano'] = String(ano);
    return firstValueFrom(this.http.get<PreCadastroResumoDTO[]>(this.api, { params }));
  }

  /** Link público (sem login): de que ano é a inscrição feita hoje. */
  inscricao(): Promise<InscricaoAbertaDTO> {
    return firstValueFrom(this.http.get<InscricaoAbertaDTO>(`${this.api}/inscricao`));
  }

  comparacao(preCadastroId: number): Promise<ComparacaoRematriculaDTO> {
    return firstValueFrom(this.http.get<ComparacaoRematriculaDTO>(`${this.api}/${preCadastroId}/comparacao`));
  }

  rematricular(preCadastroId: number, turmaId: number): Promise<PreCadastroResponseDTO> {
    return firstValueFrom(this.http.post<PreCadastroResponseDTO>(`${this.api}/${preCadastroId}/rematricular`, { turmaId }));
  }

  buscar(preCadastroId: number): Promise<PreCadastroResponseDTO> {
    return firstValueFrom(this.http.get<PreCadastroResponseDTO>(`${this.api}/${preCadastroId}`));
  }

  urlDoArquivo(preCadastroId: number, arquivoId: number): Promise<UrlArquivoDTO> {
    return firstValueFrom(this.http.get<UrlArquivoDTO>(`${this.api}/${preCadastroId}/arquivos/${arquivoId}/url`));
  }

  rascunhoAssistido(preCadastroId: number): Promise<AssistidoRequestDTO> {
    return firstValueFrom(this.http.get<AssistidoRequestDTO>(`${this.api}/${preCadastroId}/rascunho-assistido`));
  }

  aprovar(preCadastroId: number, dto: AssistidoRequestDTO): Promise<PreCadastroResponseDTO> {
    return firstValueFrom(this.http.post<PreCadastroResponseDTO>(`${this.api}/${preCadastroId}/aprovar`, dto));
  }

  reprovar(preCadastroId: number, motivo: string): Promise<PreCadastroResponseDTO> {
    return firstValueFrom(this.http.patch<PreCadastroResponseDTO>(`${this.api}/${preCadastroId}/reprovar`, { motivo }));
  }

  colocarNaListaEspera(preCadastroId: number, observacao: string): Promise<PreCadastroResponseDTO> {
    return firstValueFrom(this.http.patch<PreCadastroResponseDTO>(`${this.api}/${preCadastroId}/lista-espera`, { observacao }));
  }

  /** "Matrícula do próximo ano": muda o ano da inscrição sem aprovar (ou devolve ao ano atual). */
  moverParaAno(preCadastroId: number, ano: number): Promise<PreCadastroResponseDTO> {
    return firstValueFrom(this.http.patch<PreCadastroResponseDTO>(`${this.api}/${preCadastroId}/ano`, { ano }));
  }

  salvarObservacao(preCadastroId: number, observacao: string): Promise<void> {
    return firstValueFrom(this.http.patch<void>(`${this.api}/${preCadastroId}/observacao`, { observacao }));
  }
}
