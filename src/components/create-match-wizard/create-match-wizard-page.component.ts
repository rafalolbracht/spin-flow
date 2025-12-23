import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

// PrimeNG Modules
import { StepperModule } from 'primeng/stepper';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService, ConfirmationService } from 'primeng/api';

// Shared Components
import { AppLayoutComponent } from '@/components/shared/app-layout/app-layout.component';

// Types
import type {
  CreateMatchCommandDto,
  CreateMatchResponse,
  SideEnum,
} from '@/types';

/**
 * Opcja dla dropdownu liczby setów
 */
interface MaxSetsOption {
  label: string;
  value: number;
}

/**
 * CreateMatchWizardPageComponent
 *
 * Główny standalone komponent wizarda tworzenia meczu.
 * Implementuje kompletny przepływ tworzenia meczu z wykorzystaniem PrimeNG Stepper.
 * Zarządza formularzami reaktywnymi, walidacją i komunikacją z API.
 * Zawiera AppLayoutComponent jako współdzielony element nawigacji.
 */
@Component({
  selector: 'app-create-match-wizard-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AppLayoutComponent,
    StepperModule,
    ButtonModule,
    InputTextModule,
    FloatLabelModule,
    SelectModule,
    ToggleSwitchModule,
    CardModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './create-match-wizard-page.component.html',
  styleUrl: './create-match-wizard-page.component.css',
})
export class CreateMatchWizardPageComponent {
  /**
   * Providery dla klienta Astro (analogjs pattern)
   * W architekturze Astro+Angular musimy dostarczyć serwisy na poziomie root komponentu
   */
  static clientProviders = [
    ...AppLayoutComponent.clientProviders,
    MessageService,
    ConfirmationService,
  ];

  // Injected Services
  private readonly http = inject(HttpClient);

  // Dane użytkownika (w przyszłości z AuthService)
  readonly userName = signal<string | undefined>('Jan Kowalski');
  readonly userInitials = signal<string | undefined>('JK');

  // Stan wizarda
  readonly activeStep = signal<number>(1);
  readonly isSubmitting = signal<boolean>(false);

  // Opcje dla dropdownu liczby setów
  readonly maxSetsOptions: MaxSetsOption[] = [
    { label: '1 set', value: 1 },
    { label: '3 sety', value: 3 },
    { label: '5 setów', value: 5 },
    { label: '7 setów', value: 7 },
  ];

  // Formularz reaktywny
  readonly form = new FormGroup({
    // Krok 1 - Nazwy zawodników
    player_name: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(200)],
    }),
    opponent_name: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(200)],
    }),
    // Krok 2 - Pierwszy serwujący
    first_server_first_set: new FormControl<SideEnum | null>(null, {
      validators: [Validators.required],
    }),
    // Krok 3 - Opcje zaawansowane
    max_sets: new FormControl<number>(5, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    golden_set_enabled: new FormControl<boolean>(false, {
      nonNullable: true,
    }),
    generate_ai_summary: new FormControl<boolean>(true, {
      nonNullable: true,
    }),
  });

  /**
   * Wybór serwującego - ustawia wartość w formularzu
   */
  selectServer(side: SideEnum): void {
    this.form.controls.first_server_first_set.setValue(side);
    this.form.controls.first_server_first_set.markAsTouched();
  }

  /**
   * Sprawdza walidację kroku 1 (nazwy zawodników)
   */
  isStep1Valid(): boolean {
    const playerName = this.form.get('player_name');
    const opponentName = this.form.get('opponent_name');
    return (playerName?.valid ?? false) && (opponentName?.valid ?? false);
  }

  /**
   * Sprawdza walidację kroku 2 (serwujący)
   */
  isStep2Valid(): boolean {
    const firstServer = this.form.get('first_server_first_set');
    return firstServer?.valid ?? false;
  }

  /**
   * Sprawdza walidację kroku 3 (opcje)
   * Zawsze true dzięki wartościom domyślnym
   */
  isStep3Valid(): boolean {
    return true;
  }

  /**
   * Przejście do następnego kroku z walidacją
   */
  goToNextStep(currentStep: number, activateCallback: (step: number) => void): void {
    if (currentStep === 1 && this.isStep1Valid()) {
      this.markStep1AsTouched();
      activateCallback(2);
    } else if (currentStep === 2 && this.isStep2Valid()) {
      activateCallback(3);
    } else {
      // Pokaż błędy walidacji
      this.markCurrentStepAsTouched(currentStep);
    }
  }

  /**
   * Powrót do poprzedniego kroku
   */
  goToPreviousStep(activateCallback: (step: number) => void, targetStep: number): void {
    activateCallback(targetStep);
  }

  /**
   * Oznacza pola kroku 1 jako touched
   */
  private markStep1AsTouched(): void {
    this.form.get('player_name')?.markAsTouched();
    this.form.get('opponent_name')?.markAsTouched();
  }

  /**
   * Oznacza pola bieżącego kroku jako touched
   */
  private markCurrentStepAsTouched(step: number): void {
    if (step === 1) {
      this.markStep1AsTouched();
    } else if (step === 2) {
      this.form.get('first_server_first_set')?.markAsTouched();
    }
  }

  /**
   * Mapuje formularz na DTO
   * Metoda wywoływana tylko gdy formularz jest valid, więc first_server_first_set nie jest null
   */
  private getCommandDto(): CreateMatchCommandDto {
    const formValue = this.form.getRawValue();
    return {
      player_name: formValue.player_name.trim(),
      opponent_name: formValue.opponent_name.trim(),
      max_sets: formValue.max_sets,
      golden_set_enabled: formValue.golden_set_enabled,
      first_server_first_set: formValue.first_server_first_set as SideEnum,
      generate_ai_summary: formValue.generate_ai_summary,
    };
  }

  /**
   * Wysłanie formularza do API
   */
  onSubmit(): void {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    const command = this.getCommandDto();

    this.http.post<CreateMatchResponse>('/api/matches/create', command).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        // Przekierowanie do widoku meczu live
        if (typeof window !== 'undefined') {
          window.location.href = `/matches/${response.data.id}/live`;
        }
      },
      error: () => {
        // Błędy są obsługiwane przez httpErrorInterceptor
        this.isSubmitting.set(false);
      },
    });
  }

  /**
   * Pomocnicza metoda do sprawdzania błędów pól
   */
  hasError(controlName: string, errorType: string): boolean {
    const control = this.form.get(controlName);
    return (control?.hasError(errorType) && control?.touched) ?? false;
  }

  /**
   * Pomocnicza metoda do sprawdzania czy pole jest nieprawidłowe
   */
  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return (control?.invalid && control?.touched) ?? false;
  }
}

