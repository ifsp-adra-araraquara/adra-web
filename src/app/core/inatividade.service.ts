import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject } from '@angular/core';

const CHAVE_ULTIMA_ATIVIDADE = 'adra.ultima-atividade';
const LIMITE_INATIVIDADE_MS = 240 * 60_000;
const INTERVALO_VERIFICACAO_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class InatividadeService {
  private readonly document = inject(DOCUMENT);

  expirou(): boolean {
    const ultimaAtividade = Number(localStorage.getItem(CHAVE_ULTIMA_ATIVIDADE));
    return ultimaAtividade > 0 && Date.now() - ultimaAtividade >= LIMITE_INATIVIDADE_MS;
  }

  limpar(): void {
    localStorage.removeItem(CHAVE_ULTIMA_ATIVIDADE);
  }

  acompanhar(aoExpirar: () => void, destroyRef: DestroyRef): void {
    const registrarAtividade = () => localStorage.setItem(CHAVE_ULTIMA_ATIVIDADE, String(Date.now()));
    const aoInteragir = () => (this.expirou() ? aoExpirar() : registrarAtividade());
    const verificar = () => {
      if (this.expirou()) aoExpirar();
    };
    const aoMudarEmOutraAba = (evento: StorageEvent) => {
      if (evento.key === CHAVE_ULTIMA_ATIVIDADE && evento.newValue === null) aoExpirar();
    };

    registrarAtividade();
    this.document.addEventListener('pointerdown', aoInteragir, true);
    this.document.addEventListener('keydown', aoInteragir, true);
    window.addEventListener('storage', aoMudarEmOutraAba);
    const verificacao = setInterval(verificar, INTERVALO_VERIFICACAO_MS);

    destroyRef.onDestroy(() => {
      this.document.removeEventListener('pointerdown', aoInteragir, true);
      this.document.removeEventListener('keydown', aoInteragir, true);
      window.removeEventListener('storage', aoMudarEmOutraAba);
      clearInterval(verificacao);
    });
  }
}
