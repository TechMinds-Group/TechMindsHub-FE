import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { vi } from 'vitest';
import { ColetaLeadsApiService } from './coleta-leads-api.service';
import { environment } from '../../../environments/environment';

describe('ColetaLeadsApiService', () => {
  let service: ColetaLeadsApiService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/api/coleta-leads`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ColetaLeadsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve listar presets via GET /presets', () => {
    const presetsMock = [
      { id: 'p1', nome: 'Barbearias POA', nichos: ['barbearia'], cidades: ['Porto Alegre, RS'], dataCriacao: '', dataAtualizacao: '' }
    ];

    service.listarPresets().subscribe(presets => {
      expect(presets.length).toBe(1);
      expect(presets[0].nome).toBe('Barbearias POA');
    });

    const req = httpMock.expectOne(`${baseUrl}/presets`);
    expect(req.request.method).toBe('GET');
    req.flush(presetsMock);
  });

  it('deve criar preset via POST /presets com nome, nichos e cidades', () => {
    const request = { nome: 'Petshops', nichos: ['petshop'], cidades: ['Canoas, RS'] };

    service.criarPreset(request).subscribe(preset => {
      expect(preset.id).toBe('p2');
    });

    const req = httpMock.expectOne(`${baseUrl}/presets`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ id: 'p2', ...request, dataCriacao: '', dataAtualizacao: '' });
  });

  it('deve atualizar preset via PUT /presets/{id}', () => {
    const request = { nome: 'Petshops RS', nichos: ['petshop'], cidades: ['Canoas, RS'] };

    service.atualizarPreset('p2', request).subscribe(preset => {
      expect(preset.nome).toBe('Petshops RS');
    });

    const req = httpMock.expectOne(`${baseUrl}/presets/p2`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(request);
    req.flush({ id: 'p2', ...request, dataCriacao: '', dataAtualizacao: '' });
  });

  it('deve excluir preset via DELETE /presets/{id}', () => {
    service.excluirPreset('p2').subscribe(resposta => {
      expect(resposta.message).toBe('Preset excluído');
    });

    const req = httpMock.expectOne(`${baseUrl}/presets/p2`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'Preset excluído' });
  });

  it('deve iniciar campanha via POST /campanhas com nichos e cidades', () => {
    const request = { nichos: ['barbearia'], cidades: ['Porto Alegre, RS'] };

    service.criarCampanha(request).subscribe(resposta => {
      expect(resposta.campanhaId).toBe('c1');
    });

    const req = httpMock.expectOne(`${baseUrl}/campanhas`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ campanhaId: 'c1' });
  });

  it('deve listar campanhas via GET /campanhas', () => {
    service.listarCampanhas().subscribe(campanhas => {
      expect(campanhas.length).toBe(1);
      expect(campanhas[0].status).toBe('EmAndamento');
    });

    const req = httpMock.expectOne(`${baseUrl}/campanhas`);
    expect(req.request.method).toBe('GET');
    req.flush([
      {
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
      }
    ]);
  });

  it('deve excluir campanha via DELETE /campanhas/{id}', () => {
    service.excluirCampanha('c1').subscribe(resposta => {
      expect(resposta.message).toBe('Campanha excluída');
    });

    const req = httpMock.expectOne(`${baseUrl}/campanhas/c1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'Campanha excluída' });
  });

  it('deve propagar erro 409 quando a campanha está em andamento', () => {
    const onNext = vi.fn();
    service.excluirCampanha('c1').subscribe({
      next: onNext,
      error: (err: HttpErrorResponse) => {
        expect(onNext).not.toHaveBeenCalled();
        expect(err.status).toBe(409);
        expect(err.error.message).toContain('andamento');
      }
    });

    const req = httpMock.expectOne(`${baseUrl}/campanhas/c1`);
    req.flush(
      { message: 'Campanha em andamento — aguarde a conclusão para excluir.' },
      { status: 409, statusText: 'Conflict' }
    );
  });

  it('deve listar leads combinando filtros nicho, cidade e campanhaId', () => {
    service.listarLeads({ nicho: 'barbearia', cidade: 'Porto Alegre, RS', campanhaId: 'c1' }).subscribe(leads => {
      expect(leads.length).toBe(1);
      expect(leads[0].nome).toBe('Barbearia X');
    });

    const req = httpMock.expectOne(r => r.url === `${baseUrl}/leads`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('nicho')).toBe('barbearia');
    expect(req.request.params.get('cidade')).toBe('Porto Alegre, RS');
    expect(req.request.params.get('campanhaId')).toBe('c1');
    req.flush([{ id: 1, nome: 'Barbearia X' }]);
  });

  it('não deve enviar parâmetros de filtro quando vazios', () => {
    service.listarLeads({}).subscribe(() => {
      // sem asserção de corpo
    });

    const req = httpMock.expectOne(r => r.url === `${baseUrl}/leads`);
    expect(req.request.params.get('nicho')).toBeNull();
    expect(req.request.params.get('cidade')).toBeNull();
    expect(req.request.params.get('campanhaId')).toBeNull();
    req.flush([]);
  });

  it('deve exportar VCF via blob com observe response (RN-025), enviando apenas nicho e cidade', () => {
    service.exportarVcf({ nicho: 'barbearia', cidade: 'Porto Alegre, RS', campanhaId: 'c1' }).subscribe(resposta => {
      expect(resposta.body).toBeInstanceOf(Blob);
      expect(resposta.headers.get('X-Leads-Exportados')).toBe('2');
    });

    const req = httpMock.expectOne(r => r.url === `${baseUrl}/exportar-vcf`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    expect(req.request.params.get('nicho')).toBe('barbearia');
    expect(req.request.params.get('cidade')).toBe('Porto Alegre, RS');
    // Parâmetro `enviado` não é enviado: flag ainda não existe na API
    expect(req.request.params.get('enviado')).toBeNull();
    expect(req.request.params.get('campanhaId')).toBeNull();
    req.flush(
      new Blob(['BEGIN:VCARD'], { type: 'text/vcard' }),
      { headers: { 'X-Leads-Exportados': '2' } }
    );
  });
});
