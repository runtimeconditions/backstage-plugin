# Usage: critical-path workflows

## 1. Publish a profile for your codebase

Create a `RuntimeConditionsProfile` in each cluster where the codebase is deployed (dev, prod, federal, ...):

```yaml
apiVersion: runtimeconditions.io/v1alpha1
kind: RuntimeConditionsProfile
metadata:
  name: request-coordinator
  namespace: default
spec:
  workload:
    uri: https://github.com/my-org/request-coordinator   # must equal the Component's source-location, minus "url:"
    version: v1.2.3                                        # optional
  extensions:
    - https://runtimeconditions.io/extensions/rc/stock/runtimeconditions.extension.yaml
  conditions:
    - name: available-stock-capability
      kind: Capability
      interface:
        type: rest-api
    - name: datastore
      kind: Datastore
      optional: true
      interface:
        type: postgres
```

Apply it per cluster: `kubectl apply -f profile.yaml -n default --context <cluster>`.

**Correlation check:** the Component's catalog YAML must carry
`metadata.annotations.backstage.io/source-location: url:https://github.com/my-org/request-coordinator`.
The plugin strips `url:` and compares to `workload.uri` exactly.

## 2. See the deployment on the Component page

Open the Component in Backstage, then the **Runtime Conditions** tab. You get one card per cluster where a matching profile exists. Each card shows:

- the workload URI and cluster,
- the extensions, linked to their definition in the `runtimeconditions/extensions` repo when they follow the standard URL shape,
- a conditions table with columns: Name, Kind, Interface, Optional, "Fulfilled in" (N environments, or `none`).

Expanding a condition row shows every reported fulfillment: environment, resource kind, provider, reference, and automation tool. The reference links to the referenced component's Kubernetes tab when `provider: kubernetes` and a `componentRef` was posted.

A condition with no reported fulfillment shows `none`. Fulfillment is never inferred.

## 3. Report a fulfillment from an adapter

Adapters (platform-side automation) register what fulfills a condition:

```bash
curl -X POST $BACKSTAGE_BACKEND/api/runtime-conditions/fulfillments \
  -H 'Content-Type: application/json' \
  -d '{
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
  }'
```

Rules, enforced by the backend (returns `400` otherwise):

- `profileName`, `condition`, `environment`, and a non-empty `resources` array are required. Each resource needs `kind`, `provider`, `reference`.
- `resources` is always an array. One condition is typically fulfilled by several resources (e.g. `CiliumNetworkPolicy` plus cert-manager `Certificate`).
- `reference` is whatever uniquely identifies the resource in its environment: `cluster/namespace/kind/name` for Kubernetes, an ARN for cloud, and so on.
- `provider` and `automation.tool` are free-form strings, not enums.
- `componentRef` and `automation` are optional. With `provider: "kubernetes"` and `componentRef: component:default/<name>`, the UI links the reference to that component's Kubernetes tab.
- POSTs are purely additive. Nothing is keyed or overwritten. Multiple adapters can POST the same profile, condition, and environment concurrently. Resources accumulate.

## 4. Read fulfillments back

```
GET /api/runtime-conditions/fulfillments?profileName=request-coordinator
GET /api/runtime-conditions/fulfillments?profileName=request-coordinator&condition=datastore
```

Both query params are optional filters. The frontend uses the `profileName` form.

## 5. Example adapter

See `runtimeconditions/rc-demos`, path `cilium-policy/adapter`, for a working adapter that reports CiliumNetworkPolicy fulfillments.
