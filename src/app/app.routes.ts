import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/auth/login/login.component';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/public/public-landing/public-landing.component').then(
        (m) => m.PublicLandingComponent
      )
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'disparo',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/disparo-mensagens/components/disparo-mensagens/disparo-mensagens.component').then(
        (m) => m.DisparoMensagensComponent
      )
  },
  {
    path: 'whatsapp',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/whatsapp-conexao/components/whatsapp-conexao/whatsapp-conexao.component').then(
        (m) => m.WhatsappConexaoComponent
      )
  },
  {
    path: 'captacao',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/captacao/components/captacao-sistemas/captacao-sistemas.component').then(
            (m) => m.CaptacaoSistemasComponent
          )
      },
      {
        path: 'groom',
        loadComponent: () =>
          import('./features/captacao/components/groom-detalhes/groom-detalhes.component').then(
            (m) => m.GroomDetalhesComponent
          )
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./features/captacao/components/groom-detalhes/groom-detalhes.component').then(
            (m) => m.GroomDetalhesComponent
          )
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
