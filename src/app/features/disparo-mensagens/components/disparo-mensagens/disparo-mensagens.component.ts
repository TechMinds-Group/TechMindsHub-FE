import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit, OnDestroy, effect, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MensagensApiService } from '../../../../core/services/mensagens-api.service';
import { MensagensHubService } from '../../../../core/services/mensagens-hub.service';
import { Contato, EnviarLoteRequest, EnviarLoteResponse, ItemImportacao, ImportarEstabelecimentosResponse, TemplateMensagemItem } from '../../../../core/models/mensagem.model';
import { OPCOES_LOTE } from '../../models/disparo-config.model';
import { DisparoHelperService } from '../../services/disparo-helper.service';

@Component({
  selector: 'app-disparo-mensagens',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './disparo-mensagens.component.html',
  styleUrl: './disparo-mensagens.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DisparoHelperService]
})
export class DisparoMensagensComponent implements OnInit, OnDestroy {
  @Input() instanceName: string = 'groom';

  private readonly mensagensApi = inject(MensagensApiService);
  readonly hubService = inject(MensagensHubService);
  readonly helper = inject(DisparoHelperService);

  readonly opcoesLote = OPCOES_LOTE;
  readonly quantidadeSelecionada = signal<number>(5);
  
  readonly estabelecimentosBanco = signal<Contato[]>([]);
  readonly relatorioImportacao = signal<ImportarEstabelecimentosResponse | null>(null);
  readonly exibirPainelUpload = signal<boolean>(true);
  readonly importandoCSV = signal<boolean>(false);
  readonly progressoImportacaoBanco = signal<number>(0);
  readonly statusImportacaoTexto = signal<string>('');

  readonly statusEnvioMap = signal<Map<string, 'sucesso' | 'falha'>>(new Map());

  readonly mensagemTemplate1 = signal<string>('Olá {nome}, tudo bem? Somos da equipe TechMinds Hub! Como podemos te ajudar hoje?');
  readonly mensagemTemplate2 = signal<string>('Oi {nome}! Aqui é do TechMinds Hub. Esperamos que esteja tudo ótimo por aí! Estamos à disposição.');
  readonly mensagemTemplate3 = signal<string>('Prezado(a) {nome}, como vai? Passando para te desejar um excelente dia em nome da TechMinds Hub.');

  readonly salvandoTemplates = signal<boolean>(false);
  readonly mensagemSucessoTemplates = signal<string | null>(null);
  readonly mensagemErroTemplates = signal<string | null>(null);

  readonly executando = signal<boolean>(false);
  readonly relatorioConsolidado = signal<EnviarLoteResponse | null>(null);
  readonly erroEnvio = signal<string | null>(null);

