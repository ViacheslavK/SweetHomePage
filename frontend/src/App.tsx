import { useState, useEffect, useRef } from 'react';
import { 
  Settings, 
  AlertTriangle, 
  Bookmark, 
  FileText, 
  ChevronDown, 
  Sparkles,
  RefreshCw,
  Trash2,
  Plus,
  Upload,
  Globe
} from 'lucide-react';
import { SearchBar } from './components/SearchBar.jsx';
import { BookmarkWidget } from './components/BookmarkWidget.jsx';
import { NoteWidget } from './components/NoteWidget.jsx';
import { SettingsModal } from './components/SettingsModal.jsx';
import { BrokenLinksModal } from './components/BrokenLinksModal.jsx';
import type { GlobalSettings, PageConfig, Widget, BookmarkItem } from '@startme/shared';
import { parseBookmarksHTML } from './utils/bookmarkParser';

function App() {
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [pageConfig, setPageConfig] = useState<PageConfig | null>(null);
  
  // Modal states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBrokenLinksOpen, setIsBrokenLinksOpen] = useState(false);
  const [isPageDropdownOpen, setIsPageDropdownOpen] = useState(false);
  
  // Dropdown states
  const [isBookmarksDropdownOpen, setIsBookmarksDropdownOpen] = useState(false);
  const [isAddWidgetDropdownOpen, setIsAddWidgetDropdownOpen] = useState(false);

  // Import bookmarks states
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [browserImportInfo, setBrowserImportInfo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drop selection prompt state
  const [dropDecision, setDropDecision] = useState<{
    type: 'folder' | 'widget';
    sourceId: string;
    targetWidgetId: string;
    targetCol: number;
    isTopHalf: boolean;
    folderData?: any;
  } | null>(null);
  
  // Broken links alert state (number of alerts)
  const [brokenLinksCount, setBrokenLinksCount] = useState(0);

  // Drag and Drop layout states
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<number | null>(null);
  const [dragOverWidgetId, setDragOverWidgetId] = useState<string | null>(null);
  const [dragOverWidgetSide, setDragOverWidgetSide] = useState<'top' | 'bottom' | null>(null);

  // Fetch Global Settings
  const loadGlobalSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setGlobalSettings(data);
      }
    } catch (error) {
      console.error('Failed to load global settings:', error);
    }
  };

  // Fetch Page Configuration
  const loadPageConfig = async (pageId: string) => {
    try {
      const response = await fetch(`/api/pages/${pageId}`);
      if (response.ok) {
        const data = await response.json();
        setPageConfig(data);
      }
    } catch (error) {
      console.error(`Failed to load page ${pageId}:`, error);
    }
  };

  // Save Page Configuration to backend
  const savePageConfig = async (updatedConfig: PageConfig) => {
    setPageConfig(updatedConfig);
    try {
      const response = await fetch(`/api/pages/${updatedConfig.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig)
      });
      if (!response.ok) {
        let errMsg = 'Unknown error';
        try {
          const errData = await response.json();
          errMsg = errData.error || response.statusText;
        } catch {
          const text = await response.text();
          errMsg = text || response.statusText;
        }
        console.error('Failed to save page configuration:', errMsg);
        alert(`Failed to save configuration: ${errMsg}`);
        
        if (globalSettings?.activePageId) {
          loadPageConfig(globalSettings.activePageId);
        }
      }
    } catch (error) {
      console.error('Network error saving page configuration:', error);
      alert('Failed to connect to the server. Check your network or docker instance.');
      
      if (globalSettings?.activePageId) {
        loadPageConfig(globalSettings.activePageId);
      }
    }
  };

  // Fetch count of broken links
  const loadBrokenLinksCount = async () => {
    try {
      const response = await fetch('/api/checker/results');
      if (response.ok) {
        const data = await response.json();
        const results = data.results || [];
        setBrokenLinksCount(results.length);
      }
    } catch (error) {
      console.error('Failed to load broken links count:', error);
    }
  };

  // Initial load
  useEffect(() => {
    loadGlobalSettings();
    loadBrokenLinksCount();
  }, []);

  // Close dropdowns on document click
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setIsPageDropdownOpen(false);
        setIsBookmarksDropdownOpen(false);
        setIsAddWidgetDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  // Theme application
  useEffect(() => {
    if (!globalSettings) return;
    const bodyClass = document.body.classList;
    if (globalSettings.globalTheme === 'light-glass') {
      bodyClass.add('theme-light-glass');
    } else {
      bodyClass.remove('theme-light-glass');
    }
  }, [globalSettings]);

  // Load configuration for active page
  useEffect(() => {
    if (globalSettings && globalSettings.activePageId) {
      loadPageConfig(globalSettings.activePageId);
    } else {
      setPageConfig(null);
    }
  }, [globalSettings?.activePageId]);

  // Update browser tab title dynamically
  useEffect(() => {
    if (pageConfig && pageConfig.title) {
      document.title = `SweetHomePage - ${pageConfig.title}`;
    } else {
      document.title = 'SweetHomePage';
    }
  }, [pageConfig?.title]);

  const handleSelectPage = async (pageId: string) => {
    if (!globalSettings) return;
    
    // 1. Optimistic activePageId update
    const updatedSettings = {
      ...globalSettings,
      activePageId: pageId
    };
    setGlobalSettings(updatedSettings);
    setIsPageDropdownOpen(false);

    // 2. Persist to API
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
    } catch (error) {
      console.error('Failed to save selected page state:', error);
    }
  };

  const handleSaveWidgetData = async (widgetId: string, widgetData: any) => {
    if (!pageConfig) return;

    const updatedWidgets = pageConfig.widgets.map(w => {
      if (w.id === widgetId) {
        return {
          ...w,
          data: {
            ...w.data,
            ...widgetData
          }
        };
      }
      return w;
    });

    const updatedConfig = {
      ...pageConfig,
      widgets: updatedWidgets
    };

    await savePageConfig(updatedConfig);
  };

  // Drag and Drop layout handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedWidgetId(id);
  };

  const handleDragEnd = () => {
    setDraggedWidgetId(null);
    setDragOverCol(null);
    setDragOverWidgetId(null);
    setDragOverWidgetSide(null);
  };

  const handleDragOverCol = (e: React.DragEvent, colIndex: number) => {
    const isDraggingLink = e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('application/startme-link');
    if (isDraggingLink) {
      return;
    }

    e.preventDefault();
    if (dragOverCol !== colIndex) {
      setDragOverCol(colIndex);
    }
  };

  const handleDragOverWidget = (e: React.DragEvent, widgetId: string) => {
    const targetWidget = pageConfig?.widgets.find(w => w.id === widgetId);
    if (!targetWidget) return;

    const isDraggingLink = e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('application/startme-link');
    if (isDraggingLink && targetWidget.type !== 'bookmarks') {
      return; // Do not allow dropping links on non-bookmarks widgets
    }

    e.preventDefault();
    e.stopPropagation(); // Stop column drag over from taking over
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const isTop = relativeY < rect.height / 2;
    const side = isTop ? 'top' : 'bottom';
    
    if (dragOverWidgetId !== widgetId || dragOverWidgetSide !== side) {
      setDragOverWidgetId(widgetId);
      setDragOverWidgetSide(side);
    }
  };

  const handleDragLeaveWidget = () => {
    setDragOverWidgetId(null);
    setDragOverWidgetSide(null);
  };

  const handleDropOnCol = async (e: React.DragEvent, targetCol: number) => {
    e.preventDefault();
    setDragOverCol(null);

    // Reject dropping links on columns directly
    const linkDataStr = e.dataTransfer.getData('application/startme-link');
    if (linkDataStr) {
      setDraggedWidgetId(null);
      return;
    }

    // Check if dragging a folder
    const folderDataStr = e.dataTransfer.getData('application/startme-folder');
    if (folderDataStr && pageConfig) {
      try {
        const folderData = JSON.parse(folderDataStr);
        // 1. Remove folder from source widget
        const updatedWidgets = pageConfig.widgets.map(w => {
          if (w.id === folderData.sourceWidgetId) {
            const items = w.data?.items || [];
            const cleanItems = removeItemFromTree([...items], folderData.folderId);
            return {
              ...w,
              data: {
                ...w.data,
                items: cleanItems
              }
            };
          }
          return w;
        });

        // 2. Determine row position at end of target column
        const colWidgets = updatedWidgets.filter(w => (w.position?.col ?? 0) === targetCol);
        const maxRow = colWidgets.reduce((max, w) => Math.max(max, w.position?.row ?? 0), -1);
        const newRow = maxRow + 1;

        // 3. Create new widget from extracted folder
        const newWidget: Widget = {
          id: 'widget-' + Math.random().toString(36).substring(2, 9),
          type: 'bookmarks',
          title: folderData.folderTitle,
          position: { col: targetCol, row: newRow, colSpan: 1, rowSpan: 1 },
          data: {
            items: folderData.children || [],
            viewMode: 'list'
          }
        };

        const updatedConfig = {
          ...pageConfig,
          widgets: [...updatedWidgets, newWidget]
        };

        await savePageConfig(updatedConfig);
        setDraggedWidgetId(null);
        return;
      } catch (err) {
        console.error('Failed to handle folder drop on col:', err);
      }
    }

    const id = e.dataTransfer.getData('text/plain') || draggedWidgetId;
    if (!id || !pageConfig) return;

    // Filter widgets by target column and find max row to append at the end
    const colWidgets = pageConfig.widgets.filter(
      w => (w.position?.col ?? 0) === targetCol && w.id !== id
    );
    const maxRow = colWidgets.reduce((max, w) => Math.max(max, w.position?.row ?? 0), -1);

    const updatedWidgets = pageConfig.widgets.map(w => {
      if (w.id === id) {
        return {
          ...w,
          position: {
            ...w.position,
            col: targetCol,
            row: maxRow + 1
          }
        };
      }
      return w;
    });

    const updatedConfig = {
      ...pageConfig,
      widgets: updatedWidgets
    };

    await savePageConfig(updatedConfig);
    setDraggedWidgetId(null);
  };

  const handleDropOnWidget = async (e: React.DragEvent, targetWidgetId: string, targetCol: number) => {
    e.preventDefault();
    e.stopPropagation(); // Stop bubbling up to the column container
    setDragOverCol(null);
    setDragOverWidgetId(null);
    setDragOverWidgetSide(null);

    const targetWidget = pageConfig?.widgets.find(w => w.id === targetWidgetId);
    if (!targetWidget) return;

    // Check if dragging a link
    const linkDataStr = e.dataTransfer.getData('application/startme-link');
    if (linkDataStr) {
      if (targetWidget.type !== 'bookmarks' || !pageConfig) return;

      try {
        const linkData = JSON.parse(linkDataStr);
        // 1. Remove link from source widget
        const baseWidgets = pageConfig.widgets.map(w => {
          if (w.id === linkData.sourceWidgetId) {
            const items = w.data?.items || [];
            const cleanItems = removeItemFromTree([...items], linkData.linkId);
            return {
              ...w,
              data: {
                ...w.data,
                items: cleanItems
              }
            };
          }
          return w;
        });

        // 2. Add link inside target widget (at root level)
        const finalWidgets = baseWidgets.map(w => {
          if (w.id === targetWidgetId) {
            const items = w.data?.items || [];
            return {
              ...w,
              data: {
                ...w.data,
                items: [...items, linkData.link]
              }
            };
          }
          return w;
        });

        const updatedConfig = {
          ...pageConfig,
          widgets: finalWidgets
        };

        await savePageConfig(updatedConfig);
        setDraggedWidgetId(null);
        return;
      } catch (err) {
        console.error('Failed to handle link drop:', err);
      }
    }

    // Check if dragging a folder
    const folderDataStr = e.dataTransfer.getData('application/startme-folder');
    const id = e.dataTransfer.getData('text/plain') || draggedWidgetId;

    // If target widget is a bookmarks widget, intercept drop to ask user for target position
    if (targetWidget.type === 'bookmarks') {
      const rect = e.currentTarget.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const isTopHalf = relativeY < rect.height / 2;

      if (folderDataStr) {
        try {
          const folderData = JSON.parse(folderDataStr);
          setDropDecision({
            type: 'folder',
            sourceId: folderData.sourceWidgetId,
            targetWidgetId,
            targetCol,
            isTopHalf,
            folderData
          });
          return;
        } catch (err) {
          console.error('Failed to parse folder drop data:', err);
        }
      } else if (id && id !== targetWidgetId) {
        setDropDecision({
          type: 'widget',
          sourceId: id,
          targetWidgetId,
          targetCol,
          isTopHalf
        });
        return;
      }
    }

    // Default immediate drop logic (runs if target is NOT a bookmarks widget)
    if (folderDataStr && pageConfig) {
      try {
        const folderData = JSON.parse(folderDataStr);
        const rect = e.currentTarget.getBoundingClientRect();
        const relativeY = e.clientY - rect.top;
        const isTopHalf = relativeY < rect.height / 2;
        await handleExecuteFolderDropOnWidget(folderData, targetWidgetId, targetCol, isTopHalf);
        return;
      } catch (err) {
        console.error('Failed to handle folder drop on non-bookmarks widget:', err);
      }
    }

    if (!id || id === targetWidgetId || !pageConfig) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const isTopHalf = relativeY < rect.height / 2;
    await handleExecuteWidgetDropOnWidget(id, targetWidgetId, targetCol, isTopHalf);
  };

  const handleExecuteFolderDropOnWidget = async (folderData: any, targetWidgetId: string, targetCol: number, isTopHalf: boolean) => {
    if (!pageConfig) return;

    // 1. Remove folder from source widget
    const baseWidgets = pageConfig.widgets.map(w => {
      if (w.id === folderData.sourceWidgetId) {
        const items = w.data?.items || [];
        const cleanItems = removeItemFromTree([...items], folderData.folderId);
        return {
          ...w,
          data: {
            ...w.data,
            items: cleanItems
          }
        };
      }
      return w;
    });

    // 2. Create the new widget from the folder
    const newWidget: Widget = {
      id: 'widget-' + Math.random().toString(36).substring(2, 9),
      type: 'bookmarks',
      title: folderData.folderTitle,
      position: { col: targetCol, row: 0, colSpan: 1, rowSpan: 1 },
      data: {
        items: folderData.children || [],
        viewMode: 'list'
      }
    };

    const otherWidgets = baseWidgets;
    const targetColWidgets = otherWidgets.filter(w => (w.position?.col ?? 0) === targetCol);
    targetColWidgets.sort((a, b) => (a.position?.row ?? 0) - (b.position?.row ?? 0));

    let targetIdx = targetColWidgets.findIndex(w => w.id === targetWidgetId);
    if (targetIdx === -1) {
      targetIdx = targetColWidgets.length;
    } else if (!isTopHalf) {
      targetIdx = targetIdx + 1;
    }

    targetColWidgets.splice(targetIdx, 0, newWidget);

    // Re-index rows
    targetColWidgets.forEach((w, idx) => {
      w.position = {
        ...w.position,
        row: idx
      };
    });

    // Re-assemble widgets
    const targetColIds = new Set(targetColWidgets.map(w => w.id));
    const nonTargetColWidgets = baseWidgets.filter(w => !targetColIds.has(w.id));
    const finalWidgets = [...nonTargetColWidgets, ...targetColWidgets];

    const updatedConfig = {
      ...pageConfig,
      widgets: finalWidgets
    };

    await savePageConfig(updatedConfig);
    setDraggedWidgetId(null);
  };

  const handleExecuteWidgetDropOnWidget = async (sourceId: string, targetWidgetId: string, targetCol: number, isTopHalf: boolean) => {
    if (!pageConfig) return;

    const otherWidgets = pageConfig.widgets.filter(w => w.id !== sourceId);
    const targetColWidgets = otherWidgets.filter(w => (w.position?.col ?? 0) === targetCol);
    targetColWidgets.sort((a, b) => (a.position?.row ?? 0) - (b.position?.row ?? 0));

    let targetIdx = targetColWidgets.findIndex(w => w.id === targetWidgetId);
    if (targetIdx === -1) {
      targetIdx = targetColWidgets.length;
    } else if (!isTopHalf) {
      targetIdx = targetIdx + 1; // Insert after the target widget
    }

    const draggedWidget = pageConfig.widgets.find(w => w.id === sourceId);
    if (!draggedWidget) return;

    const newDraggedWidget = {
      ...draggedWidget,
      position: {
        ...draggedWidget.position,
        col: targetCol
      }
    };

    // Insert at index Y-adjusted position
    targetColWidgets.splice(targetIdx, 0, newDraggedWidget);

    // Re-index rows
    targetColWidgets.forEach((w, idx) => {
      w.position = {
        ...w.position,
        row: idx
      };
    });

    // Re-assemble
    const updatedWidgets = pageConfig.widgets.map(w => {
      const updatedInCol = targetColWidgets.find(tc => tc.id === w.id);
      if (updatedInCol) return updatedInCol;
      if (w.id === sourceId) return newDraggedWidget;
      return w;
    });

    const updatedConfig = {
      ...pageConfig,
      widgets: updatedWidgets
    };

    await savePageConfig(updatedConfig);
    setDraggedWidgetId(null);
  };

  const executeDropDecision = async (choice: 'top' | 'bottom' | 'inside') => {
    if (!dropDecision || !pageConfig) return;
    const { type, sourceId, targetWidgetId, targetCol, folderData } = dropDecision;
    setDropDecision(null);

    if (choice === 'top' || choice === 'bottom') {
      const adjustedIsTopHalf = choice === 'top';
      if (type === 'folder' && folderData) {
        await handleExecuteFolderDropOnWidget(folderData, targetWidgetId, targetCol, adjustedIsTopHalf);
      } else {
        await handleExecuteWidgetDropOnWidget(sourceId, targetWidgetId, targetCol, adjustedIsTopHalf);
      }
    } else if (choice === 'inside') {
      if (type === 'folder' && folderData) {
        // 1. Remove folder from source widget
        const baseWidgets = pageConfig.widgets.map(w => {
          if (w.id === folderData.sourceWidgetId) {
            const items = w.data?.items || [];
            const cleanItems = removeItemFromTree([...items], folderData.folderId);
            return {
              ...w,
              data: {
                ...w.data,
                items: cleanItems
              }
            };
          }
          return w;
        });

        // 2. Add folder inside target bookmarks widget
        const finalWidgets = baseWidgets.map(w => {
          if (w.id === targetWidgetId) {
            const items = w.data?.items || [];
            const newFolderItem = {
              id: folderData.folderId,
              type: 'group',
              title: folderData.folderTitle,
              tags: [],
              children: folderData.children || []
            };
            return {
              ...w,
              data: {
                ...w.data,
                items: [...items, newFolderItem]
              }
            };
          }
          return w;
        });

        const updatedConfig = {
          ...pageConfig,
          widgets: finalWidgets
        };

        await savePageConfig(updatedConfig);
        setDraggedWidgetId(null);
      } else {
        // Dragged a widget inside target bookmarks widget
        const draggedWidget = pageConfig.widgets.find(w => w.id === sourceId);
        const targetWidget = pageConfig.widgets.find(w => w.id === targetWidgetId);
        if (!draggedWidget || !targetWidget) return;

        if (draggedWidget.type === 'bookmarks') {
          // Remove dragged widget from page
          const filteredWidgets = pageConfig.widgets.filter(w => w.id !== sourceId);
          
          // Add dragged widget's items inside target widget under a new folder
          const finalWidgets = filteredWidgets.map(w => {
            if (w.id === targetWidgetId) {
              const items = w.data?.items || [];
              const newFolderItem = {
                id: 'group-' + Math.random().toString(36).substring(2, 9),
                type: 'group',
                title: draggedWidget.title || 'Merged Folder',
                tags: [],
                children: draggedWidget.data?.items || []
              };
              return {
                ...w,
                data: {
                  ...w.data,
                  items: [...items, newFolderItem]
                }
              };
            }
            return w;
          });

          const updatedConfig = {
            ...pageConfig,
            widgets: finalWidgets
          };

          await savePageConfig(updatedConfig);
          setDraggedWidgetId(null);
        }
      }
    }
  };

  const handleDropLinkOnGroup = async (linkDataStr: string, targetWidgetId: string, groupId: string) => {
    if (!pageConfig) return;
    try {
      const linkData = JSON.parse(linkDataStr);

      // 1. Remove link from source widget's tree
      const baseWidgets = pageConfig.widgets.map(w => {
        if (w.id === linkData.sourceWidgetId) {
          const items = w.data?.items || [];
          const cleanItems = removeItemFromTree([...items], linkData.linkId);
          return { ...w, data: { ...w.data, items: cleanItems } };
        }
        return w;
      });

      // 2. Insert link into the target group within the target widget
      const finalWidgets = baseWidgets.map(w => {
        if (w.id === targetWidgetId) {
          const items = JSON.parse(JSON.stringify(w.data?.items || [])); // deep clone
          insertItemIntoGroup(items, groupId, linkData.link);
          return { ...w, data: { ...w.data, items } };
        }
        return w;
      });

      const updatedConfig = { ...pageConfig, widgets: finalWidgets };
      await savePageConfig(updatedConfig);
    } catch (err) {
      console.error('Failed to drop link into group:', err);
    }
  };

  const handleAddWidget = async (type: 'bookmarks' | 'notes') => {
    if (!pageConfig) return;

    // Find column with the fewest widgets to keep layout balanced at creation
    let minCol = 0;
    let minCount = Infinity;
    const numColumns = pageConfig.settings?.columns || 3;
    for (let c = 0; c < numColumns; c++) {
      const count = pageConfig.widgets.filter(w => (w.position?.col ?? 0) === c).length;
      if (count < minCount) {
        minCount = count;
        minCol = c;
      }
    }

    const colWidgets = pageConfig.widgets.filter(w => (w.position?.col ?? 0) === minCol);
    const maxRow = colWidgets.reduce((max, w) => Math.max(max, w.position?.row ?? 0), -1);
    const newRow = maxRow + 1;

    const widgetTitle = type === 'bookmarks' ? 'Bookmarks Panel' : 'Notes notepad';
    const newWidget: Widget = {
      id: 'widget-' + Math.random().toString(36).substring(2, 9),
      type,
      title: widgetTitle,
      position: { col: minCol, row: newRow, colSpan: 1, rowSpan: 1 },
      data: type === 'bookmarks' ? { items: [] } : { content: '' }
    };

    const updatedConfig = {
      ...pageConfig,
      widgets: [...pageConfig.widgets, newWidget]
    };

    await savePageConfig(updatedConfig);
  };

  const handleAddImportedBookmarks = async (items: BookmarkItem[]) => {
    if (!pageConfig) return;

    // Find column with the fewest widgets to keep layout balanced at creation
    let minCol = 0;
    let minCount = Infinity;
    const numColumns = pageConfig.settings?.columns || 3;
    for (let c = 0; c < numColumns; c++) {
      const count = pageConfig.widgets.filter(w => (w.position?.col ?? 0) === c).length;
      if (count < minCount) {
        minCount = count;
        minCol = c;
      }
    }

    const colWidgets = pageConfig.widgets.filter(w => (w.position?.col ?? 0) === minCol);
    const maxRow = colWidgets.reduce((max, w) => Math.max(max, w.position?.row ?? 0), -1);
    const newRow = maxRow + 1;

    const newWidget: Widget = {
      id: 'widget-' + Math.random().toString(36).substring(2, 9),
      type: 'bookmarks',
      title: 'Imported Bookmarks',
      position: { col: minCol, row: newRow, colSpan: 1, rowSpan: 1 },
      data: { items }
    };

    const updatedConfig = {
      ...pageConfig,
      widgets: [...pageConfig.widgets, newWidget]
    };

    await savePageConfig(updatedConfig);
  };

  const handleTriggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        try {
          const parsed = parseBookmarksHTML(text);
          if (parsed.length === 0) {
            alert('No valid bookmarks could be parsed from the file. Please ensure it is a valid browser export.');
            return;
          }
          handleAddImportedBookmarks(parsed);
          setIsImportOpen(false);
          setBrowserImportInfo(false);
          alert('Bookmarks successfully imported!');
        } catch (err) {
          console.error(err);
          alert('Failed to parse bookmarks file.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportFromBrowser = () => {
    const win = window as any;
    if (win.chrome && win.chrome.bookmarks && win.chrome.bookmarks.getTree) {
      win.chrome.bookmarks.getTree((tree: any) => {
        const items = mapChromeBookmarks(tree);
        if (items && items.length > 0) {
          handleAddImportedBookmarks(items);
          setIsImportOpen(false);
          setBrowserImportInfo(false);
          alert('Bookmarks successfully imported from browser!');
        } else {
          alert('No bookmarks found in the browser.');
        }
      });
    } else {
      setBrowserImportInfo(true);
    }
  };

  const mapChromeBookmarks = (chromeNodes: any[]): BookmarkItem[] => {
    const items: BookmarkItem[] = [];
    for (const node of chromeNodes) {
      if (node.url) {
        items.push({
          id: 'link-' + Math.random().toString(36).substring(2, 9),
          type: 'link',
          title: node.title || node.url,
          url: node.url,
          tags: []
        });
      } else if (node.children) {
        const lowerTitle = (node.title || '').trim().toLowerCase();
        const isToolbar = lowerTitle === 'bookmarks toolbar' || lowerTitle === 'bookmarks bar' || lowerTitle === 'bookmarksbar';
        const title = isToolbar ? 'bookmarks toolbar' : (node.title || 'Folder');
        
        if (node.id === '0') {
          items.push(...mapChromeBookmarks(node.children));
        } else {
          items.push({
            id: 'group-' + Math.random().toString(36).substring(2, 9),
            type: 'group',
            title: title,
            tags: [],
            children: mapChromeBookmarks(node.children)
          });
        }
      }
    }
    return items;
  };

  const handleLoadSampleBookmarks = () => {
    const demoItems: BookmarkItem[] = [
      {
        id: 'group-demo-toolbar',
        type: 'group',
        title: 'bookmarks toolbar',
        tags: ['demo', 'toolbar'],
        children: [
          {
            id: 'link-demo-1',
            type: 'link',
            title: 'Google Search',
            url: 'https://google.com',
            tags: ['search']
          },
          {
            id: 'link-demo-2',
            type: 'link',
            title: 'GitHub Repositories',
            url: 'https://github.com',
            tags: ['code']
          }
        ]
      },
      {
        id: 'group-demo-dev',
        type: 'group',
        title: 'Development Links',
        tags: ['dev', 'tools'],
        children: [
          {
            id: 'link-demo-3',
            type: 'link',
            title: 'React Documentation',
            url: 'https://react.dev',
            tags: ['react', 'frontend']
          },
          {
            id: 'group-demo-nest',
            type: 'group',
            title: 'Sub-tools',
            tags: ['nested'],
            children: [
              {
                id: 'link-demo-4',
                type: 'link',
                title: 'Docker Hub',
                url: 'https://hub.docker.com',
                tags: ['docker', 'containers']
              }
            ]
          }
        ]
      }
    ];

    handleAddImportedBookmarks(demoItems);
    setIsImportOpen(false);
    setBrowserImportInfo(false);
    alert('Demo bookmarks successfully loaded!');
  };

  const handleDeleteWidget = async (widgetId: string) => {
    if (!pageConfig || !window.confirm('Are you sure you want to delete this widget?')) return;

    const updatedConfig = {
      ...pageConfig,
      widgets: pageConfig.widgets.filter(w => w.id !== widgetId)
    };

    await savePageConfig(updatedConfig);
  };

  const handleUpdateWidgetTitle = async (widgetId: string, currentTitle: string) => {
    const newTitle = window.prompt('Enter new widget title:', currentTitle);
    if (newTitle === null || !newTitle.trim()) return;

    if (!pageConfig) return;

    const updatedConfig = {
      ...pageConfig,
      widgets: pageConfig.widgets.map(w => w.id === widgetId ? { ...w, title: newTitle.trim() } : w)
    };

    await savePageConfig(updatedConfig);
  };

  return (
    <div className="app-container">
      {/* Header Panel */}
      <header className="app-header">
        <div className="header-left">
          <div className="app-logo">
            <Sparkles size={20} />
            SweetHomePage
          </div>

          {/* Switcher Dropdown */}
          {globalSettings && (
            <div className="dropdown-container">
              <button 
                className="dropdown-trigger" 
                onClick={() => setIsPageDropdownOpen(!isPageDropdownOpen)}
              >
                <span>{globalSettings.pagesList.find(p => p.id === globalSettings.activePageId)?.title || 'Select Dashboard'}</span>
                <ChevronDown size={14} />
              </button>
              {isPageDropdownOpen && (
                <ul className="dropdown-menu">
                  {globalSettings.pagesList.map(page => (
                    <li 
                      key={page.id} 
                      className={`dropdown-item ${globalSettings.activePageId === page.id ? 'active' : ''}`}
                      onClick={() => handleSelectPage(page.id)}
                    >
                      {page.title}
                    </li>
                  ))}
                  <li 
                    className="dropdown-item" 
                    style={{ borderTop: '1px solid var(--border-glass)', marginTop: '4px', color: 'var(--accent-color)', fontWeight: 600 }}
                    onClick={() => {
                      setIsPageDropdownOpen(false);
                      setIsSettingsOpen(true);
                    }}
                  >
                    + Manage Dashboards
                  </li>
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Global Search Bar */}
        <SearchBar onNavigateToPage={handleSelectPage} />

        <div className="header-right">
          {/* Health checker status bar */}
          <button 
            className="btn btn-secondary" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              borderColor: brokenLinksCount > 0 ? 'var(--warning-color)' : 'var(--border-glass)'
            }}
            onClick={() => setIsBrokenLinksOpen(true)}
          >
            <AlertTriangle 
              size={16} 
              style={{ color: brokenLinksCount > 0 ? 'var(--warning-color)' : 'var(--text-secondary)' }} 
            />
            <span>Link Health</span>
            {brokenLinksCount > 0 && (
              <span 
                style={{ 
                  background: 'var(--danger-color)', 
                  color: '#fff', 
                  borderRadius: '10px', 
                  padding: '1px 6px', 
                  fontSize: '0.7rem', 
                  fontWeight: 700 
                }}
              >
                {brokenLinksCount}
              </span>
            )}
          </button>

          <button className="btn-icon" onClick={() => setIsSettingsOpen(true)} title="Global App settings">
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Main Workspace Grid */}
      <main className="workspace-container">
        {pageConfig ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '2rem', fontWeight: 700 }}>
                  {pageConfig.title}
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                  Docker Host Volume Dashboard &rsaquo; Local Configurations File
                </p>
              </div>

              {/* Add widgets panels */}
              <div style={{ display: 'flex', gap: '10px' }}>
                {/* Bookmarks Dropdown */}
                <div className="dropdown-container">
                  <button 
                    className="btn btn-primary" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsBookmarksDropdownOpen(!isBookmarksDropdownOpen);
                      setIsAddWidgetDropdownOpen(false);
                    }}
                    style={{ gap: '6px' }}
                  >
                    <Bookmark size={16} /> Bookmarks <ChevronDown size={14} />
                  </button>
                  {isBookmarksDropdownOpen && (
                    <ul className="dropdown-menu" style={{ right: 0, left: 'auto', minWidth: '180px' }}>
                      <li 
                        className="dropdown-item" 
                        onClick={() => {
                          handleAddWidget('bookmarks');
                          setIsBookmarksDropdownOpen(false);
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <Plus size={14} /> Add Bookmarks Panel
                      </li>
                      <li 
                        className="dropdown-item" 
                        onClick={() => {
                          setIsImportOpen(true);
                          setIsBookmarksDropdownOpen(false);
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <Upload size={14} /> Import Bookmarks
                      </li>
                    </ul>
                  )}
                </div>

                {/* Add Widget Dropdown */}
                <div className="dropdown-container">
                  <button 
                    className="btn btn-secondary" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAddWidgetDropdownOpen(!isAddWidgetDropdownOpen);
                      setIsBookmarksDropdownOpen(false);
                    }}
                    style={{ gap: '6px' }}
                  >
                    <Plus size={16} /> Add widget <ChevronDown size={14} />
                  </button>
                  {isAddWidgetDropdownOpen && (
                    <ul className="dropdown-menu" style={{ right: 0, left: 'auto', minWidth: '180px' }}>
                      <li 
                        className="dropdown-item" 
                        onClick={() => {
                          handleAddWidget('notes');
                          setIsAddWidgetDropdownOpen(false);
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <FileText size={14} /> Notes Notepad
                      </li>
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Widget layout grids */}
            {pageConfig.widgets.length === 0 ? (
              <div 
                className="glass-panel" 
                style={{ 
                  padding: '5rem 2rem', 
                  textAlign: 'center', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  gap: '12px',
                  color: 'var(--text-muted)' 
                }}
              >
                <Sparkles size={36} style={{ color: 'var(--accent-color)' }} />
                <h3>Your Start Page is Empty</h3>
                <p style={{ fontSize: '0.9rem', maxWidth: '400px' }}>
                  Use the "Bookmarks" or "Add widget" dropdowns above to create grids and link panels.
                </p>
              </div>
            ) : (
              <div className="widgets-grid" style={{ gridTemplateColumns: `repeat(${pageConfig.settings?.columns || 3}, minmax(0, 1fr))` }}>
                {Array.from({ length: pageConfig.settings?.columns || 3 }).map((_, colIndex) => {
                  const numColumns = pageConfig.settings?.columns || 3;
                  const colWidgets = pageConfig.widgets.filter(
                    w => {
                      const col = w.position?.col ?? 0;
                      if (colIndex === numColumns - 1) {
                        return col >= colIndex;
                      }
                      return col === colIndex;
                    }
                  );
                  colWidgets.sort((a, b) => (a.position?.row ?? 0) - (b.position?.row ?? 0));

                  return (
                    <div 
                      key={colIndex} 
                      className={`widgets-column ${dragOverCol === colIndex ? 'drag-over' : ''}`}
                      onDragOver={(e) => handleDragOverCol(e, colIndex)}
                      onDragLeave={(e) => e.preventDefault()}
                      onDrop={(e) => handleDropOnCol(e, colIndex)}
                      style={{
                        minHeight: '450px',
                        borderRadius: 'var(--radius-md)',
                        transition: 'background var(--transition-fast), border-color var(--transition-fast)',
                        border: dragOverCol === colIndex ? '2px dashed var(--border-focus)' : '2px dashed transparent',
                        background: dragOverCol === colIndex ? 'rgba(118, 102, 240, 0.05)' : 'transparent',
                        padding: '4px'
                      }}
                    >
                      {colWidgets.map(widget => (
                        <div 
                          key={widget.id} 
                          className="glass-panel widget-card animate-fade-in"
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, widget.id)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleDragOverWidget(e, widget.id)}
                          onDragLeave={handleDragLeaveWidget}
                          onDrop={(e) => {
                            handleDragLeaveWidget();
                            handleDropOnWidget(e, widget.id, colIndex);
                          }}
                          style={{
                            borderTop: (dragOverWidgetId === widget.id && dragOverWidgetSide === 'top') ? '2px solid var(--border-focus)' : undefined,
                            borderBottom: (dragOverWidgetId === widget.id && dragOverWidgetSide === 'bottom') ? '2px solid var(--border-focus)' : undefined,
                            transition: 'border var(--transition-fast)'
                          }}
                        >
                          <div className="widget-header">
                            <div 
                              className="widget-title" 
                              style={{ cursor: 'pointer' }}
                              onClick={() => handleUpdateWidgetTitle(widget.id, widget.title)}
                              title="Click to rename"
                            >
                              {widget.type === 'bookmarks' ? <Bookmark size={15} style={{ color: 'var(--accent-color)' }} /> : <FileText size={15} style={{ color: 'var(--accent-color)' }} />}
                              <span>{widget.title}</span>
                            </div>
                            <button 
                              className="btn-icon" 
                              style={{ color: 'var(--danger-color)' }}
                              onClick={() => handleDeleteWidget(widget.id)}
                              title="Delete Panel"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <div className="widget-body">
                            {widget.type === 'bookmarks' ? (
                              <BookmarkWidget 
                                widget={widget} 
                                pageId={pageConfig.id} 
                                onSaveWidgetData={handleSaveWidgetData}
                                onDropLinkOnGroup={handleDropLinkOnGroup}
                              />
                            ) : (
                              <NoteWidget 
                                widget={widget} 
                                onSaveWidgetData={handleSaveWidgetData} 
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
            <div style={{ textAlign: 'center' }}>
              <RefreshCw size={36} className="animate-spin" style={{ animation: 'spin 2s linear infinite', marginBottom: '10px' }} />
              <p>Loading Active Dashboard Configuration...</p>
            </div>
          </div>
        )}
      </main>

      {/* Settings Modal component */}
      {globalSettings && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          globalSettings={globalSettings}
          activePageId={globalSettings.activePageId}
          onRefreshSettings={loadGlobalSettings}
          onSelectPage={handleSelectPage}
        />
      )}

      {/* Diagnostics health checker modal */}
      <BrokenLinksModal
        isOpen={isBrokenLinksOpen}
        onClose={() => {
          setIsBrokenLinksOpen(false);
          loadBrokenLinksCount(); // Update alert count
        }}
        onRefreshPageData={() => {
          if (globalSettings?.activePageId) {
            loadPageConfig(globalSettings.activePageId);
          }
        }}
      />

      {/* Import Bookmarks Modal */}
      {isImportOpen && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ background: 'var(--bg-modal)', maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bookmark size={18} style={{ color: 'var(--accent-color)' }} />
                Import Bookmarks
              </h3>
              <button className="btn-icon" onClick={() => { setIsImportOpen(false); setBrowserImportInfo(false); }}>
                &times;
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1rem 0' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Choose how you want to import your bookmarks into your dashboard.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Button 1: Import from file */}
                <button 
                  className="btn btn-secondary" 
                  onClick={handleTriggerFileInput}
                  style={{ 
                    justifyContent: 'flex-start', 
                    padding: '1.25rem', 
                    height: 'auto', 
                    textAlign: 'left',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    width: '100%',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    <Upload size={16} style={{ color: 'var(--accent-color)' }} />
                    Import from file
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Upload an HTML bookmarks file exported from Firefox, Chrome, Edge, etc.
                  </span>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  accept=".html,text/html" 
                  onChange={handleFileChange}
                />

                {/* Button 2: Import from current browser */}
                <button 
                  className="btn btn-secondary" 
                  onClick={handleImportFromBrowser}
                  style={{ 
                    justifyContent: 'flex-start', 
                    padding: '1.25rem', 
                    height: 'auto', 
                    textAlign: 'left',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    width: '100%',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    <Globe size={16} style={{ color: 'var(--accent-color)' }} />
                    Import from current browser
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Directly sync bookmarks from your active browser profile.
                  </span>
                </button>
              </div>

              {/* Status Message or Browser Import Warning/Manual Instruction */}
              {browserImportInfo && (
                <div 
                  className="glass-panel" 
                  style={{ 
                    padding: '1rem', 
                    borderRadius: 'var(--radius-sm)', 
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-glass)',
                    marginTop: '0.5rem',
                    animation: 'fadeIn 0.2s ease-out'
                  }}
                >
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                    Direct browser access restricted:
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: '1.4' }}>
                    Browser security policies prevent standard web pages from directly reading your bookmarks database.
                  </p>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                    To import manually:
                  </h4>
                  <ol style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '4px', lineHeight: '1.4' }}>
                    <li>Press <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '3px' }}>Ctrl + Shift + O</kbd> (or <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '3px' }}>Cmd + Option + B</kbd> on Mac).</li>
                    <li>Click the menu button (three dots or Organize) in the top-right corner.</li>
                    <li>Select <strong>Export Bookmarks</strong> to save an HTML file.</li>
                    <li>Upload that file using <strong>Import from file</strong> above.</li>
                  </ol>
                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      onClick={handleLoadSampleBookmarks}
                    >
                      Load Demo Bookmarks
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1rem', marginTop: 0 }}>
              <button className="btn btn-secondary" onClick={() => { setIsImportOpen(false); setBrowserImportInfo(false); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drop Decision Modal */}
      {dropDecision && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ background: 'var(--bg-modal)', maxWidth: '450px', textAlign: 'center' }}>
            <div className="modal-header" style={{ justifyContent: 'center' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} style={{ color: 'var(--accent-color)' }} />
                Save Item Position
              </h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1rem 0' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Select where you want to place the dragged {dropDecision.type === 'folder' ? 'folder' : 'widget'} relative to the hovered bookmarks widget.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => executeDropDecision('top')}
                  style={{ width: '100%', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  Place Above Hovered Widget
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => executeDropDecision('bottom')}
                  style={{ width: '100%', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  Place Below Hovered Widget
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={() => executeDropDecision('inside')}
                  style={{ 
                    width: '100%', 
                    justifyContent: 'center', 
                    gap: '8px', 
                    cursor: 'pointer',
                    opacity: (dropDecision.type === 'widget' && pageConfig?.widgets.find(w => w.id === dropDecision.sourceId)?.type !== 'bookmarks') ? 0.5 : 1,
                    pointerEvents: (dropDecision.type === 'widget' && pageConfig?.widgets.find(w => w.id === dropDecision.sourceId)?.type !== 'bookmarks') ? 'none' : 'auto'
                  }}
                  title={dropDecision.type === 'widget' && pageConfig?.widgets.find(w => w.id === dropDecision.sourceId)?.type !== 'bookmarks' ? 'Only Bookmarks widgets can be nested inside bookmarks' : ''}
                >
                  Insert Inside Hovered Widget
                </button>
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'center', marginTop: '0.5rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setDropDecision(null)} style={{ cursor: 'pointer' }}>
                Cancel Drop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function removeItemFromTree(list: any[], targetId: string): any[] {
  return list.filter(item => {
    if (item.id === targetId) {
      return false;
    }
    if (item.type === 'group') {
      item.children = removeItemFromTree(item.children || [], targetId);
    }
    return true;
  });
}

function insertItemIntoGroup(list: any[], targetGroupId: string, itemToInsert: any): boolean {
  for (const item of list) {
    if (item.type === 'group' && item.id === targetGroupId) {
      item.children = [...(item.children || []), itemToInsert];
      return true;
    }
    if (item.type === 'group' && item.children) {
      if (insertItemIntoGroup(item.children, targetGroupId, itemToInsert)) return true;
    }
  }
  return false;
}

export default App;
