# Releases

Merging a `feat`, `fix`, `perf`, `revert`, or breaking change to `main` publishes both packages to npm at the same version, tags the merge commit `vX.Y.Z`, and creates a GitHub release. Other changes, such as docs or CI, do not release.

Versions follow semantic versioning and come from the PR titles described in [CONTRIBUTING.md](../CONTRIBUTING.md). Publishing uses npm trusted publishing, so no token is stored. `CONTRIBUTING.md` lists the one-time setup.
