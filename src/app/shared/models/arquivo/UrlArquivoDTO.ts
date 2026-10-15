/** URL assinada (temporária) para exibir/baixar um arquivo do bucket privado. */
export interface UrlArquivoDTO {
  url: string;
  /** ISO-8601 (Instant do back). */
  expiraEm: string;
}
