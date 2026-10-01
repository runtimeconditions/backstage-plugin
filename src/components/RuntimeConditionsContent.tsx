import { useEntity } from '@backstage/plugin-catalog-react';
import { discoveryApiRef, fetchApiRef, useApi, useApiHolder } from '@backstage/core-plugin-api';
import { kubernetesApiRef } from '@backstage/plugin-kubernetes-react';
import { parseEntityRef } from '@backstage/catalog-model';
import useAsync from 'react-use/esm/useAsync';
import {
  InfoCard,
  Table,
  Link,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import { deploymentsForEntity, fetchAllProfiles, RuntimeConditionsProfile } from '../profiles';
import { fetchFulfillments, FulfillmentRecord } from '../fulfillments';

interface ConditionRow {
  name?: string;
  kind: string;
  interfaceType: string;
  optional: string;
  fulfillmentCount: string;
  fulfillments: FulfillmentRecord[];
}

interface ResourceRow {
  environment: string;
  kind: string;
  provider: string;
  reference: string;
  kubernetesLink?: string;
  automation: string;
}

function kubernetesEntityLink(componentRef?: string): string | undefined {
  if (!componentRef) return undefined;
  try {
    const { kind, namespace, name } = parseEntityRef(componentRef);
    return `/catalog/${namespace}/${kind}/${name}/kubernetes`;
  } catch {
    return undefined;
  }
}

const ProfileCard = ({
  cluster,
  profile,
}: {
  cluster: string;
  profile: RuntimeConditionsProfile;
}) => {
  const discoveryApi = useApi(discoveryApiRef);
  const fetchApi = useApi(fetchApiRef);
  const { value: fulfillments } = useAsync(
    () => fetchFulfillments(discoveryApi, fetchApi, profile.metadata.name),
    [profile.metadata.name],
  );

  const data: ConditionRow[] = profile.conditions.map(condition => {
    const conditionFulfillments = fulfillments?.filter(f => f.condition === condition.name) ?? [];
    const environmentCount = new Set(conditionFulfillments.map(f => f.environment)).size;
    return {
      name: condition.name,
      kind: condition.kind,
      interfaceType: condition.interface.type,
      optional: condition.optional ? 'yes' : 'no',
      fulfillmentCount:
        environmentCount === 0 ? 'none' : `${environmentCount} environment${environmentCount === 1 ? '' : 's'}`,
      fulfillments: conditionFulfillments,
    };
  });

  return (
    <InfoCard
      title={`Runtime Conditions: ${profile.metadata.name}`}
      subheader={`${profile.workload.uri} on ${cluster}`}
    >
      <p>Extensions:</p>
      <ul>
        {profile.extensions.map(extension => (
          <li key={extension}>
            <a href={extension} target="_blank" rel="noreferrer">
              {extension}
            </a>
          </li>
        ))}
      </ul>
      <Table
        options={{ paging: false, search: false }}
        columns={[
          { title: 'Name', field: 'name' },
          { title: 'Kind', field: 'kind' },
          { title: 'Interface', field: 'interfaceType' },
          { title: 'Optional', field: 'optional' },
          { title: 'Fulfilled in', field: 'fulfillmentCount' },
        ]}
        data={data}
        detailPanel={({ rowData: { fulfillments: rowFulfillments } }: { rowData: ConditionRow }) => {
          const resourceRows: ResourceRow[] = rowFulfillments.flatMap(f =>
            f.resources.map(r => ({
              environment: f.environment,
              kind: r.kind,
              provider: r.provider,
              reference: r.reference,
              kubernetesLink: r.provider === 'kubernetes' ? kubernetesEntityLink(r.componentRef) : undefined,
              automation: r.automation ? r.automation.tool : '—',
            })),
          );
          if (resourceRows.length === 0) {
            return <p style={{ margin: 16 }}>No fulfillments reported for this condition.</p>;
          }
          return (
            <div style={{ margin: 16 }}>
              <Table
                options={{ paging: false, search: false, toolbar: false }}
                columns={[
                  { title: 'Environment', field: 'environment' },
                  { title: 'Kind', field: 'kind' },
                  { title: 'Provider', field: 'provider' },
                  {
                    title: 'Reference',
                    field: 'reference',
                    render: (row: ResourceRow) =>
                      row.kubernetesLink ? (
                        <Link to={row.kubernetesLink}>{row.reference}</Link>
                      ) : (
                        row.reference
                      ),
                  },
                  { title: 'Automation', field: 'automation' },
                ]}
                data={resourceRows}
              />
            </div>
          );
        }}
      />
    </InfoCard>
  );
};

export const RuntimeConditionsContent = () => {
  const { entity } = useEntity();
  const kubernetesApi = useApiHolder().get(kubernetesApiRef);
  const { value, loading, error } = useAsync(
    () => (kubernetesApi ? fetchAllProfiles(kubernetesApi) : Promise.resolve([])),
    [kubernetesApi],
  );

  if (loading) return <Progress />;
  if (error) return <ResponseErrorPanel error={error} />;

  const deployments = deploymentsForEntity(value ?? [], entity);

  if (deployments.length === 0) {
    return (
      <InfoCard title="Runtime Conditions">
        No RuntimeConditionsProfile found for this component.
      </InfoCard>
    );
  }

  return (
    <>
      {deployments.map(({ cluster, profile }) => (
        <ProfileCard key={cluster} cluster={cluster} profile={profile} />
      ))}
    </>
  );
};
