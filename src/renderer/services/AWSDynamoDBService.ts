import { DynamoDBClient, ListTablesCommand, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoDBService, DynamoDBConfig, PaginatedQueryResult, QueryOptions } from './DynamoDBService';
import { FilterExpression } from '../components/FilterSection';

export class AWSDynamoDBService implements DynamoDBService {
  private readonly client: DynamoDBClient;
  private readonly docClient: DynamoDBDocumentClient;

  constructor(config: DynamoDBConfig) {
    this.client = new DynamoDBClient(config);
    this.docClient = DynamoDBDocumentClient.from(this.client, {
      marshallOptions: {
        removeUndefinedValues: true,
      }
    });
  }

  checkCredentials(): boolean {
    const requiredEnvVars = {
      'DDBV_KEY_ID': process.env.DDBV_KEY_ID,
      'DDBV_ACC_KEY': process.env.DDBV_ACC_KEY,
      'DDBV_STACK': process.env.DDBV_STACK
    };

    return !Object.entries(requiredEnvVars)
      .some(([_, value]) => !value);
  }

  async listTables(): Promise<string[]> {
    const command = new ListTablesCommand({});
    const response = await this.client.send(command);
    if (!response.TableNames) return [];

    const prefix = process.env.DDBV_STACK ?? '';
    if (prefix === '') {
      throw new Error('No prefix found in environment variables. Please set DDBV_STACK.');
    }
    return response.TableNames.filter(name => name.startsWith(prefix));
  }

  async queryTable(tableName: string, filters: FilterExpression[], options: QueryOptions): Promise<PaginatedQueryResult> {
    if (filters.length === 0) {
      const command = new ScanCommand({
        TableName: tableName,
        Limit: options.limit,
        ExclusiveStartKey: options.startKey
      });

      const response = await this.docClient.send(command);
      return {
        items: response.Items ?? [],
        lastEvaluatedKey: response.LastEvaluatedKey
      };
    }

    const keyConditions = this.buildKeyConditions(filters);
    const command = new QueryCommand({
      TableName: tableName,
      ...keyConditions,
      Limit: options.limit,
      ExclusiveStartKey: options.startKey
    });

    const response = await this.docClient.send(command);
    return {
      items: response.Items ?? [],
      lastEvaluatedKey: response.LastEvaluatedKey
    };
  }

  private buildKeyConditions(filters: FilterExpression[]) {
    const filterParts: string[] = [];
    const expressionAttributeValues: { [key: string]: any } = {};

    filters.forEach((filter, index) => {
      if (filter.attributeName && filter.value) {
        const placeholder = `:value${index}`;
        filterParts.push(`${filter.attributeName} ${filter.operator} ${placeholder}`);
        expressionAttributeValues[placeholder] = filter.value;
      }
    });

    return {
      FilterExpression: filterParts.join(' AND '),
      ExpressionAttributeValues: expressionAttributeValues
    };
  }

  private unmarshallItem(item: any) {
    return item; // Assuming no special unmarshalling is needed
  }
}