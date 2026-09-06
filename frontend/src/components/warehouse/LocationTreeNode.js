import React, { useState } from 'react';

const TYPE_ICONS = {
  building: '🏢',
  shelf: '📚',
  bin: '📦',
  other: '📍'
};

const LocationTreeNode = ({ node, childrenMap, depth, onAddChild, onEdit, onDelete, onViewStock }) => {
  const [expanded, setExpanded] = useState(true);
  const children = childrenMap[node._id] || [];
  const hasChildren = children.length > 0;

  return (
    <div className="tree-node" style={{ marginLeft: depth * 24 }}>
      <div className="tree-node-row">
        {hasChildren ? (
          <button className="tree-toggle" onClick={() => setExpanded((e) => !e)}>
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className="tree-toggle-spacer" />
        )}

        <span className="tree-icon">{TYPE_ICONS[node.locationType] || '📍'}</span>
        <span className="tree-name">{node.name}</span>
        <span className="tree-type">{node.locationType}</span>

        <div className="tree-actions">
          <button className="btn-chip" onClick={() => onViewStock(node)}>Stock</button>
          <button className="btn-chip" onClick={() => onAddChild(node)}>+ Sub-location</button>
          <button className="btn-secondary btn-sm" onClick={() => onEdit(node)}>Edit</button>
          <button className="btn-danger btn-sm" onClick={() => onDelete(node)}>Delete</button>
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="tree-children">
          {children.map((child) => (
            <LocationTreeNode
              key={child._id}
              node={child}
              childrenMap={childrenMap}
              depth={depth + 1}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
              onViewStock={onViewStock}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationTreeNode;
