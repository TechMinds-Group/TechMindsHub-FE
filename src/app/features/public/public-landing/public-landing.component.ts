import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AppFooterComponent } from '../../../shared/components/footer/app-footer.component';

@Component({
  selector: 'app-public-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, AppFooterComponent],
  templateUrl: './public-landing.component.html',
  styleUrl: './public-landing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicLandingComponent {
  private readonly router = inject(Router);

  irParaLogin(): void {
    this.router.navigate(['/login']);
  }

  irParaGroom(): void {
    window.location.href = 'https://groom.techminds.net.br/sg-auth-x7k9p';
  }
}
