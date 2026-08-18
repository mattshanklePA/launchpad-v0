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
        // `border`/`foreground` DEFAULTs are unchanged (still the shadcn
        // --border/--foreground HSL tokens); `subtle`/`strong`/`faint` are
        // additive — direct Tailwind handles for the Keystone DS's own
        // --border-subtle/--border-strong/--text-faint hairline tokens
        // (app/styles/keystone/colors.css), which raw hex resolve rather
        // than HSL so they're referenced without the hsl() wrapper. RD-0
        // (issue #201) adds these for the shell top bar; later RD issues
        // reuse them (`border-border-subtle`, `text-foreground-faint`).
        border: {
          DEFAULT: "hsl(var(--border))",
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)",
        },
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: {
          DEFAULT: "hsl(var(--foreground))",
          faint: "var(--text-faint)",
        },
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
        // Keystone status vocabulary (.claude/skills/tokens/colors.css's
        // --status-* aliases / .claude/skills/components/core/StatusPill) —
        // exactly four states, the DS's deliberate governance-status
        // language. Each carries a light `subtle` fill + a darkened
        // `foreground` text color so badges clear 4.5:1 text contrast
        // (the raw on-track green and amber tokens don't, against a light
        // fill, at ~3.3:1 — attention reuses the DS's own
        // --ks-amber-dark "amber text on light" token; healthy's dark
        // shade is derived the same way, same hue/saturation, lower
        // lightness). Drives lib/reviewWorkflow.ts, lib/riskProfile.ts, and
        // lib/nistRmf.ts's badge-class helpers (lib/statusTokens.ts).
        healthy: {
          DEFAULT: "#2E9E7B", // --status-healthy (--ks-on-track)
          foreground: "#1F6B53",
          subtle: "#E6F4F0",
        },
        attention: {
          DEFAULT: "#C77D3A", // --status-attention (--ks-amber)
          foreground: "#9C5F22", // --ks-amber-dark ("amber text on light")
          subtle: "#F4EDE6",
        },
        alert: {
          DEFAULT: "#C24A3A", // --status-alert (--ks-alert)
          foreground: "#C24A3A", // clears 4.5:1 on white/subtle as-is
          subtle: "#F4E8E6",
        },
        neutral: {
          DEFAULT: "#6C7680", // --status-neutral (--ks-ink-500)
          foreground: "#4A545E", // --ks-ink-700
          subtle: "#E7E1D6", // --ks-limestone
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        // The shadcn Sidebar primitive's (components/ui/sidebar.tsx) own color
        // slot — `bg-sidebar`/`border-sidebar-border`/`bg-sidebar-accent` etc.
        // — was never registered here, so those utility classes silently
        // generated no CSS and the console's left rail fell back to
        // unstyled/inherited colors instead of the fixed basalt rail Shell.jsx
        // (.claude/skills/ui_kits/keystone-app/) specifies. The CSS custom
        // properties themselves (app/globals.css) are repointed at the
        // Keystone basalt/chalk/active-blue tokens; this just wires them up.
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: {
            DEFAULT: "hsl(var(--sidebar-primary))",
            foreground: "hsl(var(--sidebar-primary-foreground))",
          },
          accent: {
            DEFAULT: "hsl(var(--sidebar-accent))",
            foreground: "hsl(var(--sidebar-accent-foreground))",
          },
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
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
        // Keystone brand palette (.claude/skills/tokens/colors.css's
        // --ks-* base palette) — literal brand hex values for non-text/
        // decorative uses (marks, large fills, chart accents). Semantic
        // tokens above (primary/secondary/destructive/healthy/attention/
        // alert/neutral) carry the same palette, adjusted where needed for
        // 508 text contrast. Supersedes the earlier brand/keystone/
        // tokens.json-driven pass; that asset kit's SVG marks are still the
        // active source for logo/favicon assets (public/keystone/), only
        // its color/type token wiring is superseded.
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
        // Keystone base type system (.claude/skills/tokens/typography.css):
        // Hanken Grotesk (body/UI), Chivo (headings/wordmark), JetBrains
        // Mono (mono/labels). Self-hosted via next/font in app/layout.tsx —
        // no runtime font CDN. Tenants can still override per-surface via
        // className.
        sans: ["var(--font-hanken)", "system-ui", "sans-serif"],
        heading: ["var(--font-chivo)", "var(--font-hanken)", "sans-serif"],
        wordmark: ["var(--font-chivo)", "Archivo", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
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
      // Keystone shadows (.claude/skills/tokens/effects.css) — soft, low,
      // basalt-tinted; overriding Tailwind's own sm/md/lg/xl keys means
      // every existing `shadow-sm`/`shadow-md`/etc. usage picks these up
      // automatically. Keystone leans on hairline borders over shadow, so
      // these stay subtle.
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-lg)",
        focus: "var(--shadow-focus)",
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
