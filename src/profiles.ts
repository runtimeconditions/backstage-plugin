import {
  ANNOTATION_SOURCE_LOCATION,
  Entity,
  parseLocationRef,
} from '@backstage/catalog-model';
import type { KubernetesApi } from '@backstage/plugin-kubernetes-react';

export interface ConditionInterface {
  type: string;
  [key: string]: unknown;
}

export interface Condition {
  name?: string;
  optional?: boolean;
  kind: string;
  interface: ConditionInterface;
  [key: string]: unknown;
}

export interface RuntimeConditionsProfile {
  metadata: { name: string; namespace?: string };
  workload: { uri: string; version?: string };
  extensions: string[];
  conditions: Condition[];
}

export interface ProfileDeployment {
  cluster: string;
  profile: RuntimeConditionsProfile;
}

const PROFILES_PATH =
  '/apis/runtimeconditions.io/v1alpha1/runtimeconditionsprofiles';

export async function fetchAllProfiles(
  kubernetesApi: KubernetesApi,
): Promise<ProfileDeployment[]> {
  const clusters = await kubernetesApi.getClusters();
  const perCluster = await Promise.all(
    clusters.map(async cluster => {
      const response = await kubernetesApi.proxy({
        clusterName: cluster.name,
        path: PROFILES_PATH,
      });
      if (!response.ok) return [];
      const body = await response.json();
      return (body.items ?? []).map(
        (profile: RuntimeConditionsProfile): ProfileDeployment => ({
          cluster: cluster.name,
          profile,
        }),
      );
    }),
  );
  return perCluster.flat();
}

export function entitySourceLocationUrl(entity: Entity): string | undefined {
  const sourceLocation =
    entity.metadata.annotations?.[ANNOTATION_SOURCE_LOCATION];
  if (!sourceLocation) return undefined;
  try {
    return parseLocationRef(sourceLocation).target;
  } catch {
    return undefined;
  }
}

export function deploymentsForEntity(
  deployments: ProfileDeployment[],
  entity: Entity,
): ProfileDeployment[] {
  const sourceLocationUrl = entitySourceLocationUrl(entity);
  if (!sourceLocationUrl) return [];
  return deployments.filter(
    deployment => deployment.profile.workload.uri === sourceLocationUrl,
  );
}
