import { FilterExpression } from '../components/FilterSection';

export interface DynamoDBService {
  listTables(): Promise<string[]>;
  queryTable(tableName: string, filters: FilterExpression[]): Promise<any[]>;
  checkCredentials(): boolean;
}

export interface DynamoDBConfig {
  region: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}