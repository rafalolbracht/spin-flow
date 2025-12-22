/**
 * Types for Landing Page components
 */

export interface FeatureCardData {
  icon: string; // PrimeIcons class (np. 'pi pi-stopwatch')
  iconBgClass: string; // Background class (np. 'bg-blue-100')
  iconColorClass: string; // Color class (np. 'text-blue-600')
  title: string;
  description: string;
}

export interface MiniFeature {
  icon: string;
  text: string;
}

export interface HeroConfig {
  badge: string;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  miniFeatures: MiniFeature[];
  appScreenshotUrl: string;
  appScreenshotAlt: string;
}
