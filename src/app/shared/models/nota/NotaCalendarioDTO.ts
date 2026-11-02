export interface NotaCalendarioResponseDTO {
  notaId: number;
  dataNota: string;
  horario: string | null;
  titulo: string;
  descricao: string | null;
  criadoPorId: number | null;
  criadoPorNome: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface NotaCalendarioRequestDTO {
  dataNota: string;
  horario?: string | null;
  titulo: string;
  descricao?: string | null;
}
