// SmartBudget/constants/theme.ts
export const Colors = {
  light: {
    // Base colors
    background: '#F8FAFC',
    card: '#FFFFFF',
    text: '#0F172A',
    subtext: '#64748B',
    border: '#E2E8F0',
    
    // Premium gradients
    primaryGradient: ['#6366F1', '#8B5CF6', '#A855F7'],
    successGradient: ['#10B981', '#059669'],
    dangerGradient: ['#EF4444', '#DC2626'],
    warningGradient: ['#F59E0B', '#D97706'],
    infoGradient: ['#0EA5E9', '#3B82F6'],
    
    // Glass morphism
    glassBackground: 'rgba(255, 255, 255, 0.7)',
    glassBorder: 'rgba(255, 255, 255, 0.2)',
    
    // Shadows
    shadow: {
      small: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      },
      medium: {
        shadowColor: '#6366F1',
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
    
    // Category colors
    categories: {
      Food: { color: '#F59E0B', gradient: ['#F59E0B', '#EF4444'] },
      Travel: { color: '#0EA5E9', gradient: ['#0EA5E9', '#8B5CF6'] },
      Shopping: { color: '#EC4899', gradient: ['#EC4899', '#F97316'] },
      Bills: { color: '#8B5CF6', gradient: ['#8B5CF6', '#6366F1'] },
      Entertainment: { color: '#EF4444', gradient: ['#EF4444', '#EC4899'] },
      Other: { color: '#64748B', gradient: ['#64748B', '#475569'] },
    },
    
    tint: '#6366F1',
  },
  
  dark: {
    // Base colors
    background: '#0F172A',
    card: '#1E293B',
    text: '#F1F5F9',
    subtext: '#94A3B8',
    border: '#334155',
    
    // Premium gradients
    primaryGradient: ['#4F46E5', '#7C3AED', '#C084FC'],
    successGradient: ['#10B981', '#059669'],
    dangerGradient: ['#EF4444', '#DC2626'],
    warningGradient: ['#F59E0B', '#D97706'],
    infoGradient: ['#0EA5E9', '#3B82F6'],
    
    // Glass morphism
    glassBackground: 'rgba(30, 41, 59, 0.7)',
    glassBorder: 'rgba(148, 163, 184, 0.1)',
    
    // Shadows
    shadow: {
      small: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 2,
      },
      medium: {
        shadowColor: '#4F46E5',
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
    
    // Category colors (same as light)
    categories: {
      Food: { color: '#F59E0B', gradient: ['#F59E0B', '#EF4444'] },
      Travel: { color: '#0EA5E9', gradient: ['#0EA5E9', '#8B5CF6'] },
      Shopping: { color: '#EC4899', gradient: ['#EC4899', '#F97316'] },
      Bills: { color: '#8B5CF6', gradient: ['#8B5CF6', '#6366F1'] },
      Entertainment: { color: '#EF4444', gradient: ['#EF4444', '#EC4899'] },
      Other: { color: '#64748B', gradient: ['#64748B', '#475569'] },
    },
    
    tint: '#818CF8',
  }
};

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
};