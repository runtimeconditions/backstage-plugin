import { Entity } from '@backstage/catalog-model';
import {
  deploymentsForEntity,
  entitySourceLocationUrl,
  ProfileDeployment,
  RuntimeConditionsProfile,
} from './profiles';

const requestCoordinatorUri =
  'https://github.com/runtimeconditions/rc-demos/tree/main/cilium-policy/apps/resource-demo/services/request-coordinator';

const requestCoordinatorProfile: RuntimeConditionsProfile = {
  metadata: { name: 'request-coordinator' },
  workload: { uri: requestCoordinatorUri, version: 'dev' },
  extensions: [
    'https://runtimeconditions.io/extensions/common-integrations/v1alpha1/runtimeconditions.extension.yaml',
    'https://runtimeconditions.io/extensions/env-configuration/v1alpha1/runtimeconditions.extension.yaml',
  ],
  conditions: [
    {
      name: 'available-stock-capability',
      kind: 'api',
      interface: { type: 'http' },
    },
    {
      name: 'delivery-work-capability',
      kind: 'api',
      interface: { type: 'http' },
    },
    {
      name: 'durable-request-history',
      kind: 'datastore',
      interface: { type: 'relational', engine: 'postgres' },
    },
    {
      name: 'transient-request-lookup',
      kind: 'cache',
      interface: { type: 'key_value', engine: 'redis' },
    },
  ],
};

function componentWithSourceLocation(sourceLocation?: string): Entity {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'request-coordinator',
      annotations: sourceLocation
        ? { 'backstage.io/source-location': sourceLocation }
        : {},
    },
    spec: { type: 'service' },
  };
}

describe('entitySourceLocationUrl', () => {
  it('strips the url: prefix', () => {
    expect(
      entitySourceLocationUrl(
        componentWithSourceLocation(`url:${requestCoordinatorUri}`),
      ),
    ).toBe(requestCoordinatorUri);
  });

  it('returns undefined without a source-location annotation', () => {
    expect(
      entitySourceLocationUrl(componentWithSourceLocation()),
    ).toBeUndefined();
  });
});

describe('deploymentsForEntity', () => {
  const deployments: ProfileDeployment[] = [
    { cluster: 'rc-cilium', profile: requestCoordinatorProfile },
    {
      cluster: 'rc-cilium',
      profile: {
        ...requestCoordinatorProfile,
        metadata: { name: 'donor-directory' },
        workload: { uri: 'https://github.com/other/repo' },
      },
    },
  ];

  it('matches a profile whose workload.uri equals the component source-location', () => {
    const entity = componentWithSourceLocation(`url:${requestCoordinatorUri}`);
    expect(deploymentsForEntity(deployments, entity)).toEqual([
      deployments[0],
    ]);
  });

  it('returns nothing for a component with no matching profile', () => {
    const entity = componentWithSourceLocation('url:https://github.com/other/unrelated');
    expect(deploymentsForEntity(deployments, entity)).toEqual([]);
  });

  it('returns nothing when the entity has no source-location', () => {
    expect(
      deploymentsForEntity(deployments, componentWithSourceLocation()),
    ).toEqual([]);
  });
});
