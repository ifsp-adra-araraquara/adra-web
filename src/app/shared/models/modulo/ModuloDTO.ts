export interface ModuloDTO {
  codigo: string;
  nomeExibicao: string;
  rota: string | null;
  icone: string | null;
  padrao: boolean; // true = módulo padrão do perfil (equivalente ao defaultPage)
}