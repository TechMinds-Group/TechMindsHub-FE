import { Component, Output, EventEmitter, TemplateRef, signal, computed, input, model } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TableColumn<T = any> {
  header: string;
  key?: keyof T | string;
  template?: TemplateRef<{ $implicit: any }> | null;
  class?: string;
  headerClass?: string;
  width?: string;
  sortable?: boolean;
  sortKey?: keyof T | string;
  sortFn?: (a: any, b: any) => number;
}

@Component({
  selector: 'tm-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (showControls()) {
      <div class="table-controls-container d-flex justify-content-between align-items-center mb-3 gap-3 flex-wrap">
        <!-- Busca estilo Groom -->
        <div class="search-input-wrapper">
          <div class="search-box d-flex align-items-center px-3 py-2 rounded-3 border">
            <i class="fas fa-search text-primary me-2 fs-6"></i>
            <input
              type="text"
              class="form-control border-0 bg-transparent text-light p-0 shadow-none"
              placeholder="Pesquisar..."
              [value]="filterText()"
              (input)="onSearchInputChange($event)"
            />
          </div>
        </div>

        <!-- Quantidade de Exibição -->
        @if (paginated()) {
          <div class="page-size-select-wrapper d-flex align-items-center gap-2">
            <span class="text-secondary small text-nowrap">Exibir:</span>
            <select
              class="form-select form-select-sm groom-select"
              [value]="pageSize()"
              (change)="onPageSizeChange($event)"
            >
              @for (opt of pageSizeOptions(); track opt) {
                <option [value]="opt">{{ opt }} itens</option>
              }
            </select>
          </div>
        }
      </div>
    }

    <div class="tm-table-wrapper border overflow-hidden" [class.is-loading]="isLoading()">
      <!-- Desktop Table View -->
      <div class="table-responsive custom-scrollbar d-none d-lg-block">
        <table class="table mb-0 align-middle">
          <thead>
            <tr>
              @for (col of cols(); track col.header) {
                <th
                  [style.width]="col.width"
                  [class]="
                    'header-cell text-uppercase fw-bold py-3 px-4 ' +
                    (isColSortable(col) ? 'cursor-pointer user-select-none ' : '') +
                    (col.headerClass || '')
                  "
                  (click)="onHeaderClick(col)"
                >
                  <div class="d-inline-flex align-items-center gap-1">
                    <span>{{ col.header }}</span>
                    @if (isColSortable(col)) {
                      @if (getActiveSortColKey() === getColSortKey(col)) {
                        <i [class]="sortDirection() === 'asc' ? 'fas fa-sort-up text-primary ms-1' : 'fas fa-sort-down text-primary ms-1'"></i>
                      } @else {
                        <i class="fas fa-sort text-muted opacity-50 ms-1"></i>
                      }
                    }
                  </div>
                </th>
              }
            </tr>
          </thead>
          <tbody>
            @if (isLoading()) {
              @for (i of [1, 2, 3, 4, 5]; track i) {
                <tr>
                  @for (col of cols(); track col.header) {
                    <td class="cell-item py-3 px-4">
                      <div class="skeleton-line"></div>
                    </td>
                  }
                </tr>
              }
            } @else {
              @for (row of paginatedData(); track $index) {
                <tr
                  class="row-item transition-all cursor-pointer"
                  [class.table-active]="selectedId() && getCellValue(row, 'id') === selectedId()"
                  (click)="onRowClick(row)"
                >
                  @for (col of cols(); track col.header) {
                    <td [class]="'cell-item py-3 px-4 ' + (col.class || '')">
                      @if (col.template) {
                        <ng-container
                          *ngTemplateOutlet="col.template; context: { $implicit: row }"
                        ></ng-container>
                      } @else if (col.key) {
                        {{ getCellValue(row, col.key) }}
                      }
                    </td>
                  }
                </tr>
              } @empty {
                <tr>
                  <td [attr.colspan]="cols().length" class="text-center py-5 border-0">
                    <div class="empty-state py-5 w-100">
                      <div class="empty-icon-container mb-3">
                        <i class="fas fa-search fs-1 opacity-25 text-muted"></i>
                      </div>
                      <h5 class="fw-bold opacity-75 mb-2 text-light">Nenhum registro encontrado</h5>
                      <p class="text-muted small mb-0 mx-auto empty-text">
                        Não encontramos nenhum resultado para os filtros aplicados no momento.
                      </p>
                    </div>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards View -->
      @if (mobileCards()) {
        <div class="tm-table-mobile-cards d-lg-none p-3">
          @if (isLoading()) {
            @for (i of [1, 2, 3]; track i) {
              <div class="tm-table-card mb-3 p-3">
                <div class="skeleton-line w-50 mb-3"></div>
                <div class="skeleton-line w-75 mb-2"></div>
                <div class="skeleton-line w-100"></div>
              </div>
            }
          } @else {
            @for (row of paginatedData(); track $index) {
              <div
                class="tm-table-card mb-3 p-3 cursor-pointer"
                (click)="onRowClick(row)"
              >
                @if (mobileTemplate()) {
                  <ng-container *ngTemplateOutlet="mobileTemplate()!; context: { $implicit: row }"></ng-container>
                } @else {
                  @for (col of cols(); track col.header) {
                    <div class="card-row d-flex justify-content-between align-items-center mb-2">
                      <span class="card-label fw-bold text-muted small text-uppercase">{{ col.header }}</span>
                      <span class="card-value text-light">
                        @if (col.template) {
                          <ng-container *ngTemplateOutlet="col.template; context: { $implicit: row }"></ng-container>
                        } @else if (col.key) {
                          {{ getCellValue(row, col.key) }}
                        }
                      </span>
                    </div>
                  }
                }
              </div>
            } @empty {
              <div class="empty-state py-5 w-100 text-center">
                <div class="empty-icon-container mb-3">
                  <i class="fas fa-search fs-1 opacity-25 text-muted"></i>
                </div>
                <h5 class="fw-bold opacity-75 mb-2 text-light">Nenhum registro encontrado</h5>
                <p class="text-muted small mb-0 mx-auto empty-text">
                  Não encontramos nenhum resultado para os filtros aplicados no momento.
                </p>
              </div>
            }
          }
        </div>
      }

      @if (paginated() && data().length > 0) {
        <div class="table-footer d-flex justify-content-between align-items-center px-4 py-3 border-top flex-wrap gap-2">
          <div class="d-flex align-items-center footer-info gap-3 flex-wrap">
            <div class="text-secondary small">
              Mostrando {{ (currentPage() - 1) * pageSize() + 1 }} - {{ Math.min(currentPage() * pageSize(), data().length) }} de {{ data().length }}
            </div>
          </div>

          <div class="d-flex align-items-center gap-1">
            <button class="pagination-nav-btn" [disabled]="currentPage() === 1" (click)="prevPage()">
              <i class="fas fa-chevron-left"></i>
            </button>

            @for (page of pages(); track $index) {
              @if (page === '...') {
                <span class="px-2 text-muted">...</span>
              } @else {
                <button
                  class="pagination-num-btn"
                  [class.active]="currentPage() === page"
                  (click)="setPage(page)"
                >
                  {{ page }}
                </button>
              }
            }

            <button class="pagination-nav-btn" [disabled]="currentPage() >= totalPages()" (click)="nextPage()">
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      margin-bottom: 2rem;
    }
    .cursor-pointer {
      cursor: pointer;
    }
    .search-input-wrapper {
      flex-grow: 1;
      max-width: 320px;
    }
    .search-box {
      background-color: #0d1117;
      border-color: rgba(255, 255, 255, 0.12) !important;
      border-radius: 10px !important;
      transition: border-color 0.2s;
    }
    .search-box:focus-within {
      border-color: #0d6efd !important;
    }
    .groom-select {
      background-color: #161b22 !important;
      color: #f8fafc !important;
      border-color: rgba(255, 255, 255, 0.12) !important;
      border-radius: 8px !important;
      width: 105px;
      font-size: 0.85rem;
      cursor: pointer;
    }
    .tm-table-wrapper {
      background-color: #161b22;
      border-color: rgba(255, 255, 255, 0.1) !important;
      border-radius: 12px;
    }
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
    }
    .header-cell {
      background-color: #161b22 !important;
      color: #cbd5e1 !important;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
      white-space: nowrap;
    }
    .row-item {
      background-color: #0d1117 !important;
      transition: background-color 0.2s ease;
    }
    .row-item td {
      background-color: #0d1117 !important;
    }
    .row-item:hover td {
      background-color: rgba(255, 255, 255, 0.04) !important;
    }
    .cell-item {
      color: #f8fafc !important;
      font-size: 0.9rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
    }
    .table-footer {
      background-color: #161b22 !important;
      border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
      color: #cbd5e1;
    }
    .pagination-nav-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: #cbd5e1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .pagination-nav-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .pagination-nav-btn:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.08);
    }
    .pagination-num-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: #cbd5e1;
      font-weight: 500;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .pagination-num-btn.active {
      background: #0d6efd;
      color: #ffffff;
      font-weight: 600;
      box-shadow: 0 2px 6px rgba(13, 110, 253, 0.4);
    }
    .pagination-num-btn:hover:not(.active) {
      background: rgba(255, 255, 255, 0.08);
    }
    .tm-table-card {
      background-color: #161b22;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
    }
    .skeleton-line {
      height: 12px;
      background: linear-gradient(90deg, rgba(255, 255, 255, 0.05) 25%, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05) 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
      border-radius: 4px;
      width: 80%;
    }
    @keyframes loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `]
})
export class TmTableComponent<T = any> {
  // Signal Inputs
  cols = input<TableColumn<T>[]>([]);
  mobileCards = input<boolean>(true);
  mobileTemplate = input<TemplateRef<{ $implicit: T }> | null>(null);
  data = input<T[]>([]);
  paginated = input<boolean>(false);
  selectedId = input<unknown>(null);
  isLoading = input<boolean>(false);
  showPageSizeOptions = input<boolean>(false);
  pageSizeOptions = input<number[]>([5, 10, 20, 50]);
  showControls = input<boolean>(true);

  // Models
  currentPage = model<number>(1);
  pageSize = model<number>(5);
  sortColumn = model<string | null>(null);
  sortDirection = model<'asc' | 'desc'>('asc');

  // Outputs
  @Output() rowClick = new EventEmitter<T>();
  @Output() sortChange = new EventEmitter<{ column: string; direction: 'asc' | 'desc' }>();

  Math = Math;
  filterText = signal<string>('');

  _data = computed(() => {
    let rawData = this.data() || [];
    const colsList = this.cols() || [];
    const term = this.filterText();

    if (term) {
      const normalizedTerm = this.normalizeString(term);
      rawData = rawData.filter(row => {
        const checkValue = (val: any): boolean => {
          if (val === null || val === undefined) return false;
          if (typeof val === 'object') {
            if (val instanceof Date) {
              return this.normalizeString(val.toLocaleDateString()).includes(normalizedTerm);
            }
            return Object.values(val).some(v => checkValue(v));
          }
          return this.normalizeString(val).includes(normalizedTerm);
        };
        return Object.values(row as any).some(v => checkValue(v));
      });
    }

    let colKey = this.sortColumn();
    const dir = this.sortDirection();

    if (!colKey && colsList.length > 0) {
      const firstSortable = colsList.find(c => this.isColSortable(c));
      if (firstSortable) {
        colKey = this.getColSortKey(firstSortable);
      }
    }

    if (colKey) {
      const targetCol = colsList.find(c => this.getColSortKey(c) === colKey || c.key === colKey || c.header === colKey);
      const sortKey = (targetCol?.sortKey || targetCol?.key || colKey);
      rawData = [...rawData].sort((a, b) => {
        if (targetCol?.sortFn) {
          const res = targetCol.sortFn(a, b);
          return dir === 'asc' ? res : -res;
        }

        const extractValue = (row: any, key: any, col?: TableColumn<T>): any => {
          let val = this.getCellValue(row, key);
          if (val !== null && val !== undefined && val !== '') return val;
          const r = row as any;
          if (col?.header) {
            const hVal = this.getCellValue(row, col.header);
            if (hVal !== null && hVal !== undefined && hVal !== '') return hVal;
          }
          const pNome = (r['primeiroNome'] || r['nome'] || r['nomeCompleto'] || r['usuarioNome'] || r['clienteNome'] || r['profissionalNome'] || '');
          const sNome = (r['sobrenome'] || '');
          const fullName = `${pNome} ${sNome}`.trim();
          if (fullName) return fullName;
          if (r['titulo']) return r['titulo'];
          if (r['nomeServico']) return r['nomeServico'];
          if (r['nomePlano']) return r['nomePlano'];
          if (r['descricao']) return r['descricao'];
          if (r['celular']) return r['celular'];
          if (r['status']) return r['status'];
          return val;
        };

        const valA = extractValue(a, sortKey, targetCol);
        const valB = extractValue(b, sortKey, targetCol);

        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === 'string' && typeof valB === 'string') {
          const res = valA.localeCompare(valB, 'pt-BR', { sensitivity: 'base' });
          return dir === 'asc' ? res : -res;
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
          return dir === 'asc' ? valA - valB : valB - valA;
        }
        const strA = String(valA);
        const strB = String(valB);
        const res = strA.localeCompare(strB, 'pt-BR', { sensitivity: 'base' });
        return dir === 'asc' ? res : -res;
      });
    }

    return rawData;
  });

  paginatedData = computed(() => {
    const data = this._data();
    if (!this.paginated()) return data;
    const start = (this.currentPage() - 1) * this.pageSize();
    return data.slice(start, start + this.pageSize());
  });

  totalPages = computed(() => Math.ceil(this._data().length / this.pageSize()));

  pages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pagesList: (string | number)[] = [];
    if (total <= 5) {
      for (let i = 1; i <= total; i++) pagesList.push(i);
    } else {
      pagesList.push(1);
      if (current > 3) pagesList.push('...');
      let start = Math.max(2, current - 1);
      let end = Math.min(total - 1, current + 1);
      if (current <= 3) end = 4;
      if (current >= total - 2) start = total - 3;
      for (let i = start; i <= end; i++) pagesList.push(i);
      if (current < total - 2) pagesList.push('...');
      pagesList.push(total);
    }
    return pagesList;
  });

  getColSortKey(col: TableColumn<T>): string | null {
    if (col.sortable === false) return null;
    return (col.sortKey || col.key || col.header) as string;
  }

  isColSortable(col: TableColumn<T>): boolean {
    return col.sortable !== false;
  }

  getActiveSortColKey(): string | null {
    const colKey = this.sortColumn();
    if (colKey) return colKey;
    const colsList = this.cols() || [];
    if (colsList.length > 0) {
      const firstSortable = colsList.find(c => this.isColSortable(c));
      if (firstSortable) {
        return this.getColSortKey(firstSortable);
      }
    }
    return null;
  }

  onHeaderClick(col: TableColumn<T>): void {
    if (!this.isColSortable(col)) return;
    const colKey = this.getColSortKey(col);
    if (!colKey) return;
    const currentActiveColKey = this.getActiveSortColKey();
    let newDir: 'asc' | 'desc' = 'asc';
    if (currentActiveColKey === colKey) {
      newDir = this.sortDirection() === 'asc' ? 'desc' : 'asc';
      this.sortDirection.set(newDir);
    } else {
      this.sortColumn.set(colKey);
      this.sortDirection.set('asc');
    }
    this.currentPage.set(1);
    this.sortChange.emit({ column: colKey, direction: newDir });
  }

  setPage(page: number | string): void {
    if (typeof page === 'number') {
      this.currentPage.set(page);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  onRowClick(row: T): void {
    this.rowClick.emit(row);
  }

  getCellValue(row: any, key: keyof T | string): any {
    if (typeof key === 'string' && key.includes('.')) {
      const parts = key.split('.');
      let current = row;
      for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
          current = current[part];
        } else {
          return undefined;
        }
      }
      return current;
    }
    return row ? row[key] : undefined;
  }

  onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newSize = Number(select.value);
    this.pageSize.set(newSize);
    this.currentPage.set(1);
  }

  onSearchInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.filterText.set(input.value || '');
    this.currentPage.set(1);
  }

  private normalizeString(val: any): string {
    if (val === null || val === undefined) return '';
    return String(val)
      .normalize('NFD')
      .replace(/[\\u0300-\\u036f]/g, '')
      .toLowerCase()
      .replace(/\\s+/g, '');
  }
}
