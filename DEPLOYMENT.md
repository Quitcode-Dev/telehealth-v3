# Deployment

This project is deployed by **Automatron** using **Kamal** to a single VPS.

- **Domain:** `telehealthv3.duckdns.org`
- **Service:** `telehealth-v3`
- **Image:** `ghcr.io/quitcode-dev/telehealth-v3`
- **Container port:** `3000`
- **Health check:** `/api/health`
- **Environment:** `production`

## How deploys happen

Automatron triggers `.github/workflows/deploy.yml` via `workflow_dispatch`.
The workflow:

1. Installs Kamal (`gem install kamal -v 2.4.0`).
2. Writes `.kamal/secrets` from GitHub Environment Secrets.
3. Runs one of: `kamal setup`, `kamal deploy`, or `kamal rollback <version>`.

`auto_deploy_on_main` is **disabled**.
Pushes to `main` do **not** trigger production deploys; use Automatron.

## Secrets (managed in GitHub Environment Secrets, never committed)

- `KAMAL_REGISTRY_PASSWORD` — registry credential for `ghcr.io`.
- `KAMAL_SSH_PRIVATE_KEY` — SSH key Kamal uses to reach `91.98.68.42`.

## Rollback

Trigger from Automatron — it supplies the previous image version recorded
during the last successful deploy. Manual rollback via the Actions tab is
also possible: dispatch `Deploy` with `action=rollback` and a `rollback_to`
version.

## Do not edit deployment files by hand

The following paths are owned by Automatron templates and will be overwritten
on the next "Generate artifacts" run:

- `Dockerfile`
- `.dockerignore`
- `config/deploy.yml`
- `.kamal/secrets.example`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `DEPLOYMENT.md`
