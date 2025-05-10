import React from 'react';
import { KeySchemaInfo } from '../services/DynamoDBService';
import { ScanFilters } from './ScanFilters';
import { QueryFilters } from './QueryFilters';

export interface FilterExpression {
  id: string;
  attributeName: string;
  operator: string;
  value: string;
}

export interface FilterSectionProps {
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
  // Query props
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
  // Helper functions for filter management
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

  // Extract nested ternary into a function
  const getButtonLabel = () => {
    if (loading) return 'Loading...';
    return operationType === 'scan' ? 'Scan' : 'Query';
  };

  return (
    <div className="filter-container">
      {/* Operation type selection */}
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
      
      {/* Table selection */}
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

      {/* Render scan or query filters based on operation type */}
      {tableName && operationType === 'scan' ? (
        <ScanFilters
          filters={filters}
          updateFilter={updateFilter}
          removeFilter={removeFilter}
          addFilter={addFilter}
          clearFilters={clearScanFilters}
          sampleItemProperties={sampleItemProperties}
          loadingProperties={loadingProperties}
          loading={loading}
        />
      ) : tableName ? (
        <QueryFilters
          tableKeySchema={tableKeySchema}
          loadingKeySchema={loadingKeySchema}
          selectedIndex={selectedIndex}
          setSelectedIndex={setSelectedIndex}
          partitionKeyValue={partitionKeyValue}
          setPartitionKeyValue={setPartitionKeyValue}
          sortKeyValue={sortKeyValue}
          setSortKeyValue={setSortKeyValue}
          sortKeyOperator={sortKeyOperator}
          setSortKeyOperator={setSortKeyOperator}
          filters={filters}
          updateFilter={updateFilter}
          removeFilter={removeFilter}
          addFilter={addFilter}
          clearFilters={clearQueryFilters}
          sampleItemProperties={sampleItemProperties}
          loadingProperties={loadingProperties}
          loading={loading}
        />
      ) : null}

      {/* Common pagination and action controls */}
      <div className="actions-row">
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
            {getButtonLabel()}
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