import { APIDefinition, OpenAPISpec } from '../types';
import * as yaml from 'js-yaml';

export const convertToOpenAPI = (api: APIDefinition): OpenAPISpec => {
  const paths: Record<string, Record<string, any>> = {};

  // Group endpoints by path
  const groupedByPath = api.endpoints.reduce(
    (acc, endpoint) => {
      if (!acc[endpoint.path]) {
        acc[endpoint.path] = [];
      }
      acc[endpoint.path].push(endpoint);
      return acc;
    },
    {} as Record<string, typeof api.endpoints>
  );

  // Convert endpoints to OpenAPI paths
  for (const [path, endpoints] of Object.entries(groupedByPath)) {
    paths[path] = {};

    for (const endpoint of endpoints) {
      const method = endpoint.method.toLowerCase();

      const operation: any = {
        summary: endpoint.summary || endpoint.description,
        description: endpoint.description,
        tags: endpoint.tags || [],
        responses: endpoint.responses || {
          '200': {
            description: 'Successful response',
          },
        },
      };

      // Add parameters if any
      if (endpoint.parameters && endpoint.parameters.length > 0) {
        operation.parameters = endpoint.parameters.map((param) => ({
          name: param.name,
          in: param.in,
          description: param.description,
          required: param.required || false,
          schema: param.schema || { type: 'string' },
        }));
      }

      // Add request body if any
      if (endpoint.requestBody) {
        operation.requestBody = {
          description: endpoint.requestBody.description,
          required: endpoint.requestBody.required || false,
          content: endpoint.requestBody.content || {
            'application/json': {
              schema: {
                type: 'object',
              },
            },
          },
        };
      }

      paths[path][method] = operation;
    }
  }

  const spec: OpenAPISpec = {
    openapi: '3.0.0',
    info: {
      title: api.name,
      version: api.version || '1.0.0',
      description: api.description,
      contact: api.contact,
      license: api.license,
    },
    servers: [
      {
        url: api.baseUrl,
        description: 'API Server',
      },
    ],
    paths,
    tags: api.tags,
  };

  return spec;
};

export const specToYAML = (spec: OpenAPISpec): string => {
  return yaml.dump(spec as any, { indent: 2 });
};

export const specToJSON = (spec: OpenAPISpec): string => {
  return JSON.stringify(spec, null, 2);
};
