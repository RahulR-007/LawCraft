import { extendTheme } from '@chakra-ui/react'

const theme = extendTheme({
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
  fonts: {
    heading: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    body: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  styles: {
    global: (props: any) => ({
      body: {
        bg: props.colorMode === 'dark' ? '#08090d' : '#f8f9fd',
        color: props.colorMode === 'dark' ? '#f1f5f9' : '#0f172a',
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
        overflowX: 'hidden',
      },
    }),
  },
  colors: {
    brand: {
      50: '#f5e6ff',
      100: '#e1b3ff',
      200: '#cc80ff',
      300: '#b84dff',
      400: '#a31aff',
      500: '#970fff', // Primary vibrant purple
      600: '#7817ff',
      700: '#5a0bd9',
      800: '#3d08a3',
      900: '#1f046d',
    },
    accent: {
      cyan: '#00f2fe',
      emerald: '#10b981',
      amber: '#f59e0b',
      rose: '#f43f5e',
    },
    dark: {
      900: '#08090d',
      800: '#0d0f17',
      700: '#131622',
      600: '#1a1e2e',
      500: '#252a3e',
    },
    surface: {
      glassDark: 'rgba(13, 15, 23, 0.75)',
      glassLight: 'rgba(255, 255, 255, 0.75)',
      borderDark: 'rgba(255, 255, 255, 0.1)',
      borderLight: 'rgba(0, 0, 0, 0.08)',
      glow: 'rgba(151, 15, 255, 0.25)',
    },
  },
  shadows: {
    glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    glow: '0 0 25px rgba(151, 15, 255, 0.4)',
    glowStrong: '0 0 40px rgba(151, 15, 255, 0.6)',
    cardHover: '0 20px 40px -15px rgba(151, 15, 255, 0.25)',
  },
  radii: {
    '4xl': '2rem',
    '5xl': '2.5rem',
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: '600',
        borderRadius: 'xl',
        letterSpacing: '0.01em',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        _active: {
          transform: 'scale(0.98)',
        },
      },
      variants: {
        solid: {
          bg: 'linear-gradient(135deg, #970fff 0%, #7817ff 100%)',
          color: 'white',
          boxShadow: '0 4px 15px rgba(151, 15, 255, 0.35)',
          _hover: {
            bg: 'linear-gradient(135deg, #a31aff 0%, #8928ff 100%)',
            boxShadow: '0 8px 25px rgba(151, 15, 255, 0.5)',
            transform: 'translateY(-2px)',
          },
        },
        outline: {
          borderColor: 'rgba(151, 15, 255, 0.5)',
          color: 'white',
          backdropFilter: 'blur(10px)',
          _hover: {
            bg: 'rgba(151, 15, 255, 0.12)',
            borderColor: '#970fff',
            boxShadow: '0 0 15px rgba(151, 15, 255, 0.25)',
            transform: 'translateY(-2px)',
          },
        },
        glass: {
          bg: 'rgba(255, 255, 255, 0.05)',
          color: 'white',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(16px)',
          _hover: {
            bg: 'rgba(255, 255, 255, 0.1)',
            borderColor: 'rgba(151, 15, 255, 0.4)',
            transform: 'translateY(-2px)',
          },
        },
        ghost: {
          _hover: {
            bg: 'rgba(151, 15, 255, 0.12)',
            color: 'white',
          },
        },
      },
    },
    Input: {
      variants: {
        outline: {
          field: {
            bg: 'rgba(13, 15, 23, 0.6)',
            borderColor: 'rgba(255, 255, 255, 0.12)',
            borderRadius: 'xl',
            backdropFilter: 'blur(12px)',
            color: 'white',
            _placeholder: {
              color: 'gray.500',
            },
            _hover: {
              borderColor: 'rgba(151, 15, 255, 0.4)',
            },
            _focus: {
              borderColor: '#970fff',
              boxShadow: '0 0 0 1px #970fff, 0 0 15px rgba(151, 15, 255, 0.3)',
            },
          },
        },
      },
    },
    Textarea: {
      variants: {
        outline: {
          bg: 'rgba(13, 15, 23, 0.6)',
          borderColor: 'rgba(255, 255, 255, 0.12)',
          borderRadius: 'xl',
          backdropFilter: 'blur(12px)',
          color: 'white',
          _placeholder: {
            color: 'gray.500',
          },
          _hover: {
            borderColor: 'rgba(151, 15, 255, 0.4)',
          },
          _focus: {
            borderColor: '#970fff',
            boxShadow: '0 0 0 1px #970fff, 0 0 15px rgba(151, 15, 255, 0.3)',
          },
        },
      },
    },
    Select: {
      variants: {
        outline: {
          field: {
            bg: 'rgba(13, 15, 23, 0.6)',
            borderColor: 'rgba(255, 255, 255, 0.12)',
            borderRadius: 'xl',
            backdropFilter: 'blur(12px)',
            color: 'white',
            _hover: {
              borderColor: 'rgba(151, 15, 255, 0.4)',
            },
            _focus: {
              borderColor: '#970fff',
              boxShadow: '0 0 0 1px #970fff',
            },
          },
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: 'rgba(13, 15, 23, 0.75)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '2xl',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
    },
  },
})

export default theme

