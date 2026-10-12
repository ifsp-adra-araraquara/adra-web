import { HttpErrorResponse } from '@angular/common/http';

export function errosPorCampo(resposta: HttpErrorResponse): Record<string, string> {
  const porCampo: Record<string, string> = {};
  for (const detalhe of (resposta.error?.detalhes ?? []) as string[]) {
    const [campo, ...resto] = detalhe.split(':');
    porCampo[campo.trim()] = resto.join(':').trim();
  }
  return porCampo;
}

export function mensagemErro(resposta: HttpErrorResponse, padrao: string): string {
  const detalhes = Object.values(errosPorCampo(resposta));
  if (detalhes.length) return detalhes.join('. ');
  return resposta.error?.mensagem ?? padrao;
}
