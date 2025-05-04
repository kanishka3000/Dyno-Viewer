import React from 'react';

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
  onPreviousPage
}) => {
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

  return (
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
      </div>

      <div className="actions-row">
        <button
          onClick={addFilter}
          className="secondary"
        >
          Add Filter
        </button>
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
            disabled={loading || !tableName}
            className="primary"
          >
            {loading ? 'Loading...' : 'Query'}
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