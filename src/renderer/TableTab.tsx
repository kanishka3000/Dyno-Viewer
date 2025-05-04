import React, { useState, useEffect } from 'react';
import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { FilterSection, type FilterExpression } from './components/FilterSection';
import { TableView } from './components/TableView';

interface TableTabProps {
  tabId: string;
  tableName: string;
  onTableNameChange: (name: string) => void;
}

interface TabState {
  tableName: string;
  filters: FilterExpression[];
  columnWidths: { [key: string]: number };
}

export const TableTab: React.FC<TableTabProps> = ({ tabId, tableName, onTableNameChange }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState<string[]>([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [filters, setFilters] = useState<FilterExpression[]>([]);
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});

  const clientConfig = {
    region: 'ap-southeast-2',
    credentials: {
      accessKeyId: process.env.DDBV_KEY_ID ?? '',
      secretAccessKey: process.env.DDBV_ACC_KEY ?? '',
    }
  };

  const client = new DynamoDBClient(clientConfig);
  const docClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      removeUndefinedValues: true,
    }
  });

  const checkRequiredEnvVars = () => {
    const requiredEnvVars = {
      'DDBV_KEY_ID': process.env.DDBV_KEY_ID,
      'DDBV_ACC_KEY': process.env.DDBV_ACC_KEY,
      'DDBV_STACK': process.env.DDBV_STACK
    };

    const missingVars = Object.entries(requiredEnvVars)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      const envVarsList = missingVars.map(v => 'export ' + v + '=<value>').join('\n');
      const message = 'The following environment variables need to be set:\n' + envVarsList;
      alert(message);
      return false;
    }
    return true;
  };

  useEffect(() => {
    checkRequiredEnvVars();
  }, []);

  useEffect(() => {
    const savedState = localStorage.getItem(`tab-${tabId}`);
    if (savedState) {
      const state: TabState = JSON.parse(savedState);
      if (state.tableName) {
        onTableNameChange(state.tableName);
      }
      if (state.filters) {
        setFilters(state.filters);
      }
      if (state.columnWidths) {
        setColumnWidths(state.columnWidths);
      }
    }
  }, [tabId]);

  useEffect(() => {
    const state: TabState = {
      tableName,
      filters,
      columnWidths
    };
    localStorage.setItem(`tab-${tabId}`, JSON.stringify(state));
  }, [tabId, tableName, filters, columnWidths]);

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const command = new ListTablesCommand({});
        const response = await client.send(command);
        if (response.TableNames) {
          const prefix = process.env.DDBV_STACK ?? '';
          if (prefix === '') {
            alert('No prefix found in environment variables. Please set DDBV_STACK.');
            return;
          }
          const filteredTables = response.TableNames.filter(name => name.startsWith(prefix));
          setTables(filteredTables);
          if (!tableName && response.TableNames.length > 0) {
            onTableNameChange(response.TableNames[0]);
          }
        }
      } catch (error) {
        alert(`Error fetching tables: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setLoadingTables(false);
      }
    };

    fetchTables();
  }, []);

  const executeQuery = async () => {
    if (!tableName) return;

    setLoading(true);
    try {
      if (filters.length > 0) {
        const filterParts: string[] = [];
        const expressionAttributeValues: { [key: string]: any } = {};

        filters.forEach((filter, index) => {
          if (filter.attributeName && filter.value) {
            const placeholder = `:value${index}`;
            filterParts.push(`${filter.attributeName} ${filter.operator} ${placeholder}`);
            expressionAttributeValues[placeholder] = filter.value;
          }
        });

        if (filterParts.length > 0) {
          const command = new ScanCommand({
            TableName: tableName,
            FilterExpression: filterParts.join(' AND '),
            ExpressionAttributeValues: expressionAttributeValues
          });
          const response = await docClient.send(command);
          setItems(response.Items ?? []);
        }
      } else {
        const command = new ScanCommand({
          TableName: tableName,
          Limit: 20
        });
        const response = await docClient.send(command);
        setItems(response.Items ?? []);
      }
    } catch (error) {
      alert(`Error querying DynamoDB: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <FilterSection
        filters={filters}
        setFilters={setFilters}
        onExecuteQuery={executeQuery}
        loading={loading}
        tableName={tableName}
        tables={tables}
        loadingTables={loadingTables}
        onTableNameChange={onTableNameChange}
      />
      <TableView
        items={items}
        columnWidths={columnWidths}
        setColumnWidths={setColumnWidths}
        tabId={tabId}
      />
    </div>
  );
};