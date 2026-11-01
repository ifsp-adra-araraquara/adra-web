import { ESCOLARIDADE_LABELS } from '../../shared/enum/Escolaridade';
import { ESTADO_CIVIL_LABELS } from '../../shared/enum/EstadoCivil';
import { PROGRAMA_TRANSFERENCIA_LABELS } from '../../shared/enum/ProgramaTransferencia';
import { SEXO_LABELS } from '../../shared/enum/Sexo';
import { PreCadastroRequestDTO } from '../../shared/models/precadastro/PreCadastro';
import { formatarEndereco } from '../../shared/utils/endereco.util';
import { formatarMoeda, formatarTelefone } from '../../shared/utils/mascara.util';
import { formatarCpf } from '../../shared/validators/cpf.validator';
import { ChaveEtapa } from './pre-cadastro-form.util';

export interface SecaoRevisao {
  chave: ChaveEtapa;
  titulo: string;
  itens: { rotulo: string; valor: string }[];
}

const simNao = (valor: boolean) => (valor ? 'Sim' : 'Não');
const dataBr = (iso: string) => iso.split('-').reverse().join('/');

/** Resumo do que vai ser enviado, por etapa (só as respostas que se aplicam). */
export function secoesRevisao(p: PreCadastroRequestDTO): SecaoRevisao[] {
  const { termos, mae, pai, responsavelLegal: legal, transferencia: t, saude, autorizacoes: a } = p.dados;
  const responsaveis: SecaoRevisao['itens'] = [];
  if (mae) {
    responsaveis.push(
      { rotulo: 'Mãe', valor: `${mae.nomeCompleto} · nasc. ${dataBr(mae.dataNascimento)} · CPF ${formatarCpf(mae.cpf)}` },
      {
        rotulo: 'Mãe — escolaridade e estado civil',
        valor: `${ESCOLARIDADE_LABELS[mae.escolaridade]} · ${mae.estadoCivil ? ESTADO_CIVIL_LABELS[mae.estadoCivil] : mae.estadoCivilOutro}`,
      },
      { rotulo: 'Mãe — renda e telefone', valor: `${formatarMoeda(mae.renda)} · ${formatarTelefone(mae.telefone)}` },
    );
  }
  if (pai) {
    responsaveis.push({
      rotulo: 'Pai',
      valor: [pai.nomeCompleto, pai.cpf && `CPF ${formatarCpf(pai.cpf)}`, formatarMoeda(pai.renda), pai.telefone && formatarTelefone(pai.telefone)]
        .filter(Boolean)
        .join(' · '),
    });
  }
  if (legal) {
    responsaveis.push({
      rotulo: 'Responsável legal',
      valor: [`${legal.nomeCompleto} (${legal.parentesco})`, legal.cpf && `CPF ${formatarCpf(legal.cpf)}`, formatarTelefone(legal.telefone)]
        .filter(Boolean)
        .join(' · '),
    });
  }
  responsaveis.push({ rotulo: 'Endereço da família', valor: formatarEndereco(p.dados.enderecoFamilia) });
  if (p.email) responsaveis.push({ rotulo: 'E-mail', valor: p.email });

  return [
    {
      chave: 'termos',
      titulo: 'Termos',
      itens: [
        { rotulo: 'LGPD', valor: termos.aceiteLgpd ? 'Aceito' : 'Não aceito' },
        { rotulo: 'Cessão de imagem', valor: termos.autorizaUsoImagem ? 'Aceito' : 'Não aceito' },
      ],
    },
    {
      chave: 'crianca',
      titulo: 'Criança ou adolescente',
      itens: [
        { rotulo: 'Nome', valor: p.nomeCompleto },
        { rotulo: 'Nascimento', valor: dataBr(p.dataNascimento) },
        { rotulo: 'CPF', valor: formatarCpf(p.cpf) },
        { rotulo: 'Sexo', valor: SEXO_LABELS[p.sexo] },
        { rotulo: 'Endereço', valor: formatarEndereco(p.dados.crianca?.endereco) },
      ],
    },
    { chave: 'responsaveis', titulo: 'Responsáveis', itens: responsaveis },
    {
      chave: 'renda',
      titulo: 'Renda da família',
      itens: [
        {
          rotulo: 'Programa de transferência de renda',
          valor: t.recebe
            ? t.programas.map((programa) => (programa === 'OUTRO' && t.outro ? t.outro : PROGRAMA_TRANSFERENCIA_LABELS[programa])).join(', ')
            : 'Não recebe',
        },
        ...(t.nis ? [{ rotulo: 'NIS', valor: t.nis }] : []),
      ],
    },
    {
      chave: 'saude',
      titulo: 'Saúde e autorizações',
      itens: [
        { rotulo: 'Problema de saúde', valor: saude.possuiProblema ? (saude.descricao ?? 'Sim') : 'Não' },
        { rotulo: 'Em caso de adoecimento', valor: `${saude.contatoEmergenciaNome} · ${formatarTelefone(saude.contatoEmergenciaTelefone)}` },
        { rotulo: 'Eventos, passeios e viagens', valor: simNao(a.eventosPasseios) },
        { rotulo: 'Pode ir embora sozinha', valor: a.irEmboraSozinho ? 'Sim' : `Não · busca: ${a.quemBusca}` },
      ],
    },
  ];
}
