// SmartBudget/constants/theme.ts
export const Colors = {
  light: {
    // Base colors
    background: '#F8FAFC',
    card: '#FFFFFF',
    text: '#0F172A',
    subtext: '#64748B',
    border: '#E2E8F0',
    
    // Premium gradients - CHANGED TO BLUE
    primaryGradient: ['#3B82F6', '#2563EB', '#1D4ED8'] as const, // Blue gradient
    successGradient: ['#10B981', '#059669'] as const,
    dangerGradient: ['#EF4444', '#DC2626'] as const,
    warningGradient: ['#F59E0B', '#D97706'] as const,
    infoGradient: ['#0EA5E9', '#3B82F6'] as const,
    
    // Glass morphism
    glassBackground: 'rgba(255, 255, 255, 0.7)',
    glassBorder: 'rgba(255, 255, 255, 0.2)',
    
    // Shadows - UPDATED TO BLUE
    shadow: {
      small: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      },
      medium: {
        shadowColor: '#3B82F6', // Blue shadow
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 5,
      },
      large: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
        elevation: 8,
      }
    },
    
    // Category colors - UPDATED SOME TO BLUE THEME
    categories: {
      Food: { color: '#F59E0B', gradient: ['#F59E0B', '#F97316'] as const },
      Travel: { color: '#0EA5E9', gradient: ['#0EA5E9', '#3B82F6'] as const },
      Shopping: { color: '#EC4899', gradient: ['#EC4899', '#F97316'] as const },
      Bills: { color: '#3B82F6', gradient: ['#3B82F6', '#2563EB'] as const }, // Blue
      Entertainment: { color: '#8B5CF6', gradient: ['#8B5CF6', '#7C3AED'] as const },
      Other: { color: '#64748B', gradient: ['#64748B', '#475569'] as const },
    },
    
    tint: '#3B82F6', // CHANGED TO BLUE
  },
  
  dark: {
    // Base colors
    background: '#0F172A',
    card: '#1E293B',
    text: '#F1F5F9',
    subtext: '#94A3B8',
    border: '#334155',
    
    // Premium gradients - CHANGED TO BLUE
    primaryGradient: ['#2563EB', '#1D4ED8', '#1E40AF'] as const, // Darker blue gradient
    successGradient: ['#10B981', '#059669'] as const,
    dangerGradient: ['#EF4444', '#DC2626'] as const,
    warningGradient: ['#F59E0B', '#D97706'] as const,
    infoGradient: ['#0EA5E9', '#3B82F6'] as const,
    
    // Glass morphism
    glassBackground: 'rgba(30, 41, 59, 0.7)',
    glassBorder: 'rgba(148, 163, 184, 0.1)',
    
    // Shadows - UPDATED TO BLUE
    shadow: {
      small: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 2,
      },
      medium: {
        shadowColor: '#2563EB', // Blue shadow
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 5,
      },
      large: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
        elevation: 8,
      }
    },
    
    // Category colors (updated to blue theme)
    categories: {
      Food: { color: '#F59E0B', gradient: ['#F59E0B', '#F97316'] as const },
      Travel: { color: '#0EA5E9', gradient: ['#0EA5E9', '#3B82F6'] as const },
      Shopping: { color: '#EC4899', gradient: ['#EC4899', '#F97316'] as const },
      Bills: { color: '#3B82F6', gradient: ['#3B82F6', '#2563EB'] as const }, // Blue
      Entertainment: { color: '#8B5CF6', gradient: ['#8B5CF6', '#7C3AED'] as const },
      Other: { color: '#64748B', gradient: ['#64748B', '#475569'] as const },
    },
    
    tint: '#60A5FA', // CHANGED TO LIGHT BLUE
  }
} as const;

export const AnimationPresets = {
  springy: {
    type: 'spring',
    damping: 15,
    stiffness: 120,
  },
  smooth: {
    type: 'timing',
    duration: 400,
  },
  quick: {
    type: 'timing',
    duration: 200,
  },
} as const;