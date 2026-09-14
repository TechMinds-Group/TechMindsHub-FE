import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  TemplateRef,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TableColumn, TmTableComponent } from '@techminds-group/tm-angular-lib';

export interface SistemaItem {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  status: 'Ativo' | 'Inativo' | 'Em Manutenção';
  url: string;
  icone: string;
  dataIntegracao: string;
}

@Component({
  selector: 'app-captacao-sistemas',
  standalone: true,
  imports: [CommonModule, TmTableComponent],
  templateUrl: './captacao-sistemas.component.html',
  styleUrl: './captacao-sistemas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CaptacaoSistemasComponent {
  constructor(private readonly router: Router) {}

  @ViewChild('sistemaTemplate', { static: true })
  sistemaTemplate!: TemplateRef<{ $implicit: SistemaItem }>;

  @ViewChild('categoriaTemplate', { static: true })
  categoriaTemplate!: TemplateRef<{ $implicit: SistemaItem }>;

  @ViewChild('urlTemplate', { static: true })
  urlTemplate!: TemplateRef<{ $implicit: SistemaItem }>;

  @ViewChild('statusTemplate', { static: true })
  statusTemplate!: TemplateRef<{ $implicit: SistemaItem }>;

  readonly tamanhoPagina = signal<number>(5);

  readonly sistemas = signal<SistemaItem[]>([
    {
      id: 'groom',
      nome: 'Groom',
      descricao: 'Plataforma completa para gestão de agendamentos, clientes, serviços e planos em barbearias e salões.',
      categoria: 'Gestão de Agendamentos',
      status: 'Ativo',
      url: 'https://hub.techminds.net.br/sg-auth-x7k9p',
      icone: 'fas fa-cut',
      dataIntegracao: '11/09/2026'
    },
    {
      id: 'abobora',
      nome: 'Abóbora',
      descricao: 'Sistema independente de captação, relacionamento e disparos de automação.',
      categoria: 'Captação & Automação',
      status: 'Ativo',
      url: 'https://abobora.techminds.net.br',
      icone: 'fas fa-seedling',
      dataIntegracao: '11/09/2026'
    }
  ]);

  readonly cols = computed<TableColumn<SistemaItem>[]>(() => [
    {
      header: 'Sistema',
      template: this.sistemaTemplate,
      width: '40%',
      sortable: true,
      sortKey: 'nome'
    },
    {
      header: 'Categoria',
      template: this.categoriaTemplate,
      width: '25%',
      sortable: true,
      sortKey: 'categoria'
    },
    {
      header: 'URL / Domínio',
      template: this.urlTemplate,
      width: '20%',
      sortable: true,
      sortKey: 'url'
    },
    {
      header: 'Status',
      template: this.statusTemplate,
      width: '15%',
      sortable: true,
      sortKey: 'status'
    }
  ]);

  verDetalhes(sistema: SistemaItem): void {
    this.router.navigate(['/captacao', sistema.id]);
  }
}
