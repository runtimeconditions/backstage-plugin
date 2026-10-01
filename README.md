# backstage-plugin
A Backstage Plugin for supporting Runtime Conditions Profiles

Adds a "Runtime Conditions" tab to a Component's page. A `RuntimeConditionsProfile`
describes one codebase, independent of where it's deployed, so a single profile
can exist as a resource in more than one cluster (dev, prod, federal, and so
on). The tab shows one card per cluster where a matching profile is found,
each is a distinct deployment of that codebase.

Each card shows the profile's workload, its extensions, and its declared
conditions, alongside which resource fulfilled each condition, if a platform
adapter (see `runtimeconditions/rc-demos/tree/main/cilium-policy/adapter` for
an example) has reported one through the fulfillment API below. Fulfillment
is never inferred by this plugin, only reported by an adapter.

## Install

Add this repo as a dependency in your app's `packages/app`, then in
`packages/app/src/components/catalog/EntityPage.tsx`:

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

Requires the Kubernetes plugin already configured in the app, with at least
one cluster registered, since profiles are currently read as
`RuntimeConditionsProfile` custom resources from every configured cluster.
No per-entity Kubernetes annotation or `kubernetes.customResources` config is
needed: this plugin lists profiles directly through the Kubernetes plugin's
proxy API rather than the entity-scoped fetch.

## Correlating a Profile to a Component

A profile describes a codebase, not a deployment, so it's matched by
identity, not by Kubernetes labels. A `RuntimeConditionsProfile` is shown on
a Component's page when its `workload.uri` equals that Component's
`backstage.io/source-location` annotation (with the `url:` prefix stripped).
The same profile can be found in more than one cluster; each is shown as its
own deployment.

Profile YAML doesn't have to live in Kubernetes at all, it can just as well
live in a Git repo or a file server. This plugin only reads it from
Kubernetes today because that's the only source wired up so far; the
correlation and rendering logic here doesn't assume Kubernetes, only the
current fetch does.

## Fulfillment API

`backend/` is `@runtimeconditions/plugin-runtime-conditions-backend`, a
companion backend plugin an adapter reports fulfillment to. Add it to your
app's `packages/backend`:

```ts
backend.add(import('@runtimeconditions/plugin-runtime-conditions-backend'));
```

An adapter registers a fulfillment with:

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

- A condition is often fulfilled by more than one resource, e.g. a
  `CiliumNetworkPolicy` plus a cert-manager `Certificate` for an API
  condition, or a database plus a `CiliumNetworkPolicy` plus a `Secret` for a
  datastore condition, so `resources` is always an array, never a single
  object.
- Each resource's `reference` is whatever uniquely identifies it in its
  environment, e.g. `cluster/namespace/kind/name` for Kubernetes or an ARN
  for a cloud resource.
- `resource.provider` and `resource.automation.tool` are free-form strings,
  not an enum, since the set of platforms and automation tools isn't fixed.
- `resource.componentRef` and `resource.automation` are optional. When a
  resource's `provider` is `"kubernetes"` and it carries a `componentRef`,
  the frontend links its reference to that component's Kubernetes tab in the
  Kubernetes Backstage plugin.
- `automation` lives on each resource, not on the fulfillment as a whole,
  because a single POST doesn't have to come from one adapter's work: a
  platform composed of several independent adapters (say, separate Kratix
  Promises for network policy, certificates, and secrets) can each POST
  their own resources for the same condition and environment, and each
  resource keeps its own automation provenance.

Every POST is purely additive, nothing is ever looked up by key and
overwritten, so multiple adapters can post to the same profile, condition,
and even the same environment concurrently without racing or clobbering
each other; each POST's resources simply show up alongside whatever else
has already been reported for that condition.

The frontend reads `GET /api/runtime-conditions/fulfillments?profileName=...`.
A single condition can be fulfilled in more than one environment (dev, prod,
federal), each independently, so the conditions table shows how many
distinct environments have reported a fulfillment for that condition, even
if multiple adapters posted to the same one; expanding a row shows a table
of every environment, resource, and automation tool involved. A condition
with no reported fulfillment shows none, it is never inferred.
