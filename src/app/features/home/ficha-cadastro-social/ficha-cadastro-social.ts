import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { EnderecoDTO } from '../../../shared/models/endereco/EnderecoDTO';
import { formatarEndereco } from '../../../shared/utils/endereco.util';
import { dataPorExtenso } from '../../../shared/utils/data-por-extenso.util';
import { hojeISO } from '../../../shared/utils/aula.util';
import { formatarMoeda, formatarTelefone } from '../../../shared/utils/mascara.util';
import { ANO_INSCRICAO, TERMO_IMAGEM, TERMO_LGPD } from '../../../shared/utils/termos-inscricao';
import { formatarCpf } from '../../../shared/validators/cpf.validator';
import { FichaCadastroSocial, PessoaFicha } from './ficha-cadastro-social.model';

/** Provisório: segue as seções do Google Forms até chegar o modelo de ficha socioeconômica da ADRA. */
export const FICHA_PROVISORIA = {
  titulo: `Ficha de inscrição e cadastro socioeconômico — ${ANO_INSCRICAO}`,
  aviso: 'Modelo provisório — será trocado pelo modelo de ficha socioeconômica da ADRA.',
};


/** Documento A4 da ficha de cadastro social, para a família e a Assistente Social assinarem (FT-26). */
@Component({
  selector: 'app-ficha-cadastro-social',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ficha-cadastro-social.html',
  styleUrl: './ficha-cadastro-social.css',
})
export class FichaCadastroSocialDocumento {
  ficha = input.required<FichaCadastroSocial>();

  protected readonly FICHA = FICHA_PROVISORIA;

  protected readonly dataPorExtenso = dataPorExtenso(hojeISO());

  protected texto(valor: string | null | undefined): string {
    return valor?.trim() ?? '';
  }

  protected data(iso: string | null | undefined): string {
    return iso ? iso.split('-').reverse().join('/') : '';
  }

  protected cpf(valor: string | null | undefined): string {
    return valor ? formatarCpf(valor) : '';
  }

  protected telefone(valor: string | null | undefined): string {
    return valor ? formatarTelefone(valor) : '';
  }

  protected moeda(valor: number | null | undefined): string {
    return formatarMoeda(valor);
  }

  protected endereco(valor: EnderecoDTO | null): string {
    return formatarEndereco(valor);
  }

  protected simNao(valor: boolean | null): string {
    return valor == null ? '' : valor ? 'Sim' : 'Não';
  }

  /** Mãe, pai e responsável legal sempre aparecem: quem não foi informado sai em branco para preencher. */
  protected pessoas(): { titulo: string; pessoa: PessoaFicha | null }[] {
    const f = this.ficha();
    return [
      { titulo: 'Mãe', pessoa: f.mae },
      { titulo: 'Pai', pessoa: f.pai },
      { titulo: 'Responsável legal', pessoa: f.responsavelLegal },
    ];
  }

  protected termos() {
    const f = this.ficha();
    return [
      { texto: TERMO_LGPD, aceito: f.aceiteLgpd },
      { texto: TERMO_IMAGEM, aceito: f.autorizaUsoImagem },
    ];
  }
}
