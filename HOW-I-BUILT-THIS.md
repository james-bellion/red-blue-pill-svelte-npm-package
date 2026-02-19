# How I Built `create-red-blue-app`

A step-by-step guide to building an npm CLI scaffolding tool from scratch.
When a user runs `npx create-red-blue-app`, they get an interactive prompt,
enter their name, choose Red or Blue, and receive a complete SvelteKit +
Skeleton UI project with **only** that one component — personalised to them.

---

## All Commands Used (In Order)

Every command run to build and test this project from scratch:

```sh
# 1. Create the SvelteKit project
bunx sv create create-red-blue-app
cd create-red-blue-app

# 2. Install SvelteKit + Skeleton UI dev dependencies
bun install
bun add -D @skeletonlabs/skeleton @skeletonlabs/skeleton-svelte

# 3. Install the CLI runtime dependencies
bun add prompts fs-extra

# 4. Create the CLI entry file and make it executable
mkdir bin
touch bin/cli.js
chmod +x bin/cli.js

# 5. Create the templates folder structure
mkdir -p templates/base/src/routes
mkdir -p templates/base/src/lib
mkdir -p templates/base/static
mkdir -p templates/features/red/src/lib/RedPill
mkdir -p templates/features/red/src/routes
mkdir -p templates/features/blue/src/lib/BluePill
mkdir -p templates/features/blue/src/routes

# 6. Register the command on your machine (no publish needed yet)
bun link

# 7. Test it — run from any directory outside your project
cd ~/sandbox
create-red-blue-app

# 8. Run the generated project
cd my-app
bun run dev

# --- When ready to publish ---

# 9. Preview exactly what will be uploaded (nothing gets sent yet)
npm pack --dry-run

# 10. Create a Granular Access Token on npmjs.com with:
#     - Read and write permissions
#     - "Bypass two-factor authentication" enabled
#     - Expiration: up to 90 days
# Then set it:
npm set //registry.npmjs.org/:_authToken=YOUR_GRANULAR_TOKEN

# 11. Confirm you are logged in
npm whoami

# 12. Publish using bun — preserves the bin entry (npm 11 strips it)
bun publish --access public

# 13. To publish an update — bump version in package.json first, then:
bun publish --access public
```

---

## What We're Building

```
npx create-red-blue-app

💊 Welcome to Red/Blue Generator

✔ Project name: … my-app
✔ Your name: … James
✔ Choose your reality: › Red Pill 🔴

📁 Creating project in ./my-app...
📦 Installing dependencies...
✨ Done! Your project is ready.

   cd my-app
   bun run dev
```

The generated project shows:

```
Welcome,
JAMES
You chose the Red Pill 🔴
Welcome to the real world.
```

This is **build-time generation** — not runtime conditionals. The name is
stored in `.env`. The unchosen component does not exist in `node_modules`,
`git`, or anywhere on disk.

---

## Understanding the Two Worlds

Your project folder serves two purposes at once:

| Folder | What it is |
|--------|-----------|
| `src/` | Your **dev playground** — a real running SvelteKit app for building and testing. Never published to npm. |
| `templates/` | A **snapshot** of files waiting to be copied to the user's machine. Not running, just stored. |
| `bin/cli.js` | The middleman — asks questions, copies the right template files. |

> Whatever you want users to receive → it goes in `templates/`
>
> Whatever is just for your own development → it stays in `src/`

---

## Prerequisites

