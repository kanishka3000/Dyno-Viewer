import React, { useState, useEffect } from 'react';
import { KeySchemaInfo } from '../services/DynamoDBService';

interface FilterExpression {
  id: string;
  attributeName: string;
  operator: string;
  value: string;
}

interface FilterSectionProps {
  filters: FilterExpression[];
  setFilters: (filters: FilterExpression[]) => void;
  onExecuteQuery: () => void;
  loading: boolean;
  tableName: string;
  tables: string[];
  loadingTables: boolean;
  onTableNameChange: (name: string) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (value: number) => void;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onNextPage: () => void;
  onPreviousPage: () => void;
  sampleItemProperties?: string[];
  loadingProperties?: boolean;
  // New props for query feature
  operationType: 'scan' | 'query';
  setOperationType: (type: 'scan' | 'query') => void;
  tableKeySchema: KeySchemaInfo | null;
  loadingKeySchema: boolean;
  selectedIndex: string | null;
  setSelectedIndex: (indexName: string | null) => void;
  partitionKeyValue: string;
  setPartitionKeyValue: (value: string) => void;
  sortKeyValue: string;
  setSortKeyValue: (value: string) => void;
  sortKeyOperator: string;
  setSortKeyOperator: (operator: string) => void;
}

export const FilterSection: React.FC<FilterSectionProps> = ({
  filters,
  setFilters,
  onExecuteQuery,
  loading,
  tableName,
  tables,
  loadingTables,
  onTableNameChange,
  itemsPerPage,
  onItemsPerPageChange,
  hasNextPage,
  hasPreviousPage,
  onNextPage,
  onPreviousPage,
  sampleItemProperties = [],
  loadingProperties = false,
  // Query related props
  operationType,
  setOperationType,
  tableKeySchema,
  loadingKeySchema,
  selectedIndex,
  setSelectedIndex,
  partitionKeyValue,
  setPartitionKeyValue,
  sortKeyValue,
  setSortKeyValue,
  sortKeyOperator,
  setSortKeyOperator
}) => {
  const [availableIndexes, setAvailableIndexes] = useState<{name: string; partitionKey: string; sortKey?: string}[]>([]);
  const [partitionKeyName, setPartitionKeyName] = useState<string>('');
  const [sortKeyName, setSortKeyName] = useState<string | undefined>(undefined);
  
  // Update available indexes when table key schema changes
  useEffect(() => {
    if (tableKeySchema) {
      // Add the base table as an option
      const options = [{
        name: 'Primary Key',
        partitionKey: tableKeySchema.keySchema.partitionKey,
        sortKey: tableKeySchema.keySchema.sortKey
      }];
      
      // Add all indexes
      if (tableKeySchema.indexes) {
        Object.entries(tableKeySchema.indexes).forEach(([indexName, keySchema]) => {
          options.push({
            name: indexName,
            partitionKey: keySchema.partitionKey,
            sortKey: keySchema.sortKey
          });
        });
      }
      
      setAvailableIndexes(options);
      
      // Set default selected index to primary key
      if (!selectedIndex) {
        setSelectedIndex('Primary Key');
      }
    }
  }, [tableKeySchema, setSelectedIndex, selectedIndex]);
  
  // Update partition/sort key names when selected index changes
  useEffect(() => {
    if (!selectedIndex || !availableIndexes.length) return;
    
    const selectedIndexInfo = availableIndexes.find(idx => idx.name === selectedIndex);
    if (selectedIndexInfo) {
      setPartitionKeyName(selectedIndexInfo.partitionKey);
      setSortKeyName(selectedIndexInfo.sortKey);
    }
  }, [selectedIndex, availableIndexes]);

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
  
  // Clear scan filters
  const clearScanFilters = () => {
    setFilters([]);
  };
  
  // Clear query parameters
  const clearQueryFilters = () => {
    setPartitionKeyValue('');
    setSortKeyValue('');
    setSortKeyOperator('=');
    setFilters([]);
  };

  // Handle operation type change with the toggle switch
  const handleOperationTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOperationType(e.target.checked ? 'query' : 'scan');
  };
  
  // Handle index change
  const handleIndexChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedIndex(e.target.value === 'Primary Key' ? 'Primary Key' : e.target.value);
  };

  return (
    <div className="filter-container">
      <div className="operation-selection">
        <label htmlFor="operationType">Operation Type:</label>
        <div className="toggle-switch-container">
          <label className="toggle-switch">
            <input
              type="checkbox"
              id="operationType"
              checked={operationType === 'query'}
              onChange={handleOperationTypeChange}
              aria-label="Toggle between Scan and Query operations"
            />
            <span className="toggle-slider"></span>
            <div className="toggle-labels">
              <span className="scan">Scan</span>
              <span className="query">Query</span>
            </div>
          </label>
        </div>
      </div>
      
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

      {/* Query specific controls */}
      {operationType === 'query' && tableName && (
        <div className="query-controls">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0 }}>Query Parameters</h4>
            <button
              onClick={clearQueryFilters}
              className="secondary clear-filters-btn"
              disabled={loading || (!partitionKeyValue && !sortKeyValue && filters.length === 0)}
            >
              Clear Filters
            </button>
          </div>
          
          {loadingKeySchema ? (
            <div className="loading-text">Loading table structure...</div>
          ) : (
            <>
              <div className="index-selection">
                <label htmlFor="indexSelect">Select a table or index:</label>
                <select
                  id="indexSelect"
                  value={selectedIndex || ''}
                  onChange={handleIndexChange}
                  disabled={availableIndexes.length === 0}
                >
                  {availableIndexes.length === 0 ? (
                    <option value="">No indexes available</option>
                  ) : (
                    availableIndexes.map(idx => (
                      <option key={idx.name} value={idx.name}>
                        {idx.name === 'Primary Key' ? 'Table: ' + tableName : 'Index: ' + idx.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            
              {/* Partition key input */}
              {partitionKeyName && (
                <div className="key-input">
                  <label htmlFor="partitionKey">Partition key: {partitionKeyName}</label>
                  <input
                    id="partitionKey"
                    type="text"
                    placeholder={`Enter ${partitionKeyName} value`}
                    value={partitionKeyValue}
                    onChange={(e) => setPartitionKeyValue(e.target.value)}
                  />
                </div>
              )}
              
              {/* Sort key input */}
              {sortKeyName && (
                <div className="key-input sort-key">
                  <label htmlFor="sortKey">Sort key: {sortKeyName}</label>
                  <div className="sort-key-controls">
                    <select
                      value={sortKeyOperator}
                      onChange={(e) => setSortKeyOperator(e.target.value)}
                      className="sort-key-operator"
                    >
                      <option value="=">=</option>
                      <option value="<">&lt;</option>
                      <option value="<=">&lt;=</option>
                      <option value=">">&gt;</option>
                      <option value=">=">&gt;=</option>
                      <option value="begins_with">begins_with</option>
                    </select>
                    <input
                      id="sortKey"
                      type="text"
                      placeholder={`Enter ${sortKeyName} value`}
                      value={sortKeyValue}
                      onChange={(e) => setSortKeyValue(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Additional filters - only shown for scan or as additional query filters */}
      <div className="filters-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ margin: 0 }}>
            {operationType === 'scan' ? 'Filters' : 'Additional Filters'}
            {operationType === 'query' && (
              <span className="filter-hint">(applied after the key conditions)</span>
            )}
          </h4>
        </div>
        {filters.map((filter) => (
          <div key={filter.id} className="filter-row">
            <div className="attribute-field">
              {loadingProperties ? (
                <select disabled>
                  <option>Loading properties...</option>
                </select>
              ) : (
                <div className="combobox-wrapper">
                  <input
                    list={`properties-list-${filter.id}`}
                    type="text"
                    placeholder="Attribute name"
                    value={filter.attributeName}
                    onChange={(e) => updateFilter(filter.id, { attributeName: e.target.value })}
                  />
                  <datalist id={`properties-list-${filter.id}`}>
                    {sampleItemProperties.map((prop) => (
                      <option key={prop} value={prop} />
                    ))}
                  </datalist>
                </div>
              )}
            </div>

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
      </div>

      <div className="actions-row">
        <button
          onClick={addFilter}
          className="secondary"
        >
          Add Filter
        </button>
        {operationType === 'scan' ? (
          <button
            onClick={clearScanFilters}
            className="secondary"
            disabled={loading || filters.length === 0}
          >
            Clear Filters
          </button>
        ) : (
          <button
            onClick={clearQueryFilters}
            className="secondary"
            disabled={loading || (!partitionKeyValue && !sortKeyValue && filters.length === 0)}
          >
            Clear Filters
          </button>
        )}
        <div className="items-per-page">
          <label htmlFor="itemsPerPage">Items per page:</label>
          <select
            id="itemsPerPage"
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          >
            <option value="10">10</option>
            <option value="30">30</option>
            <option value="50">50</option>
          </select>
        </div>
        <div className="pagination-controls">
          <button
            onClick={onPreviousPage}
            disabled={!hasPreviousPage || loading}
            className="secondary"
          >
            Previous
          </button>
          <button
            onClick={onExecuteQuery}
            disabled={loading || !tableName || (operationType === 'query' && !partitionKeyValue)}
            className="primary"
          >
            {loading ? 'Loading...' : operationType === 'scan' ? 'Scan' : 'Query'}
          </button>
          <button
            onClick={onNextPage}
            disabled={!hasNextPage || loading}
            className="secondary"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export type { FilterExpression, FilterSectionProps };