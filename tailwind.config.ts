import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	// Safelist to prevent purging of dynamically-used responsive classes
	safelist: [
		// Flex direction responsive variants
		'sm:flex-row', 'md:flex-row', 'lg:flex-row',
		'sm:flex-col', 'md:flex-col', 'lg:flex-col',
		// Grid responsive variants
		'sm:grid-cols-2', 'md:grid-cols-2', 'lg:grid-cols-2',
		'sm:grid-cols-3', 'md:grid-cols-3', 'lg:grid-cols-3',
		'sm:grid-cols-4', 'md:grid-cols-4', 'lg:grid-cols-4',
		// Display responsive variants
		'sm:flex', 'md:flex', 'lg:flex',
		'sm:grid', 'md:grid', 'lg:grid',
		'sm:block', 'md:block', 'lg:block',
		'sm:hidden', 'md:hidden', 'lg:hidden',
		// Dynamic spacing from useMobileOptimizations
		'p-4', 'p-6', 'space-y-4', 'space-y-6',
		'gap-4', 'gap-6', 'gap-8',
		// Common responsive gap variants
		'sm:gap-4', 'sm:gap-6', 'md:gap-6', 'md:gap-8', 'lg:gap-8',
		// Width responsive variants
		'sm:w-auto', 'md:w-auto', 'lg:w-auto',
		// Text alignment responsive
		'sm:text-left', 'md:text-left', 'lg:text-left',
		// Justify and align responsive
		'sm:justify-start', 'md:justify-start', 'lg:justify-start',
		'sm:items-start', 'md:items-center', 'lg:items-center',
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: {
				DEFAULT: '1rem',
				sm: '1.5rem',
				md: '2rem',
				lg: '3rem',
				xl: '4rem',
				'2xl': '6rem',
			},
			screens: {
				'xs': '475px',
				'sm': '640px',
				'md': '768px',
				'lg': '1024px',
				'xl': '1280px',
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				sans: ['Poppins', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
				heading: ['"DM Sans"', 'Poppins', 'system-ui', '-apple-system', 'sans-serif'],
				body: ['Poppins', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
				mono: ['"SF Mono"', '"Roboto Mono"', 'Consolas', 'monospace'],
			},
			screens: {
				'xs': '475px',
				'3xl': '1600px',
				'4xl': '1920px',
				// Touch-specific breakpoints
				'touch': { 'raw': '(hover: none)' },
				'no-touch': { 'raw': '(hover: hover)' },
				// Mobile-first breakpoints
				'mobile-sm': '320px',
				'mobile-md': '375px',
				'mobile-lg': '414px',
				'tablet-sm': '768px',
				'tablet-lg': '1024px',
			},
			spacing: {
				'18': '4.5rem',
				'88': '22rem',
				'112': '28rem',
				'128': '32rem',
				'144': '36rem',
				// Mobile-friendly spacing
				'safe-top': 'env(safe-area-inset-top)',
				'safe-bottom': 'env(safe-area-inset-bottom)',
				'safe-left': 'env(safe-area-inset-left)',
				'safe-right': 'env(safe-area-inset-right)',
			},
			fontSize: {
				'2xs': ['0.625rem', { lineHeight: '0.875rem' }],
				// Mobile-optimized font scales
				'mobile-xs': ['0.75rem', { lineHeight: '1rem' }],
				'mobile-sm': ['0.875rem', { lineHeight: '1.25rem' }],
				'mobile-base': ['1rem', { lineHeight: '1.5rem' }],
				'mobile-lg': ['1.125rem', { lineHeight: '1.75rem' }],
				'mobile-xl': ['1.25rem', { lineHeight: '1.75rem' }],
				'mobile-2xl': ['1.5rem', { lineHeight: '2rem' }],
				'mobile-3xl': ['1.875rem', { lineHeight: '2.25rem' }],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				dental: {
					primary: 'hsl(var(--dental-primary))',
					'primary-foreground': 'hsl(var(--dental-primary-foreground))',
					secondary: 'hsl(var(--dental-secondary))',
					'secondary-foreground': 'hsl(var(--dental-secondary-foreground))',
					accent: 'hsl(var(--dental-accent))',
					'accent-foreground': 'hsl(var(--dental-accent-foreground))',
					muted: 'hsl(var(--dental-muted))',
					'muted-foreground': 'hsl(var(--dental-muted-foreground))',
					surface: 'hsl(var(--dental-surface))',
					'surface-foreground': 'hsl(var(--dental-surface-foreground))',
					neutral: 'hsl(var(--dental-neutral))',
					'neutral-foreground': 'hsl(var(--dental-neutral-foreground))',
					success: 'hsl(var(--dental-success))',
					warning: 'hsl(var(--dental-warning))',
					error: 'hsl(var(--dental-error))',
					info: 'hsl(var(--dental-info))',
				},
				// Status colors with semantic tokens
				success: {
					100: 'hsl(var(--success-100))',
					300: 'hsl(var(--success-300))',
					600: 'hsl(var(--success-600))',
					800: 'hsl(var(--success-800))',
				},
				warning: {
					100: 'hsl(var(--warning-100))',
					300: 'hsl(var(--warning-300))',
					600: 'hsl(var(--warning-600))',
					800: 'hsl(var(--warning-800))',
				},
				danger: {
					100: 'hsl(var(--danger-100))',
					300: 'hsl(var(--danger-300))',
					600: 'hsl(var(--danger-600))',
					800: 'hsl(var(--danger-800))',
				},
				info: {
					100: 'hsl(var(--info-100))',
					300: 'hsl(var(--info-300))',
					600: 'hsl(var(--info-600))',
					800: 'hsl(var(--info-800))',
				}
			},
			backgroundImage: {
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-secondary': 'var(--gradient-secondary)',
				'gradient-accent': 'var(--gradient-accent)',
				'gradient-card': 'var(--gradient-card)',
				'gradient-hero': 'var(--gradient-hero)',
				'gradient-mesh': 'var(--gradient-mesh)',
				'gradient-glass': 'var(--gradient-glass)',
			},
			boxShadow: {
				'elegant': 'var(--shadow-elegant)',
				'glow': 'var(--shadow-glow)',
				'card': 'var(--shadow-card)',
				'float': 'var(--shadow-float)',
				'inner': 'var(--shadow-inner)',
				'glass': 'var(--shadow-glass)',
				'soft': 'var(--shadow-soft)',
				'medium': 'var(--shadow-medium)',
				'large': 'var(--shadow-large)',
			},
			borderRadius: {
				lg: 'var(--radius-lg)',
				md: 'var(--radius-md)',
				sm: 'var(--radius-sm)',
				xl: 'var(--radius-xl)',
				'2xl': 'var(--radius-2xl)',
				'4xl': '2rem',
				'5xl': '2.5rem',
				card: 'var(--radius-card)',
			},
			backdropBlur: {
				'4xl': '72px',
				'5xl': '96px',
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in': {
					'0%': {
						opacity: '0',
						transform: 'translateY(10px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'slide-in': {
					'0%': {
						opacity: '0',
						transform: 'translateX(-20px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateX(0)'
					}
				},
				'scale-in': {
					'0%': {
						opacity: '0',
						transform: 'scale(0.95)'
					},
					'100%': {
						opacity: '1',
						transform: 'scale(1)'
					}
				},
				'float': {
					'0%, 100%': {
						transform: 'translateY(0px)'
					},
					'50%': {
						transform: 'translateY(-8px)'
					}
				},
				'glow': {
					'0%, 100%': {
						boxShadow: '0 0 20px hsl(var(--dental-primary) / 0.1)'
					},
					'50%': {
						boxShadow: '0 0 40px hsl(var(--dental-primary) / 0.2)'
					}
				},
				// Mobile-specific animations
				'mobile-slide-up': {
					'0%': {
						opacity: '0',
						transform: 'translateY(20px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'mobile-scale': {
					'0%': {
						transform: 'scale(0.95)'
					},
					'100%': {
						transform: 'scale(1)'
					}
				},
				'bounce-gentle': {
					'0%, 100%': {
						transform: 'translateY(0)'
					},
					'50%': {
						transform: 'translateY(-4px)'
					}
				},
				'marquee': {
					'0%': { transform: 'translateX(0%)' },
					'100%': { transform: 'translateX(-100%)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.5s ease-out',
				'slide-in': 'slide-in 0.3s ease-out',
				'scale-in': 'scale-in 0.2s ease-out',
				'float': 'float 6s ease-in-out infinite',
				'glow': 'glow 3s ease-in-out infinite',
				'mobile-slide-up': 'mobile-slide-up 0.4s ease-out',
				'mobile-scale': 'mobile-scale 0.2s ease-out',
				'bounce-gentle': 'bounce-gentle 2s ease-in-out infinite',
				'marquee': 'marquee 10s linear infinite',
			},
			// Touch-friendly sizing
			minHeight: {
				'touch': '44px', // Minimum touch target size
				'screen-safe': 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
			},
			minWidth: {
				'touch': '44px',
			},
			// Mobile-first grid
			gridTemplateColumns: {
				'mobile': 'repeat(auto-fit, minmax(280px, 1fr))',
				'tablet': 'repeat(auto-fit, minmax(320px, 1fr))',
				'desktop': 'repeat(auto-fit, minmax(380px, 1fr))',
			}
		}
	},
	plugins: [tailwindcssAnimate],
} satisfies Config;