- [Bun](https://bun.sh) installed
- A terminal

---

## Step 1 — Scaffold a SvelteKit Project

This becomes both your **development playground** and the **published npm package**.

```sh
bunx sv create create-red-blue-app
cd create-red-blue-app
```

When prompted by the SvelteKit scaffolder, choose:
- Template: **SvelteKit minimal**
- Type checking: **TypeScript**
- Add-ons: **Tailwind CSS** (required)

Then install Skeleton UI on top:

```sh
bun install
bun add -D @skeletonlabs/skeleton @skeletonlabs/skeleton-svelte
```

---

## Step 2 — Install the CLI Dependencies

The CLI needs two packages to work:

```sh
bun add prompts fs-extra
```

- **`prompts`** — interactive terminal questions (project name, user name, red/blue choice)
- **`fs-extra`** — file system utilities (copy folders, read/write JSON, write files)

---

## Step 3 — Update `package.json`

Open `package.json` and make these changes:

```json
{
  "name": "create-red-blue-app",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "create-red-blue-app": "./bin/cli.js"
  },
  "files": [
    "bin",
    "templates"
  ],
  ...rest of your scripts and dependencies
}
```

**Why each field matters:**

| Field | Purpose |
|-------|---------|
| `"name"` | The exact package name people use with `npx` |
| `"bin"` | Tells npm which file to run when the command is typed |
| `"files"` | Only `bin/` and `templates/` are uploaded to npm — `src/` playground is excluded |
| `"type": "module"` | Allows `import`/`export` syntax in the CLI script |

> Remove `"private": true` if it exists — private packages cannot be published.

**Important:** Your `devDependencies` (SvelteKit, Tailwind, Skeleton, etc.) are fine
to keep here. They are for your local development only. `npx` users won't install
them because:
- `devDependencies` are never installed by consumers
- The `"files"` field means your `src/` folder never even reaches npm

---

## Step 4 — Create the CLI Script

```sh
mkdir bin
touch bin/cli.js
chmod +x bin/cli.js
```

Paste this into `bin/cli.js`:

```js
#!/usr/bin/env node

import prompts from "prompts";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("\n💊 Welcome to Red/Blue Generator\n");

  const response = await prompts(
    [
      {
        type: "text",
        name: "projectName",
        message: "Project name:",
        initial: "my-app"
      },
      {
        type: "text",
        name: "userName",
        message: "Your name:",
        initial: "Explorer"
      },
      {
        type: "select",
        name: "pill",
        message: "Choose your reality:",
        choices: [
          { title: "Red Pill 🔴", value: "red" },
          { title: "Blue Pill 🔵", value: "blue" }
        ]
      }
    ],
    {
      onCancel: () => {
        console.log("\nCancelled.\n");
        process.exit(0);
      }
    }
  );

  if (!response.projectName || !response.userName || !response.pill) return;

  const targetDir = path.join(process.cwd(), response.projectName);

  if (await fs.pathExists(targetDir)) {
    console.error(`\n❌ Directory "${response.projectName}" already exists.\n`);
    process.exit(1);
  }

  console.log(`\n📁 Creating project in ./${response.projectName}...`);

  // 1. Copy the base SvelteKit boilerplate
  await fs.copy(path.join(__dirname, "../templates/base"), targetDir);

  // Rename _gitignore → .gitignore
  // (npm strips dotfiles when publishing, so we store it as _gitignore)
  const gitignoreSrc = path.join(targetDir, "_gitignore");
  if (await fs.pathExists(gitignoreSrc)) {
    await fs.rename(gitignoreSrc, path.join(targetDir, ".gitignore"));
  }

  // 2. Inject ONLY the chosen feature — the other one is never copied
  await fs.copy(
    path.join(__dirname, `../templates/features/${response.pill}`),
    targetDir,
    { overwrite: true }
  );

  // 3. Write .env with the user's name
  // PUBLIC_ prefix makes it safe to use in the browser via SvelteKit
  await fs.writeFile(
    path.join(targetDir, ".env"),
    `PUBLIC_USER_NAME=${response.userName}\n`
  );

  // 4. Set the project name in the generated package.json
  const pkgPath = path.join(targetDir, "package.json");
  const pkg = await fs.readJson(pkgPath);
  pkg.name = response.projectName;
  await fs.writeJson(pkgPath, pkg, { spaces: "\t" });

  // 5. Install dependencies in the new project
  console.log("\n📦 Installing dependencies...");
  try {
    execSync("bun install", { cwd: targetDir, stdio: "inherit" });
  } catch {
    // Fall back to npm if bun is not available
    execSync("npm install", { cwd: targetDir, stdio: "inherit" });
  }

  console.log("\n✨ Done! Your project is ready.\n");
  console.log(`   cd ${response.projectName}`);
  console.log("   bun run dev\n");
}

main();
```

---

## Step 5 — Create the Template Structure

```
templates/
├── base/              ← full SvelteKit + Skeleton UI boilerplate
└── features/
    ├── red/           ← only the red files
    └── blue/          ← only the blue files
```

---

### `templates/base/` — the SvelteKit + Skeleton boilerplate

**`templates/base/package.json`**

> The name `PROJECT_NAME` is a placeholder — `cli.js` replaces it with the
> user's chosen project name.

```json
{
  "name": "PROJECT_NAME",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "prepare": "svelte-kit sync || echo ''"
  },
  "devDependencies": {
    "@skeletonlabs/skeleton": "^4.12.0",
    "@skeletonlabs/skeleton-svelte": "^4.12.0",
    "@sveltejs/adapter-auto": "^7.0.0",
    "@sveltejs/kit": "^2.50.2",
    "@sveltejs/vite-plugin-svelte": "^6.2.4",
    "@tailwindcss/forms": "^0.5.11",
    "@tailwindcss/typography": "^0.5.19",
    "@tailwindcss/vite": "^4.1.18",
    "svelte": "^5.49.2",
    "svelte-check": "^4.3.6",
    "tailwindcss": "^4.1.18",
    "typescript": "^5.9.3",
    "vite": "^7.3.1"
  }
}
```

**`templates/base/svelte.config.js`**
```js
import adapter from '@sveltejs/adapter-auto';

const config = {
  kit: {
    adapter: adapter()
  }
};

export default config;
```

**`templates/base/vite.config.ts`**
```ts
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()]
});
```

**`templates/base/tsconfig.json`**
```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "strict": true,
    "moduleResolution": "bundler"
  }
}
```

**`templates/base/src/app.html`**
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

**`templates/base/src/app.d.ts`**
```ts
declare global {
  namespace App {}
}
export {};
```

**`templates/base/src/routes/+layout.svelte`**
```svelte
<script lang="ts">
  import './layout.css';
  let { children } = $props();
</script>

{@render children()}
```

**`templates/base/src/routes/layout.css`**

> Order matters — Skeleton theme first, then Skeleton base styles, then Tailwind.
> Swap `cerberus.css` for any other theme name (wintry, rocket, catppuccin, etc.)

```css
@import '@skeletonlabs/skeleton/themes/cerberus.css';
@import '@skeletonlabs/skeleton/src/index.css';
@import 'tailwindcss';
@plugin '@tailwindcss/forms';
@plugin '@tailwindcss/typography';
```

**`templates/base/src/routes/+page.svelte`**
```svelte
<h1>Loading reality...</h1>
```

> This placeholder gets **overwritten** by the feature injection step.

**`templates/base/.env.example`**
```
PUBLIC_USER_NAME=Explorer
```

> Documents what env variables the project expects. The actual `.env` is
> written by `cli.js` at generation time — it is never stored in templates.

**`templates/base/_gitignore`**
```
node_modules
/.svelte-kit
/build
.DS_Store
.env
.env.*
!.env.example
```

> Named `_gitignore` not `.gitignore` because npm strips dotfiles during
> publish. The CLI renames it back to `.gitignore` when copying.

**`templates/base/static/robots.txt`**
```
User-agent: *
Allow: /
```

---

### `templates/features/red/` — the red-only files

**`templates/features/red/src/lib/RedPill/RedPill.svelte`**

> Uses `$env/static/public` to read `PUBLIC_USER_NAME` from `.env`.
> SvelteKit bakes this in at dev/build time — not a runtime API call.

```svelte
<script lang="ts">
  import { PUBLIC_USER_NAME } from '$env/static/public';
</script>

<div class="bg-red-500 p-10 rounded-2xl shadow-2xl text-center space-y-3">
  <p class="text-red-200 text-lg uppercase tracking-widest">Welcome,</p>
  <h1 class="text-white text-5xl font-extrabold">{PUBLIC_USER_NAME}</h1>
  <p class="text-red-100 text-xl mt-4">You chose the Red Pill 🔴</p>
  <p class="text-red-300 text-sm">Welcome to the real world.</p>
</div>
```

**`templates/features/red/src/routes/+page.svelte`**
```svelte
<script lang="ts">
  import RedPill from '$lib/RedPill/RedPill.svelte';
</script>

<div class="min-h-screen flex items-center justify-center bg-black text-white">
  <RedPill />
</div>
```

---

### `templates/features/blue/` — the blue-only files

**`templates/features/blue/src/lib/BluePill/BluePill.svelte`**
```svelte
<script lang="ts">
  import { PUBLIC_USER_NAME } from '$env/static/public';
</script>

<div class="bg-blue-500 p-10 rounded-2xl shadow-2xl text-center space-y-3">
  <p class="text-blue-200 text-lg uppercase tracking-widest">Welcome,</p>
  <h1 class="text-white text-5xl font-extrabold">{PUBLIC_USER_NAME}</h1>
  <p class="text-blue-100 text-xl mt-4">You chose the Blue Pill 🔵</p>
  <p class="text-blue-300 text-sm">Ignorance is bliss.</p>
</div>
```

**`templates/features/blue/src/routes/+page.svelte`**
```svelte
<script lang="ts">
  import BluePill from '$lib/BluePill/BluePill.svelte';
</script>

<div class="min-h-screen flex items-center justify-center bg-black text-white">
  <BluePill />
</div>
```

---

## Step 6 — Test Locally Before Publishing

Register the command on your machine without publishing:

```sh
# From inside the project root
bun link
```

Now test it from any other directory:

```sh
cd ~/Desktop
create-red-blue-app
```

Verify only the chosen component exists:

```sh
# If you chose red — this should print nothing:
find my-app/src -name "BluePill*"

# If you chose blue — this should print nothing:
find my-app/src -name "RedPill*"

# Check .env was written correctly:
cat my-app/.env
# PUBLIC_USER_NAME=James
```

---

## Step 7 — Publish to npm

When you're ready:

```sh
# Create a free account at npmjs.com, then:
npm login

# Publish the package
npm publish --access public
```

After publishing, anyone can run:

```sh
npx create-red-blue-app
# or
bunx create-red-blue-app
```

To publish updates, bump the `version` in `package.json` first:
```sh
# e.g. 0.1.0 → 0.2.0, then:
npm publish --access public
```

---

## How the "Only One Component" Guarantee Works

```
cli.js picks: response.pill = "red"
                      ↓
fs.copy("templates/features/red", targetDir)   ← only this runs
                                                  "blue" folder never touched
```

The key is `templates/features/${response.pill}` — this resolves to either
`features/red` or `features/blue`, never both. The other folder simply
never gets copied. It does not exist in the generated project anywhere.

---

## How the Personalised Name Works

```
cli.js asks: "Your name?" → "James"
                    ↓
.env written: PUBLIC_USER_NAME=James
                    ↓
RedPill.svelte reads: import { PUBLIC_USER_NAME } from '$env/static/public'
                    ↓
SvelteKit bakes it in at dev/build time → displays "James"
```

The `PUBLIC_` prefix is a SvelteKit convention — it means the variable is
safe to use in the browser. SvelteKit reads `.env` at startup and makes
`PUBLIC_*` variables available via `$env/static/public`.

---

## Final Project Structure

```
npm-package-exploration/          ← this IS the npm package
├── bin/
│   └── cli.js                    ← the interactive CLI
├── templates/
│   ├── base/                     ← SvelteKit + Skeleton UI boilerplate
│   │   ├── src/routes/layout.css ← Skeleton theme + Tailwind imports
│   │   ├── .env.example          ← documents expected env variables
│   │   └── _gitignore            ← renamed to .gitignore on copy
│   └── features/
│       ├── red/                  ← RedPill.svelte + red page (uses PUBLIC_USER_NAME)
│       └── blue/                 ← BluePill.svelte + blue page (uses PUBLIC_USER_NAME)
├── src/                          ← your dev playground (NOT published)
└── package.json                  ← name, bin, files fields
```

The `"files": ["bin", "templates"]` in `package.json` ensures that when
you publish, npm only uploads those two folders. Your `src/` playground,
`node_modules`, and everything else stays off npm entirely.

---

## Adding More Features Later

The same pattern scales to any feature:

```sh
mkdir -p templates/features/auth/src/lib/Auth
# add your Auth component files...
```

Then in `cli.js`, add a prompt:
```js
{
  type: "confirm",
  name: "addAuth",
  message: "Add authentication?",
  initial: false
}
```

And copy conditionally:
```js
if (response.addAuth) {
  await fs.copy("templates/features/auth", targetDir, { overwrite: true });
}
```

This is exactly how `create-vite`, `create-next-app`, and other major
scaffolders work. Each feature is just a folder waiting to be copied.
