import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { DisciplinarService } from '../../../../core/disciplinar.service';
import { NivelDisciplinar } from '../../../../shared/enum/NivelDisciplinar';
import { RegistroDisciplinarDTO } from '../../../../shared/models/disciplinar/Disciplinar';
import { dataBr } from '../../../../shared/utils/disciplinar.util';
import { BrandLogo } from '../../../../shared/components/brand-logo/brand-logo';
import { Button } from '../../../../shared/components/button/button';
import { Icon } from '../../../../shared/components/icon/icon';

/**
 * Dados fixos do cabeçalho/rodapé, tirados do comunicado de uniforme que a
 * ADRA já usa. Se o coordenador ou o endereço mudarem, é aqui.
 */
const INSTITUICAO = {
  nome: 'Agência Adventista de Desenvolvimento e Recursos Assistenciais',
  nucleo: 'ADRA – Núcleo Araraquara',
  cnpj: 'CNPJ/MF: 15.355.260/0011-29',
  cidade: 'Araraquara',
  signatario: 'Eugênio Arminini',
  cargo: 'Coordenador de Projetos',
  endereco: 'Av. Sgto. PM Vital Maria Bueno Lopes nº 300 – Jd. Maria Luiza – Cep.: 14.805-266 – Araraquara – SP',
  contato: 'Fone (16) 3397-7052 / 99754-5147 · Email: adra.araraquara@adventistas.org',
};

const ORDINAIS = ['PRIMEIRA', 'SEGUNDA', 'TERCEIRA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÉTIMA', 'OITAVA', 'NONA', 'DÉCIMA'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/**
 * FT-04: documento para os pais assinarem — comunicado de uniforme,
 * advertência escrita ou suspensão — no modelo da ADRA, pronto para
 * imprimir em A4 (o menu e os botões somem na impressão).
 */
@Component({
  selector: 'app-documento-disciplinar',
  imports: [BrandLogo, Button, Icon],
  templateUrl: './documento-disciplinar.html',
  styleUrl: './documento-disciplinar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentoDisciplinar implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly disciplinarService = inject(DisciplinarService);

  readonly INSTITUICAO = INSTITUICAO;
  readonly NivelDisciplinar = NivelDisciplinar;
  readonly dataBr = dataBr;

  readonly registro = signal<RegistroDisciplinarDTO | null>(null);
  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);

  readonly titulo = computed(() => {
    switch (this.registro()?.nivel) {
      case NivelDisciplinar.UNIFORME:
        return 'Comunicado – Uso do uniforme';
      case NivelDisciplinar.ADVERTENCIA:
        return 'Comunicado – Advertência escrita';
      case NivelDisciplinar.SUSPENSAO:
        return 'Comunicado – Suspensão';
      default:
        return 'Comunicado';
    }
  });

  readonly ordinal = computed(() => {
    const seq = this.registro()?.sequencia ?? 1;
    return ORDINAIS[seq - 1] ?? `${seq}ª`;
  });

  readonly dataPorExtenso = computed(() => {
    const iso = this.registro()?.dataRegistro;
    if (!iso) return '';
    const [a, m, d] = iso.split('-').map(Number);
    return `${INSTITUICAO.cidade}, ${d} de ${MESES[m - 1]} de ${a}.`;
  });

  /** Dia seguinte ao fim da suspensão (retorno às atividades). */
  readonly dataRetorno = computed(() => {
    const fim = this.registro()?.suspensaoFim;
    if (!fim) return '';
    const [a, m, d] = fim.split('-').map(Number);
    const retorno = new Date(a, m - 1, d + 1);
    return dataBr(
      `${retorno.getFullYear()}-${String(retorno.getMonth() + 1).padStart(2, '0')}-${String(retorno.getDate()).padStart(2, '0')}`,
    );
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('registroId'));
    if (!id) {
      this.erro.set('Registro não encontrado.');
      this.carregando.set(false);
      return;
    }
    this.carregar(id);
  }

  imprimir(): void {
    window.print();
  }

  voltar(): void {
    this.location.back();
  }

  private async carregar(id: number): Promise<void> {
    try {
      const registro = await this.disciplinarService.buscarRegistro(id);
      if (!registro.documentoStatus) {
        this.erro.set('Este registro é uma ocorrência simples e não tem documento para os pais assinarem.');
      } else {
        this.registro.set(registro);
      }
    } catch {
      this.erro.set('Não foi possível carregar o registro.');
    } finally {
      this.carregando.set(false);
    }
  }
}
