import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  ViewChild,
  TemplateRef,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { TableColumn, TmTableComponent } from '@techminds-group/tm-angular-lib';
import { ColetaLeadsApiService } from '../../../../core/services/coleta-leads-api.service';
import {
  CampanhaColeta,
  FiltrosLeads,
  LeadColetado,
  PresetColeta,
  STATUS_CAMPANHA_CONFIG,
  StatusCampanhaColeta
} from '../../../../core/models/coleta-leads.model';
import { PresetModalComponent } from '../modais/preset-modal/preset-modal.component';

/** Intervalo do polling de campanhas enquanto houver alguma Em Andamento (RN-017; padrão RN-013). */
const POLLING_CAMPANHAS_MS = 5000;

/**
 * Tela de Coleta de Leads (/coleta) — BC-6 (RN-017/018/019/022/025).
 * Seleção ad-hoc de nichos × cidades, CRUD de presets, acompanhamento de campanhas
 * com polling enquanto houver Em Andamento e tabela de leads com filtros + export VCF.
 */
@Component({
  selector: 'app-coleta-leads',
  standalone: true,
  imports: [CommonModule, FormsModule, TmTableComponent, PresetModalComponent],
  templateUrl: './coleta-leads.component.html',
  styleUrl: './coleta-leads.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ColetaLeadsComponent implements OnInit, OnDestroy {
  private readonly apiService = inject(ColetaLeadsApiService);
  private pollingSub?: Subscription;

  @ViewChild('telefoneTemplate', { static: true })
  telefoneTemplate!: TemplateRef<{ $implicit: LeadColetado }>;

  @ViewChild('nichoTemplate', { static: true })
  nichoTemplate!: TemplateRef<{ $implicit: LeadColetado }>;

  @ViewChild('nomeTemplate', { static: true })
  nomeTemplate!: TemplateRef<{ $implicit: LeadColetado }>;

  @ViewChild('enderecoTemplate', { static: true })
  enderecoTemplate!: TemplateRef<{ $implicit: LeadColetado }>;

  @ViewChild('siteTemplate', { static: true })
  siteTemplate!: TemplateRef<{ $implicit: LeadColetado }>;

  // ===== Seleção de busca (RN-017) =====
  readonly nichosSelecionados = signal<string[]>([]);
  readonly cidadesSelecionadas = signal<string[]>([]);
  readonly novoNicho = signal<string>('');
  readonly novaCidade = signal<string>('');

  // ===== Presets (RN-018) =====
  readonly presets = signal<PresetColeta[]>([]);
  readonly showModalPreset = signal<boolean>(false);
  readonly modoPreset = signal<'criar' | 'editar'>('criar');
  readonly presetEditando = signal<PresetColeta | null>(null);

  // ===== Campanhas (RN-017/019) =====
  readonly campanhas = signal<CampanhaColeta[]>([]);
  readonly iniciandoColeta = signal<boolean>(false);

  // ===== Leads (RN-022) =====
  readonly leads = signal<LeadColetado[]>([]);
  readonly isLoadingLeads = signal<boolean>(false);
  readonly filtroNicho = signal<string>('');
  readonly filtroCidade = signal<string>('');
  readonly filtroCampanhaId = signal<string>('');

  // ===== Feedback geral =====
  readonly mensagem = signal<string | null>(null);
  readonly mensagemTipo = signal<'success' | 'danger' | 'warning'>('success');

  readonly isLoadingPresets = signal<boolean>(false);
  readonly isLoadingCampanhas = signal<boolean>(false);

  readonly exportando = signal<boolean>(false);

  readonly temSelecao = computed(
    () => this.nichosSelecionados().length > 0 && this.cidadesSelecionadas().length > 0
  );

  readonly temCampanhaEmAndamento = computed(() =>
    this.campanhas().some(c => c.status === 'EmAndamento')
  );

  /** Algum filtro de leads está preenchido? Diferencia "base vazia" de "filtros sem resultado". */
  readonly temFiltrosAtivos = computed(() =>
    !!(this.filtroNicho().trim() || this.filtroCidade().trim() || this.filtroCampanhaId().trim())
  );

  readonly cols = computed<TableColumn<LeadColetado>[]>(() => [
    { header: 'Nome', template: this.nomeTemplate, width: '20%', sortable: true, sortKey: 'nome' },
    { header: 'Telefone', template: this.telefoneTemplate, width: '18%', sortable: false },
    { header: 'Endereço', template: this.enderecoTemplate, width: '20%', sortable: false },
    { header: 'Site', template: this.siteTemplate, width: '14%', sortable: false },
    { header: 'Nicho', template: this.nichoTemplate, width: '13%', sortable: false },
    { header: 'Cidade', key: 'cidadeBuscada', width: '15%', sortable: true, sortKey: 'cidadeBuscada' }
  ]);

  ngOnInit(): void {
    this.carregarPresets();
    this.carregarCampanhas();
    this.carregarLeads();
  }

  ngOnDestroy(): void {
    this.pararPolling();
  }

  // ===== Seleção de busca =====

  adicionarNicho(): void {
    this.adicionarValor(this.nichosSelecionados, this.novoNicho());
    this.novoNicho.set('');
  }

  removerNicho(valor: string): void {
    this.nichosSelecionados.update(lista => lista.filter(n => n !== valor));
  }

  adicionarCidade(): void {
    this.adicionarValor(this.cidadesSelecionadas, this.novaCidade());
    this.novaCidade.set('');
  }

  removerCidade(valor: string): void {
    this.cidadesSelecionadas.update(lista => lista.filter(c => c !== valor));
  }

  // ===== Campanha (RN-017) =====

  iniciarColeta(): void {
    if (!this.temSelecao() || this.temCampanhaEmAndamento() || this.iniciandoColeta()) {
      return;
    }
    this.iniciandoColeta.set(true);
    this.apiService
      .criarCampanha({
        nichos: [...this.nichosSelecionados()],
        cidades: [...this.cidadesSelecionadas()]
      })
      .subscribe({
        next: () => {
          this.iniciandoColeta.set(false);
          this.exibirMensagem('success', 'Campanha de coleta iniciada. Acompanhe o progresso abaixo.');
          this.carregarCampanhas();
        },
        error: (err) => {
          console.error('Erro ao iniciar campanha de coleta:', err);
          this.iniciandoColeta.set(false);
          this.exibirMensagem('danger', 'Falha ao iniciar a campanha de coleta.');
        }
      });
  }

  // ===== Exclusão de campanha (fora do escopo original — solicitação do stakeholder; CR futuro) =====

  /**
   * Exclui a campanha e os leads coletados por ela. Campanha Em Andamento
   * não é excluível: botão desabilitado na tabela e 409 da API tratado
   * como warning. Ao excluir a campanha ativa no filtro, o filtro é limpo.
   */
  excluirCampanha(campanha: CampanhaColeta): void {
    if (campanha.status === 'EmAndamento') {
      return;
    }
    const perguntaLeads =
      campanha.totalColetados === 1
        ? 'o 1 lead coletado dela'
        : `os ${campanha.totalColetados} leads coletados dela`;
    if (!confirm(`Excluir a campanha e ${perguntaLeads}? Esta ação não pode ser desfeita.`)) {
      return;
    }
    this.apiService.excluirCampanha(campanha.id).subscribe({
      next: () => {
        // Filtro apontando para a campanha apagada não faz sentido — limpa antes de recarregar
        if (this.filtroCampanhaId() === campanha.id) {
          this.filtroCampanhaId.set('');
        }
        this.exibirMensagem('success', 'Campanha excluída junto com os leads coletados por ela.');
        this.carregarCampanhas();
        this.carregarLeads();
      },
      error: (err) => {
        console.error('Erro ao excluir campanha:', err);
        if (err.status === 409) {
          this.exibirMensagem('warning', err.error?.message || 'Campanha em andamento — aguarde a conclusão para excluir.');
        } else {
          this.exibirMensagem('danger', err.error?.message || 'Falha ao excluir a campanha.');
        }
      }
    });
  }

  // ===== Presets (RN-018) =====

  abrirModalSalvarPreset(): void {
    this.modoPreset.set('criar');
    this.presetEditando.set(null);
    this.showModalPreset.set(true);
  }

  abrirModalEditarPreset(preset: PresetColeta): void {
    this.modoPreset.set('editar');
    this.presetEditando.set(preset);
    this.showModalPreset.set(true);
  }

  fecharModalPreset(): void {
    this.showModalPreset.set(false);
    this.presetEditando.set(null);
  }

  salvarPreset(request: { nome: string; nichos: string[]; cidades: string[] }): void {
    const editando = this.modoPreset() === 'editar' ? this.presetEditando() : null;
    const chamada = editando
      ? this.apiService.atualizarPreset(editando.id, request)
      : this.apiService.criarPreset(request);

    chamada.subscribe({
      next: () => {
        this.fecharModalPreset();
        this.exibirMensagem('success', editando ? 'Preset atualizado com sucesso.' : 'Preset salvo com sucesso.');
        this.carregarPresets();
      },
      error: (err) => {
        console.error('Erro ao salvar preset:', err);
        this.fecharModalPreset();
        this.exibirMensagem('danger', 'Falha ao salvar o preset. Verifique se o nome não está duplicado.');
      }
    });
  }

  /** Aplica o preset na seleção com um clique (RN-018). */
  aplicarPreset(preset: PresetColeta): void {
    this.nichosSelecionados.set([...preset.nichos]);
    this.cidadesSelecionadas.set([...preset.cidades]);
    this.exibirMensagem('success', `Preset "${preset.nome}" aplicado à seleção.`);
  }

  excluirPreset(preset: PresetColeta): void {
    if (!confirm(`Tem certeza que deseja excluir o preset "${preset.nome}"?`)) {
      return;
    }
    this.apiService.excluirPreset(preset.id).subscribe({
      next: () => {
        this.exibirMensagem('success', 'Preset excluído.');
        this.carregarPresets();
      },
      error: (err) => {
        console.error('Erro ao excluir preset:', err);
        this.exibirMensagem('danger', 'Falha ao excluir o preset.');
      }
    });
  }

  resumoPreset(preset: PresetColeta): string {
    return `${preset.nichos.length} nicho(s) × ${preset.cidades.length} cidade(s)`;
  }

  configStatus(status: StatusCampanhaColeta) {
    return STATUS_CAMPANHA_CONFIG[status];
  }

  // ===== Filtros e leads (RN-022) =====

  aplicarFiltros(): void {
    this.carregarLeads();
  }

  limparFiltros(): void {
    this.filtroNicho.set('');
    this.filtroCidade.set('');
    this.filtroCampanhaId.set('');
    this.carregarLeads();
  }

  filtrosAtivos(): FiltrosLeads {
    return {
      nicho: this.filtroNicho().trim() || undefined,
      cidade: this.filtroCidade().trim() || undefined,
      campanhaId: this.filtroCampanhaId().trim() || undefined
    };
  }

  // ===== Export VCF (RN-025) =====

  exportarVcf(): void {
    if (this.exportando()) {
      return;
    }
    this.exportando.set(true);
    this.apiService.exportarVcf(this.filtrosAtivos()).subscribe({
      next: (response) => {
        this.exportando.set(false);
        const contagem = response.headers.get('X-Leads-Exportados');
        const blob = response.body ?? new Blob([]);
        const vazio = contagem === '0' || (contagem === null && blob.size === 0);
        if (vazio) {
          // ERR-063: nenhum lead corresponde aos filtros — arquivo vazio
          this.exibirMensagem(
            'warning',
            'Nenhum lead corresponde aos filtros ativos: o arquivo VCF exportado está vazio (ERR-063).'
          );
          return;
        }
        this.baixarBlob(blob);
        this.exibirMensagem('success', 'Arquivo VCF exportado com sucesso.');
      },
      error: (err) => {
        console.error('Erro ao exportar VCF:', err);
        this.exportando.set(false);
        this.exibirMensagem('danger', 'Falha ao exportar o arquivo VCF.');
      }
    });
  }

  private baixarBlob(blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'leads-export.vcf';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  // ===== Helpers da tabela de leads =====

  /** Melhor telefone para contato: normalizado (+55) quando existir, senão o original (RN-022). */
  telefoneParaContato(lead: LeadColetado): string {
    return lead.telefoneNormalizado || lead.telefone || '';
  }

  /** Iniciais do lead para o avatar da coluna Nome (máx. 2 caracteres). */
  iniciais(nome: string): string {
    return (
      nome
        .trim()
        .split(/\s+/)
        .filter(p => p.length > 1)
        .slice(0, 2)
        .map(p => p[0]?.toUpperCase() ?? '')
        .join('') || nome.trim().substring(0, 2).toUpperCase()
    );
  }

  /** Cor do avatar derivada do nome (hash simples) — distribui leads entre as cores da paleta. */
  corAvatar(nome: string): string {
    const cores = ['azul', 'verde', 'roxo', 'laranja', 'ciano'];
    let hash = 0;
    for (let i = 0; i < nome.length; i++) {
      hash = (hash * 31 + nome.charCodeAt(i)) % 100000;
    }
    return cores[hash % cores.length];
  }

  /** Ícone do nicho para o badge da tabela (match por substring; fallback = tag genérica). */
  iconeNicho(nicho: string): string {
    const n = nicho.toLowerCase();
    if (n.includes('barbearia')) return 'fa-scissors';
    if (n.includes('petshop') || n.includes('pet shop')) return 'fa-paw';
    if (n.includes('tatuagem')) return 'fa-paintbrush';
    if (n.includes('piercing')) return 'fa-gem';
    if (n.includes('manicure') || n.includes('pedicure')) return 'fa-hand';
    if (n.includes('beleza') || n.includes('salão') || n.includes('salao')) return 'fa-spa';
    return 'fa-tag';
  }

  /** Copia o melhor telefone do lead para a área de transferência (fluxo de prospecção manual). */
  copiarTelefone(lead: LeadColetado, event: Event): void {
    event.stopPropagation();
    const telefone = this.telefoneParaContato(lead);
    if (!telefone) {
      return;
    }
    navigator.clipboard.writeText(telefone).then(
      () => this.exibirMensagem('success', `Telefone ${telefone} copiado.`),
      () => this.exibirMensagem('danger', 'Não foi possível copiar o telefone.')
    );
  }

  // ===== Carga de dados =====

  private carregarPresets(): void {
    this.isLoadingPresets.set(true);
    this.apiService.listarPresets().subscribe({
      next: (presets) => {
        this.presets.set(presets);
        this.isLoadingPresets.set(false);
      },
      error: (err) => {
        console.error('Erro ao carregar presets:', err);
        this.isLoadingPresets.set(false);
        this.exibirMensagem('danger', 'Falha ao carregar os presets.');
      }
    });
  }

  private carregarCampanhas(): void {
    this.isLoadingCampanhas.set(true);
    this.apiService.listarCampanhas().subscribe({
      next: (campanhas) => {
        this.campanhas.set(campanhas);
        this.isLoadingCampanhas.set(false);
        this.gerenciarPolling();
      },
      error: (err) => {
        console.error('Erro ao carregar campanhas:', err);
        this.isLoadingCampanhas.set(false);
      }
    });
  }

  carregarLeads(): void {
    this.isLoadingLeads.set(true);
    this.apiService.listarLeads(this.filtrosAtivos()).subscribe({
      next: (leads) => {
        this.leads.set(leads);
        this.isLoadingLeads.set(false);
      },
      error: (err) => {
        console.error('Erro ao carregar leads:', err);
        this.isLoadingLeads.set(false);
        this.exibirMensagem('danger', 'Falha ao carregar os leads coletados.');
      }
    });
  }

  // ===== Polling de campanhas (padrão whatsapp-conexao — RN-013) =====

  private gerenciarPolling(): void {
    if (this.temCampanhaEmAndamento()) {
      this.garantirPolling();
    } else {
      this.pararPolling();
    }
  }

  private garantirPolling(): void {
    if (this.pollingSub) {
      return;
    }
    this.pollingSub = interval(POLLING_CAMPANHAS_MS).subscribe(() => {
      this.apiService.listarCampanhas().subscribe({
        next: (campanhas) => {
          const anterior = this.campanhas();
          this.campanhas.set(campanhas);
          this.gerenciarPolling();
          // Campanha recém-concluída → atualiza a tabela de leads
          const concluiu = anterior.some(
            (c, i) => c.status === 'EmAndamento' && campanhas[i]?.status !== 'EmAndamento'
          );
          if (concluiu) {
            this.carregarLeads();
          }
        },
        error: (err) => console.error('Erro no polling de campanhas:', err)
      });
    });
  }

  private pararPolling(): void {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = undefined;
    }
  }

  // ===== Auxiliares =====

  private adicionarValor(lista: ReturnType<typeof signal<string[]>>, valor: string): void {
    const trim = valor.trim();
    if (!trim) {
      return;
    }
    lista.update(atual => (atual.some(v => v.toLowerCase() === trim.toLowerCase()) ? atual : [...atual, trim]));
  }

  private exibirMensagem(tipo: 'success' | 'danger' | 'warning', texto: string): void {
    this.mensagemTipo.set(tipo);
    this.mensagem.set(texto);
  }
}
