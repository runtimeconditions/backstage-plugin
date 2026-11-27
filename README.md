# backstage-plugin

A Backstage plugin for Runtime Conditions Profiles.

A `RuntimeConditionsProfile` is a portable, machine-readable list of what one workload needs at runtime. This plugin adds a **Runtime Conditions** tab to a Component's page. The tab shows one card per cluster where a matching profile is found, with the profile's workload, extensions, declared conditions, and which resources fulfilled each condition, as reported by platform adapters. Fulfillment is never inferred by this plugin. Only an adapter reports it.

## The mental model

| Concept | What it is | Where it lives |
| --- | --- | --- |
| **Profile** (`RuntimeConditionsProfile`) | A description of one codebase, independent of where it runs: its `workload.uri`, the `extensions` it uses, and the `conditions` it declares. Each condition has a `kind`, an `interface.type`, and an optional `optional` flag. | A custom resource (`runtimeconditions.io/v1alpha1`) in a cluster. Conceptually it could live anywhere; only the current fetch is Kubernetes. |
| **Deployment** | One cluster where a matching profile exists. The same profile in dev, prod, and federal means three deployments, shown as three cards on the Component page. | Derived: profile found in cluster X. |
| **Condition** | A capability the workload needs (e.g. `available-stock-capability`) with an interface contract. | `profile.conditions[]`. |
| **Fulfillment** | A report from a platform adapter that a condition is satisfied in an environment, and by which concrete resources. Never inferred by the plugin. Only reported. | Stored by the companion backend plugin via `POST /api/runtime-conditions/fulfillments`. |
| **Extension** | A pluggable capability the workload consumes. Extension URLs of the form `https://runtimeconditions.io/extensions/<ns>/<name>/runtimeconditions.extension.yaml` are linked by the UI to their definition in the `runtimeconditions/extensions` repo. | `profile.extensions[]`. |

**Correlation rule (important):** a profile belongs to a Component when the profile's `workload.uri` equals the Component's `backstage.io/source-location` annotation, with the `url:` prefix stripped. Matching is by identity (repo URL), not by Kubernetes labels.

Profile YAML doesn't have to live in Kubernetes at all. It can just as well live in a Git repo or a file server. This plugin only reads it from Kubernetes today because that's the only source wired up so far. The correlation and rendering logic doesn't assume Kubernetes. Only the current fetch does.

## Quickstart

Prerequisites: the Kubernetes plugin configured in your Backstage app with at least one cluster registered, and the CRD `runtimeconditionsprofiles.runtimeconditions.io` installed in each cluster you want scanned. Profiles are listed from every configured cluster through the Kubernetes plugin's proxy API. No per-entity Kubernetes annotation or `kubernetes.customResources` config is needed.

Frontend:

```
yarn --cwd packages/app add @runtimeconditions/plugin-runtime-conditions
```

Then in `packages/app/src/components/catalog/EntityPage.tsx`:

```tsx
import {
  EntityRuntimeConditionsContent,
  isRuntimeConditionsAvailable,
} from '@runtimeconditions/plugin-runtime-conditions';

<EntityLayout.Route
  path="/runtime-conditions"
  title="Runtime Conditions"
  if={isRuntimeConditionsAvailable}
>
  <EntityRuntimeConditionsContent />
</EntityLayout.Route>
```

Backend, only if adapters will report fulfillments:

```
yarn --cwd packages/backend add @runtimeconditions/plugin-runtime-conditions-backend
```

```ts
backend.add(import('@runtimeconditions/plugin-runtime-conditions-backend'));
```

Open any Component with a `backstage.io/source-location` annotation. A "Runtime Conditions" tab appears.

## Documentation

- [Usage: critical-path workflows](docs/usage.md)
- [Architecture and API reference](docs/architecture.md)
- [Fulfillment API for adapters](docs/fulfillment-api.md)
- [Releases](docs/releases.md)

## Ecosystem

Part of the Runtime Conditions org, https://github.com/runtimeconditions:

- [spec](https://github.com/runtimeconditions/spec): the Runtime Conditions specification
- [extensions](https://github.com/runtimeconditions/extensions): first-party extension definitions; profile extension URLs link here
- [rc-demos](https://github.com/runtimeconditions/rc-demos): demos, including the `cilium-policy/adapter` fulfillment adapter
- [rc-cli](https://github.com/runtimeconditions/rc-cli): CLI that generates and validates profiles
- [go-rc-profiler](https://github.com/runtimeconditions/go-rc-profiler), [java-rc-profiler](https://github.com/runtimeconditions/java-rc-profiler), [python-rc-profiler](https://github.com/runtimeconditions/python-rc-profiler): language profilers
- https://runtimeconditions.github.io: public reader guide

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
