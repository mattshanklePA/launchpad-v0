import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
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
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
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
        // Keystone brand palette (brand/keystone/tokens.json) — literal brand
        // hex values for non-text/decorative uses (marks, large fills, chart
        // accents). Semantic tokens above (primary/secondary/success/warning)
        // carry the same palette, adjusted where needed for 508 text contrast.
        keystone: {
          basalt: "#2A333C",
          activeBlue: "#0086CA",
          amber: "#C77D3A",
          amberLight: "#DCA061",
          amberDark: "#9C5F22",
          onTrack: "#2E9E7B",
          alert: "#C24A3A",
          limestone: "#E7E1D6",
          chalk: "#F4F2EC",
        },
        uspto: {
          blue: {
            primary: "#355E93",
            secondary: "#254267",
          },
          red: "#C10230",
          gray: {
            text: "#333333",
          },
        },
        dow: {
          blue: "#355E93",
          ocean: "#254267",
          space: "#15263B",
          steel: "#AEBFD4",
          hazy: "#EBEFF5",
          gold: "#FFCD00",
          "gold-shade": "#B5853C",
          gray: "#333333",
        },
      },
      fontFamily: {
        // Keystone base type system (brand/keystone/README.md): Hanken Grotesk
        // (body/UI), Chivo (headings/wordmark). Self-hosted via next/font in
        // app/layout.tsx. Tenants can still override per-surface via className.
        sans: ["var(--font-hanken)", "system-ui", "sans-serif"],
        heading: ["var(--font-chivo)", "var(--font-hanken)", "sans-serif"],
        wordmark: ["var(--font-chivo)", "Archivo", "system-ui", "sans-serif"],
        // Public landing typography system (docs/landing-page-conversion-audit-2026-07-15.md).
        // Scoped to components/landing/public-landing.tsx — not used elsewhere in the app,
        // so the app-wide brand tokens above (sans/heading/wordmark) are unaffected.
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        body: ["var(--font-public-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
