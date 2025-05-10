import React from 'react';
import { FilterExpression } from './FilterSection';

interface ScanFiltersProps {
  filters: FilterExpression[];
  updateFilter: (id: string, updates: Partial<FilterExpression>) => void;
  removeFilter: (id: string) => void;
  addFilter: () => void;
  clearFilters: () => void;
  sampleItemProperties: string[];
  loadingProperties: boolean;
  loading: boolean;
}

export const ScanFilters: React.FC<ScanFiltersProps> = ({
  filters,
  updateFilter,
  removeFilter,
  addFilter,
  clearFilters,
  sampleItemProperties = [],
  loadingProperties = false,
  loading = false
}) => {
  return (
    <div className="filters-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h4 style={{ margin: 0 }}>Filters</h4>
        <button
          onClick={clearFilters}
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
  );
};