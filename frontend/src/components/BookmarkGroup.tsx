import React, { useState } from 'react';
import { Folder, FolderOpen, Plus, Trash2, Edit, ChevronDown, ChevronRight, Globe } from 'lucide-react';
import type { BookmarkItem, Link, Group } from '@startme/shared';

interface BookmarkGroupProps {
  items: BookmarkItem[];
  parentId?: string;
  onAddLink: (parentId?: string) => void;
  onAddGroup: (parentId?: string) => void;
  onEditLink: (link: Link, parentId?: string) => void;
  onEditGroup: (group: Group, parentId?: string) => void;
  onDeleteItem: (itemId: string) => void;
}

export const BookmarkGroup: React.FC<BookmarkGroupProps> = ({
  items,
  parentId,
  onAddLink,
  onAddGroup,
  onEditLink,
  onEditGroup,
  onDeleteItem,
}) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  if (!items || items.length === 0) {
    return (
      <div style={{ padding: '0.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
        Folder is empty. Click + to add links or subfolders.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {items.map(item => {
        if (item.type === 'group') {
          const isCollapsed = !!collapsedGroups[item.id];
          return (
            <div 
              key={item.id} 
              style={{ 
                borderLeft: '1.5px solid var(--border-glass)', 
                paddingLeft: '0.5rem',
                marginLeft: '0.2rem',
                marginTop: '4px',
                marginBottom: '4px'
              }}
            >
              {/* Folder Row */}
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.03)'
                }}
                className="group-row-hover"
              >
                <div 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', flex: 1 }}
                  onClick={() => toggleGroup(item.id)}
                >
                  {isCollapsed ? <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />}
                  {isCollapsed ? (
                    <Folder size={16} style={{ color: 'var(--accent-color)' }} />
                  ) : (
                    <FolderOpen size={16} style={{ color: 'var(--accent-color)' }} />
                  )}
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    {item.title}
                  </span>
                  
                  {item.tags && item.tags.length > 0 && (
                    <span style={{ display: 'flex', gap: '3px', marginLeft: '6px' }}>
                      {item.tags.map(tag => (
                        <span 
                          key={tag} 
                          style={{ 
                            fontSize: '0.65rem', 
                            background: 'rgba(118, 102, 240, 0.1)', 
                            color: 'var(--accent-color)',
                            padding: '1px 4px',
                            borderRadius: '3px',
                            border: '1px solid rgba(118, 102, 240, 0.2)'
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </span>
                  )}
                </div>

                {/* Folder Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button 
                    className="btn-icon" 
                    style={{ padding: '2px' }} 
                    onClick={() => onAddLink(item.id)}
                    title="Add Link Here"
                  >
                    <Plus size={14} />
                  </button>
                  <button 
                    className="btn-icon" 
                    style={{ padding: '2px' }} 
                    onClick={() => onAddGroup(item.id)}
                    title="Add Subfolder"
                  >
                    <Folder size={14} />
                  </button>
                  <button 
                    className="btn-icon" 
                    style={{ padding: '2px' }} 
                    onClick={() => onEditGroup(item, parentId)}
                    title="Edit Folder"
                  >
                    <Edit size={14} />
                  </button>
                  <button 
                    className="btn-icon" 
                    style={{ padding: '2px', color: 'var(--danger-color)' }} 
                    onClick={() => onDeleteItem(item.id)}
                    title="Delete Folder"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Children Nodes */}
              {!isCollapsed && (
                <div style={{ paddingLeft: '0.75rem', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <BookmarkGroup
                    items={item.children}
                    parentId={item.id}
                    onAddLink={onAddLink}
                    onAddGroup={onAddGroup}
                    onEditLink={onEditLink}
                    onEditGroup={onEditGroup}
                    onDeleteItem={onDeleteItem}
                  />
                </div>
              )}
            </div>
          );
        } else {
          // It's a link
          return (
            <div 
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                borderRadius: '6px',
                transition: 'background var(--transition-fast)'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                <Globe size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    fontSize: '0.85rem', 
                    color: 'var(--text-primary)', 
                    textDecoration: 'none',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={item.description || item.url}
                >
                  {item.title}
                </a>

                {item.tags && item.tags.length > 0 && (
                  <span style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                    {item.tags.map(tag => (
                      <span 
                        key={tag} 
                        style={{ 
                          fontSize: '0.65rem', 
                          background: 'rgba(255,255,255,0.06)', 
                          color: 'var(--text-secondary)',
                          padding: '1px 4px',
                          borderRadius: '3px',
                          border: '1px solid var(--border-glass)'
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </span>
                )}
              </div>

              {/* Link Controls */}
              <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                <button 
                  className="btn-icon" 
                  style={{ padding: '2px' }} 
                  onClick={() => onEditLink(item, parentId)}
                  title="Edit Link"
                >
                  <Edit size={13} />
                </button>
                <button 
                  className="btn-icon" 
                  style={{ padding: '2px', color: 'var(--danger-color)' }} 
                  onClick={() => onDeleteItem(item.id)}
                  title="Delete Link"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        }
      })}
    </div>
  );
};
