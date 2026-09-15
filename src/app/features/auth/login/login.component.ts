import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TmTextComponent } from '../../../shared/components/tm-text/tm-text.component';
import { CommonModule } from '@angular/common';
import { AppFooterComponent } from '../../../shared/components/footer/app-footer.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TmTextComponent, AppFooterComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  loginForm = this.fb.group({
    email: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rememberMe: [false]
  });

  newPasswordForm = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  });

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  isForceChangePassword = signal(false);

  ngOnInit(): void {
    const rememberMe = sessionStorage.getItem('login_remember_me') === 'true';
    if (rememberMe) {
      const email = sessionStorage.getItem('login_email') || '';
      this.loginForm.patchValue({
        rememberMe: true,
        email
      });
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password, rememberMe } = this.loginForm.value;

    this.authService.login({ email: email!, password: password! }, rememberMe!)
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          if (rememberMe) {
            sessionStorage.setItem('login_remember_me', 'true');
            sessionStorage.setItem('login_email', email!);
          } else {
            sessionStorage.removeItem('login_remember_me');
            sessionStorage.removeItem('login_email');
          }
          this.router.navigate(['/disparo']);
        },
        error: (err) => {
          this.isLoading.set(false);
          if (err.status === 403 && err.error?.requirePasswordChange) {
            this.isForceChangePassword.set(true);
            this.errorMessage.set('Sua senha foi resetada. Por favor, crie uma nova senha para acessar o sistema.');
          } else if (err.status === 401 && err.error?.Message) {
            this.errorMessage.set(err.error.Message);
          } else if (err.status === 401) {
            this.errorMessage.set('Credenciais inválidas.');
          } else if (err.error?.Message) {
            this.errorMessage.set(err.error.Message);
          } else {
            this.errorMessage.set('Ocorreu um erro ao tentar fazer login.');
          }
        }
      });
  }

  onSubmitNewPassword(): void {
    if (this.newPasswordForm.invalid) {
      this.newPasswordForm.markAllAsTouched();
      return;
    }

    const { newPassword, confirmPassword } = this.newPasswordForm.value;
    if (newPassword !== confirmPassword) {
      this.errorMessage.set('As senhas não coincidem.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const email = this.loginForm.value.email!;
    const currentPassword = this.loginForm.value.password!;

    this.authService.forceChangePassword({
      email,
      currentPassword,
      newPassword
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/disparo']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.Message || 'Erro ao trocar a senha. Verifique os dados e tente novamente.');
      }
    });
  }
}
