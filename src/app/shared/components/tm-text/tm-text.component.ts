import { Component, Input, forwardRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, AbstractControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'tm-text',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TmTextComponent),
      multi: true
    }
  ],
  template: `
    <div class="tm-text-container w-100" [class.disabled]="disabled">
      @if (label) {
        <label class="form-label small fw-bold text-muted text-uppercase tracking-wider mb-2">
          {{ label }}
        </label>
      }
      <div
        class="input-wrapper d-flex align-items-center rounded-3 shadow-sm transition-all"
        [class.focused]="isFocused()"
        [class.invalid]="isInvalid()"
      >
        <input
          #inputEl
          [type]="type"
          [placeholder]="placeholder"
          [name]="name"
          [autocomplete]="autocomplete"
          [disabled]="disabled"
          [value]="internalValue()"
          (input)="onInputChange($event)"
          (focus)="onInputFocus()"
          (blur)="onInputBlur()"
          class="form-control border-0 bg-transparent text-light shadow-none"
        />
      </div>
      @if (isInvalid()) {
        <div class="invalid-feedback d-block mt-1">
          Campo obrigatório ou inválido.
        </div>
      }
    </div>
  `,
  styles: [`
    .tm-text-container {
      display: flex;
      flex-direction: column;
    }
    .form-label {
      color: #94a3b8 !important;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }
    .input-wrapper {
      background-color: #0f172a;
      border: 1px solid #334155;
      padding: 0.25rem 0.5rem;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .input-wrapper.focused {
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }
    .input-wrapper.invalid {
      border-color: #ef4444;
    }
    input {
      color: #f8fafc !important;
      font-size: 0.95rem;
    }
    input::placeholder {
      color: #64748b;
    }
  `]
})
export class TmTextComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() placeholder: string = '';
  @Input() name: string = '';
  @Input() type: string = 'text';
  @Input() autocomplete: string = 'off';
  @Input() control: AbstractControl | null = null;
  @Input() disabled: boolean = false;

  internalValue = signal<string>('');
  isFocused = signal<boolean>(false);

  onChange = (_: any) => {};
  onTouched = () => {};

  isInvalid = computed(() => {
    if (!this.control) return false;
    return this.control.invalid && (this.control.dirty || this.control.touched);
  });

  writeValue(val: any): void {
    this.internalValue.set(val ?? '');
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.internalValue.set(input.value);
    this.onChange(input.value);
  }

  onInputFocus(): void {
    if (this.disabled) return;
    this.isFocused.set(true);
  }

  onInputBlur(): void {
    this.isFocused.set(false);
    this.onTouched();
  }
}
