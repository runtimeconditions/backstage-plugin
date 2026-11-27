# Architecture and API reference

## Data flow

The adapter only writes. The browser only reads. The store is not a separate actor; it is just the backend plugin's memory.

```
Adapter ──POST /fulfillments──▶ backend plugin ──▶ in-memory store (append-only)
                                ▲
Browser ──▶ frontend plugin ────┘── GET /fulfillments?profileName=...
    │
    └──▶ Kubernetes plugin proxy ──GET /apis/runtimeconditions.io/v1alpha1/runtimeconditionsprofiles
              │                     (once per configured cluster)
              ▼
        profiles matched to the current entity (workload.uri == source-location)
              │
              ▼
        one card per cluster; conditions table joined with fulfillments by condition name
```

## How the pieces work

### Profile fetch

- File: `src/profiles.ts`, function `fetchAllProfiles`
- Calls `kubernetesApi.getClusters()` to list configured clusters.
- Per cluster, calls `kubernetesApi.proxy()` with path `/apis/runtimeconditions.io/v1alpha1/runtimeconditionsprofiles` (the `PROFILES_PATH` constant).
- Non-OK responses are skipped, so clusters without the CRD installed simply contribute nothing.
- Returns one `ProfileDeployment` per profile: `{ cluster, profile }`.

### Correlation

- File: `src/profiles.ts`, functions `entitySourceLocationUrl` and `deploymentsForEntity`
- The Component's `backstage.io/source-location` annotation is parsed with `parseLocationRef`, which strips the `url:` prefix. The result is compared to `profile.workload.uri`.
- Entities without the annotation match nothing. The tab is hidden for them via `isRuntimeConditionsAvailable`.
- Matching is by identity (repo URL), not by Kubernetes labels.

### Fulfillment store

- File: `backend/src/router.ts`
- A plain in-memory array. `POST /fulfillments` validates and appends (returns `201`). `GET /fulfillments` filters by optional `profileName` and `condition` query params.
- Ephemeral: a backend restart loses all fulfillments. Adapters should treat POST as "report current state" and re-post after a restart.
- File: `backend/src/plugin.ts` registers an auth policy with `allow: 'unauthenticated'` for path `/fulfillments`, so adapters can call without a Backstage session.

### Rendering

- File: `src/components/RuntimeConditionsContent.tsx`
- Extension links: URLs matching `https://runtimeconditions.io/extensions/<ns>/<name>/runtimeconditions.extension.yaml` are rewritten to `https://github.com/runtimeconditions/extensions/blob/main/catalog/rc/<ns>/<ns>-<name>.yaml`. Other URLs are shown as-is.
- Kubernetes deep links: fulfillments with `provider: "kubernetes"` and a `componentRef` render the reference as a link to `/catalog/<namespace>/<kind>/<name>/kubernetes`.
- Conditions table columns: Name, Kind, Interface, Optional, "Fulfilled in". The count is the number of distinct environments that reported a fulfillment for the condition; `none` when zero.
- Expanding a condition row shows a table of every fulfillment resource: Environment, Kind, Provider, Reference (linked as above), Automation.

## API reference

Base path: `/api/runtime-conditions` (backend plugin id `runtime-conditions`).

### `POST /fulfillments`

Registers a fulfillment. Body:

```ts
interface FulfillmentRecord {
  profileName: string;             // required
  profileNamespace?: string;       // optional
  condition: string;               // required; matches profile.conditions[].name
  environment: string;             // required, e.g. "dev", "prod", "federal"
  resources: FulfillingResource[]; // required, non-empty
}
interface FulfillingResource {
  kind: string;                    // required, e.g. "CiliumNetworkPolicy"
  provider: string;                // required, free-form, e.g. "kubernetes"
  reference: string;               // required; unique id in its environment
  componentRef?: string;           // optional, e.g. "component:default/inventory-service"
  automation?: { tool: string; reference?: string }; // optional provenance
}
```

Responses:

- `201` with the stored record
- `400` with an error message if validation fails

### `GET /fulfillments?profileName=...&condition=...`

Returns the array of stored records matching the filters (both optional). Always `200`.

## Frontend exports (`src/index.ts`)

- `runtimeConditionsPlugin`: the plugin object created with `createPlugin`. Id: `runtime-conditions`. It registers one route, `entityContent`, which is the mount point for the entity tab.
- `EntityRuntimeConditionsContent`: the routable extension rendered inside the tab. Fetches profiles via the Kubernetes API, correlates them to the current entity, and renders one card per matching cluster.
- `isRuntimeConditionsAvailable(entity)`: route guard for `EntityLayout.Route`. Returns true when the entity has a `backstage.io/source-location` annotation.
