import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

export interface MenuItem {
  label: string;
  icon: string;
  route?: string;
  externalUrl?: string;
  exact?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  currentUser = this.authService.currentUser;
  isCollapsed = signal<boolean>(false);
  isProfileOpen = signal<boolean>(false);
  isDarkMode = signal<boolean>(true);

  menuItems = signal<MenuItem[]>([
    {
      label: 'Captação',
      icon: 'fas fa-magnet',
      route: '/captacao'
    },
    {
      label: 'Coleta de Leads',
      icon: 'fas fa-user-plus',
      route: '/coleta'
    }
  ]);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.isProfileOpen() && !target.closest('.dropup')) {
      this.isProfileOpen.set(false);
    }
  }

  toggleCollapse(): void {
    this.isCollapsed.update(v => !v);
  }

  toggleProfile(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isProfileOpen.update(v => !v);
  }

  toggleTheme(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDarkMode.update(v => !v);
  }

  handleLogout(event: MouseEvent): void {
    event.preventDefault();
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }
}
