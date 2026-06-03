import { z } from 'zod';

// --- Links & Groups (Recursive structure) ---
export const LinkSchema = z.object({
  id: z.string(),
  type: z.literal('link'),
  title: z.string().optional(),
  url: z.string(),
  icon: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type Link = z.infer<typeof LinkSchema>;

export interface Group {
  id: string;
  type: 'group';
  title: string;
  tags?: string[];
  children: (Link | Group)[];
}

export const GroupSchema: z.ZodType<Group> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.literal('group'),
    title: z.string(),
    tags: z.array(z.string()).optional(),
    children: z.array(z.union([LinkSchema, GroupSchema])),
  })
);

export const BookmarkItemSchema = z.union([LinkSchema, GroupSchema]);
export type BookmarkItem = Link | Group;

// --- Widgets ---
export const WidgetSchema = z.object({
  id: z.string(),
  type: z.union([z.literal('bookmarks'), z.literal('notes')]),
  title: z.string(),
  position: z.object({
    col: z.number(),
    row: z.number(),
    colSpan: z.number(),
    rowSpan: z.number(),
  }),
  data: z.any(), // Custom validation based on type
});

export type Widget = z.infer<typeof WidgetSchema>;

export const BookmarksDataSchema = z.object({
  items: z.array(BookmarkItemSchema),
});

export type BookmarksData = z.infer<typeof BookmarksDataSchema>;

export const NotesDataSchema = z.object({
  content: z.string(),
});

export type NotesData = z.infer<typeof NotesDataSchema>;

// --- Individual Page Config ---
export const PageConfigSchema = z.object({
  version: z.string().default('1.0.0'),
  id: z.string(),
  title: z.string(),
  settings: z.object({
    columns: z.number().default(3),
    backgroundUrl: z.string().default(''),
    customCss: z.string().default(''),
  }),
  widgets: z.array(WidgetSchema).default([]),
});

export type PageConfig = z.infer<typeof PageConfigSchema>;

// --- Global Settings ---
export const PageListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  fileName: z.string(),
});

export type PageListItem = z.infer<typeof PageListItemSchema>;

export const GlobalSettingsSchema = z.object({
  version: z.string().default('1.0.0'),
  activePageId: z.string().nullable().default(null),
  globalTheme: z.string().default('dark-glass'),
  pagesList: z.array(PageListItemSchema).default([]),
  backupSettings: z.object({
    provider: z.string().default('none'),
    intervalHours: z.number().default(24),
  }).default({ provider: 'none', intervalHours: 24 }),
});

export type GlobalSettings = z.infer<typeof GlobalSettingsSchema>;

// --- Flatten Link Item representation ---
export interface FlatLinkInfo {
  id: string;
  title: string;
  url: string;
  tags: string[];
  widgetId: string;
  widgetTitle: string;
  path: string[]; // Folder path e.g. ["Hosting Services"]
}

// --- Shared Helpers ---
export function getAllLinksFromPage(page: PageConfig): FlatLinkInfo[] {
  const result: FlatLinkInfo[] = [];

  for (const widget of page.widgets) {
    if (widget.type === 'bookmarks') {
      const data = widget.data as BookmarksData;
      if (data && Array.isArray(data.items)) {
        traverseItems(data.items, widget.id, widget.title, []);
      }
    }
  }

  function traverseItems(items: BookmarkItem[], widgetId: string, widgetTitle: string, currentPath: string[]) {
    for (const item of items) {
      if (item.type === 'link') {
        result.push({
          id: item.id,
          title: item.title || item.url,
          url: item.url,
          tags: item.tags || [],
          widgetId,
          widgetTitle,
          path: [...currentPath],
        });
      } else if (item.type === 'group') {
        const nextPath = [...currentPath, item.title];
        if (Array.isArray(item.children)) {
          traverseItems(item.children, widgetId, widgetTitle, nextPath);
        }
      }
    }
  }

  return result;
}
