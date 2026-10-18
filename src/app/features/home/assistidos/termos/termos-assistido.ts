import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { AssistidoRequestDTO } from '../../../../shared/models/assistido/AssistidoRequestDTO';

export type TermosAssistido = Pick<
  AssistidoRequestDTO,
  'aceiteLgpd' | 'autorizaUsoImagem' | 'autorizaEventosPasseios' | 'podeIrEmboraSozinho' | 'cienteFrequenciaObrigatoria'
>;

interface Termo {
  campo: keyof TermosAssistido;
  titulo: string;
  descricao: string;
  obrigatorio?: boolean;
}

/**
 * Termos e autorizações assinados pelo responsável, no fim do cadastro.
 * Uso: `<app-termos-assistido [(dados)]="form" [invalido]="tentouSalvar()" />`.
 */
@Component({
  selector: 'app-termos-assistido',
  templateUrl: './termos-assistido.html',
  styleUrl: './termos-assistido.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block;' },
})
export class TermosAssistidoForm<T extends TermosAssistido> {
  dados = model.required<T>();
  /** Destaca o aceite LGPD em vermelho depois de tentar salvar sem ele. */
  invalido = input(false);

  protected readonly termos: Termo[] = [
    {
      campo: 'aceiteLgpd',
      titulo: 'Aceite do uso de dados (LGPD)',
      descricao:
        'Autorizo a ADRA a coletar e guardar os dados pessoais do assistido e da família, inclusive de saúde, ' +
        'somente para o atendimento no SCFV, conforme a Lei 13.709/2018 (LGPD).',
      obrigatorio: true,
    },
    {
      campo: 'autorizaUsoImagem',
      titulo: 'Cessão de imagem',
      descricao:
        'Autorizo o uso de fotos e vídeos do assistido em materiais e redes sociais da ADRA, sem fins comerciais.',
    },
    {
      campo: 'autorizaEventosPasseios',
      titulo: 'Eventos, passeios e viagens',
      descricao: 'Autorizo o assistido a participar de eventos, passeios e viagens organizados pela ADRA, com a equipe.',
    },
    {
      campo: 'podeIrEmboraSozinho',
      titulo: 'Pode ir embora sozinho',
      descricao:
        'Autorizo o assistido a sair sozinho ao fim das atividades, sem um responsável. Aparece nas listas de presença.',
    },
    {
      campo: 'cienteFrequenciaObrigatoria',
      titulo: 'Frequência obrigatória',
      descricao:
        'Estou ciente de que a frequência é obrigatória e que faltas sem justificativa são acompanhadas pela equipe.',
    },
  ];

  protected marcado(campo: keyof TermosAssistido): boolean {
    return !!this.dados()[campo];
  }

  protected alternar(campo: keyof TermosAssistido, valor: boolean): void {
    this.dados.update((atual) => ({ ...atual, [campo]: valor }));
  }
}
