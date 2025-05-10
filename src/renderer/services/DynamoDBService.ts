import { FilterExpression } from '../components/FilterSection';

export interface PaginatedQueryResult {
  items: any[];
  lastEvaluatedKey?: any;
}

export interface QueryOptions {
  limit: number;
  startKey?: any;
}

// Interface for table/index key schema information
export interface KeySchemaInfo {
  tableName: string;
  keySchema: {
    partitionKey: string;
    sortKey?: string;
  };
  indexes?: {
    [indexName: string]: {
      partitionKey: string;
      sortKey?: string;
    }
  };
}

export interface DynamoDBService {
  listTables(): Promise<string[]>;
  scanTable(tableName: string, filters: FilterExpression[], options: QueryOptions): Promise<PaginatedQueryResult>;
  fetchSampleItem(tableName: string): Promise<any | null>;
  checkCredentials(): boolean;
  
  // New methods for querying
  getTableKeySchema(tableName: string): Promise<KeySchemaInfo | null>;
  queryTable(
    tableName: string, 
    indexName: string | null, 
    partitionKey: { name: string; value: string },
    sortKey: { name: string; value: string; operator: string } | null,
    filters: FilterExpression[], 
    options: QueryOptions
  ): Promise<PaginatedQueryResult>;
}

export interface DynamoDBConfig {
  region: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}