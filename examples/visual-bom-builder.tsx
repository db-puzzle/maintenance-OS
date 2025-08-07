import React, { useState } from 'react';
import { Plus, Trash2, Save, Download, ChevronRight, ChevronDown, Edit, GripVertical } from 'lucide-react';

const VisualBOMBuilder = () => {
  const [items, setItems] = useState([
    {
      id: '1',
      name: 'Main Assembly',
      description: 'Top level assembly',
      quantity: 1,
      unit: 'ea',
      children: [
        {
          id: '1-1',
          name: 'Sub-Assembly A',
          description: 'First sub-assembly',
          quantity: 2,
          unit: 'ea',
          children: [
            { id: '1-1-1', name: 'Component X', description: 'Metal bracket', quantity: 4, unit: 'ea', children: [] },
            { id: '1-1-2', name: 'Component Y', description: 'Fastener set', quantity: 12, unit: 'ea', children: [] }
          ]
        },
        {
          id: '1-2',
          name: 'Sub-Assembly B',
          description: 'Second sub-assembly',
          quantity: 1,
          unit: 'ea',
          children: [
            { id: '1-2-1', name: 'Component Z', description: 'Circuit board', quantity: 1, unit: 'ea', children: [] }
          ]
        }
      ]
    }
  ]);

  const [expanded, setExpanded] = useState({ '1': true, '1-1': true, '1-2': true });
  const [dragging, setDragging] = useState(null);
  const [, setDragPreview] = useState(null);
  const [, setHoverTarget] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [newItemParentId, setNewItemParentId] = useState(null);

  // Helper function to find and update an item in the tree
  const findItemById = (items, id) => {
    for (const item of items) {
      if (item.id === id) {
        return item;
      }
      if (item.children && item.children.length > 0) {
        const found = findItemById(item.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Helper function to update the items tree
  const updateItemsTree = (items, id, updateFn) => {
    return items.map(item => {
      if (item.id === id) {
        return updateFn(item);
      }
      if (item.children && item.children.length > 0) {
        return {
          ...item,
          children: updateItemsTree(item.children, id, updateFn)
        };
      }
      return item;
    });
  };

  // Helper function to remove an item from the tree
  const removeItemFromTree = (items, id) => {
    return items.reduce((acc, item) => {
      if (item.id === id) {
        return acc;
      }

      if (item.children && item.children.length > 0) {
        const newChildren = removeItemFromTree(item.children, id);
        return [...acc, { ...item, children: newChildren }];
      }

      return [...acc, item];
    }, []);
  };

  // Helper function to add a child to an item
  const addChildToItem = (items, parentId, newChild) => {
    return items.map(item => {
      if (item.id === parentId) {
        return {
          ...item,
          children: [...item.children, newChild]
        };
      }
      if (item.children && item.children.length > 0) {
        return {
          ...item,
          children: addChildToItem(item.children, parentId, newChild)
        };
      }
      return item;
    });
  };

  // Function to toggle expanded state
  const toggleExpand = (id) => {
    setExpanded(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Function to handle drag start
  const handleDragStart = (e, id) => {
    // Prevent default to ensure drag starts immediately on first click
    e.stopPropagation();

    // Set ghost image for drag (invisible)
    const dragGhost = document.createElement('div');
    dragGhost.style.position = 'absolute';
    dragGhost.style.top = '-1000px';
    document.body.appendChild(dragGhost);
    e.dataTransfer.setDragImage(dragGhost, 0, 0);

    // Get the element by its ID to add a class for styling
    const element = document.querySelector(`[data-id="${id}"]`);
    if (element) {
      element.classList.add('opacity-50');
    }

    // Store the dragged item for preview
    const draggedItem = findItemById(items, id);
    setDragPreview(draggedItem);

    setDragging(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';

    // Clean up ghost element after drag
    setTimeout(() => {
      document.body.removeChild(dragGhost);
    }, 0);
  };

  // Function to handle drag over
  const handleDragOver = (e, targetId) => {
    e.preventDefault();

    if (dragging === targetId) return; // Can't drop onto itself

    // Check if target is a child of the dragged item (to prevent circular references)
    const isChildOfDragged = (items, draggedId, targetId) => {
      const draggedItem = findItemById(items, draggedId);

      const checkChildren = (item) => {
        if (item.id === targetId) return true;
        if (item.children && item.children.length > 0) {
          return item.children.some(child => checkChildren(child));
        }
        return false;
      };

      return draggedItem ? draggedItem.children.some(child => checkChildren(child)) : false;
    };

    // Don't allow dropping on its own children (circular reference)
    if (isChildOfDragged(items, dragging, targetId)) {
      return;
    }

    // Find the closest draggable container
    const container = e.target.closest('[data-draggable="true"]');
    if (container && container.dataset.id === targetId) {
      // Set a visual indication that this is a valid drop target
      container.classList.add('border-blue-500', 'border-2', 'bg-blue-50');

      // Set hover target for preview
      setHoverTarget(targetId);
    }

    e.dataTransfer.dropEffect = 'move';
  };

  // Function to handle drag leave
  const handleDragLeave = (e, targetId) => {
    // Find the closest draggable container
    const container = e.target.closest('[data-draggable="true"]');
    if (container && container.dataset.id === targetId) {
      // Remove the visual indication
      container.classList.remove('border-blue-500', 'border-2', 'bg-blue-50');

      // Only clear hover target if we're leaving this specific target
      // (not just moving within the same target)
      const relatedTarget = e.relatedTarget;
      if (!relatedTarget || !container.contains(relatedTarget)) {
        setHoverTarget(null);
      }
    }
  };

  // Function to handle drag end
  const handleDragEnd = () => {
    // Clean up all drag-related states
    setDragging(null);
    setDragPreview(null);
    setHoverTarget(null);

    // Remove all visual indicators
    document.querySelectorAll('[data-draggable="true"]').forEach(el => {
      el.classList.remove('border-blue-500', 'border-2', 'bg-blue-50', 'opacity-50');
    });
  };

  // Function to handle drop
  const handleDrop = (e, targetId) => {
    e.preventDefault();

    // Remove visual indication from all elements
    document.querySelectorAll('[data-draggable="true"]').forEach(el => {
      el.classList.remove('border-blue-500', 'border-2', 'bg-blue-50', 'opacity-50');
    });

    const draggedId = e.dataTransfer.getData('text/plain');

    if (draggedId === targetId) {
      // Clean up states
      setDragging(null);
      setDragPreview(null);
      setHoverTarget(null);
      return; // Can't drop onto itself
    }

    // Check if target is a child of the dragged item (to prevent circular references)
    const isChildOfDragged = (items, draggedId, targetId) => {
      const draggedItem = findItemById(items, draggedId);

      const checkChildren = (item) => {
        if (item.id === targetId) return true;
        if (item.children && item.children.length > 0) {
          return item.children.some(child => checkChildren(child));
        }
        return false;
      };

      return draggedItem ? draggedItem.children.some(child => checkChildren(child)) : false;
    };

    if (isChildOfDragged(items, draggedId, targetId)) {
      // Show error visual feedback
      const targetElement = document.querySelector(`[data-id="${targetId}"]`);
      if (targetElement) {
        targetElement.classList.add('border-red-500', 'border-2');
        setTimeout(() => {
          targetElement.classList.remove('border-red-500', 'border-2');
        }, 1000);
      }

      // Clean up states
      setDragging(null);
      setDragPreview(null);
      setHoverTarget(null);
      return; // Prevent circular reference
    }

    const draggedItem = findItemById(items, draggedId);

    // Clone the dragged item and remove it from its original position
    const newItems = removeItemFromTree(items, draggedId);

    // Add the dragged item to the target's children
    const updatedItems = addChildToItem(newItems, targetId, draggedItem);
    setItems(updatedItems);

    // Expand the target to show the newly added item
    setExpanded(prev => ({
      ...prev,
      [targetId]: true
    }));

    // Clean up states
    setDragging(null);
    setDragPreview(null);
    setHoverTarget(null);
  };

  // Function to handle edit item
  const handleEditItem = (item) => {
    setEditingItem({ ...item });
  };

  // Function to save edited item
  const handleSaveEdit = () => {
    if (!editingItem) return;

    const updatedItems = updateItemsTree(items, editingItem.id, () => ({
      ...editingItem
    }));

    setItems(updatedItems);
    setEditingItem(null);
  };

  // Function to add new item
  const handleAddItem = (parentId) => {
    const parent = findItemById(items, parentId);
    const newId = `${parentId}-${parent.children.length + 1}`;

    const newItem = {
      id: newId,
      name: 'New Item',
      description: 'Description',
      quantity: 1,
      unit: 'ea',
      children: []
    };

    setNewItemParentId(parentId);
    setEditingItem(newItem);
  };

  // Function to save new item
  const handleSaveNewItem = () => {
    if (!editingItem || !newItemParentId) return;

    const updatedItems = addChildToItem(items, newItemParentId, editingItem);
    setItems(updatedItems);

    // Expand the parent to show the new item
    setExpanded(prev => ({
      ...prev,
      [newItemParentId]: true
    }));

    setEditingItem(null);
    setNewItemParentId(null);
  };

  // Function to delete an item
  const handleDeleteItem = (id) => {
    // Don't allow deleting the root item
    if (id === '1') return;

    const updatedItems = removeItemFromTree(items, id);
    setItems(updatedItems);
  };

  // Function to export BOM as JSON
  const handleExportBOM = () => {
    const dataStr = JSON.stringify(items, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = 'bom.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Simple indented list with connecting lines
  const TreeItem = ({ node, depth = 0, isLast = true, parentConnectorLines = [] }) => {
    const isExpanded = expanded[node.id];
    const hasChildren = node.children && node.children.length > 0;

    // Create the connector lines for children of this node
    const childConnectorLines = [...parentConnectorLines];
    if (depth > 0) {
      // Add connector for this level: true if not last item, false otherwise
      childConnectorLines.push(!isLast);
    }

    return (
      <div className="w-full">
        <div className="flex">
          {/* Display connector lines from parent levels */}
          {parentConnectorLines.map((showLine, i) => (
            <div key={`connector-${i}`} className="w-6 relative">
              {showLine && <div className="absolute h-full w-0 border-l-2 border-gray-300 left-3 top-0"></div>}
            </div>
          ))}

          {/* Current level connector */}
          {depth > 0 && (
            <div className="w-6 relative">
              {/* Vertical line */}
              <div className="absolute h-1/2 w-0 border-l-2 border-gray-300 left-3 top-0"></div>

              {/* Horizontal line to the node */}
              <div className="absolute w-3 border-t-2 border-gray-300 left-3 top-1/2"></div>

              {/* Continue vertical line for non-last items */}
              {!isLast && <div className="absolute h-1/2 w-0 border-l-2 border-gray-300 left-3 top-1/2"></div>}
            </div>
          )}

          {/* Item content */}
          <div
            data-draggable="true"
            data-id={node.id}
            className={`flex-grow p-2 my-1 border border-gray-200 rounded hover:bg-gray-50 ${dragging === node.id ? 'opacity-50' : ''} ${dragging && dragging !== node.id ? 'hover:border-blue-500 hover:border-dashed' : ''}`}
            onDragOver={(e) => handleDragOver(e, node.id)}
            onDragLeave={(e) => handleDragLeave(e, node.id)}
            onDrop={(e) => handleDrop(e, node.id)}
          >
            <div className="flex items-center w-full">
              {/* Drag handle */}
              <div
                className="mr-2 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1"
                draggable="true"
                onDragStart={(e) => handleDragStart(e, node.id)}
                onDragEnd={handleDragEnd}
                title="Drag to reposition"
              >
                <GripVertical size={16} />
              </div>

              {hasChildren && (
                <button
                  className="mr-2 focus:outline-none"
                  onClick={() => toggleExpand(node.id)}
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
              {!hasChildren && <div className="w-6 mr-2"></div>}

              <div className="flex-grow grid grid-cols-12 gap-2">
                <div className="col-span-3 font-medium">{node.name}</div>
                <div className="col-span-4 text-gray-600">{node.description}</div>
                <div className="col-span-2 text-center">{node.quantity} {node.unit}</div>
                <div className="col-span-3 flex justify-end gap-2">
                  <button
                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                    onClick={() => handleEditItem(node)}
                    title="Edit item"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    className="p-1 text-green-600 hover:bg-green-100 rounded"
                    onClick={() => handleAddItem(node.id)}
                    title="Add child item"
                  >
                    <Plus size={16} />
                  </button>
                  {node.id !== '1' && (
                    <button
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                      onClick={() => handleDeleteItem(node.id)}
                      title="Delete item"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Render children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child, index) => (
              <TreeItem
                key={child.id}
                node={child}
                depth={depth + 1}
                isLast={index === node.children.length - 1}
                parentConnectorLines={childConnectorLines}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">Visual BOM Builder</h1>
        <p className="text-gray-600">Drag and drop items to rearrange the Bill of Materials structure</p>
      </div>

      <div className="p-4 border-b border-gray-200 flex gap-2">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
          onClick={handleExportBOM}
        >
          <Download size={16} />
          Export BOM
        </button>
      </div>

      {/* Drag preview overlay removed */}

      <div className="overflow-auto flex-grow p-4">
        <div className="w-full bg-gray-100 p-3 rounded-lg mb-4 grid grid-cols-12 gap-2 font-semibold">
          <div className="col-span-3">Name</div>
          <div className="col-span-4">Description</div>
          <div className="col-span-2 text-center">Quantity</div>
          <div className="col-span-3 text-right">Actions</div>
        </div>

        <div>
          {items.map((item, index) => (
            <TreeItem
              key={item.id}
              node={item}
              isLast={index === items.length - 1}
              parentConnectorLines={[]}
            />
          ))}
        </div>
      </div>

      {/* Edit/Add Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {newItemParentId ? 'Add New Item' : 'Edit Item'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded"
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full p-2 border border-gray-300 rounded"
                    value={editingItem.quantity}
                    onChange={(e) => setEditingItem({ ...editingItem, quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded"
                    value={editingItem.unit}
                    onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                  >
                    <option value="ea">ea (each)</option>
                    <option value="kg">kg (kilogram)</option>
                    <option value="m">m (meter)</option>
                    <option value="L">L (liter)</option>
                    <option value="pcs">pcs (pieces)</option>
                    <option value="set">set</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                onClick={() => {
                  setEditingItem(null);
                  setNewItemParentId(null);
                }}
              >
                Cancel
              </button>

              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                onClick={newItemParentId ? handleSaveNewItem : handleSaveEdit}
              >
                <Save size={16} />
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualBOMBuilder;