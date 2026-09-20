import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PresetModalComponent } from './preset-modal.component';

describe('PresetModalComponent', () => {
  let component: PresetModalComponent;
  let fixture: ComponentFixture<PresetModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PresetModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PresetModalComponent);
    fixture.componentRef.setInput('modo', 'criar');
    fixture.componentRef.setInput('nomeInicial', '');
    fixture.componentRef.setInput('nichosIniciais', ['barbearia']);
    fixture.componentRef.setInput('cidadesIniciais', ['Porto Alegre, RS']);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o modal de preset inicializando com os dados informados', () => {
    expect(component).toBeTruthy();
    expect(component.nichos()).toEqual(['barbearia']);
    expect(component.cidades()).toEqual(['Porto Alegre, RS']);
  });

  it('deve bloquear confirmação sem nome (ERR-020)', () => {
    let salvo = false;
    component.salvo.subscribe(() => (salvo = true));

    component.confirmar();

    expect(salvo).toBe(false);
    expect(component.erroNome()).toBe('Informe o nome do preset.');
  });

  it('deve emitir request completo ao confirmar com nome (RN-018)', () => {
    let recebido: { nome: string; nichos: string[]; cidades: string[] } | null = null;
    component.salvo.subscribe(req => (recebido = req));

    component.nome.set('Barbearias POA');
    component.confirmar();

    expect(recebido).toEqual({ nome: 'Barbearias POA', nichos: ['barbearia'], cidades: ['Porto Alegre, RS'] });
    expect(component.erroNome()).toBeNull();
  });

  it('deve adicionar e remover nichos sem duplicar (case-insensitive)', () => {
    component.adicionarNicho('petshop');
    component.adicionarNicho('PETSHOP');

    expect(component.nichos()).toEqual(['barbearia', 'petshop']);

    component.removerNicho('petshop');
    expect(component.nichos()).toEqual(['barbearia']);
  });
});