  readonly contagemRegressivaSegundos = signal<number>(0);
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Efeito para atualizar reativamente o status de envio de cada contato e acionar a contagem regressiva em tempo real
    effect(() => {
      const prog = this.hubService.progressoAtual();
      if (prog) {
        this.iniciarContagemRegressiva(prog.delayProximoSegundos || 0);

        if (prog.numeroSanitizado) {
          const status: 'sucesso' | 'falha' = prog.sucesso ? 'sucesso' : 'falha';
          this.statusEnvioMap.update((mapaAtual) => {
            const novoMapa = new Map(mapaAtual);
            novoMapa.set(prog.numeroSanitizado, status);
            return novoMapa;
          });

          // Atualizar também a flag de enviado na lista local de estabelecimentos do banco
          if (prog.sucesso) {
            this.estabelecimentosBanco.update((lista) =>
              lista.map((item) => (item.numero === prog.numeroSanitizado ? { ...item, enviado: true } : item))
            );
          }
        }
      }
    });
  }

  readonly apenasNaoEnviados = signal<boolean>(true);

  /**
   * Obtém a sublista de estabelecimentos cadastrados a serem contatados.
   * Filtra contatos já enviados quando apenasNaoEnviados estiver marcado.
   */
  readonly contatosSelecionados = computed<Contato[]>(() => {
    let base = this.estabelecimentosBanco();
    if (this.apenasNaoEnviados()) {
      base = base.filter((c) => !c.enviado && this.obterStatusEnvio(c) !== 'sucesso');
    }
    const qtd = this.quantidadeSelecionada();
    if (qtd >= base.length) {
      return base;
    }
    return base.slice(0, qtd);
  });

  /**
   * Quantidade de estabelecimentos no banco que já foram contatados anteriormente.
   */
  readonly totalIgnoradosPorJaEnviados = computed<number>(() => {
    return this.estabelecimentosBanco().filter((c) => c.enviado || this.obterStatusEnvio(c) === 'sucesso').length;
  });

  /**
   * Verifica se um determinado contato faz parte do lote de envio atual (é um Alvo).
   */
  isContatoAlvo(contato: Contato): boolean {
    const selecionados = this.contatosSelecionados();
    return selecionados.some((item) => item.numero === contato.numero);
  }

  /**
   * Progresso percentual calculado para a barra de progresso.
   */
  readonly progressoPercentual = computed<number>(() => {
    const progresso = this.hubService.progressoAtual();
    if (!progresso || progresso.totalContatos === 0) {
      return 0;
    }
    return Math.round((progresso.indiceAtual / progresso.totalContatos) * 100);
  });

  ngOnInit(): void {
    this.hubService.iniciarConexao();
    this.carregarEstabelecimentosDoBanco();
    this.carregarTemplatesDoBanco();
  }

  ngOnDestroy(): void {
    this.limparTimer();
    this.hubService.pararConexao();
  }

  /**
   * Carrega os templates de mensagem salvos no banco de dados.
   */
  carregarTemplatesDoBanco(): void {
    this.mensagensApi.obterTemplates().subscribe({
      next: (templates) => {
        if (templates && templates.length > 0) {
          const t1 = templates.find((t) => t.posicao === 1);
          const t2 = templates.find((t) => t.posicao === 2);
          const t3 = templates.find((t) => t.posicao === 3);

          if (t1?.conteudo !== undefined) this.mensagemTemplate1.set(t1.conteudo);
          if (t2?.conteudo !== undefined) this.mensagemTemplate2.set(t2.conteudo);
          if (t3?.conteudo !== undefined) this.mensagemTemplate3.set(t3.conteudo);
        }
      },
      error: (err) => {
        console.error('Erro ao carregar templates do banco:', err);
      }
    });
  }

  /**
   * Persiste os 3 templates de mensagem no banco de dados.
   */
  salvarTemplatesNoBanco(): void {
    this.salvandoTemplates.set(true);
    this.mensagemSucessoTemplates.set(null);
    this.mensagemErroTemplates.set(null);

    const items: TemplateMensagemItem[] = [
      { posicao: 1, conteudo: this.mensagemTemplate1() },
      { posicao: 2, conteudo: this.mensagemTemplate2() },
      { posicao: 3, conteudo: this.mensagemTemplate3() }
    ];

    this.mensagensApi.salvarTemplates(items).subscribe({
      next: (res) => {
        this.salvandoTemplates.set(false);
        if (res && res.length > 0) {
          const t1 = res.find((t) => t.posicao === 1);
          const t2 = res.find((t) => t.posicao === 2);
          const t3 = res.find((t) => t.posicao === 3);

          if (t1?.conteudo !== undefined) this.mensagemTemplate1.set(t1.conteudo);
          if (t2?.conteudo !== undefined) this.mensagemTemplate2.set(t2.conteudo);
          if (t3?.conteudo !== undefined) this.mensagemTemplate3.set(t3.conteudo);
        }
        this.mensagemSucessoTemplates.set('Templates de mensagem salvos com sucesso no banco de dados!');
        setTimeout(() => this.mensagemSucessoTemplates.set(null), 4000);
      },
      error: (err) => {
        console.error('Erro ao salvar templates:', err);
        this.salvandoTemplates.set(false);
        this.mensagemErroTemplates.set('Falha ao salvar templates no banco de dados.');
      }
    });
  }

  /**
   * Carrega os estabelecimentos persistidos no banco de dados.
   */
  carregarEstabelecimentosDoBanco(): void {
    this.mensagensApi.obterEstabelecimentos().subscribe({
      next: (lista) => {
        this.estabelecimentosBanco.set(lista);
        if (lista.length > 0 && this.quantidadeSelecionada() === 5) {
          this.quantidadeSelecionada.set(Math.min(lista.length, 100));
        }
      },
      error: (err) => {
        console.error('Erro ao buscar estabelecimentos do banco:', err);
      }
    });
  }

  /**
   * Alterna a visibilidade do painel de upload de CSV.
   */
  togglePainelUpload(): void {
    this.exibirPainelUpload.update((v) => !v);
  }

  /**
   * Processa a seleção de arquivo CSV enviado pelo usuário.
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    const reader = new FileReader();

    this.importandoCSV.set(true);
    this.erroEnvio.set(null);

    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        this.processarCSV(content, file.name);
      } else {
        this.importandoCSV.set(false);
      }
    };

    reader.readAsText(file, 'UTF-8');
    input.value = ''; // Reset do input para permitir re-upload
  }

  /**
   * Parser robusto de CSV com envio direto para persistência no banco de dados backend.
   */
  private processarCSV(content: string, fileName: string): void {
    const linhas = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (linhas.length === 0) {
      this.erroEnvio.set('O arquivo CSV selecionado está vazio.');
      this.importandoCSV.set(false);
      return;
    }

    const listaParaImportar: ItemImportacao[] = [];
    let nomeIndex = 0;
    let telefoneIndex = 1;
    let enderecoIndex = -1;
    let siteIndex = -1;
    let tiposIndex = -1;
    let nichoIndex = -1;
    let cidadeIndex = -1;

    // Verificar cabeçalho
    const primeiraLinhaColunas = this.parseCSVLine(linhas[0]);
    const temCabecalho = primeiraLinhaColunas.some((col) => {
      const colUpper = col.toUpperCase();
      return colUpper.includes('NOME') || colUpper.includes('TELEFONE') || colUpper.includes('CELULAR') || colUpper.includes('EMPRESA');
    });

    let startRow = 0;
    if (temCabecalho) {
      startRow = 1;
      primeiraLinhaColunas.forEach((col, idx) => {
        const colUpper = col.toUpperCase();
        if (colUpper.includes('NOME') || colUpper.includes('EMPRESA') || colUpper.includes('RAZAO')) {
          nomeIndex = idx;
        } else if (colUpper.includes('TELEFONE') || colUpper.includes('CELULAR') || colUpper.includes('WHATSAPP') || colUpper.includes('NUMERO')) {
          telefoneIndex = idx;
        } else if (colUpper.includes('ENDEREÇO') || colUpper.includes('ENDERECO')) {
          enderecoIndex = idx;
        } else if (colUpper.includes('SITE')) {
          siteIndex = idx;
        } else if (colUpper.includes('TIPOS')) {
          tiposIndex = idx;
        } else if (colUpper.includes('NICHO')) {
          nichoIndex = idx;
        } else if (colUpper.includes('CIDADE')) {
          cidadeIndex = idx;
        }
      });
    }

    for (let i = startRow; i < linhas.length; i++) {
      const colunas = this.parseCSVLine(linhas[i]);
      if (colunas.length <= Math.max(nomeIndex, telefoneIndex)) {
        continue;
      }

      const nomeBruto = colunas[nomeIndex]?.trim();
      const telefoneBruto = colunas[telefoneIndex]?.trim();

      if (!nomeBruto || !telefoneBruto) {
        continue;
      }

      // Sanitizar telefone com regras de DDI 55, DDD e 9º dígito móvel
      const telefoneSanitizado = this.sanitizarTelefone(telefoneBruto);
      if (!telefoneSanitizado) {
        continue;
      }

      listaParaImportar.push({
        nome: nomeBruto,
        numero: telefoneSanitizado,
        endereco: enderecoIndex >= 0 ? colunas[enderecoIndex] : undefined,
        site: siteIndex >= 0 ? colunas[siteIndex] : undefined,
        tipos: tiposIndex >= 0 ? colunas[tiposIndex] : undefined,
        nichoBuscado: nichoIndex >= 0 ? colunas[nichoIndex] : undefined,
        cidadeBuscada: cidadeIndex >= 0 ? colunas[cidadeIndex] : undefined
      });
    }

    if (listaParaImportar.length === 0) {
      this.erroEnvio.set('Nenhum contato válido com telefone foi encontrado na planilha.');
      this.importandoCSV.set(false);
      return;
    }

    this.progressoImportacaoBanco.set(30);
    this.statusImportacaoTexto.set(`Persistindo ${listaParaImportar.length} estabelecimentos no Banco de Dados PostgreSQL...`);

    // Divisão em blocos (chunks) de 250 registros para atualização em tempo real da barra de carregamento
    const CHUNK_SIZE = 250;
    const totalChunks = Math.ceil(listaParaImportar.length / CHUNK_SIZE);
    let novosTotal = 0;
    let duplicadosTotal = 0;

    const enviarChunk = (index: number) => {
      if (index >= totalChunks) {
        // Finalizado com sucesso
        this.progressoImportacaoBanco.set(100);
        this.statusImportacaoTexto.set('Importação concluída e salva no banco de dados!');
        this.relatorioImportacao.set({
          totalRecebidos: listaParaImportar.length,
          novoscadastrados: novosTotal,
          duplicadosIgnorados: duplicadosTotal,
          mensagem: `Importação concluída com sucesso! ${novosTotal} novos estabelecimentos cadastrados no banco. ${duplicadosTotal} duplicados ignorados.`
        });
        this.exibirPainelUpload.set(false); // Ocultar painel de upload após importar com sucesso
        this.importandoCSV.set(false);
        this.carregarEstabelecimentosDoBanco();
        return;
      }

      const chunk = listaParaImportar.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE);
      const percentual = Math.round(30 + ((index + 1) / totalChunks) * 70);
      this.progressoImportacaoBanco.set(percentual);
      this.statusImportacaoTexto.set(`Salvando no banco de dados... Bloco ${index + 1} de ${totalChunks} (${percentual}%)`);

      this.mensagensApi.importarEstabelecimentos({ estabelecimentos: chunk }).subscribe({
        next: (res) => {
          novosTotal += res.novoscadastrados;
          duplicadosTotal += res.duplicadosIgnorados;
          enviarChunk(index + 1);
        },
        error: (err) => {
          console.error('Erro ao importar bloco no banco:', err);
          this.erroEnvio.set('Falha ao salvar a planilha no banco de dados.');
          this.importandoCSV.set(false);
        }
      });
    };

    enviarChunk(0);
  }

  /**
   * Parser auxiliar de linha CSV respeitando aspas e vírgulas internas.
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((char === ',' || char === ';') && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  /**
   * Remove todos os estabelecimentos do banco de dados.
   */
  limparBancoDeDados(): void {
    if (!confirm('Tem certeza que deseja apagar todos os estabelecimentos salvos no banco de dados?')) {
      return;
    }

    this.mensagensApi.limparEstabelecimentos().subscribe({
      next: () => {
        this.relatorioImportacao.set(null);
        this.carregarEstabelecimentosDoBanco();
      },
      error: (err) => {
        console.error('Erro ao limpar banco de dados:', err);
      }
    });
  }

  /**
   * Obtém o status de envio de um estabelecimento ('sucesso', 'falha' ou 'pendente').
   */
  obterStatusEnvio(contato: Contato): 'sucesso' | 'falha' | 'pendente' {
    const statusSessao = this.statusEnvioMap().get(contato.numero);
    if (statusSessao) {
      return statusSessao;
    }
    if (contato.enviado) {
      return 'sucesso';
    }
    return 'pendente';
  }

  /**
   * Altera a quantidade de estabelecimentos selecionada.
   */
  alterarQuantidade(novaQuantidade: number): void {
    if (this.executando()) {
      return;
    }
    this.quantidadeSelecionada.set(Number(novaQuantidade));
  }

  /**
   * Inicia o disparo em lote com rotação aleatória de 3 templates anti-ban e acompanhamento SignalR.
   */
  dispararMensagens(): void {
    if (this.executando()) {
      return;
    }

    const contatos = this.contatosSelecionados();
    if (contatos.length === 0) {
      this.erroEnvio.set('Nenhum estabelecimento cadastrado no banco de dados para disparo.');
      return;
    }

    const t1 = this.mensagemTemplate1().trim();
    const t2 = this.mensagemTemplate2().trim();
    const t3 = this.mensagemTemplate3().trim();

    const templatesValidos = [t1, t2, t3].filter((t) => t.length > 0);

    if (templatesValidos.length === 0) {
      this.erroEnvio.set('Por favor, informe ao menos um template de mensagem válido.');
      return;
    }

    this.erroEnvio.set(null);
    this.relatorioConsolidado.set(null);
    this.hubService.limparLogs();
    this.executando.set(true);

    const payload: EnviarLoteRequest = {
      mensagensTemplates: templatesValidos,
      contatos: contatos
    };

    this.mensagensApi.enviarLote(payload, this.instanceName).subscribe({
      next: (relatorio) => {
        this.relatorioConsolidado.set(relatorio);
        this.executando.set(false);
        this.carregarEstabelecimentosDoBanco();
      },
      error: (err) => {
        console.error('Erro ao disparar mensagens em lote:', err);
        this.erroEnvio.set(err.error?.mensagem || 'Falha ao se comunicar com o servidor de disparo.');
        this.executando.set(false);
      }
    });
  }

  /**
   * Normaliza o número de telefone para o formato canônico com DDI 55, DDD e 9º dígito móvel.
   */
  private sanitizarTelefone(raw: string): string {
    if (!raw) {
      return '';
    }
    let digitos = raw.replace(/\D/g, '');
    if (!digitos) {
      return '';
    }

    // Remove zeros à esquerda (ex: 011999998888 -> 11999998888)
    digitos = digitos.replace(/^0+/, '');

    if (digitos.startsWith('55')) {
      if (digitos.length > 4 && digitos.charAt(2) === '0') {
        digitos = '55' + digitos.substring(3);
      }
      let semDdi = digitos.substring(2);
      if (semDdi.length === 10 && '6789'.includes(semDdi.charAt(2))) {
        semDdi = semDdi.substring(0, 2) + '9' + semDdi.substring(2);
        digitos = '55' + semDdi;
      }
      return digitos;
    } else {
      if (digitos.length === 10 && '6789'.includes(digitos.charAt(2))) {
        digitos = digitos.substring(0, 2) + '9' + digitos.substring(2);
      }
      if (digitos.length === 10 || digitos.length === 11) {
        digitos = '55' + digitos;
      }
      return digitos;
    }
  }

  /**
   * Inicia a contagem regressiva segundo a segundo para o próximo envio de mensagem no lote.
   */
  private iniciarContagemRegressiva(segundos: number): void {
    this.limparTimer();
    if (segundos <= 0) {
      this.contagemRegressivaSegundos.set(0);
      return;
    }

    this.contagemRegressivaSegundos.set(segundos);
    this.timerInterval = setInterval(() => {
      const valorAtual = this.contagemRegressivaSegundos();
      if (valorAtual > 1) {
        this.contagemRegressivaSegundos.set(valorAtual - 1);
      } else {
        this.contagemRegressivaSegundos.set(0);
        this.limparTimer();
      }
    }, 1000);
  }

  /**
   * Cancela e limpa o timer de contagem regressiva ativo.
   */
  private limparTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}
