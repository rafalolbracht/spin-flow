import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';
import type { PrimeNG } from 'primeng/config';

/**
 * PrimeNG Theme Configuration
 *
 * Defines the Green preset for PrimeNG components.
 * This configuration is used across all pages to ensure consistent theming.
 */
export const PrimeNGPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{green.50}',
      100: '{green.100}',
      200: '{green.200}',
      300: '{green.300}',
      400: '{green.400}',
      500: '{green.500}',
      600: '{green.600}',
      700: '{green.700}',
      800: '{green.800}',
      900: '{green.900}',
      950: '{green.950}',
    },
  },
});

/**
 * PrimeNG Theme Options
 *
 * Configures dark mode selector to sync with Tailwind CSS.
 */
export const PrimeNGOptions = {
  darkModeSelector: '.dark',
};

export function initPrimeNGTheme(primeNG: PrimeNG): void {
  primeNG.theme.set({
    preset: PrimeNGPreset,
    options: PrimeNGOptions,
  });
}

