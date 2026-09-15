import { ChangeDetectionStrategy, Component } from '@angular/core';

interface Material {
  titulo: string;
  tipo: string;
  tamanho: string;
  oficina: string;
  formato: 'PDF' | 'MP4';
}

interface PlanoAula {
  oficina: string;
  turma: string;
  data: string;
  conteudoPrevisto: string;
  conteudoMinistrado: string;
  status: 'Realizada' | 'Planejada' | 'Cancelada';
}

@Component({
  selector: 'app-materiais',
  templateUrl: './materiais.html',
  styleUrl: './materiais.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Materiais {
  readonly materiais: Material[] = [
    { titulo: 'Apostila de Reforço - Matemática', tipo: 'PDF', tamanho: '2,4 MB', oficina: 'Reforço Escolar', formato: 'PDF' },
    { titulo: 'Partituras Iniciais', tipo: 'PDF', tamanho: '1,1 MB', oficina: 'Música', formato: 'PDF' },
    { titulo: 'Vídeo - Fundamentos do Voleibol', tipo: 'MP4', tamanho: '86 MB', oficina: 'Esporte', formato: 'MP4' },
  ];

  readonly planos: PlanoAula[] = [
    { oficina: 'Reforço Escolar', turma: 'Turma A', data: '17/06', conteudoPrevisto: 'Frações - introdução', conteudoMinistrado: 'Frações - introdução', status: 'Realizada' },
    { oficina: 'Música', turma: 'Turma A', data: '17/06', conteudoPrevisto: 'Leitura rítmica', conteudoMinistrado: '-', status: 'Planejada' },
    { oficina: 'Esporte', turma: 'Turma B', data: '16/06', conteudoPrevisto: 'Voleibol - saque', conteudoMinistrado: 'Voleibol - saque e recepção', status: 'Realizada' },
    { oficina: 'Teatro', turma: 'Turma A', data: '16/06', conteudoPrevisto: 'Expressão corporal', conteudoMinistrado: '-', status: 'Cancelada' },
  ];

  abaAtiva: 'materiais' | 'planos' = 'materiais';

  selecionarAba(aba: 'materiais' | 'planos'): void {
    this.abaAtiva = aba;
  }
}