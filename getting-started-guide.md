# How to Build a PWA Like Thursday Lunch — From Scratch

## Prerequisites (install once)

1. **Install Node.js** — Go to [nodejs.org](https://nodejs.org) and download the LTS version. This also installs `npm` (the package manager).

2. **Install Git** — Go to [git-scm.com](https://git-scm.com) and install it. This tracks your code changes.

3. **Install a code editor** — [VS Code](https://code.visualstudio.com) is free and the most popular choice.

4. **Install Claude Code** — This is the AI assistant that actually writes the code for you. Install it by opening your terminal and running:
   ```
   npm install -g @anthropic-ai/claude-code
   ```
   You'll need an Anthropic account and API key (or a Max subscription).

---

## Step 1: Create the project

Open your terminal and run:
```bash
npx create-next-app@latest my-app-name
```

When it asks you questions, choose:
- TypeScript: **Yes**
- ESLint: **Yes**
- Tailwind CSS: **Yes**
- `src/` directory: **Yes**
- App Router: **Yes**
- Import alias: **Yes** (keep the default `@/*`)

Then:
```bash
cd my-app-name
npm run dev
```

Open `http://localhost:3000` in your browser — you should see the Next.js starter page. You now have a working app.

---

## Step 2: Set up the database (Neon Postgres)

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project (pick any name)
3. Copy the **pooled connection string** — it looks like `postgresql://user:pass@ep-something.us-east-2.aws.neon.tech/neondb?sslmode=require`
4. In your project folder, create a file called `.env.local` and add:
   ```
   DATABASE_URL=postgresql://user:pass@ep-something.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
5. Install the Neon database driver:
   ```bash
   npm install @neondatabase/serverless
   ```

---

## Step 3: Set up shadcn/ui (pre-built components)

This gives you nice-looking buttons, cards, dialogs, etc. without designing them yourself.

```bash
npx shadcn@latest init
```

Then add components as needed:
```bash
npx shadcn@latest add button card dialog input
```

---

## Step 4: Set up additional tools

```bash
npm install zod sonner
```

- **Zod** — validates data (makes sure forms and API inputs are correct)
- **Sonner** — shows toast notifications (those little pop-up messages)

---

## Step 5: Set up Git and GitHub

```bash
git init
git add .
git commit -m "Initial setup"
```

Then create a repository on [github.com](https://github.com) and follow their instructions to push your code up. This is where your code lives online.

---

## Step 6: Deploy to Vercel (free hosting)

1. Go to [vercel.com](https://vercel.com) and sign up with your GitHub account
2. Click "Import Project" and select your GitHub repo
3. In the Environment Variables section, add:
   - `DATABASE_URL` = your Neon connection string
   - Any other secrets your app needs (API keys, admin tokens, etc.)
4. Click Deploy

Your app is now live on the internet with a `.vercel.app` URL.

**Or from the command line:**
```bash
npm install -g vercel
vercel login
vercel link
vercel --prod
```

---

## Step 7: Start building with Claude Code

This is the big one. Open your terminal in the project folder and run:
```bash
claude
```

Now you just talk to it. Describe what you want your app to do, and Claude writes the code. Here's roughly how our project evolved:

1. **"Create a database schema for [your app idea]"** — Claude writes SQL migrations
2. **"Build the main page that shows [whatever your app displays]"** — Claude creates the UI
3. **"Add an API route for [feature]"** — Claude creates the backend
4. **"Make it look better on mobile"** — Claude polishes the design
5. **"Add [new feature]"** — Rinse and repeat

**Tips for working with Claude Code:**
- Be specific about what you want ("add a button that does X" beats "make it better")
- If something looks wrong, just tell Claude what's wrong and it'll fix it
- Say "squash and deploy" when you're happy with changes and want them live
- Create a `CLAUDE.md` file in your project root with your conventions — Claude reads this every time

---

## Step 8: Optional extras we used

| Service | What it does | Free tier? |
|---------|-------------|------------|
| [Google Places API](https://console.cloud.google.com) | Restaurant search/autocomplete | $200/month credit (plenty) |
| [Google Material Symbols](https://fonts.google.com/icons) | Icons | Yes |
| Neon Postgres | Database | Yes (generous) |
| Vercel | Hosting + deploys | Yes (100 deploys/day) |

For Google Places: Go to Google Cloud Console, create a project, enable the Places API, create an API key, and add it as `GOOGLE_PLACES_API_KEY` in both `.env.local` and Vercel environment variables.

---

## Project structure (what goes where)

```
my-app-name/
├── src/
│   ├── app/              ← Pages and API routes
│   │   ├── page.tsx      ← Home page
│   │   ├── admin/        ← Admin pages
│   │   └── api/          ← Backend API routes
│   ├── components/       ← Reusable UI pieces
│   ├── lib/
│   │   └── db/           ← Database queries and migrations
│   └── hooks/            ← Shared logic (like real-time updates)
├── public/               ← Static files (images, icons)
├── .env.local            ← Secrets (never commit this!)
├── CLAUDE.md             ← Instructions for Claude Code
└── package.json          ← Project dependencies
```

---

## The workflow in a nutshell

1. Run `claude` in your terminal
2. Describe what you want
3. Claude writes the code
4. Preview at `localhost:3000` (run `npm run dev` in another terminal)
5. When happy, say "squash and deploy"
6. Live on the internet

The honest truth: you don't need to know how to code. You need to know **what you want your app to do** and be able to describe it clearly. Claude handles the rest.
