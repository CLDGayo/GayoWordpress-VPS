# CLAUDE.md — Frontend Website Rules

## Always Do First
- **Session start**: use `gayo-vps` MCP to trigger a site update/rebuild for the active site.
- **Any frontend code**: invoke `frontend-design` or `taste-skill` skill depending on the situation.
- **Non-trivial feature**: run `/plan` before touching code.
- **Before custom code**: run `search-first` skill.
- **After writing/modifying code**: run `/code-review`.
- **Auth / user input / APIs**: run `security-review` skill.
- **Before marking done**: run `/verify`.

## Site Shorthands
- `clarence` → `https://clarence.gayo-sphere.cloud`
- `gwyneth` → `https://gwyneth.gayo-sphere.cloud`

## Local Dev (verify before deploying)

| Site | Source dir | Dev command | Local URL |
|------|-----------|-------------|-----------|
| Clarence portfolio | `../clarencegayo-main/` | `bun dev` | `http://localhost:8080` |
| Gayo Sphere agency | `gayo-sphere/` | static HTML, open directly | `file://` or live server |

**Workflow:** edit → `bun dev` in `clarencegayo-main/` → verify at `http://localhost:8080` → deploy via `sync-to-vps.sh` or `gayo-vps` MCP → screenshot live domain.

- Always verify locally first for Clarence portfolio changes before touching the live site.
- Screenshot local: `node screenshot.mjs http://localhost:8080` (saves to `./temporary screenshots/`)
- Screenshot live: `node screenshot.mjs https://clarence.gayo-sphere.cloud`

## Live Site & Deployment
- All changes go to the live site. No local WordPress or staging server.
- CMS: `https://cms.gayo-sphere.cloud` — single source of truth for all content.
- Never hardcode content — always fetch from WordPress REST API or ACF fields.
- Separate content per person via `person`/`site` taxonomy — never mix Clarence and Gwyneth data.

## MCP Servers

### `wordpress-cms` — Content layer
Connects to `https://cms.gayo-sphere.cloud`. Use for all CMS reads/writes: posts, pages, CPTs, ACF fields, media, menus, options. Credentials pre-configured in `~/.claude/settings.json`.

### `gayo-vps` — Server / infrastructure layer
Connects to VPS `72.62.196.231` as root via SSH key. CloudPanel at `https://cp.gayo-sphere.cloud`.

| Tool | Purpose |
|------|---------|
| `run_command` | Run any shell command via SSH |
| `cloudpanel_list_sites` | List subdomains |
| `cloudpanel_add_reverse_proxy` | Add subdomain → local port |
| `cloudpanel_add_nodejs` | Add Node.js subdomain |
| `cloudpanel_add_static` | Add static HTML subdomain |
| `cloudpanel_add_php` | Add PHP/WordPress subdomain |
| `cloudpanel_install_ssl` | Install/renew SSL |
| `cloudpanel_delete_site` | Remove subdomain (irreversible) |

**New subdomain order:** add site → start app/service → verify live domain.

**Rule:** content changes → `wordpress-cms`; server/infra → `gayo-vps`.

### MCP Workflow Rules
1. Read current state before writing.
2. Verify live site after every write.
3. Never mock or simulate data — always use live MCP.
4. If an MCP tool fails — report it, do not silently fallback.

## Installed Plugins

| Plugin | Purpose |
|--------|---------|
| `frontend-design` | Design-quality frontend code |
| `taste-skill` (project-local) | Typography, color, motion, layout variance rules |
| `playwright` | Browser automation MCP |
| `github` | PR, issue, repo management |
| `superpowers` | Structured dev workflows |
| `everything-claude-code` | 50+ skills (tdd, code-review, security, etc.) |
| `claude-mem` | Cross-session memory search |
| `skill-creator` | Create skills from session patterns |
| `learning-output-style` | Educational output mode |

## WordPress Integration Rules
- All sections (Hero, About, Services, Skills, Experience, Portfolio, Testimonials, Contact) pull from WP REST API (`https://cms.gayo-sphere.cloud/wp-json/wp/v2/`) or ACF endpoints.
- Use ACF for structured data; expose via REST (`show_in_rest: true`).
- Use Custom Post Types for repeatable content: `projects`, `testimonials`, `services`, `experience`.
- Hero text, tagline, bio → ACF Options Page, not hardcoded.
- Images → WordPress Media Library URLs, never `placehold.co` for real assets.
- After any content-rendering change, verify CMS edits reflect on the live site.

