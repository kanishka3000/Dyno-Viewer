import { DynamoDBClient, ListTablesCommand, ScanCommand, QueryCommand, DescribeTableCommand, ListTablesCommandOutput } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoDBService, DynamoDBConfig, PaginatedQueryResult, QueryOptions, KeySchemaInfo } from './DynamoDBService';
import { FilterExpression } from '../components/FilterSection';

export class AWSDynamoDBService implements DynamoDBService {
  private readonly client: DynamoDBClient;
  private readonly docClient: DynamoDBDocumentClient;
  // Cache for table key schemas
  private keySchemaCache: Map<string, KeySchemaInfo> = new Map();

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

  async fetchSampleItem(tableName: string): Promise<any | null> {
    try {
      // Query just one item to use as a sample for property names
      const command = new ScanCommand({
        TableName: tableName,
        Limit: 1 // Just get 1 item
      });

      const response = await this.docClient.send(command);
      
      if (response.Items && response.Items.length > 0) {
        return response.Items[0];
      }
      return null;
    } catch (error) {
      console.error('Error fetching sample item:', error);
      return null;
    }
  }

  async scanTable(tableName: string, filters: FilterExpression[], options: QueryOptions): Promise<PaginatedQueryResult> {
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

  async getTableKeySchema(tableName: string): Promise<KeySchemaInfo | null> {
    // Check cache first
    if (this.keySchemaCache.has(tableName)) {
      return this.keySchemaCache.get(tableName) || null;
    }

    try {
      const command = new DescribeTableCommand({
        TableName: tableName,
      });

      const response = await this.client.send(command);
      
      if (!response.Table) {
        return null;
      }

      const { Table } = response;
      const keySchemaInfo: KeySchemaInfo = {
        tableName,
        keySchema: {
          partitionKey: '',
          sortKey: undefined,
        },
        indexes: {},
      };

      // Extract table's key schema
      if (Table.KeySchema) {
        const partitionKeyItem = Table.KeySchema.find(k => k.KeyType === 'HASH');
        const sortKeyItem = Table.KeySchema.find(k => k.KeyType === 'RANGE');
        
        if (partitionKeyItem && partitionKeyItem.AttributeName) {
          keySchemaInfo.keySchema.partitionKey = partitionKeyItem.AttributeName;
        }
        
        if (sortKeyItem && sortKeyItem.AttributeName) {
          keySchemaInfo.keySchema.sortKey = sortKeyItem.AttributeName;
        }
      }

      // Extract local secondary indexes
      if (Table.LocalSecondaryIndexes) {
        for (const lsi of Table.LocalSecondaryIndexes) {
          if (lsi.IndexName && lsi.KeySchema) {
            const sortKeyItem = lsi.KeySchema.find(k => k.KeyType === 'RANGE');
            
            if (sortKeyItem && sortKeyItem.AttributeName) {
              if (!keySchemaInfo.indexes) keySchemaInfo.indexes = {};
              keySchemaInfo.indexes[lsi.IndexName] = {
                partitionKey: keySchemaInfo.keySchema.partitionKey, // LSIs use same partition key
                sortKey: sortKeyItem.AttributeName,
              };
            }
          }
        }
      }

      // Extract global secondary indexes
      if (Table.GlobalSecondaryIndexes) {
        for (const gsi of Table.GlobalSecondaryIndexes) {
          if (gsi.IndexName && gsi.KeySchema) {
            const partitionKeyItem = gsi.KeySchema.find(k => k.KeyType === 'HASH');
            const sortKeyItem = gsi.KeySchema.find(k => k.KeyType === 'RANGE');
            
            if (partitionKeyItem && partitionKeyItem.AttributeName) {
              if (!keySchemaInfo.indexes) keySchemaInfo.indexes = {};
              keySchemaInfo.indexes[gsi.IndexName] = {
                partitionKey: partitionKeyItem.AttributeName,
                sortKey: sortKeyItem?.AttributeName,
              };
            }
          }
        }
      }

      // Save to cache
      this.keySchemaCache.set(tableName, keySchemaInfo);
      return keySchemaInfo;
    } catch (error) {
      console.error('Error fetching table key schema:', error);
      return null;
    }
  }

  async queryTable(
    tableName: string,
    indexName: string | null,
    partitionKey: { name: string; value: string },
    sortKey: { name: string; value: string; operator: string } | null,
    filters: FilterExpression[],
    options: QueryOptions
  ): Promise<PaginatedQueryResult> {
    // Start building key condition expression
    let keyConditionExpressionParts: string[] = [];
    const expressionAttributeNames: { [key: string]: string } = {};
    const expressionAttributeValues: { [key: string]: any } = {};
    
    // Add partition key condition (always required for query)
    const partitionKeyNamePlaceholder = '#pk';
    const partitionKeyValuePlaceholder = ':pkval';
    
    keyConditionExpressionParts.push(`${partitionKeyNamePlaceholder} = ${partitionKeyValuePlaceholder}`);
    expressionAttributeNames[partitionKeyNamePlaceholder] = partitionKey.name;
    
    // Determine attribute type for partition key value
    const numValue = Number(partitionKey.value);
    if (!isNaN(numValue) && partitionKey.value.trim() !== '') {
      expressionAttributeValues[partitionKeyValuePlaceholder] = { N: partitionKey.value };
    } else if (partitionKey.value.toLowerCase() === 'true' || partitionKey.value.toLowerCase() === 'false') {
      expressionAttributeValues[partitionKeyValuePlaceholder] = { BOOL: partitionKey.value.toLowerCase() === 'true' };
    } else if (partitionKey.value.toLowerCase() === 'null') {
      expressionAttributeValues[partitionKeyValuePlaceholder] = { NULL: true };
    } else {
      expressionAttributeValues[partitionKeyValuePlaceholder] = { S: partitionKey.value };
    }
    
    // Add sort key condition if provided
    if (sortKey && sortKey.name && sortKey.value) {
      const sortKeyNamePlaceholder = '#sk';
      const sortKeyValuePlaceholder = ':skval';
      
      expressionAttributeNames[sortKeyNamePlaceholder] = sortKey.name;
      
      // Determine the sort key condition based on the operator
      let sortKeyCondition = '';
      if (sortKey.operator === 'begins_with') {
        sortKeyCondition = `begins_with(${sortKeyNamePlaceholder}, ${sortKeyValuePlaceholder})`;
      } else {
        sortKeyCondition = `${sortKeyNamePlaceholder} ${sortKey.operator} ${sortKeyValuePlaceholder}`;
      }
      
      keyConditionExpressionParts.push(sortKeyCondition);
      
      // Determine attribute type for sort key value
      const numSortValue = Number(sortKey.value);
      if (!isNaN(numSortValue) && sortKey.value.trim() !== '') {
        expressionAttributeValues[sortKeyValuePlaceholder] = { N: sortKey.value };
      } else if (sortKey.value.toLowerCase() === 'true' || sortKey.value.toLowerCase() === 'false') {
        expressionAttributeValues[sortKeyValuePlaceholder] = { BOOL: sortKey.value.toLowerCase() === 'true' };
      } else if (sortKey.value.toLowerCase() === 'null') {
        expressionAttributeValues[sortKeyValuePlaceholder] = { NULL: true };
      } else {
        expressionAttributeValues[sortKeyValuePlaceholder] = { S: sortKey.value };
      }
    }
    
    // Build filter expression from additional filters
    const { FilterExpression, ExpressionAttributeValues: filterValues, ExpressionAttributeNames: filterNames } = 
      this.buildKeyConditions(filters);
    
    // Merge filter expression attribute names and values with key condition ones
    if (filterNames) {
      Object.entries(filterNames).forEach(([key, value]) => {
        expressionAttributeNames[key] = value;
      });
    }
    
    if (filterValues) {
      Object.entries(filterValues).forEach(([key, value]) => {
        expressionAttributeValues[key] = value;
      });
    }
    
    // Build the query command
    const queryParams: any = {
      TableName: tableName,
      KeyConditionExpression: keyConditionExpressionParts.join(' AND '),
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: options.limit,
      ExclusiveStartKey: options.startKey
    };
    
    // Add index name if provided
    if (indexName) {
      queryParams.IndexName = indexName;
    }
    
    // Add filter expression if there are additional filters
    if (FilterExpression) {
      queryParams.FilterExpression = FilterExpression;
    }
    
    const command = new QueryCommand(queryParams);
    
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