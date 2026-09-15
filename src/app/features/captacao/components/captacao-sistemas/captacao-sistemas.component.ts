import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  TemplateRef,
  ViewChild,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TableColumn, TmTableComponent } from '@techminds-group/tm-angular-lib';
import { SistemasCaptacaoService, SistemaItem } from '../../../../core/services/sistemas-captacao.service';

@Component({
  selector: 'app-captacao-sistemas',
  standalone: true,
  imports: [CommonModule, FormsModule, TmTableComponent],
  templateUrl: './captacao-sistemas.component.html',
  styleUrl: './captacao-sistemas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CaptacaoSistemasComponent implements OnInit {
  private readonly sistemasService = inject(SistemasCaptacaoService);
  private readonly router = inject(Router);

  @ViewChild('sistemaTemplate', { static: true })
  sistemaTemplate!: TemplateRef<{ $implicit: SistemaItem }>;

  @ViewChild('categoriaTemplate', { static: true })
  categoriaTemplate!: TemplateRef<{ $implicit: SistemaItem }>;

  @ViewChild('urlTemplate', { static: true })
  urlTemplate!: TemplateRef<{ $implicit: SistemaItem }>;

  @ViewChild('statusTemplate', { static: true })
  statusTemplate!: TemplateRef<{ $implicit: SistemaItem }>;

  @ViewChild('acoesTemplate', { static: true })
  acoesTemplate!: TemplateRef<{ $implicit: SistemaItem }>;

  readonly tamanhoPagina = signal<number>(5);
  readonly sistemas = signal<SistemaItem[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Modal / Form state
  readonly showModal = signal<boolean>(false);
  readonly isEditing = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly selectedId = signal<string | null>(null);

  readonly formData = signal<Partial<SistemaItem>>({
    nome: '',
    descricao: '',
    categoria: '',
    status: 'Ativo',
    url: '',
    icone: 'fas fa-cube'
  });

  readonly cols = computed<TableColumn<SistemaItem>[]>(() => [
    {
      header: 'Sistema',
      template: this.sistemaTemplate,
      width: '35%',
      sortable: true,
      sortKey: 'nome'
    },
    {
      header: 'Categoria',
      template: this.categoriaTemplate,
      width: '20%',
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
      width: '13%',
      sortable: true,
      sortKey: 'status'
    },
    {
      header: 'Ações',
      template: this.acoesTemplate,
      width: '12%',
      sortable: false
    }
  ]);

  ngOnInit(): void {
    this.carregarSistemas();
  }

  carregarSistemas(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.sistemasService.getAll().subscribe({
      next: (dados) => {
        this.sistemas.set(dados);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Erro ao carregar sistemas de captação:', err);
        this.errorMessage.set('Falha ao carregar a lista de sistemas.');
        this.isLoading.set(false);
      }
    });
  }

  verDetalhes(sistema: SistemaItem): void {
    this.router.navigate(['/captacao', sistema.id]);
  }

  abrirModalCriacao(): void {
    this.isEditing.set(false);
    this.selectedId.set(null);
    this.formData.set({
      nome: '',
      descricao: '',
      categoria: '',
      status: 'Ativo',
      url: '',
      icone: 'fas fa-cube'
    });
    this.showModal.set(true);
  }

  abrirModalEdicao(sistema: SistemaItem, event: Event): void {
    event.stopPropagation();
    this.isEditing.set(true);
    this.selectedId.set(sistema.id);
    this.formData.set({
      nome: sistema.nome,
      descricao: sistema.descricao,
      categoria: sistema.categoria,
      status: sistema.status,
      url: sistema.url,
      icone: sistema.icone
    });
    this.showModal.set(true);
  }

  fecharModal(): void {
    this.showModal.set(false);
  }

  salvar(): void {
    const data = this.formData();
    if (!data.nome || !data.nome.trim()) {
      alert('Por favor, informe o nome do sistema.');
      return;
    }

    this.isSaving.set(true);

    if (this.isEditing() && this.selectedId()) {
      this.sistemasService.update(this.selectedId()!, data).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.fecharModal();
          this.carregarSistemas();
        },
        error: (err) => {
          console.error('Erro ao atualizar sistema:', err);
          alert('Erro ao atualizar o sistema.');
          this.isSaving.set(false);
        }
      });
    } else {
      this.sistemasService.create(data).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.fecharModal();
          this.carregarSistemas();
        },
        error: (err) => {
          console.error('Erro ao criar sistema:', err);
          alert('Erro ao cadastrar o novo sistema.');
          this.isSaving.set(false);
        }
      });
    }
  }

  confirmarExclusao(sistema: SistemaItem, event: Event): void {
    event.stopPropagation();
    if (confirm(`Tem certeza que deseja excluir o sistema "${sistema.nome}"?`)) {
      this.sistemasService.delete(sistema.id).subscribe({
        next: () => {
          this.carregarSistemas();
        },
        error: (err) => {
          console.error('Erro ao excluir sistema:', err);
          alert('Erro ao remover o sistema.');
        }
      });
    }
  }

  updateFormField(field: keyof SistemaItem, value: any): void {
    this.formData.update(current => ({ ...current, [field]: value }));
  }
}