## Screenshot Workflow
- `node screenshot.mjs https://clarence.gayo-sphere.cloud` — saves to `./temporary screenshots/screenshot-N.png`
- Optional label: `node screenshot.mjs https://clarence.gayo-sphere.cloud label` → `screenshot-N-label.png`
- Read the PNG with the Read tool to analyze it.
- Always screenshot the live domain — never `localhost` or `file://`.
- When comparing: be specific about px values, hex colors, spacing, radius, shadows.

## Playwright MCP
Use instead of Puppeteer when you need interaction (click, fill, evaluate, etc.).
Tools: `browser_navigate`, `browser_take_screenshot`, `browser_click`, `browser_fill_form`, `browser_evaluate`, `browser_snapshot`, `browser_wait_for`, `browser_console_messages`, `browser_type`, `browser_press_key`, `browser_network_requests`, `browser_resize`.

| Need | Use |
|------|-----|
| Quick screenshot | `node screenshot.mjs` |
| Click / fill / interact | Playwright MCP |
| Debug JS errors | Playwright → `browser_console_messages` |
| Inspect network | Playwright → `browser_network_requests` |

Always call `browser_navigate` first. Always use live domains.

## claude-mem
Use `smart_search` at session start for the project name to recall prior decisions. Search before implementing any pattern to check if a prior decision exists.

## Output Defaults
- Single `index.html`, styles inline, unless told otherwise.
- Tailwind via CDN: `<script src="https://cdn.tailwindcss.com"></script>`
- Placeholders: `https://placehold.co/WIDTHxHEIGHT` (only when no real asset exists).
- Mobile-first responsive.

## Brand Assets
Check `brand_assets/` before designing. Use any logos, palettes, or style guides found there — do not invent brand colors when a palette exists.

## Anti-Generic Guardrails
- **Colors:** Never use default Tailwind palette. Derive from a custom brand color.
- **Shadows:** Never flat `shadow-md`. Use layered, color-tinted shadows with low opacity.
- **Typography:** Different fonts for headings and body. Tight tracking (`-0.03em`) on large headings, generous line-height (`1.7`) on body.
- **Gradients:** Layer multiple radial gradients. Add grain via SVG noise filter.
- **Animations:** Only animate `transform` and `opacity`. Never `transition-all`. Spring-style easing.
- **Interactive states:** Every clickable element needs hover, focus-visible, and active states.
- **Images:** Add gradient overlay (`bg-gradient-to-t from-black/60`) + color treatment with `mix-blend-multiply`.
- **Depth:** Base → elevated → floating layer system. Not everything at the same z-plane.

## Skill Activation Map

### Frontend & Design
| Task | Skill |
|------|-------|
| Any UI / layout / components | `frontend-design` or `taste-skill` (situation-dependent) |
| React patterns, state, architecture | `frontend-patterns` |
| Liquid glass / glassmorphism | `liquid-glass-design` |
| HTML slides / presentations | `frontend-slides` |
| E2E tests | Playwright MCP or `/e2e` |

### WordPress & CMS
| Task | Use |
|------|-----|
| Read/write posts, pages, CPTs, ACF, media | `wordpress-cms` MCP |
| REST API design or WP plugin patterns | `api-design` skill |

### VPS / Server
| Task | Use |
|------|-----|
| Deploy, restart services, edit configs, logs | `gayo-vps` MCP |

### Code Quality
| Task | Skill |
|------|-------|
| Plan before coding | `/plan` |
| TDD | `/tdd` |
| Code review | `/code-review` |
| Security audit | `security-review` or `/security-scan` |
| Build errors | `/build-fix` |
| Verify done | `/verify` |
| Research before coding | `search-first` |
| Refactor / dead code | `refactor-clean` |
| Coding standards | `coding-standards` |

---

## Hard Rules
- Do not add sections or features not in the reference.
- Do not "improve" a reference design — match it.
- Do not stop after one screenshot pass.
- Do not use `transition-all`.
- Do not use default Tailwind blue/indigo as primary color.
- Do not hardcode content that should come from WordPress.
- Do not screenshot `localhost` or `file://` — always use the live domain.
- Always use `wordpress-cms` MCP for CMS reads/writes.
- Always use `gayo-vps` MCP for server/infra operations.
- Never simulate CMS or server data.
- Verify live site after every MCP write.
- **Do not use the Agent tool** — use Glob, Grep, Read, Bash directly.
