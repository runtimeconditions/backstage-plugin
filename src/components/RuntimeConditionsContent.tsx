import { useEntity } from '@backstage/plugin-catalog-react';
import {
  useCustomResources,
  useKubernetesObjects,
} from '@backstage/plugin-kubernetes-react';
import {
  InfoCard,
  Table,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';

const matchers = [
  {
    group: 'runtimeconditions.io',
    apiVersion: 'v1alpha1',
    plural: 'runtimeconditionsprofiles',
  },
];

function envSources(resources: any[]): Map<string, string> {
  const sources = new Map<string, string>();
  for (const response of resources) {
    if (response.type !== 'pods') continue;
    for (const pod of response.resources) {
      for (const container of pod.spec?.containers ?? []) {
        for (const env of container.env ?? []) {
          if (env.value !== undefined && !sources.has(env.name)) {
            sources.set(env.name, pod.metadata?.name ?? '');
          }
        }
      }
    }
  }
  return sources;
}

function conditionRows(profile: any, sources: Map<string, string>) {
  return profile.conditions.map((condition: any) => {
    const envNames = (condition.configuration?.env ?? []).map(
      (e: any) => e.name,
    );
    const fulfillingResources = envNames.map((name: string) =>
      sources.get(name),
    );
    return {
      name: condition.name,
      kind: condition.kind,
      interfaceType: condition.interface?.type,
      optional: condition.optional ? 'yes' : 'no',
      fulfilled:
        envNames.length === 0
          ? 'unknown'
          : fulfillingResources.every(Boolean)
          ? 'yes'
          : 'no',
      resource: fulfillingResources.find(Boolean) ?? '',
    };
  });
}

export const RuntimeConditionsContent = () => {
  const { entity } = useEntity();
  const profiles = useCustomResources(entity, matchers);
  const workloads = useKubernetesObjects(entity);

  if (profiles.loading || workloads.loading) return <Progress />;
  if (profiles.error) return <ResponseErrorPanel error={new Error(profiles.error)} />;
  if (workloads.error) return <ResponseErrorPanel error={new Error(workloads.error)} />;

  const deployments = (profiles.kubernetesObjects?.items ?? [])
    .map(item => ({
      cluster: item.cluster,
      profile: item.resources.flatMap(response => response.resources)[0],
      resources:
        workloads.kubernetesObjects?.items.find(
          w => w.cluster.name === item.cluster.name,
        )?.resources ?? [],
    }))
    .filter(deployment => deployment.profile);

  if (deployments.length === 0) {
    return (
      <InfoCard title="Runtime Conditions">
        No RuntimeConditionsProfile found for this component.
      </InfoCard>
    );
  }

  return (
    <>
      {deployments.map(({ cluster, profile, resources }) => (
        <InfoCard
          key={cluster.name}
          title={`Runtime Conditions: ${profile.metadata.name}`}
          subheader={`${profile.workload.uri} on ${cluster.title ?? cluster.name}`}
        >
          <p>Extensions: {profile.extensions.join(', ')}</p>
          <Table
            options={{ paging: false, search: false }}
            columns={[
              { title: 'Name', field: 'name' },
              { title: 'Kind', field: 'kind' },
              { title: 'Interface', field: 'interfaceType' },
              { title: 'Optional', field: 'optional' },
              { title: 'Fulfilled', field: 'fulfilled' },
              { title: 'Resource', field: 'resource' },
            ]}
            data={conditionRows(profile, envSources(resources))}
          />
        </InfoCard>
      ))}
    </>
  );
};
