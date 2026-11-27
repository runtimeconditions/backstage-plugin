# Fulfillment API (for adapters)

`backend/` ships as `@runtimeconditions/plugin-runtime-conditions-backend`, a companion backend plugin that adapters report fulfillment to. Install it in `packages/backend`:

```
yarn --cwd packages/backend add @runtimeconditions/plugin-runtime-conditions-backend
```

```ts
backend.add(import('@runtimeconditions/plugin-runtime-conditions-backend'));
```

The plugin registers an auth policy allowing **unauthenticated** access to `/fulfillments`, because adapters call it without a Backstage user session. Restrict this at your ingress or API gateway if the endpoint should not be public.

## Register a fulfillment

```
POST /api/runtime-conditions/fulfillments
{
  "profileName": "request-coordinator",
  "condition": "available-stock-capability",
  "environment": "dev",
  "resources": [
    {
      "kind": "CiliumNetworkPolicy",
      "provider": "kubernetes",
      "reference": "rc-cilium/applications/request-coordinator-egress",
      "componentRef": "component:default/inventory-service",
      "automation": { "tool": "kratix", "reference": "cnp-promise" }
    }
  ]
}
```

Validation rules (the backend returns `400` otherwise):

- Required fields: `profileName`, `condition`, `environment`, and a non-empty `resources` array.
- Each resource requires `kind`, `provider`, and `reference`.
- `resources` is always an array, never a single object. One condition is often fulfilled by several resources, e.g. a `CiliumNetworkPolicy` plus a cert-manager `Certificate` for an API condition, or a database plus a `CiliumNetworkPolicy` plus a `Secret` for a datastore condition.
- `reference` is whatever uniquely identifies the resource in its environment: `cluster/namespace/kind/name` for Kubernetes, an ARN for a cloud resource.
- `provider` and `automation.tool` are free-form strings, not an enum. The set of platforms and automation tools isn't fixed.
- `componentRef` and `automation` are optional. When a resource's `provider` is `"kubernetes"` and it carries a `componentRef`, the frontend links its reference to that component's Kubernetes tab in the Kubernetes Backstage plugin.
- `automation` lives on each resource, not on the fulfillment as a whole. A platform composed of several independent adapters (separate Kratix Promises for network policy, certificates, and secrets) can each POST their own resources for the same condition and environment. Each resource keeps its own automation provenance.

POSTs are purely additive. Nothing is ever looked up by key and overwritten. Multiple adapters can post to the same profile, condition, and even the same environment concurrently without racing or clobbering each other. Each POST's resources show up alongside whatever else has been reported for that condition.

## Read fulfillments

```
GET /api/runtime-conditions/fulfillments?profileName=request-coordinator
GET /api/runtime-conditions/fulfillments?profileName=request-coordinator&condition=datastore
```

Both query params are optional filters. The frontend uses the `profileName` form.

The conditions table shows how many distinct environments have reported a fulfillment for a condition, even if multiple adapters posted to the same one. Expanding a row shows every environment, resource, and automation tool involved. A condition with no reported fulfillment shows none. It is never inferred.

## Example adapter

See `runtimeconditions/rc-demos`, path `cilium-policy/adapter`, for a working adapter that reports CiliumNetworkPolicy fulfillments.

## Storage caveat

The store is in-memory and ephemeral. A backend restart loses all fulfillments. Treat POST as "report current state" and re-post after a restart.
