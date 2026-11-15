# cloud-computing

MiniPaaS — CSC 382 course project (local Kubernetes control plane, Azure metering dashboard, Git builds).

## Quick start

```bash
k3d cluster start minipaas && docker start minipaas-db
cd api && node server.js
cd dashboard-next && npm run dev
```

See `infra/README.md`, `build-worker/README.md`, and `.cursor/rules/minipaas.mdc` for full architecture.

## Git build sample

Public repo URL for **Build from Git**: `https://github.com/Craftzmen/cloud-computing`  
Docker context: `samples/git-hello`