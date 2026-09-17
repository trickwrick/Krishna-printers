import React from 'react';
import { Eye, Plus, Edit2, Trash2 } from 'lucide-react';

const ActionButtons = ({ 
  recordId, 
  onRowView, 
  onRowAdd, 
  onRowEdit, 
  onRowDelete,
  canEdit = true,
  canDelete = true
}) => {
  return (
    <div className="flex justify-center gap-2">
      {onRowView && (
        <button
          onClick={() => onRowView(recordId)}
          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
          title="View Details"
        >
          <Eye size={16} />
        </button>
      )}
      
      {canEdit && onRowAdd && (
        <button
          onClick={() => onRowAdd(recordId)}
          className="p-2 text-sky-500 hover:bg-sky-50 rounded-lg transition-all"
          title="Duplicate / Quick Add"
        >
          <Plus size={16} />
        </button>
      )}
      
      {canEdit && onRowEdit && (
        <button 
          onClick={() => onRowEdit(recordId)}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
          title="Edit Details"
        >
          <Edit2 size={16} />
        </button>
      )}
      
      {canDelete && onRowDelete && (
        <button 
          onClick={() => onRowDelete(recordId)}
          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
          title="Delete Item"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
};

export default ActionButtons;
