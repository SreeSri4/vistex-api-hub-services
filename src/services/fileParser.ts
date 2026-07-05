import { TenantConfig } from '../types';

export const parseConfigFile = (jsonString: string): TenantConfig => {
  try {
    const config = JSON.parse(jsonString) as TenantConfig;

    // Validate structure
    if (!config.tenants || !Array.isArray(config.tenants)) {
      throw new Error('Invalid config: missing "tenants" array');
    }

    for (const tenant of config.tenants) {
      if (!tenant.id || !tenant.name) {
        throw new Error('Invalid tenant: missing "id" or "name"');
      }
      if (!tenant.apis || !Array.isArray(tenant.apis)) {
        throw new Error(`Invalid tenant '${tenant.name}': missing "apis" array`);
      }

      for (const api of tenant.apis) {
        if (!api.id || !api.name || !api.baseUrl || !api.endpoints) {
          throw new Error(
            `Invalid API in '${tenant.name}': missing required fields`
          );
        }
        if (!Array.isArray(api.endpoints)) {
          throw new Error(
            `Invalid API '${api.name}': "endpoints" must be an array`
          );
        }
      }
    }

    return config;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`JSON parsing error: ${error.message}`);
    }
    throw error;
  }
};

export const validateEndpoint = (endpoint: any): boolean => {
  return (
    endpoint.path &&
    endpoint.method &&
    ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'].includes(
      endpoint.method
    )
  );
};
