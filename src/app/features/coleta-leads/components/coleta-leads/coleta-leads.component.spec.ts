import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { ColetaLeadsComponent } from './coleta-leads.component';
import { CampanhaColeta, PresetColeta } from '../../../../core/models/coleta-leads.model';
import { environment } from '../../../../../environments/environment';

describe('ColetaLeadsComponent', () => {
  let component: ColetaLeadsComponent;
  let fixture: ComponentFixture<ColetaLeadsComponent>;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/api/coleta-leads`;

  const presetMock: PresetColeta = {
    id: 'p1',
    nome: 'Barbearias POA',
    nichos: ['barbearia'],
    cidades: ['Porto Alegre, RS'],
    dataCriacao: '2026-09-19T12:00:00Z',
    dataAtualizacao: '2026-09-19T12:00:00Z'
  };

  const campanhaEmAndamento: CampanhaColeta = {
    id: 'c1',
    nichos: ['barbearia'],
    cidades: ['Porto Alegre, RS'],
    presetColetaId: null,
    status: 'EmAndamento',
    totalColetados: 5,
    duplicadosIgnorados: 2,
    erro: null,
    dataInicio: '2026-09-19T12:00:00Z',
    dataFim: null
  };

  const campanhaConcluida: CampanhaColeta = {
    ...campanhaEmAndamento,
    id: 'c2',
    status: 'Concluida',
    totalColetados: 12,
    dataFim: '2026-09-19T12:10:00Z'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColetaLeadsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ColetaLeadsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    httpMock.verify();
  });

  function flushInitialRequests(): void {
    httpMock.expectOne(`${baseUrl}/presets`).flush([presetMock]);
    httpMock.expectOne(`${baseUrl}/campanhas`).flush([]);
    httpMock.expectOne(r => r.url === `${baseUrl}/leads`).flush([]);
  }

  it('deve criar o componente de coleta de leads', () => {
    flushInitialRequests();
    expect(component).toBeTruthy();
  });

  it('deve carregar presets, campanhas e leads na inicialização', () => {
    flushInitialRequests();
    expect(component.presets().length).toBe(1);
    expect(component.presets()[0].nome).toBe('Barbearias POA');
    expect(component.leads().length).toBe(0);
  });

  it('deve aplicar preset preenchendo a seleção de nichos e cidades com um clique (RN-018)', () => {
    flushInitialRequests();

    component.aplicarPreset(presetMock);

    expect(component.nichosSelecionados()).toEqual(['barbearia']);
    expect(component.cidadesSelecionadas()).toEqual(['Porto Alegre, RS']);
    expect(component.temSelecao()).toBe(true);
  });

  it('deve iniciar campanha via service e exibi-la como Em Andamento com contadores (RN-017)', () => {
    flushInitialRequests();

    component.nichosSelecionados.set(['barbearia']);
    component.cidadesSelecionadas.set(['Porto Alegre, RS']);
    component.iniciarColeta();

    const reqPost = httpMock.expectOne(`${baseUrl}/campanhas`);
    expect(reqPost.request.method).toBe('POST');
    expect(reqPost.request.body).toEqual({ nichos: ['barbearia'], cidades: ['Porto Alegre, RS'] });
    reqPost.flush({ campanhaId: 'c1' });

    // Após o 202, o componente recarrega as campanhas para acompanhamento
    const reqGet = httpMock.expectOne(`${baseUrl}/campanhas`);
    reqGet.flush([campanhaEmAndamento]);

    expect(component.campanhas().length).toBe(1);
    expect(component.campanhas()[0].status).toBe('EmAndamento');
    expect(component.campanhas()[0].totalColetados).toBe(5);
    expect(component.temCampanhaEmAndamento()).toBe(true);
  });

  it('não deve iniciar campanha sem seleção completa de nichos e cidades (RN-017)', () => {
    flushInitialRequests();

    component.nichosSelecionados.set(['barbearia']);
    component.cidadesSelecionadas.set([]);
    component.iniciarColeta();

    httpMock.expectNone(`${baseUrl}/campanhas`);
    expect(component.temSelecao()).toBe(false);
  });

  it('deve exportar VCF via blob respeitando os filtros ativos e disparar download (RN-025)', () => {
    flushInitialRequests();

    const urlMock = 'blob:mock-url';
    Object.defineProperty(URL, 'createObjectURL', {
      value: () => urlMock,
      configurable: true,
      writable: true
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: () => undefined,
      configurable: true,
      writable: true
    });

    component.filtroNicho.set('barbearia');
    component.filtroCidade.set('Porto Alegre, RS');
    component.exportarVcf();

    const req = httpMock.expectOne(r => r.url === `${baseUrl}/exportar-vcf`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    expect(req.request.params.get('nicho')).toBe('barbearia');
    expect(req.request.params.get('cidade')).toBe('Porto Alegre, RS');
    req.flush(
      new Blob(['BEGIN:VCARD'], { type: 'text/vcard' }),
      { headers: { 'X-Leads-Exportados': '2' } }
    );

    expect(component.exportando()).toBe(false);
    expect(component.mensagemTipo()).toBe('success');
  });

  it('deve informar arquivo vazio quando zero leads correspondem aos filtros (ERR-063)', () => {
    flushInitialRequests();

    component.filtroNicho.set('nicho-inexistente');
    component.exportarVcf();

    const req = httpMock.expectOne(r => r.url === `${baseUrl}/exportar-vcf`);
    expect(req.request.params.get('nicho')).toBe('nicho-inexistente');
    req.flush(
      new Blob([]),
      { headers: { 'X-Leads-Exportados': '0' } }
    );

    expect(component.mensagemTipo()).toBe('warning');
    expect(component.mensagem()).toContain('vazio');
    expect(component.mensagem()).toContain('ERR-063');
    expect(component.exportando()).toBe(false);
  });

  // ===== Exclusão de campanha (fora do escopo original — solicitação do stakeholder; CR futuro) =====

  function expectRecargaListas(): void {
    httpMock.expectOne(r => r.url === `${baseUrl}/campanhas` && r.method === 'GET').flush([]);
    httpMock.expectOne(r => r.url === `${baseUrl}/leads`).flush([]);
  }

  it('deve excluir campanha via DELETE e recarregar campanhas e leads após confirmação', () => {
    flushInitialRequests();
    component.campanhas.set([campanhaConcluida]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    component.excluirCampanha(campanhaConcluida);

    const reqDel = httpMock.expectOne(`${baseUrl}/campanhas/c2`);
    expect(reqDel.request.method).toBe('DELETE');
    reqDel.flush({ message: 'Campanha excluída' });

    expectRecargaListas();

    expect(component.mensagemTipo()).toBe('success');
    expect(component.mensagem()).toContain('excluída');
  });

  it('deve cancelar a exclusão quando o usuário não confirma', () => {
    flushInitialRequests();
    component.campanhas.set([campanhaConcluida]);
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    component.excluirCampanha(campanhaConcluida);

    httpMock.expectNone(r => r.url === `${baseUrl}/campanhas/c2`);
  });

  it('não deve excluir campanha em andamento (RN exclusão — status protege a coleta)', () => {
    flushInitialRequests();
    component.campanhas.set([campanhaEmAndamento]);

    component.excluirCampanha(campanhaEmAndamento);

    httpMock.expectNone(`${baseUrl}/campanhas/c1`);
  });

  it('deve limpar o filtro de campanha ao excluir a campanha filtrada e recarregar leads sem campanhaId', () => {
    flushInitialRequests();
    component.campanhas.set([campanhaConcluida]);
    component.filtroCampanhaId.set('c2');
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    component.excluirCampanha(campanhaConcluida);

    httpMock.expectOne(`${baseUrl}/campanhas/c2`).flush({ message: 'Campanha excluída' });

    const reqLeads = httpMock.expectOne(r => r.url === `${baseUrl}/leads`);
    httpMock.expectOne(r => r.url === `${baseUrl}/campanhas` && r.method === 'GET').flush([]);

    expect(component.filtroCampanhaId()).toBe('');
    expect(reqLeads.request.params.get('campanhaId')).toBeNull();
  });

  it('deve exibir warning com o texto da API quando a exclusão retorna 409', () => {
    flushInitialRequests();
    component.campanhas.set([campanhaConcluida]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    component.excluirCampanha(campanhaConcluida);

    httpMock.expectOne(`${baseUrl}/campanhas/c2`).flush(
      { message: 'Campanha em andamento — aguarde a conclusão para excluir.' },
      { status: 409, statusText: 'Conflict' }
    );

    expect(component.mensagemTipo()).toBe('warning');
    expect(component.mensagem()).toContain('Campanha em andamento');
  });

  it('deve exibir mensagem danger quando a exclusão falha com erro genérico (404)', () => {
    flushInitialRequests();
    component.campanhas.set([campanhaConcluida]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    component.excluirCampanha(campanhaConcluida);

    httpMock.expectOne(`${baseUrl}/campanhas/c2`).flush(
      { message: 'Campanha não encontrada.' },
      { status: 404, statusText: 'Not Found' }
    );

    expect(component.mensagemTipo()).toBe('danger');
  });

  it('deve desabilitar o botão de exclusão apenas para campanhas em andamento', () => {
    flushInitialRequests();
    component.campanhas.set([campanhaEmAndamento, campanhaConcluida]);
    fixture.detectChanges();

    const botoes = fixture.nativeElement.querySelectorAll('tbody .btn-outline-danger');
    expect(botoes.length).toBe(2);
    expect(botoes[0].disabled).toBe(true);
    expect(botoes[1].disabled).toBe(false);
  });
});
