import React, { useState } from 'react';
import { Folder, FolderOpen, Plus, Trash2, Edit, ChevronDown, ChevronRight } from 'lucide-react';
import type { BookmarkItem, Link, Group } from '@startme/shared';

interface BookmarkGroupProps {
  items: BookmarkItem[];
  parentId?: string;
  widgetId: string;
  viewMode?: 'list' | 'detailed' | 'icons' | 'cloud';
  onAddLink: (parentId?: string) => void;
  onAddGroup: (parentId?: string) => void;
  onEditLink: (link: Link, parentId?: string) => void;
  onEditGroup: (group: Group, parentId?: string) => void;
  onDeleteItem: (itemId: string) => void;
  onDropLinkOnGroup?: (linkDataStr: string, groupId: string) => void;
}

export const BookmarkGroup: React.FC<BookmarkGroupProps> = ({
  items,
  parentId,
  widgetId,
  viewMode = 'list',
  onAddLink,
  onAddGroup,
  onEditLink,
  onEditGroup,
  onDeleteItem,
  onDropLinkOnGroup,
}) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);;

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const getDomain = (urlStr: string): string => {
    try {
      const url = new URL(urlStr);
      return url.hostname;
    } catch {
      return '';
    }
  };

  if (!items || items.length === 0) {
    return (
      <div style={{ padding: '0.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
        Folder is empty. Click + to add links or subfolders.
      </div>
    );
  }

  // Filter links and subfolders
  const subGroups = items.filter(item => item.type === 'group') as Group[];
  const links = items.filter(item => item.type === 'link') as Link[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      
      {/* 1. RENDER DIRECT LINKS IN SELECTED VIEW MODE */}
      {links.length > 0 && (
        <>
          {viewMode === 'list' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {links.map(link => (
                <div 
                  key={link.id}
                  draggable={true}
                  onDragStart={(e) => {
                    e.stopPropagation();
                    e.dataTransfer.setData('application/startme-link', JSON.stringify({
                      sourceWidgetId: widgetId,
                      sourceParentId: parentId,
                      linkId: link.id,
                      link: link
                    }));
                    e.dataTransfer.setData('text/plain', `link:${link.id}`);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    transition: 'background var(--transition-fast)',
                    cursor: 'grab'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-dropdown-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1, minWidth: 0 }}>
                    <img 
                      src={`https://www.google.com/s2/favicons?sz=16&domain=${getDomain(link.url)}`} 
                      alt="" 
                      style={{ width: '14px', height: '14px', borderRadius: '2px', flexShrink: 0, marginTop: '3px' }} 
                      onError={e => { (e.target as HTMLElement).style.display = 'none'; }} 
                    />
                    <a 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ 
                        fontSize: '0.85rem', 
                        color: 'var(--text-primary)', 
                        textDecoration: 'none',
                        fontWeight: 500,
                        wordBreak: 'break-all',
                        whiteSpace: 'normal'
                      }}
                      title={link.description || link.url}
                    >
                      {link.title}
                    </a>

                    {link.tags && link.tags.length > 0 && (
                      <span style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                        {link.tags.map(tag => (
                          <span 
                            key={tag} 
                            style={{ 
                              fontSize: '0.65rem', 
                              background: 'var(--bg-tag)', 
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

                  <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                    <button className="btn-icon" style={{ padding: '2px' }} onClick={() => onEditLink(link, parentId)} title="Edit Link">
                      <Edit size={13} />
                    </button>
                    <button className="btn-icon" style={{ padding: '2px', color: 'var(--danger-color)' }} onClick={() => onDeleteItem(link.id)} title="Delete Link">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'detailed' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {links.map(link => (
                <div 
                  key={link.id}
                  draggable={true}
                  onDragStart={(e) => {
                    e.stopPropagation();
                    e.dataTransfer.setData('application/startme-link', JSON.stringify({
                      sourceWidgetId: widgetId,
                      sourceParentId: parentId,
                      linkId: link.id,
                      link: link
                    }));
                    e.dataTransfer.setData('text/plain', `link:${link.id}`);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'var(--bg-tag)',
                    border: '1px solid var(--border-glass)',
                    transition: 'background var(--transition-fast)',
                    cursor: 'grab'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-dropdown-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-tag)')}
                >
                  <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
                    <img 
                      src={`https://www.google.com/s2/favicons?sz=32&domain=${getDomain(link.url)}`} 
                      alt="" 
                      style={{ width: '22px', height: '22px', borderRadius: '4px', marginTop: '3px', flexShrink: 0 }} 
                      onError={e => { (e.target as HTMLElement).style.display = 'none'; }} 
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                      <a 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ 
                          fontSize: '0.85rem', 
                          color: 'var(--text-primary)', 
                          textDecoration: 'none',
                          fontWeight: 600,
                        }}
                      >
                        {link.title}
                      </a>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', wordBreak: 'break-all', whiteSpace: 'normal' }}>
                        {link.description || link.url}
                      </span>
                      {link.tags && link.tags.length > 0 && (
                        <span style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginTop: '2px' }}>
                          {link.tags.map(tag => (
                            <span key={tag} style={{ fontSize: '0.6rem', background: 'var(--bg-tag)', color: 'var(--text-secondary)', padding: '0px 4px', borderRadius: '2px', border: '1px solid var(--border-glass)' }}>
                              {tag}
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                    <button className="btn-icon" style={{ padding: '4px' }} onClick={() => onEditLink(link, parentId)} title="Edit Link">
                      <Edit size={14} />
                    </button>
                    <button className="btn-icon" style={{ padding: '4px', color: 'var(--danger-color)' }} onClick={() => onDeleteItem(link.id)} title="Delete Link">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'icons' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))', gap: '14px', padding: '6px 0' }}>
              {links.map(link => (
                <div 
                  key={link.id}
                  draggable={true}
                  onDragStart={(e) => {
                    e.stopPropagation();
                    e.dataTransfer.setData('application/startme-link', JSON.stringify({
                      sourceWidgetId: widgetId,
                      sourceParentId: parentId,
                      linkId: link.id,
                      link: link
                    }));
                    e.dataTransfer.setData('text/plain', `link:${link.id}`);
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    position: 'relative',
                    padding: '8px 4px',
                    borderRadius: '8px',
                    transition: 'background var(--transition-fast)',
                    cursor: 'grab'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-dropdown-hover)';
                    const el = e.currentTarget.querySelector('.icon-controls') as HTMLElement;
                    if (el) el.style.display = 'flex';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    const el = e.currentTarget.querySelector('.icon-controls') as HTMLElement;
                    if (el) el.style.display = 'none';
                  }}
                >
                  {/* Floating overlay controls */}
                  <div 
                    className="icon-controls" 
                    style={{ 
                      position: 'absolute', 
                      top: '2px', 
                      right: '2px', 
                      display: 'none', 
                      gap: '2px', 
                      background: 'var(--bg-dropdown)', 
                      borderRadius: '4px', 
                      padding: '2px', 
                      border: '1px solid var(--border-glass)',
                      zIndex: 5
                    }}
                  >
                    <button 
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '1px', display: 'flex' }}
                      onClick={() => onEditLink(link, parentId)}
                    >
                      <Edit size={10} />
                    </button>
                    <button 
                      style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', padding: '1px', display: 'flex' }}
                      onClick={() => onDeleteItem(link.id)}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>

                  <a 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      textDecoration: 'none',
                      color: 'var(--text-primary)',
                      width: '100%'
                    }}
                  >
                    <div 
                      style={{ 
                        width: '44px', 
                        height: '44px', 
                        borderRadius: '10px', 
                        background: 'var(--bg-tag)', 
                        border: '1px solid var(--border-glass)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                      }}
                    >
                      <img 
                        src={`https://www.google.com/s2/favicons?sz=64&domain=${getDomain(link.url)}`} 
                        alt="" 
                        style={{ width: '24px', height: '24px', borderRadius: '3px' }} 
                        onError={e => {
                          const parent = (e.target as HTMLElement).parentElement;
                          if (parent) {
                            parent.innerHTML = `<span style="font-weight: 700; font-size: 1.1rem; color: var(--accent-color);">${link.title ? link.title.charAt(0).toUpperCase() : 'L'}</span>`;
                          }
                        }}
                      />
                    </div>
                    <span 
                      style={{ 
                        fontSize: '0.72rem', 
                        fontWeight: 500,
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        display: '-webkit-box', 
                        WebkitLineClamp: 2, 
                        WebkitBoxOrient: 'vertical',
                        textAlign: 'center',
                        width: '100%',
                        lineHeight: '1.2',
                        wordBreak: 'break-word',
                        height: '2.4em'
                      }}
                    >
                      {link.title}
                    </span>
                  </a>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'cloud' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '6px 0' }}>
              {links.map(link => (
                <div 
                  key={link.id}
                  draggable={true}
                  onDragStart={(e) => {
                    e.stopPropagation();
                    e.dataTransfer.setData('application/startme-link', JSON.stringify({
                      sourceWidgetId: widgetId,
                      sourceParentId: parentId,
                      linkId: link.id,
                      link: link
                    }));
                    e.dataTransfer.setData('text/plain', `link:${link.id}`);
                  }}
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    padding: '5px 10px', 
                    borderRadius: '20px', 
                    background: 'var(--bg-tag)', 
                    border: '1px solid var(--border-glass)', 
                    transition: 'all var(--transition-fast)',
                    cursor: 'grab'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-dropdown-hover)';
                    e.currentTarget.style.borderColor = 'var(--border-focus)';
                    const btns = e.currentTarget.querySelectorAll('.cloud-btn') as NodeListOf<HTMLElement>;
                    btns.forEach(b => b.style.opacity = '1');
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-tag)';
                    e.currentTarget.style.borderColor = 'var(--border-glass)';
                    const btns = e.currentTarget.querySelectorAll('.cloud-btn') as NodeListOf<HTMLElement>;
                    btns.forEach(b => b.style.opacity = '0');
                  }}
                >
                  <a 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '5px', 
                      textDecoration: 'none', 
                      color: 'var(--text-primary)', 
                      fontSize: '0.75rem', 
                      fontWeight: 500 
                    }}
                  >
                    <img 
                      src={`https://www.google.com/s2/favicons?sz=16&domain=${getDomain(link.url)}`} 
                      alt="" 
                      style={{ width: '12px', height: '12px', borderRadius: '2px' }} 
                      onError={e => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                    <span>{link.title}</span>
                  </a>
                  
                  <button 
                    className="cloud-btn" 
                    style={{ background: 'none', border: 'none', padding: '0', display: 'flex', cursor: 'pointer', color: 'var(--text-secondary)', opacity: 0, transition: 'opacity 0.15s' }} 
                    onClick={() => onEditLink(link, parentId)}
                  >
                    <Edit size={10} />
                  </button>
                  <button 
                    className="cloud-btn" 
                    style={{ background: 'none', border: 'none', padding: '0', display: 'flex', cursor: 'pointer', color: 'var(--danger-color)', opacity: 0, transition: 'opacity 0.15s' }} 
                    onClick={() => onDeleteItem(link.id)}
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 2. RENDER SUBFOLDERS (RECURSIVE) */}
      {subGroups.map(item => {
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
            {/* Folder Header Row */}
            <div 
              draggable={true}
              onDragStart={(e) => {
                e.stopPropagation();
                e.dataTransfer.setData('application/startme-folder', JSON.stringify({
                  sourceWidgetId: widgetId,
                  folderId: item.id,
                  folderTitle: item.title,
                  children: item.children
                }));
                e.dataTransfer.setData('text/plain', `folder:${item.id}`);
              }}
              onDragOver={(e) => {
                const isLink = e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('application/startme-link');
                if (!isLink) return;
                e.preventDefault();
                e.stopPropagation();
                if (dragOverGroupId !== item.id) setDragOverGroupId(item.id);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverGroupId(null);
                }
              }}
              onDrop={(e) => {
                const linkDataStr = e.dataTransfer.getData('application/startme-link');
                if (!linkDataStr) return;
                e.preventDefault();
                e.stopPropagation();
                setDragOverGroupId(null);
                onDropLinkOnGroup?.(linkDataStr, item.id);
              }}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '6px 8px',
                borderRadius: '6px',
                background: dragOverGroupId === item.id ? 'var(--bg-dropdown-hover)' : 'var(--bg-tag)',
                border: dragOverGroupId === item.id ? '1.5px solid var(--accent-color)' : '1px solid var(--border-glass)',
                cursor: 'grab',
                transition: 'background 0.15s ease, border-color 0.15s ease'
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
                <button className="btn-icon" style={{ padding: '2px' }} onClick={() => onAddLink(item.id)} title="Add Link Here">
                  <Plus size={14} />
                </button>
                <button className="btn-icon" style={{ padding: '2px' }} onClick={() => onAddGroup(item.id)} title="Add Subfolder">
                  <Folder size={14} />
                </button>
                <button className="btn-icon" style={{ padding: '2px' }} onClick={() => onEditGroup(item, parentId)} title="Edit Folder">
                  <Edit size={14} />
                </button>
                <button className="btn-icon" style={{ padding: '2px', color: 'var(--danger-color)' }} onClick={() => onDeleteItem(item.id)} title="Delete Folder">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Nested Nodes */}
            {!isCollapsed && (
              <div style={{ paddingLeft: '0.75rem', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <BookmarkGroup
                  items={item.children}
                  parentId={item.id}
                  widgetId={widgetId}
                  viewMode={viewMode}
                  onAddLink={onAddLink}
                  onAddGroup={onAddGroup}
                  onEditLink={onEditLink}
                  onEditGroup={onEditGroup}
                  onDeleteItem={onDeleteItem}
                  onDropLinkOnGroup={onDropLinkOnGroup}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
