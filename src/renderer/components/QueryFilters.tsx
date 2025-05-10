import React from 'react';
import { FilterExpression } from './FilterSection';
import { KeySchemaInfo } from '../services/DynamoDBService';

interface QueryFiltersProps {
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
  filters: FilterExpression[];
  updateFilter: (id: string, updates: Partial<FilterExpression>) => void;
  removeFilter: (id: string) => void;
  addFilter: () => void;
  clearFilters: () => void;
  sampleItemProperties: string[];
  loadingProperties: boolean;
  loading: boolean;
}

export const QueryFilters: React.FC<QueryFiltersProps> = ({
  tableKeySchema,
  loadingKeySchema,
  selectedIndex,
  setSelectedIndex,
  partitionKeyValue,
  setPartitionKeyValue,
  sortKeyValue,
  setSortKeyValue,
  sortKeyOperator,
  setSortKeyOperator,
  filters,
  updateFilter,
  removeFilter,
  addFilter,
  clearFilters,
  sampleItemProperties = [],
  loadingProperties = false,
  loading = false
}) => {
  const [partitionKeyName, setPartitionKeyName] = React.useState<string>('');
  const [sortKeyName, setSortKeyName] = React.useState<string | undefined>(undefined);
  const [availableIndexes, setAvailableIndexes] = React.useState<{name: string; partitionKey: string; sortKey?: string}[]>([]);

  // Update available indexes when table key schema changes
  React.useEffect(() => {
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
  React.useEffect(() => {
    if (!selectedIndex || !availableIndexes.length) return;
    
    const selectedIndexInfo = availableIndexes.find(idx => idx.name === selectedIndex);
    if (selectedIndexInfo) {
      setPartitionKeyName(selectedIndexInfo.partitionKey);
      setSortKeyName(selectedIndexInfo.sortKey);
    }
  }, [selectedIndex, availableIndexes]);

  // Handle index change
  const handleIndexChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedIndex(e.target.value === 'Primary Key' ? 'Primary Key' : e.target.value);
  };

  return (
    <>
      <div className="query-controls">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ margin: 0 }}>Query Parameters</h4>
          <button
            onClick={clearFilters}
            className="secondary clear-filters-btn"
            disabled={loading || (!partitionKeyValue && !sortKeyValue && filters.length === 0)}
          >
            Clear All
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
                value={selectedIndex ?? ''}
                onChange={handleIndexChange}
                disabled={availableIndexes.length === 0}
              >
                {availableIndexes.length === 0 ? (
                  <option value="">No indexes available</option>
                ) : (
                  availableIndexes.map(idx => (
                    <option key={idx.name} value={idx.name}>
                      {idx.name === 'Primary Key' ? 'Table: Primary Key' : `Index: ${idx.name}`}
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

      {/* Additional filters section */}
      <div className="filters-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ margin: 0 }}>
            Additional Filters{' '}
            <span className="filter-hint">(applied after the key conditions)</span>
          </h4>
          <button
            onClick={() => filters.length > 0 && clearFilters()}
            className="secondary clear-filters-btn"
            disabled={loading || filters.length === 0}
          >
            Clear Filters
          </button>
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

        <div style={{ marginTop: '12px' }}>
          <button
            onClick={addFilter}
            className="secondary"
          >
            Add Filter
          </button>
        </div>
      </div>
    </>
  );
};