export interface FulfillingAutomation {
  tool: string;
  reference?: string;
}

export interface FulfillingResource {
  kind: string;
  provider: string;
  reference: string;
  componentRef?: string;
  automation?: FulfillingAutomation;
}

export interface FulfillmentRecord {
  profileName: string;
  profileNamespace?: string;
  condition: string;
  environment: string;
  resources: FulfillingResource[];
}
