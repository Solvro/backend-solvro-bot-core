# Backend Solvro Bot Core

[📂 GitHub Project](https://github.com/orgs/Solvro/projects/40) |
[👥 GitHub Team](https://github.com/orgs/Solvro/teams/solvro-bot) |
[💾 Google Drive](https://drive.google.com/drive/folders/1YeTG061qQ5Y9_eGXIXAa4POcpaZerIN5)

---

## Services

- [🎙️ Transcriber](https://github.com/Solvro/backend-solvro-bot-transcriber)
- [📹 Office Cam](https://github.com/Solvro/hardware-solvro-bot-office-cam)

---

## Development

### Prerequisites

- [Visual Studio Code](https://code.visualstudio.com/)
- [Node.js & npm / pnpm](https://nodejs.org/en/download)
- [Docker](https://www.docker.com/)

---

### Step-by-Step Guide

#### Install Project Dependencies

Recommended:

```bash
pnpm install
```

Alternatively:

```bash
npm install
```

#### Start Required Services

Ensure Docker Engine is running, then start all services:

```bash
docker compose up -d
```

> [!NOTE] To shut down all services, run:
> ```bash
> docker compose down
> ```

#### Migrate Database

Run all pending database migrations:

```bash
node ace migration:run
```

> [!NOTE] Check migrations status using:
> ```bash
> node ace migration:status
> ```

#### Run Application

Start the application:

```bash
pnpm dev
```

Alternatively:

```bash
npm run dev
```

You should see a message similar to this:

```bash
[ info ] starting HTTP server...
╭─────────────────────────────────────────────────╮
│                                                 │
│    Server address: http://localhost:3333        │
│    Watch Mode: HMR                              │
│    Ready in: 5 ms                               │
│                                                 │
╰─────────────────────────────────────────────────╯
```

---

### Commits

Follow the [Conventional Commits](https://www.conventionalcommits.org) specification.

> [!NOTE]
> The commit message should be structured as follows:
>
> ```
> <type>[optional scope]: <description>
>
> [optional body]
>
> [optional footer(s)]
> ```

---

### Visual Studio Code Extensions

> [!TIP]
> Press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>X</kbd> and search _@recommended_ to see recommended Visual Studio Code extensions for this workspace.

### API Documentation

Documentation is auto-generated based on the [OpenAPI](https://www.openapis.org) specification using [AdonisJS AutoSwagger](https://github.com/ad-on-is/adonis-autoswagger).

> [!IMPORTANT]
> Navigate to [http://localhost:3333/docs](http://localhost:3333/docs) to access the [Scalar](https://scalar.com) UI, where you can explore the API endpoints interactively.

### Custom Commands

#### Bootstrap Environment Variables

```bash
node ace bootstrap:env
```

#### Deploy Discord Commands

Deploy registered commands to the Discord REST API:

```bash
node ace discord:deploy
```
> [!IMPORTANT]
> Use this command to deploy changes to the Discord API whenever you modify the command signatures (*SlashCommandBuilder*) in the *app/discord/commands* directory.
>

### Resources

#### Discord.js

[library docs](https://discord.js.org/docs) |
[developer guide](https://discordjs.guide) |
[Discord docs](https://discord.com/developers/docs)

#### AdonisJS

- [Documentation](https://docs.adonisjs.com)
- [Tutorials](https://adocasts.com)
