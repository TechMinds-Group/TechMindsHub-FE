import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DisparoMensagensComponent } from './disparo-mensagens.component';

describe('DisparoMensagensComponent', () => {
  let component: DisparoMensagensComponent;
  let fixture: ComponentFixture<DisparoMensagensComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisparoMensagensComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DisparoMensagensComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente com a quantidade padrão de 5 estabelecimentos', () => {
    expect(component).toBeTruthy();
    expect(component.quantidadeSelecionada()).toBe(5);
    expect(component.contatosSelecionados().length).toBe(5);
  });

  it('deve atualizar a sublista de contatos quando a quantidade for alterada para 20', () => {
    component.alterarQuantidade(20);
    expect(component.quantidadeSelecionada()).toBe(20);
    expect(component.contatosSelecionados().length).toBe(20);
  });
});
