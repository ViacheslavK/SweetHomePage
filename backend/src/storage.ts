import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  GlobalSettings, 
  GlobalSettingsSchema, 
  PageConfig, 
  PageConfigSchema 
} from '@startme/shared';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

/**
 * Validates a page ID against a strict allowlist and rejects any value that
 * could be used for path traversal (CWE-23 / js/path-injection fix).
 * Only lowercase alphanumeric characters, hyphens, and underscores are allowed.
 * Throws if the id is invalid.
 */
function sanitizePageId(id: string): string {
  if (!id || typeof id !== 'string') {
    throw new Error('Page ID must be a non-empty string');
  }
  // Strict allowlist: lowercase a-z, 0-9, hyphen, underscore; 1-64 chars
  if (!/^[a-z0-9_-]{1,64}$/.test(id)) {
    throw new Error(`Invalid page ID: "${id.slice(0, 64)}" (only a-z, 0-9, _ and - are allowed)`);
  }
  // Extra guard: resolved path must remain inside DATA_DIR
  const resolved = path.resolve(DATA_DIR, `page-${id}.json`);
  if (!resolved.startsWith(path.resolve(DATA_DIR) + path.sep)) {
    throw new Error('Page ID would escape the data directory');
  }
  return id;
}

export async function initStorage(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    // Check if global-settings.json exists
    const globalSettingsPath = path.join(DATA_DIR, 'global-settings.json');
    try {
      await fs.access(globalSettingsPath);
    } catch {
      // It does not exist, initialize it
      const defaultSettings: GlobalSettings = {
        version: '1.0.0',
        activePageId: 'default',
        globalTheme: 'dark-glass',
        pagesList: [
          { id: 'default', title: 'Home Page', fileName: 'page-default.json' }
        ],
        backupSettings: { provider: 'none', intervalHours: 24 }
      };
      await fs.writeFile(globalSettingsPath, JSON.stringify(defaultSettings, null, 2), 'utf-8');
      
      // Initialize the default page configuration
      const defaultPage: PageConfig = {
        version: '1.0.0',
        id: 'default',
        title: 'Home Page',
        settings: {
          columns: 3,
          backgroundUrl: '',
          customCss: ''
        },
        widgets: [
          {
            id: 'widget-welcome',
            type: 'bookmarks',
            title: 'Welcome Links',
            position: { col: 0, row: 0, colSpan: 1, rowSpan: 1 },
            data: {
              items: [
                {
                  id: 'link-1',
                  type: 'link',
                  title: 'Google',
                  url: 'https://www.google.com',
                  icon: 'search',
                  description: 'Search Engine',
                  tags: ['search', 'general']
                },
                {
                  id: 'link-2',
                  type: 'link',
                  title: 'GitHub',
                  url: 'https://github.com',
                  icon: 'github',
                  description: 'Code Hosting',
                  tags: ['code', 'git', 'dev']
                }
              ]
            }
          },
          {
            id: 'widget-notes',
            type: 'notes',
            title: 'My Notes',
            position: { col: 1, row: 0, colSpan: 1, rowSpan: 1 },
            data: {
              content: '# Welcome to your StartPage!\n\nThis is a local docker clone of start.me. You can:\n- Group links recursively.\n- Add tags to links and groups.\n- Run a global search.\n- Check for broken links!'
            }
          }
        ]
      };
      await writePageConfig('default', defaultPage);
    }
  } catch (error) {
    console.error('Failed to initialize storage:', error);
    throw error;
  }
}

export async function readGlobalSettings(): Promise<GlobalSettings> {
  const filePath = path.join(DATA_DIR, 'global-settings.json');
  const content = await fs.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(content);
  return GlobalSettingsSchema.parse(parsed);
}

export async function writeGlobalSettings(settings: GlobalSettings): Promise<void> {
  const filePath = path.join(DATA_DIR, 'global-settings.json');
  // Validate before writing
  const validated = GlobalSettingsSchema.parse(settings);
  await fs.writeFile(filePath, JSON.stringify(validated, null, 2), 'utf-8');
}

export async function readPageConfig(id: string): Promise<PageConfig> {
  const safeId = sanitizePageId(id);
  const filePath = path.join(DATA_DIR, `page-${safeId}.json`);
  const content = await fs.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(content);
  return PageConfigSchema.parse(parsed);
}

export async function writePageConfig(id: string, config: PageConfig): Promise<void> {
  const safeId = sanitizePageId(id);
  const filePath = path.join(DATA_DIR, `page-${safeId}.json`);
  // Validate before writing
  const validated = PageConfigSchema.parse(config);
  await fs.writeFile(filePath, JSON.stringify(validated, null, 2), 'utf-8');
}

export async function deletePageConfig(id: string): Promise<void> {
  const safeId = sanitizePageId(id);
  const filePath = path.join(DATA_DIR, `page-${safeId}.json`);
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // If it doesn't exist, ignore — log safely without interpolating user input
    console.warn('Attempted to delete a page config file that did not exist', { pageId: safeId, error });
  }
}

export async function readBrokenLinks(): Promise<any> {
  const filePath = path.join(DATA_DIR, 'broken-links.json');
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    // If doesn't exist, return empty results structure
    return {
      lastChecked: null,
      running: false,
      results: []
    };
  }
}

export async function writeBrokenLinks(data: any): Promise<void> {
  const filePath = path.join(DATA_DIR, 'broken-links.json');
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function getDataDirPath(): string {
  return DATA_DIR;
}
