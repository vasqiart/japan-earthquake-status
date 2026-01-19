/**
 * Common UI theme constants for consistent styling across LP and service pages
 */
export const UI_THEME = {
  // Colors
  ACCENT_RED_CLASS: 'bg-red-600/80',
  ACCENT_RED_TEXT: 'text-red-600/80',
  ACCENT_RED_BORDER: 'border-red-600/80',
  
  // Borders
  BORDER_CLASS: 'border-black/10',
  BORDER_SUBTLE: 'border-black/5',
  
  // Text colors
  TEXT_TITLE: 'text-black',
  TEXT_BODY: 'text-black/70',
  TEXT_MUTED: 'text-black/55',
  TEXT_SUBTLE: 'text-black/45',
  TEXT_DISABLED: 'text-black/35',
  
  // Backgrounds
  PAGE_BG: 'bg-white',
  CARD_BG: 'bg-white',
  CARD_BG_SUBTLE: 'bg-white/80',
  
  // Rounded corners
  ROUNDED_CARD: 'rounded-xl',
  ROUNDED_BUTTON: 'rounded-lg',
  ROUNDED_LARGE: 'rounded-2xl',
  
  // Shadows
  SHADOW_SUBTLE: 'shadow-[0_10px_30px_rgba(0,0,0,0.06)]',
} as const;
