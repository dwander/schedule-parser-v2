/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        naver: {
          DEFAULT: "hsl(var(--naver-green))",
        },
        kakao: {
          DEFAULT: "hsl(var(--kakao-yellow))",
          foreground: "hsl(var(--kakao-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          border: "hsl(var(--warning-border))",
        },
        error: {
          DEFAULT: "hsl(var(--error))",
          foreground: "hsl(var(--error-foreground))",
          border: "hsl(var(--error-border))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        sm: "0 1px 2px 0 hsla(var(--shadow), var(--shadow-opacity))",
        DEFAULT: "0 1px 3px 0 hsla(var(--shadow), var(--shadow-opacity)), 0 1px 2px -1px hsla(var(--shadow), var(--shadow-opacity))",
        md: "0 4px 6px -1px hsla(var(--shadow), var(--shadow-opacity)), 0 2px 4px -2px hsla(var(--shadow), var(--shadow-opacity))",
        lg: "0 10px 15px -3px hsla(var(--shadow), var(--shadow-opacity)), 0 4px 6px -4px hsla(var(--shadow), var(--shadow-opacity))",
        xl: "0 20px 25px -5px hsla(var(--shadow), var(--shadow-opacity)), 0 8px 10px -6px hsla(var(--shadow), var(--shadow-opacity))",
        "2xl": "0 25px 50px -12px hsla(var(--shadow), var(--shadow-opacity))",
      },
    },
  },
  plugins: [],
}
