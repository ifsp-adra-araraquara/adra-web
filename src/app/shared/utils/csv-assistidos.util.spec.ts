import { decodificarCsv, paraDataIso, parseCsvAssistidos } from './csv-assistidos.util';

describe('csv-assistidos.util', () => {
  it('le CSV UTF-8 com BOM e separador ; com quantos grupos de responsavel existirem', () => {
    const csv =
      '\uFEFFnome;data_nascimento;cpf;resp1_nome;resp1_cpf;resp1_parentesco;resp2_nome;resp2_cpf;resp3_nome;resp3_cpf;resp3_contato_emergencia\n' +
      'Ana Souza;03/05/2015;;Maria;529.982.247-25;Mãe;João;11144477735;Lia;39053344705;S\n';

    const [linha] = parseCsvAssistidos(decodificarCsv(new TextEncoder().encode(csv).buffer));

    expect(linha.nomeCompleto).toBe('Ana Souza');
    expect(paraDataIso(linha.dataNascimento)).toBe('2015-05-03');
    expect(linha.responsaveis.map((r) => r.nomeCompleto)).toEqual(['Maria', 'João', 'Lia']);
    expect(linha.responsaveis[0].cpf).toBe('52998224725');
    expect(linha.responsaveis[2].contatoEmergencia).toBe(true);
  });

  it('cai para windows-1252, recupera o zero a esquerda do CPF e mantem a data invalida para correcao', () => {
    const texto = 'nome;data_nascimento;resp1_nome;resp1_cpf\r\nJoão;31/02/2015;Conceição;2364546078\r\n';
    const bytes = Uint8Array.from(texto, (caractere) => caractere.charCodeAt(0));

    const [linha] = parseCsvAssistidos(decodificarCsv(bytes.buffer));

    expect(linha.nomeCompleto).toBe('João');
    expect(linha.responsaveis[0].nomeCompleto).toBe('Conceição');
    expect(linha.responsaveis[0].cpf).toBe('02364546078');
    expect(paraDataIso(linha.dataNascimento)).toBeNull();
  });
});
