import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, FolderPlus, Globe, AlertTriangle, List, AlignJustify, Grid, Cloud } from 'lucide-react';
import { BookmarkGroup } from './BookmarkGroup.js';
import type { Widget, BookmarkItem, Link, Group } from '@startme/shared';

interface BookmarkWidgetProps {
  widget: Widget;
  pageId: string;
  onSaveWidgetData: (widgetId: string, data: { items?: BookmarkItem[]; viewMode?: 'list' | 'detailed' | 'icons' | 'cloud' }) => void;
  onDropLinkOnGroup?: (linkDataStr: string, targetWidgetId: string, groupId: string) => void;
}

export const BookmarkWidget: React.FC<BookmarkWidgetProps> = ({ widget, pageId, onSaveWidgetData, onDropLinkOnGroup }) => {
  const items = (widget.data && widget.data.items) || [];

  // Dialog / Form States
  const [isLinkFormOpen, setIsLinkFormOpen] = useState(false);
  const [isGroupFormOpen, setIsGroupFormOpen] = useState(false);
  
  const [activeParentId, setActiveParentId] = useState<string | undefined>(undefined);
  const [editItem, setEditItem] = useState<BookmarkItem | null>(null);

  // Link Form Values
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTags, setLinkTags] = useState('');
  const [linkDescription, setLinkDescription] = useState('');
  
  // Duplicate Checker state
  const [duplicateWarning, setDuplicateWarning] = useState<{ exists: boolean; occurrences: Array<{ pageTitle: string; title: string }> } | null>(null);

  // Group Form Values
  const [groupTitle, setGroupTitle] = useState('');
  const [groupTags, setGroupTags] = useState('');

  // Handle URL change for duplicate warning checking (includes same dashboard checks, excluding self if editing)
  useEffect(() => {
    if (!linkUrl) {
      setDuplicateWarning(null);
      return;
    }

    const checkDuplicate = setTimeout(async () => {
      let checkUrl = linkUrl.trim();
      if (!checkUrl.startsWith('http://') && !checkUrl.startsWith('https://')) {
        checkUrl = 'https://' + checkUrl;
      }
      
      try {
        const excludeParam = editItem ? `&excludeLinkId=${editItem.id}` : '';
        const response = await fetch(`/api/links/check-duplicate?url=${encodeURIComponent(checkUrl)}&currentPageId=${pageId}${excludeParam}`);
        if (response.ok) {
          const data = await response.json();
          if (data.exists) {
            setDuplicateWarning({ exists: true, occurrences: data.occurrences });
          } else {
            setDuplicateWarning(null);
          }
        }
      } catch (err) {
        console.error('Error checking duplicate url:', err);
      }
    }, 400);

    return () => clearTimeout(checkDuplicate);
  }, [linkUrl, editItem, pageId]);

  // Handle URL Blur to fetch website metadata (title, description)
  const handleUrlBlur = async () => {
    if (!linkUrl || editItem) return;

    let cleanUrl = linkUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    try {
      const res = await fetch(`/api/links/metadata?url=${encodeURIComponent(cleanUrl)}`);
      if (res.ok) {
        const meta = await res.json();
        if (meta.title && !linkTitle.trim()) {
          setLinkTitle(meta.title);
        }
        if (meta.description && !linkDescription.trim()) {
          setLinkDescription(meta.description);
        }
      }
    } catch (err) {
      console.warn('Failed to scrape link metadata:', err);
    }
  };

  // Recursively find and delete an item
  const deleteItemFromTree = (list: BookmarkItem[], targetId: string): boolean => {
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === targetId) {
        list.splice(i, 1);
        return true;
      }
      if (list[i].type === 'group') {
        const group = list[i] as Group;
        if (group.children && deleteItemFromTree(group.children, targetId)) {
          return true;
        }
      }
    }
    return false;
  };

  // Recursively find and insert item inside target parent
  const insertItemIntoTree = (list: BookmarkItem[], targetParentId: string, itemToInsert: BookmarkItem): boolean => {
    for (const item of list) {
      if (item.type === 'group' && item.id === targetParentId) {
        const group = item as Group;
        if (!group.children) group.children = [];
        group.children.push(itemToInsert);
        return true;
      }
      if (item.type === 'group') {
        const group = item as Group;
        if (group.children && insertItemIntoTree(group.children, targetParentId, itemToInsert)) {
          return true;
        }
      }
    }
    return false;
  };

  // Recursively update an item
  const updateItemInTree = (list: BookmarkItem[], targetId: string, updatedProps: Partial<BookmarkItem>): boolean => {
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === targetId) {
        list[i] = { ...list[i], ...updatedProps } as BookmarkItem;
        return true;
      }
      if (list[i].type === 'group') {
        const group = list[i] as Group;
        if (group.children && updateItemInTree(group.children, targetId, updatedProps)) {
          return true;
        }
      }
    }
    return false;
  };

  const handleOpenAddLink = (parentId?: string) => {
    setEditItem(null);
    setActiveParentId(parentId);
    setLinkTitle('');
    setLinkUrl('');
    setLinkTags('');
    setLinkDescription('');
    setDuplicateWarning(null);
    setIsLinkFormOpen(true);
  };

  const handleOpenEditLink = (link: Link, parentId?: string) => {
    setEditItem(link);
    setActiveParentId(parentId);
    setLinkTitle(link.title || '');
    setLinkUrl(link.url);
    setLinkTags(link.tags ? link.tags.join(', ') : '');
    setLinkDescription(link.description || '');
    setDuplicateWarning(null);
    setIsLinkFormOpen(true);
  };

  const handleOpenAddGroup = (parentId?: string) => {
    setEditItem(null);
    setActiveParentId(parentId);
    setGroupTitle('');
    setGroupTags('');
    setIsGroupFormOpen(true);
  };

  const handleOpenEditGroup = (group: Group, parentId?: string) => {
    setEditItem(group);
    setActiveParentId(parentId);
    setGroupTitle(group.title);
    setGroupTags(group.tags ? group.tags.join(', ') : '');
    setIsGroupFormOpen(true);
  };

  const handleDeleteItem = (itemId: string) => {
    if (!window.confirm('Are you sure you want to delete this item? If it is a folder, all nested subfolders and links inside it will be permanently deleted.')) {
      return;
    }
    const updatedItems = [...items];
    deleteItemFromTree(updatedItems, itemId);
    onSaveWidgetData(widget.id, { items: updatedItems });
  };

  const handleSaveLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;

    let finalUrl = linkUrl.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    let finalTitle = linkTitle.trim();
    if (!finalTitle) {
      try {
        const parsedUrl = new URL(finalUrl);
        finalTitle = parsedUrl.hostname.replace('www.', '');
      } catch {
        finalTitle = finalUrl;
      }
    }

    const tagsArray = linkTags
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);

    const updatedItems = [...items];

    if (editItem) {
      // Editing Link
      updateItemInTree(updatedItems, editItem.id, {
        title: finalTitle,
        url: finalUrl,
        tags: tagsArray,
        description: linkDescription.trim() || undefined
      });
    } else {
      // Adding New Link
      const newLink: Link = {
        id: 'link-' + Math.random().toString(36).substring(2, 9),
        type: 'link',
        title: finalTitle,
        url: finalUrl,
        tags: tagsArray,
        description: linkDescription.trim() || undefined
      };

      if (activeParentId) {
        insertItemIntoTree(updatedItems, activeParentId, newLink);
      } else {
        updatedItems.push(newLink);
      }
    }

    onSaveWidgetData(widget.id, { items: updatedItems });
    setIsLinkFormOpen(false);
  };

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupTitle.trim()) return;

    const tagsArray = groupTags
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);

    const updatedItems = [...items];

    if (editItem) {
      // Editing Group
      updateItemInTree(updatedItems, editItem.id, {
        title: groupTitle.trim(),
        tags: tagsArray
      });
    } else {
      // Adding New Group
      const newGroup: Group = {
        id: 'group-' + Math.random().toString(36).substring(2, 9),
        type: 'group',
        title: groupTitle.trim(),
        tags: tagsArray,
        children: []
      };

      if (activeParentId) {
        insertItemIntoTree(updatedItems, activeParentId, newGroup);
      } else {
        updatedItems.push(newGroup);
      }
    }

    onSaveWidgetData(widget.id, { items: updatedItems });
    setIsGroupFormOpen(false);
  };

  const currentViewMode = widget.data?.viewMode || 'list';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* List controls */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px', 
          marginBottom: '1rem',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          paddingBottom: '0.75rem' 
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            onClick={() => handleOpenAddLink()}
          >
            <Plus size={14} /> Add Link
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            onClick={() => handleOpenAddGroup()}
          >
            <FolderPlus size={14} /> Add Folder
          </button>
        </div>

        {/* View Mode Selectors */}
        <div style={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.03)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-glass)' }}>
          <button
            type="button"
            className="btn-icon"
            style={{
              padding: '4px 6px',
              borderRadius: '4px',
              background: currentViewMode === 'list' ? 'var(--accent-color)' : 'transparent',
              color: currentViewMode === 'list' ? '#fff' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onClick={() => onSaveWidgetData(widget.id, { viewMode: 'list' })}
            title="List View"
          >
            <List size={14} />
          </button>
          <button
            type="button"
            className="btn-icon"
            style={{
              padding: '4px 6px',
              borderRadius: '4px',
              background: currentViewMode === 'detailed' ? 'var(--accent-color)' : 'transparent',
              color: currentViewMode === 'detailed' ? '#fff' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onClick={() => onSaveWidgetData(widget.id, { viewMode: 'detailed' })}
            title="Detailed List View"
          >
            <AlignJustify size={14} />
          </button>
          <button
            type="button"
            className="btn-icon"
            style={{
              padding: '4px 6px',
              borderRadius: '4px',
              background: currentViewMode === 'icons' ? 'var(--accent-color)' : 'transparent',
              color: currentViewMode === 'icons' ? '#fff' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onClick={() => onSaveWidgetData(widget.id, { viewMode: 'icons' })}
            title="Grid of Icons View"
          >
            <Grid size={14} />
          </button>
          <button
            type="button"
            className="btn-icon"
            style={{
              padding: '4px 6px',
              borderRadius: '4px',
              background: currentViewMode === 'cloud' ? 'var(--accent-color)' : 'transparent',
              color: currentViewMode === 'cloud' ? '#fff' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onClick={() => onSaveWidgetData(widget.id, { viewMode: 'cloud' })}
            title="Cloud View"
          >
            <Cloud size={14} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No bookmarks created yet. Use the buttons above to get started!
          </div>
        ) : (
          <BookmarkGroup
            items={items}
            widgetId={widget.id}
            viewMode={currentViewMode}
            onAddLink={handleOpenAddLink}
            onAddGroup={handleOpenAddGroup}
            onEditLink={handleOpenEditLink}
            onEditGroup={handleOpenEditGroup}
            onDeleteItem={handleDeleteItem}
            onDropLinkOnGroup={(linkDataStr, groupId) => onDropLinkOnGroup?.(linkDataStr, widget.id, groupId)}
          />
        )}
      </div>

      {/* LINK DIALOG */}
      {isLinkFormOpen && createPortal(
        <div className="modal-overlay">
          <form className="glass-panel modal-content" onSubmit={handleSaveLink} style={{ background: 'var(--bg-modal)' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Globe size={18} style={{ color: 'var(--accent-color)' }} />
                {editItem ? 'Edit Link' : 'Add Link'}
              </h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Title (optional - auto-scrapes if empty)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. GitHub"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>URL</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g. github.com or https://..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onBlur={handleUrlBlur}
                />
              </div>

              {/* Duplicate URL alert box */}
              {duplicateWarning && duplicateWarning.exists && (
                <div 
                  style={{ 
                    background: 'rgba(245, 158, 11, 0.1)', 
                    border: '1px solid var(--warning-color)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    fontSize: '0.75rem',
                    color: '#f59e0b'
                  }}
                >
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Duplicate Warning:</strong> This URL is already saved on:
                    <ul style={{ paddingLeft: '15px', marginTop: '4px' }}>
                      {duplicateWarning.occurrences.map((o, idx) => (
                        <li key={idx}>
                          "{o.pageTitle}" (as "{o.title}")
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tags (comma separated)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. code, git, repo"
                  value={linkTags}
                  onChange={(e) => setLinkTags(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Description (optional)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Code hosting platform"
                  value={linkDescription}
                  onChange={(e) => setLinkDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsLinkFormOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* GROUP / FOLDER DIALOG */}
      {isGroupFormOpen && createPortal(
        <div className="modal-overlay">
          <form className="glass-panel modal-content" onSubmit={handleSaveGroup} style={{ background: 'var(--bg-modal)' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={18} style={{ color: 'var(--accent-color)' }} />
                {editItem ? 'Edit Folder' : 'Add Folder'}
              </h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Folder Title</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g. Dev Tools"
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tags (comma separated)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. daily, dev"
                  value={groupTags}
                  onChange={(e) => setGroupTags(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsGroupFormOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
};
