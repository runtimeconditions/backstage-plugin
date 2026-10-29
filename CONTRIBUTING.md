# Contributing

## Pull request titles

Pull requests are squash-merged, so the PR title becomes the commit message on
`main` and decides whether a release is published. Titles follow
[Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): summary
```

The scope is optional, the summary is lowercase and in the imperative mood, and
a CI check rejects anything that does not match.

| Type | Use it for | Release |
| --- | --- | --- |
| `feat` | A new capability for users or adapters | minor |
| `fix` | A bug fix | patch |
| `perf` | A performance improvement | patch |
| `revert` | Reverting an earlier change | patch |
| `docs` | Documentation only | none |
| `refactor` | A change that alters no behavior | none |
| `test` | Tests only | none |
| `build` | Build or dependency changes | none |
| `ci` | Workflow changes | none |
| `style` | Formatting only | none |
| `chore` | Anything else | none |

Add `!` after the type or scope for a breaking change, as in
`feat(backend)!: rename the fulfillments route`, and describe what breaks in the
PR body. A breaking change releases a new major version whatever its type.

Examples: `fix: ignore profiles without a workload uri`,
`feat(backend): accept resource labels`, `docs: explain trusted publishing`.

## Releases

Merging a `feat`, `fix`, `perf`, `revert`, or breaking change to `main`
publishes both packages to npm at the next version and tags it `vX.Y.Z`; other
types release nothing, and several merges can share one release. The version is
chosen from the commit messages since the last tag. Both packages always share
a version.

## Local checks

```
npm ci && npm test && npm run build
(cd backend && npm ci && npm test && npm run build)
```

## Maintainer setup

- Merge with "Squash and merge", using the PR title as the commit message, and
  require the `PR title` and `verify` checks on `main`.
- Publishing uses npm trusted publishing, so there is no token. For each
  package, on npmjs.com open Settings, Trusted Publisher, GitHub Actions, and
  enter organization `runtimeconditions`, repository `backstage-plugin`, and
  workflow `release.yml`. A package must exist before it can be configured, so
  publish the current version of each once by hand with
  `npm publish --access public`; the first automated release then tags it
  without publishing it again.
