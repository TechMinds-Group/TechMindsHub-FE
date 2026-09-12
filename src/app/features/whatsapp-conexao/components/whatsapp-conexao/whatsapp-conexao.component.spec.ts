import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WhatsappConexaoComponent } from './whatsapp-conexao.component';

describe('WhatsappConexaoComponent', () => {
  let component: WhatsappConexaoComponent;
  let fixture: ComponentFixture<WhatsappConexaoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WhatsappConexaoComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(WhatsappConexaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente de conexão do WhatsApp', () => {
    expect(component).toBeTruthy();
  });
});
