import { FilterExpression } from '../components/FilterSection';

export interface PaginatedQueryResult {
  items: any[];
  lastEvaluatedKey?: any;
}

export interface QueryOptions {
  limit: number;
  startKey?: any;
}

export interface DynamoDBService {
  listTables(): Promise<string[]>;
  queryTable(tableName: string, filters: FilterExpression[], options: QueryOptions): Promise<PaginatedQueryResult>;
  checkCredentials(): boolean;
}

export interface DynamoDBConfig {
  region: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}