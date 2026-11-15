# MiniPaaS build worker

Polls the control plane build queue, clones a public GitHub repo, runs `docker build` / `docker push` to the local k3d registry, then deploys through the API.

## Run locally

```bash
source ~/minipaas-azure.env   # optional: AZURE_STORAGE_CONNECTION_STRING or BUILD_LOGS_CONN
export REGISTRY=localhost:5001
export CONTROL_PLANE=http://localhost:4000
cd build-worker && npm install && npm start
```

## Registry

Create and attach a registry (once per machine):

```bash
./scripts/k3d-registry.sh
```

## Kaniko (report note)

This worker uses the Docker daemon for speed on a laptop. A production path is a Kaniko `Job` in the cluster (no Docker socket). The flow—clone, build, push to registry, deploy—is the same.