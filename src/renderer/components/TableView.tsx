import React, { useState, useRef, useEffect } from 'react';

interface TableViewProps {
  items: any[];
  columnWidths: { [key: string]: number };
  setColumnWidths: (widths: { [key: string]: number }) => void;
  tabId: string;
}

export const TableView: React.FC<TableViewProps> = ({
  items,
  columnWidths,
  setColumnWidths,
  tabId
}) => {
  const [currentResizer, setCurrentResizer] = useState<{ column: string; startX: number } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  // Helper function to extract value from DynamoDB attribute
  const extractValue = (attr: any): string => {
    if (!attr) return '';
    // Handle different DynamoDB types
    if (attr.S !== undefined) return attr.S;
    if (attr.N !== undefined) return attr.N;
    if (attr.BOOL !== undefined) return attr.BOOL.toString();
    if (attr.NULL !== undefined) return 'null';
    if (attr.L !== undefined) return JSON.stringify(attr.L.map(extractValue));
    if (attr.M !== undefined) {
      const obj = Object.entries(attr.M).reduce((acc: any, [key, value]) => {
        acc[key] = extractValue(value);
        return acc;
      }, {});
      return JSON.stringify(obj);
    }
    return JSON.stringify(attr);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!currentResizer) return;

      const diff = e.clientX - currentResizer.startX;
      const currentWidth = columnWidths[currentResizer.column] || 150;
      const newWidth = Math.max(50, currentWidth + diff);

      setColumnWidths({
        ...columnWidths,
        [currentResizer.column]: newWidth
      });
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
  }, [currentResizer, columnWidths, setColumnWidths]);

  const handleResizerMouseDown = (e: React.MouseEvent, column: string) => {
    e.preventDefault();
    setCurrentResizer({
      column,
      startX: e.clientX
    });
  };

  const handleCellDoubleClick = (e: React.MouseEvent<HTMLElement>) => {
    const cell = e.currentTarget;

    document.querySelectorAll('.cell-content.selected').forEach(el =>
      el.classList.remove('selected')
    );

    const range = document.createRange();
    const selection = window.getSelection();

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

  if (items.length === 0) return null;

  const columns = Array.from(
    new Set(items.flatMap(item => Object.keys(item)))
  );

  return (
    <div className="table-container">
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
                  {extractValue(item[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};