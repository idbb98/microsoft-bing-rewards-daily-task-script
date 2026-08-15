# AGENTS.md

## Repo overview

This is a Chinese-language project: docs, code comments, and commit messages are all in Chinese — write new content in Chinese to match. `CLAUDE.md` is now a pointer to this file; all conventions live here.

Hard rule: **propose a plan and get confirmation before modifying any code** (修改前先出方案). Never edit code directly.

| Target | Path | Notes |
|---|---|---|
| Userscript (recommended) | `BingRewards.user.js` | Tampermonkey/Violentmonkey, ~4400 lines, single file |
| Python desktop | `bing-rewards-python/` | Windows-only (pywin32/tkinter), entry `main.py` |
| Chrome extension | `bing-rewards-extension/` | MV3, `content.js` excludes `rewards.bing.com` |
| .NET desktop | `bing-rewards-simulator/` | **Discontinued**, .NET Framework net48, don't add features |
| Docs site | `docs/` + `mkdocs.yml` | MkDocs Material, deployed to GitHub Pages |

## Architecture

### 1. Userscript (recommended)

- Entry: `BingRewards.user.js` (root). JavaScript (ES6+) + Tampermonkey/Violentmonkey API, injected into `https://*.bing.com/*` by the manager extension.
- Fetches hot search words via `GM_xmlhttpRequest`; random add/cut word obfuscation; live progress panel UI; config persisted with `GM_setValue`/`GM_getValue`.
- All config goes through the `CONFIG` object's getters/setters, which bind 1:1 to GM storage (keys prefixed `custom*`).

### 2. Python desktop

- Dir `bing-rewards-python/`; entry `main.py`; core automation `browser_automation.py`; GUI `ui.py`; search words `search_word_provider.py`; logging `log.py`.
- Stack: Python 3.x + pyautogui + pywin32 (win32gui/win32con/win32api/win32process) + psutil + pyperclip + requests; packaged with cx_Freeze. Windows-only.
- Runtime config `config.json`; project metadata `about_config.json`.

### 3. Chrome extension (discontinued)

- Dir `bing-rewards-extension/`, Manifest V3. `manifest.json` host_permissions cover bing.com + hot-word sources; `background.js` service worker; `content.js` injects into `https://*.bing.com/*` (excludes `rewards.bing.com`); `popup.html/js` control UI; `options.html/js` settings.
- Third-party: Bootstrap 5 (`css/bootstrap.min.css`, `js/bootstrap.bundle.min.js`).

### 4. .NET desktop (discontinued)

- Dir `bing-rewards-simulator/`, .NET Framework net48 + C#. Entry `BingSearchAutomation.csproj` (main `Program.cs`, source under `src/`). Dependencies: Newtonsoft.Json, NLog, WindowsInput. Don't add features.

### 5. Docs site

- `docs/` + `mkdocs.yml`, MkDocs Material, deployed to GitHub Pages. See Commands below.

## Versioning

- Format `YY.M.D.Revision` (e.g. `26.7.16.2`).
- Versions are maintained **independently per target** and are currently out of sync: userscript `@version` = `26.7.16.2`, extension `manifest.json` version = `26.1.15.1`, simulator `csproj` = `26.2.2.1`.
- When a feature/behavior change affects a target, bump that target's version in its own file. Root `docs/changelog.md` tracks userscript history only.

## Commands

- **No test framework, no lint/typecheck** anywhere. Verification is manual: load the userscript/extension in a browser and run on `www.bing.com` with the tab foregrounded.
- **Userscript**: no build. Install `BingRewards.user.js` via Tampermonkey/Violentmonkey, open `www.bing.com`, start from the manager menu.
- **Python run/build** (from `bing-rewards-python/`): `pip install -r requirements.txt` then `python main.py`. Build: `python setup.py build` → output under `build/exe.win-amd64-<pythonver>/` (version segment varies by Python version; README says 3.13, setup.py output currently 3.14). `setup.py` already copies `config.json`, `about_config.json`, `asset/` via `include_files`.
- **Extension**: load `bing-rewards-extension/` unpacked in `chrome://extensions` (developer mode).
- **Docs site**: root `requirements.txt` is only `mkdocs-material`. `pip install -r requirements.txt`, then `mkdocs serve` → http://127.0.0.1:8000. Deploy is automatic via `.github/workflows/deploy.yml` (`mkdocs gh-deploy --force`) on push to `main`/`master`. Before first deploy `site_url` in `mkdocs.yml` must be edited.
- **Simulator build**: `dotnet publish -c Release -o publish` (needs .NET SDK + net48 runtime on target).

## Conventions

### Code style

- JS: `'use strict'`, ES6+, single quotes. Python: PEP 8, PascalCase classes / snake_case functions. No code comments unless asked.
- Config: JS user-config keys live on the `CONFIG` getter/setter bound to `GM_getValue`/`GM_setValue` (keys prefixed `custom*`).
- Logging: Python uses `log_manager` (`log.py`); JS uses `GM_log`.

### File organization

- Root `.gitignore` manages ignore rules across all subprojects; each subproject keeps its own `.gitignore`.
- Build artifacts (`build/`, `__pycache__/`) and logs (`*.log`) are gitignored.
- Third-party CSS/JS (Bootstrap) is excluded from version control — a fresh clone of the extension lacks `css/bootstrap.min.css` / `js/bootstrap.bundle.min.js` and won't run until restored.

### Docs markdown

- `!!! admonition` (danger/tip/etc.) is MkDocs Material syntax and renders only in the `docs/` site. All other docs (root `README.md`, sub-project `README.md`) render on GitHub — use standard Markdown (e.g. `> ⚠️` blockquotes) there.

### Automation constraints

- All automation must simulate real behavior (random intervals, words, scrolling); never collect or upload cookies/personal data. Keep the browser tab foregrounded. MIT-licensed.

## Gotchas

- **`.gitignore` contains an unresolved merge conflict** (lines 12–17: `<<<<<<< HEAD` / `>>>>>>>`). Don't propagate it; resolve carefully if editing that region.
- Extension's `css/bootstrap.min.css` and `js/bootstrap.bundle.min.js` are gitignored but required at runtime (Bootstrap 5.1.0).
- Screenshots are duplicated: root `asset/` (used by root `README.md`) vs `docs/assets/` (used by the MkDocs site). Update both when screenshots change.
- Userscript config is persisted via `GM_getValue` keys prefixed `custom*`; the `CONFIG` object getter/setter maps 1:1. `searchFormParam` (default `QBLH`) must be customized per account.
- `BingRewards.user.js` header has an extensive changelog in comments — append to it for userscript changes.