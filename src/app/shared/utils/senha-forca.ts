export type NivelForca = 'fraca' | 'media' | 'forte' | 'muito-forte';

export interface CriterioSenha {
  chave: string;
  label: string;
  atendido: boolean;
}

export interface ResultadoForcaSenha {
  score: number; // 0 a 4
  nivel: NivelForca;
  label: string;
  cor: string;
  criterios: CriterioSenha[];
}

export function avaliarForcaSenha(senha: string): ResultadoForcaSenha {
  const criterios: CriterioSenha[] = [
    { chave: 'tamanho', label: 'Mínimo de 8 caracteres', atendido: senha.length >= 8 },
    { chave: 'maiuscula', label: 'Uma letra maiúscula', atendido: /[A-Z]/.test(senha) },
    { chave: 'minuscula', label: 'Uma letra minúscula', atendido: /[a-z]/.test(senha) },
    { chave: 'numero', label: 'Um número', atendido: /[0-9]/.test(senha) },
    { chave: 'especial', label: 'Um caractere especial (!@#$...)', atendido: /[^A-Za-z0-9]/.test(senha) }
  ];

  const atendidos = criterios.filter(c => c.atendido).length;

  let score = 0;
  if (senha.length > 0) score = 1;
  if (atendidos >= 3) score = 2;
  if (atendidos >= 4 && senha.length >= 8) score = 3;
  if (atendidos === 5 && senha.length >= 10) score = 4;

  const mapa: Record<number, { nivel: NivelForca; label: string; cor: string }> = {
    0: { nivel: 'fraca', label: 'Muito fraca', cor: '#E24B4A' },
    1: { nivel: 'fraca', label: 'Fraca', cor: '#E24B4A' },
    2: { nivel: 'media', label: 'Média', cor: '#BA7517' },
    3: { nivel: 'forte', label: 'Forte', cor: '#007B5F' },
    4: { nivel: 'muito-forte', label: 'Muito forte', cor: '#005A45' }
  };

  return { score, ...mapa[score], criterios };
}

/**
 * Política mínima de senha exigida pelo backend (DefinirSenhaRequestDTO):
 * `^(?=.*[a-zA-Z])(?=.*\d).{8,}$` — 8+ caracteres, com ao menos 1 letra e 1 número.
 * Retorna a primeira mensagem de erro encontrada, ou `null` se a senha atende a política.
 */
export function validarPoliticaSenha(senha: string): string | null {
  if (senha.length < 8) return 'A senha precisa ter no mínimo 8 caracteres.';
  if (!/[A-Za-z]/.test(senha)) return 'A senha precisa ter ao menos uma letra.';
  if (!/[0-9]/.test(senha)) return 'A senha precisa ter ao menos um número.';
  return null;
}