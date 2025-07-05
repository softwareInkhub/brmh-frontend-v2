export interface NamespaceMethod {
  'method-id': string;
  'namespace-id': string;
  'namespace-account-method-name': string;
  'namespace-account-method-type': 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  'namespace-account-method-url-override'?: string;
  'namespace-account-method-queryParams'?: Array<{ key: string; value: string }>;
  'namespace-account-method-header'?: Array<{ key: string; value: string }>;
  'sample-request'?: string;
  'sample-response'?: string;
  'request-schema'?: string;
  'response-schema'?: string;
  'save-data'?: boolean;
  isInitialized?: boolean;
  tags: string[];
}

///htis is commntbjsdhj

export interface NamespaceAccount {
  'namespace-id': string;
  'namespace-account-id': string;
  'namespace-account-name': string;
  'namespace-account-url-override': string;
  'namespace-account-header': Array<{ key: string; value: string }>;
  'token': string;
  'variables': Array<{ key: string; value: string }>;
  tags: string[];
}

export interface Namespace {
  'namespace-id': string;
  'namespace-name': string;
  'namespace-url': string;
  'namespace-accounts': NamespaceAccount[];
  'namespace-methods': NamespaceMethod[];
  tags: string[];
}

export interface NamespaceInput {
  'namespace-name': string;
  'namespace-url': string;
  tags: string[];
}

export interface Account {
  'namespace-id': string;
  'namespace-account-id': string;
  'namespace-account-name': string;
  'namespace-account-url-override'?: string;
  'namespace-account-header': Array<{ key: string; value: string }>;
  'variables': Array<{ key: string; value: string }>;
  'tags': string[];
}

export interface Method {
  'namespace-id': string;
  'namespace-method-id': string;
  'namespace-method-name': string;
  'namespace-method-type': string;
  'namespace-method-url-override': string;
  'namespace-method-queryParams': Array<{ key: string; value: string }>;
  'namespace-method-header': Array<{ key: string; value: string }>;
  'save-data': boolean;
  'isInitialized': boolean;
  'tags': string[];
  'sample-request'?: Record<string, unknown>;
  'sample-response'?: Record<string, unknown>;
  'request-schema'?: Record<string, unknown>;
  'response-schema'?: Record<string, unknown>;
}

export interface WebhookData {
  id: string;
  methodId: string;
  route: string;
  tableName: string;
  createdAt: string;
}

export interface ExecutionLog {
  'exec-id': string;
  'child-exec-id': string;
  data: {
    'execution-id': string;
    'request-url'?: string;
    'status'?: 'success' | 'completed' | 'error' | 'in-progress';
    'total-items-processed'?: number;
    'iteration-no'?: number;
    'items-in-current-page'?: number;
    'response-status'?: number;
    'pagination-type'?: string;
    'timestamp'?: string;
    'is-last'?: boolean;
  };
} 

