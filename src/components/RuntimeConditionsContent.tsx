import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi } from '@backstage/core-plugin-api';
import { kubernetesApiRef } from '@backstage/plugin-kubernetes-react';
import useAsync from 'react-use/esm/useAsync';
import {
  InfoCard,
  Table,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import { deploymentsForEntity, fetchAllProfiles } from '../profiles';

export const RuntimeConditionsContent = () => {
  const { entity } = useEntity();
  const kubernetesApi = useApi(kubernetesApiRef);
  const { value, loading, error } = useAsync(
    () => fetchAllProfiles(kubernetesApi),
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
        <InfoCard
          key={cluster}
          title={`Runtime Conditions: ${profile.metadata.name}`}
          subheader={`${profile.workload.uri} on ${cluster}`}
        >
          <p>Extensions: {profile.extensions.join(', ')}</p>
          <Table
            options={{ paging: false, search: false }}
            columns={[
              { title: 'Name', field: 'name' },
              { title: 'Kind', field: 'kind' },
              { title: 'Interface', field: 'interfaceType' },
              { title: 'Optional', field: 'optional' },
            ]}
            data={profile.conditions.map(condition => ({
              name: condition.name,
              kind: condition.kind,
              interfaceType: condition.interface.type,
              optional: condition.optional ? 'yes' : 'no',
            }))}
          />
        </InfoCard>
      ))}
    </>
  );
};
