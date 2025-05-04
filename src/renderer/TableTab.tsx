import React, { useState, useEffect, useRef } from 'react';
import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

interface TableTabProps {
  tabId: string;
  tableName: string;
  onTableNameChange: (name: string) => void;
}

interface FilterExpression {
  id: string;
  attributeName: string;
  operator: string;
  value: string;
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
  const [currentResizer, setCurrentResizer] = useState<{ column: string; startX: number } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const clientConfig = {
    region: 'ap-southeast-2', // Sydney region
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
      const message = `The following environment variables need to be set:\n${missingVars.map(v => `export ${v}=<value>`).join('\n')}`;
      alert(message);
      return false;
    }
    return true;
  };

  // Add env var check on mount
  useEffect(() => {
    checkRequiredEnvVars();
  }, []);

  // Load saved state
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

  // Save state when it changes
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
          // Set the first table as default if none is selected
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
        // Build filter expression and expression attribute values
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

  const addFilter = () => {
    setFilters([
      ...filters,
      {
        id: Date.now().toString(),
        attributeName: '',
        operator: '=',
        value: ''
      }
    ]);
  };

  const updateFilter = (id: string, updates: Partial<FilterExpression>) => {
    setFilters(filters.map(filter =>
      filter.id === id ? { ...filter, ...updates } : filter
    ));
  };

  const removeFilter = (id: string) => {
    setFilters(filters.filter(filter => filter.id !== id));
  };

  const handleResizerMouseDown = (e: React.MouseEvent, column: string) => {
    e.preventDefault();
    setCurrentResizer({
      column,
      startX: e.clientX
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!currentResizer) return;

      const diff = e.clientX - currentResizer.startX;
      const currentWidth = columnWidths[currentResizer.column] || 150;
      const newWidth = Math.max(50, currentWidth + diff);

      setColumnWidths(prev => ({
        ...prev,
        [currentResizer.column]: newWidth
      }));
    };

    const handleMouseUp = () => {
      setCurrentResizer(null);
    };

    if (currentResizer) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [currentResizer]);

  const handleCellDoubleClick = (e: React.MouseEvent<HTMLElement>) => {
    const cell = e.currentTarget;

    // Remove existing selections
    document.querySelectorAll('.cell-content.selected').forEach(el =>
      el.classList.remove('selected')
    );

    // Create a range to select the content
    const range = document.createRange();
    const selection = window.getSelection();

    // Find the text content excluding the quotes
    const textNode = Array.from(cell.childNodes)
      .find(node => node.nodeType === Node.TEXT_NODE);

    if (textNode && selection) {
      const text = textNode.textContent ?? '';
      const start = text.startsWith('"') ? 1 : 0;
      const end = text.endsWith('"') ? text.length - 1 : text.length;

      range.setStart(textNode, start);
      range.setEnd(textNode, end);

      selection.removeAllRanges();
      selection.addRange(range);

      cell.classList.add('selected');
    }
  };

  const renderResults = () => {
    if (items.length === 0) return null;

    const columns = Array.from(
      new Set(items.flatMap(item => Object.keys(item)))
    );

    return (
      <table ref={tableRef}>
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col}
                style={{ width: columnWidths[col] || 150 }}
              >
                {col}
                <div
                  role="button"
                  aria-orientation="vertical"
                  aria-label={`Resize ${col} column`}
                  className="resizer"
                  onMouseDown={(e) => handleResizerMouseDown(e, col)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleResizerMouseDown(e as unknown as React.MouseEvent, col);
                    }
                  }}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={`${tabId}-${idx}-${Object.values(item).join('-')}`}>
              {columns.map(col => (
                <td
                  key={col}
                  onDoubleClick={handleCellDoubleClick}
                  className="cell-content"
                  style={{ width: columnWidths[col] || 150 }}
                >
                  {JSON.stringify(item[col] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div>
      <div className="filter-container">
        {loadingTables ? (
          <span className="loading-text">Loading tables...</span>
        ) : (
          <select
            value={tableName}
            onChange={(e) => onTableNameChange(e.target.value)}
            className="table-select"
          >
            <option value="">Select a table</option>
            {tables.map(table => (
              <option key={table} value={table}>{table}</option>
            ))}
          </select>
        )}

        <div className="filters-section">
          {filters.map((filter) => (
            <div key={filter.id} className="filter-row">
              <input
                type="text"
                placeholder="Attribute name"
                value={filter.attributeName}
                onChange={(e) => updateFilter(filter.id, { attributeName: e.target.value })}
              />
              <select
                value={filter.operator}
                onChange={(e) => updateFilter(filter.id, { operator: e.target.value })}
              >
                <option value="=">=</option>
                <option value="<">&lt;</option>
                <option value="<=">&lt;=</option>
                <option value=">">&gt;</option>
                <option value=">=">&gt;=</option>
                <option value="begins_with">begins_with</option>
              </select>
              <input
                type="text"
                placeholder="Value"
                value={filter.value}
                onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
              />
              <button
                onClick={() => removeFilter(filter.id)}
                className="secondary"
                aria-label="Remove filter"
              >
                ✕
              </button>
            </div>
          ))}

          <div className="actions-row">
            <button
              onClick={addFilter}
              className="secondary"
            >
              Add Filter
            </button>
            <button
              onClick={executeQuery}
              disabled={loading || !tableName}
              className="primary"
            >
              {loading ? 'Loading...' : 'Query'}
            </button>
          </div>
        </div>
      </div>
      {renderResults()}
    </div>
  );
};