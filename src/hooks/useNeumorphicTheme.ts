import { useMemo } from 'react';
import { useTheme, Theme } from '../context/ThemeContext';

export interface NeumorphicThemeStyles {
  bg: string;             // Root container background
  card: string;           // Neumorphic element base background
  text: string;           // Primary text
  textMuted: string;      // Muted description text
  accent: string;         // Theme-focused highlight color (sky, pink, etc.)
  border: string;         // Fine border surrounding elements (Neumorphic finish)
  shadowOuter: string;    // Outer embossed Neumorphic shadow list
  shadowInner: string;    // Deep sunken/well Neumorphic shadow list
  flatBg: string;         // Smooth linear gradient background for normal states
  convexBg: string;       // Convex light-wash background
  concaveBg: string;      // Concave light-wash background
  shadowButton: string;   // Lightweight soft shadow for smaller buttons
  borderMuted: string;    // Subtle border for secondary grids
  cardInnerShadow: string; // Inner card shadow when sunken
  badgeBg: string;        // Soft badge backgrounds
  badgeBorder: string;    // Soft badge borders
}

export function useNeumorphicTheme(): NeumorphicThemeStyles {
  const { theme } = useTheme();

  return useMemo<NeumorphicThemeStyles>(() => {
    switch (theme) {
      case 'light':
        return {
          bg: '#e6ebf4',
          card: '#edf2fc',
          text: '#2c3e50',
          textMuted: '#7f8c8d',
          accent: '#3b82f6',
          border: '1px solid rgba(255, 255, 255, 0.75)',
          shadowOuter: '8px 8px 16px #c8d0dc, -8px -8px 16px #ffffff',
          shadowInner: 'inset 4px 4px 8px #cbd5e1, inset -4px -4px 8px #ffffff',
          flatBg: 'linear-gradient(135deg, #edf2fc, #dee4ed)',
          convexBg: 'linear-gradient(135deg, #f2f7fc, #dae0e9)',
          concaveBg: 'linear-gradient(135deg, #dae0e9, #f2f7fc)',
          shadowButton: '3px 3px 6px #cbd5e1, -3px -3px 6px #ffffff',
          borderMuted: 'rgba(0, 0, 0, 0.04)',
          cardInnerShadow: 'inset 2px 2px 5px rgba(0, 0, 0, 0.02)',
          badgeBg: 'rgba(59, 130, 246, 0.08)',
          badgeBorder: 'rgba(59, 130, 246, 0.2)',
        };
      case 'dark':
        return {
          bg: '#0b1329',
          card: '#0d162d',
          text: '#f1f5f9',
          textMuted: '#94a3b8',
          accent: '#818cf8',
          border: '1px solid rgba(255, 255, 255, 0.04)',
          shadowOuter: '9px 9px 18px #040812, -9px -9px 18px #121e40',
          shadowInner: 'inset 4px 4px 8px #040812, inset -4px -4px 8px #121e40',
          flatBg: 'linear-gradient(135deg, #0d162d, #080d1e)',
          convexBg: 'linear-gradient(135deg, #0f1c3a, #060a16)',
          concaveBg: 'linear-gradient(135deg, #060a16, #0f1c3a)',
          shadowButton: '3px 3px 6px #040812, -3px -3px 6px #121e40',
          borderMuted: 'rgba(255, 255, 255, 0.05)',
          cardInnerShadow: 'inset 2px 2px 5px rgba(0, 0, 0, 0.25)',
          badgeBg: 'rgba(129, 140, 248, 0.08)',
          badgeBorder: 'rgba(129, 140, 248, 0.2)',
        };
      case 'pastel':
        return {
          bg: '#e8e2d5',
          card: '#f3ede2',
          text: '#2c1810',
          textMuted: '#7a6a60',
          accent: '#bf7575',
          border: '1px solid rgba(255, 255, 255, 0.75)',
          shadowOuter: '9px 9px 18px #cbc3b2, -9px -9px 18px #ffffff',
          shadowInner: 'inset 4px 4px 8px #cbc3b2, inset -4px -4px 8px #ffffff',
          flatBg: 'linear-gradient(135deg, #f3ede2, #ddd6c8)',
          convexBg: 'linear-gradient(135deg, #f9f4ea, #d5cebf)',
          concaveBg: 'linear-gradient(135deg, #d5cebf, #f9f4ea)',
          shadowButton: '3px 3px 6px #cbc3b2, -3px -3px 6px #ffffff',
          borderMuted: 'rgba(44, 24, 16, 0.04)',
          cardInnerShadow: 'inset 2px 2px 5px rgba(44, 24, 16, 0.02)',
          badgeBg: 'rgba(191, 117, 117, 0.08)',
          badgeBorder: 'rgba(191, 117, 117, 0.2)',
        };
      case 'clay':
        return {
          bg: '#debca3',
          card: '#ebd0bc',
          text: '#35251c',
          textMuted: '#7c6353',
          accent: '#cf5c36',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          shadowOuter: '9px 9px 18px #be967a, -9px -9px 18px #fadec4',
          shadowInner: 'inset 4px 4px 8px #be967a, inset -4px -4px 8px #fadec4',
          flatBg: 'linear-gradient(135deg, #ebd0bc, #cca78d)',
          convexBg: 'linear-gradient(135deg, #f0d6c4, #c7a186)',
          concaveBg: 'linear-gradient(135deg, #c7a186, #f0d6c4)',
          shadowButton: '3px 3px 6px #be967a, -3px -3px 6px #fadec4',
          borderMuted: 'rgba(53, 37, 28, 0.05)',
          cardInnerShadow: 'inset 2px 2px 5px rgba(53, 37, 28, 0.04)',
          badgeBg: 'rgba(207, 92, 54, 0.08)',
          badgeBorder: 'rgba(207, 92, 54, 0.2)',
        };
      default:
        // Dynamic fallback CSS custom property-driven styles
        return {
          bg: 'var(--theme-bg, #0b1329)',
          card: 'var(--theme-bg, #0d162d)',
          text: 'var(--theme-text, #f1f5f9)',
          textMuted: 'var(--theme-muted, #94a3b8)',
          accent: 'var(--theme-accent, #818cf8)',
          border: 'var(--neu-border, 1px solid rgba(255,255,255,0.05))',
          shadowOuter: '8px 8px 16px var(--neu-shadow-dark, rgba(0,0,0,0.55)), -8px -8px 16px var(--neu-shadow-light, rgba(255,255,255,0.05))',
          shadowInner: 'inset 4px 4px 8px var(--neu-shadow-dark, rgba(0,0,0,0.55)), inset -4px -4px 8px var(--neu-shadow-light, rgba(255,255,255,0.05))',
          flatBg: 'var(--neu-flat-bg, var(--theme-bg, #0d162d))',
          convexBg: 'var(--neu-convex-bg, var(--theme-bg, #0f1c3a))',
          concaveBg: 'var(--neu-concave-bg, var(--theme-bg, #060a16))',
          shadowButton: '3px 3px 6px var(--neu-shadow-dark, rgba(0,0,0,0.5)), -3px -3px 6px var(--neu-shadow-light, rgba(255,255,255,0.05))',
          borderMuted: 'var(--neu-border, rgba(255,255,255,0.05))',
          cardInnerShadow: 'inset 2px 2px 5px rgba(0,0,0,0.15)',
          badgeBg: 'var(--theme-bg, #0d162d)',
          badgeBorder: 'var(--neu-border, rgba(255,255,255,0.15))',
        };
    }
  }, [theme]);
}
