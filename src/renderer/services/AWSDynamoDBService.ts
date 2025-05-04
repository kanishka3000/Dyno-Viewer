import { DynamoDBClient, ListTablesCommand, ScanCommand, ListTablesCommandOutput } from '@aws-sdk/client-dynamodb';
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
    const requiredValues = {
      'DDBV_KEY_ID': localStorage.getItem('DDBV_KEY_ID'),
      'DDBV_ACC_KEY': localStorage.getItem('DDBV_ACC_KEY')
      // Stack prefix is not required now
    };

    return !Object.entries(requiredValues)
      .some(([_, value]) => !value || value.trim() === '');
  }

  async listTables(): Promise<string[]> {
    let allTables: string[] = [];
    let exclusiveStartTableName: string | undefined = undefined;
    
    do {
      const command: ListTablesCommand = new ListTablesCommand({
        ExclusiveStartTableName: exclusiveStartTableName
      });
      
      const response: ListTablesCommandOutput = await this.client.send(command);
      if (!response.TableNames) break;
      
      allTables = [...allTables, ...response.TableNames];
      exclusiveStartTableName = response.LastEvaluatedTableName;
    } while (exclusiveStartTableName);

    const prefix = localStorage.getItem('DDBV_STACK') ?? '';
    
    // If prefix is empty, return all tables without filtering
    if (prefix === '') {
      return allTables.sort((a, b) => a.localeCompare(b));
    }
    
    // Otherwise filter by prefix
    return allTables
      .filter(name => name.startsWith(prefix))
      .sort((a, b) => a.localeCompare(b)); // Sort tables alphabetically in ascending order
  }

  async queryTable(tableName: string, filters: FilterExpression[], options: QueryOptions): Promise<PaginatedQueryResult> {
    const { FilterExpression, ExpressionAttributeValues, ExpressionAttributeNames } = this.buildKeyConditions(filters);
    
    const command = new ScanCommand({
      TableName: tableName,
      FilterExpression,
      ExpressionAttributeValues,
      ExpressionAttributeNames,
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
    const expressionAttributeNames: { [key: string]: string } = {};

    filters.forEach((filter, index) => {
      if (filter.attributeName && filter.value) {
        const valuePlaceholder = `:value${index}`;
        const namePlaceholder = `#name${index}`;
        
        // Handle attribute names (using placeholders to avoid reserved words)
        expressionAttributeNames[namePlaceholder] = filter.attributeName;

        // Build the filter expression part
        let filterPart: string;
        if (filter.operator === 'begins_with') {
          filterPart = `begins_with(${namePlaceholder}, ${valuePlaceholder})`;
        } else {
          filterPart = `${namePlaceholder} ${filter.operator} ${valuePlaceholder}`;
        }
        filterParts.push(filterPart);

        // Handle the value based on its type
        let attributeValue: any;
        // Try to parse as number first
        const numValue = Number(filter.value);
        if (!isNaN(numValue) && filter.value.trim() !== '') {
          attributeValue = { N: filter.value };
        } else if (filter.value.toLowerCase() === 'true' || filter.value.toLowerCase() === 'false') {
          attributeValue = { BOOL: filter.value.toLowerCase() === 'true' };
        } else if (filter.value.toLowerCase() === 'null') {
          attributeValue = { NULL: true };
        } else {
          attributeValue = { S: filter.value };
        }
        
        expressionAttributeValues[valuePlaceholder] = attributeValue;
      }
    });

    return {
      FilterExpression: filterParts.length > 0 ? filterParts.join(' AND ') : undefined,
      ExpressionAttributeValues: Object.keys(expressionAttributeValues).length > 0 ? expressionAttributeValues : undefined,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined
    };
  }

  private unmarshallItem(item: any) {
    return item; // Assuming no special unmarshalling is needed
  }
}