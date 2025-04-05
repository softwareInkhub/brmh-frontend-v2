export interface NamespaceInput {
  'namespace-name': string;
  'namespace-url': string;
}

export interface Namespace {
  id: string;
  name: string;
  description: string;
  url: string;
  tags: string[];
}

export interface Account {
  id: string;
  name: string;
  urlOverride?: string;
  headers: Array<{ key: string; value: string }>;
  variables: Array<{ key: string; value: string }>;
  tags: string[];
}

export interface Method {
  id: string;
  name: string;
  type: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  urlOverride?: string;
  queryParams: Array<{ key: string; value: string }>;
  headers: Array<{ key: string; value: string }>;
  saveData: boolean;
  tags: string[];
}

export interface Execution {
  id: string;
  namespaceId: string;
  accountId: string;
  methodId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TableData {
  id: string;
  namespaceId: string;
  accountId: string;
  methodId: string;
  data: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface KeyValuePair {
  key: string;
  value: string;
}

export interface ApiResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

export interface ApiRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  queryParams?: Record<string, string>;
}

export interface EditFormData {
  account: {
    'namespace-account-name': string;
    'namespace-account-url-override': string;
    'namespace-account-header': KeyValuePair[];
    variables: KeyValuePair[];
    tags: string[];
  };
  method: {
    'namespace-method-name': string;
    'namespace-method-type': string;
    'namespace-method-url-override': string;
    'namespace-method-queryParams': KeyValuePair[];
    'namespace-method-header': KeyValuePair[];
    'save-data': boolean;
    tags: string[];
  };
}

export interface NamespaceState {
  namespaces: Namespace[];
  selectedNamespace: Namespace | null;
  selectedAccount: Account | null;
  selectedMethod: Method | null;
  loading: boolean;
  error: string | null;
  newNamespaceName: string;
  activeTab: 'methods' | 'accounts';
  searchQuery: string;
  accountSearchQuery: string;
  methodSearchQuery: string;
  isAddingNamespace: boolean;
  isEditingAccount: boolean;
  isEditingMethod: boolean;
  editFormData: EditFormData;
  newNamespace: {
    'namespace-name': string;
    'namespace-url': string;
    tags: string[];
  };
}
