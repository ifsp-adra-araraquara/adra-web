import { EnderecoDTO } from '../models/endereco/EnderecoDTO';

export function enderecoVazio(): EnderecoDTO {
  return { logradouro: '', numero: '', bairro: '', pontoReferencia: '' };
}

/** Cópia editável (nunca null) para preencher formulários. */
export function enderecoParaForm(endereco: EnderecoDTO | null | undefined): EnderecoDTO {
  return { ...enderecoVazio(), ...(endereco ?? {}) };
}

/** Payload para a API: tira espaços; endereço sem nenhum campo preenchido vira null. */
export function enderecoParaPayload(endereco: EnderecoDTO | null | undefined): EnderecoDTO | null {
  if (!endereco) return null;
  const limpo: EnderecoDTO = {
    logradouro: endereco.logradouro?.trim() || null,
    numero: endereco.numero?.trim() || null,
    bairro: endereco.bairro?.trim() || null,
    pontoReferencia: endereco.pontoReferencia?.trim() || null,
  };
  return Object.values(limpo).some((v) => v) ? limpo : null;
}

/** "Rua X, 123 — Bairro Y" (ponto de referência fica de fora; a ficha mostra à parte). */
export function formatarEndereco(endereco: EnderecoDTO | null | undefined): string {
  if (!endereco) return '';
  const ruaNumero = [endereco.logradouro, endereco.numero].filter(Boolean).join(', ');
  return [ruaNumero, endereco.bairro].filter(Boolean).join(' — ');
}
