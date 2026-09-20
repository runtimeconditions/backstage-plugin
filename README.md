# backstage-plugin
A Backstage Plugin for supporting Runtime Conditions Profiles

Adds a "Runtime Conditions" tab to a Component's page. A `RuntimeConditionsProfile`
describes one codebase, independent of where it's deployed, so a single profile
can exist as a resource in more than one cluster (dev, prod, federal, and so
on). The tab shows one card per cluster where a matching profile is found,
each is a distinct deployment of that codebase.

Each card shows the profile's workload, its extensions, and its declared
conditions. It does not show whether a condition is actually fulfilled,
fulfillment is environment-specific and is computed by a platform adapter
(see `runtimeconditions/rc-demos/tree/main/cilium-policy/adapter` for an
example), not inferred here. Once a fulfillment document or CRD shape exists,
this plugin can read and display it; tracked in
[#2](https://github.com/runtimeconditions/backstage-plugin/issues/2).

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
