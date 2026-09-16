# backstage-plugin
A Backstage Plugin for supporting Runtime Conditions Profiles

Adds a "Runtime Conditions" tab to a Component's page. A codebase can be
deployed to more than one cluster (dev, prod, federal, and so on), so the tab
shows one card per cluster where a matching `RuntimeConditionsProfile` is
found, each is a distinct deployment of that codebase. Each card shows the
workload, extensions, and conditions, plus whether each condition is
fulfilled in that cluster and which Kubernetes resource fulfills it, based on
whether the condition's configured environment variables are actually set on
a running pod there.

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

Requires the Kubernetes plugin already configured for the entity (a
`backstage.io/kubernetes-id` annotation on the Component), and the cluster's
`kubernetes.customResources` config including:

```yaml
- group: runtimeconditions.io
  apiVersion: v1alpha1
  plural: runtimeconditionsprofiles
  objectType: customresources
```

## Correlating a Profile to a Component

A `RuntimeConditionsProfile` resource is shown on a Component's page when it
carries the same `backstage.io/kubernetes-id` label as that Component's other
workloads in that cluster. Its `workload.uri` should also point at the
Component's `backstage.io/source-location` so the two stay traceable to the
same codebase even outside Backstage. The same label can exist in more than
one cluster the Kubernetes plugin is configured against, each is shown as
its own deployment rather than picking just one.
