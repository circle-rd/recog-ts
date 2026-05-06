/**
 * JSON Schema definitions used to validate request and response
 * payloads. Pure data with `as const` for inference.
 */

export const matchRequestSchema = {
  type: 'object',
  required: ['db', 'data'],
  additionalProperties: false,
  properties: {
    db: { type: 'string', minLength: 1 },
    data: { type: 'string' },
    encoding: { type: 'string', enum: ['utf8', 'base64'] },
  },
} as const;

export const matchAutoRequestSchema = {
  type: 'object',
  required: ['data'],
  additionalProperties: false,
  properties: {
    data: { type: 'string' },
    encoding: { type: 'string', enum: ['utf8', 'base64'] },
    dbs: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
      uniqueItems: true,
    },
  },
} as const;

export const matchResponseSchema = {
  type: 'object',
  required: ['matched'],
  properties: {
    matched: { type: 'boolean' },
    result: {
      type: 'object',
      additionalProperties: { type: 'string' },
    },
  },
} as const;

export const matchAutoResponseSchema = {
  type: 'object',
  required: ['matches'],
  properties: {
    matches: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: { type: 'string' },
      },
    },
  },
} as const;

export const dbsResponseSchema = {
  type: 'object',
  required: ['dbs'],
  properties: {
    dbs: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'count'],
        properties: {
          name: { type: 'string' },
          matches: { type: 'string' },
          protocol: { type: 'string' },
          databaseType: { type: 'string' },
          preference: { type: 'number' },
          count: { type: 'integer' },
        },
      },
    },
  },
} as const;

export const healthResponseSchema = {
  type: 'object',
  required: ['status', 'dbs'],
  properties: {
    status: { type: 'string' },
    dbs: { type: 'integer' },
  },
} as const;
