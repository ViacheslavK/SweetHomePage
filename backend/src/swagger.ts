export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'SweetHomePage API Documentation',
    version: '1.0.0',
    description: 'API endpoints for managing page configurations, global settings, scraping link metadata, and running broken link diagnostics for the SweetHomePage start page clone.',
  },
  servers: [
    {
      url: '/api',
      description: 'Base API path',
    },
  ],
  paths: {
    '/settings': {
      get: {
        summary: 'Retrieve global settings',
        description: 'Returns the active theme, the active page configuration ID, and the list of available pages.',
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/GlobalSettings',
                },
              },
            },
          },
        },
      },
      put: {
        summary: 'Update global settings',
        description: 'Updates active theme, active page configuration ID, and pages list.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/GlobalSettings',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Successful update',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid settings format',
          },
        },
      },
    },
    '/pages': {
      post: {
        summary: 'Create a new page config',
        description: 'Creates a new page with a given ID and title, initializing it with empty columns.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['id', 'title'],
                properties: {
                  id: { type: 'string', example: 'work-dash' },
                  title: { type: 'string', example: 'Work Dashboard' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Page successfully created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PageConfig',
                },
              },
            },
          },
          '400': {
            description: 'Invalid input or page ID format',
          },
          '409': {
            description: 'Page with given ID already exists',
          },
        },
      },
    },
    '/pages/{id}': {
      get: {
        summary: 'Get a page config by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'The unique page ID',
          },
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PageConfig',
                },
              },
            },
          },
          '404': {
            description: 'Page not found',
          },
        },
      },
      put: {
        summary: 'Update a page config',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'The unique page ID to update',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/PageConfig',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Successful update',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid page configuration schema',
          },
        },
      },
      delete: {
        summary: 'Delete a page config',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'The unique page ID to delete',
          },
        ],
        responses: {
          '200': {
            description: 'Successful deletion',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Page not found in global settings list',
          },
        },
      },
    },
    '/search': {
      get: {
        summary: 'Search bookmarks and folders',
        description: 'Searches through all bookmarks, tags, URLs, folder paths, and widget titles across all page configurations.',
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Search query string',
          },
        ],
        responses: {
          '200': {
            description: 'Successful search results',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/FlatLinkInfo',
                  },
                },
              },
            },
          },
        },
      },
    },
    '/links/check-duplicate': {
      get: {
        summary: 'Check if a URL is already bookmarked',
        parameters: [
          {
            name: 'url',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'The URL to check',
          },
          {
            name: 'currentPageId',
            in: 'query',
            required: false,
            schema: { type: 'string' },
          },
          {
            name: 'excludeLinkId',
            in: 'query',
            required: false,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Duplicate scan results',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    exists: { type: 'boolean', example: true },
                    occurrences: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          pageId: { type: 'string' },
                          pageTitle: { type: 'string' },
                          title: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/links/metadata': {
      get: {
        summary: 'Scrape URL title and description',
        description: 'Fetches the remote HTML and parses open-graph and header tags. Performs SSRF validations to ensure internal URLs cannot be queried.',
        parameters: [
          {
            name: 'url',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'The target web page URL to scrape',
          },
        ],
        responses: {
          '200': {
            description: 'Extracted metadata',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', example: 'Example Domain' },
                    description: { type: 'string', example: 'This domain is for use in illustrative examples...' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid scheme, syntax, or SSRF protection blocked the domain',
          },
        },
      },
    },
    '/checker/results': {
      get: {
        summary: 'Get broken link scanner results',
        responses: {
          '200': {
            description: 'Scanned links history and current status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    lastChecked: { type: 'string', format: 'date-time', nullable: true },
                    running: { type: 'boolean', example: false },
                    results: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/BrokenResult',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/checker/run': {
      post: {
        summary: 'Trigger broken link scanner',
        description: 'Starts a background diagnostics thread checking HTTP status and redirect URLs for all saved bookmarks.',
        responses: {
          '202': {
            description: 'Link checking job successfully spawned',
          },
          '409': {
            description: 'Diagnostics scan is already running',
          },
        },
      },
    },
    '/checker/pause': {
      post: {
        summary: 'Pause the global scanner',
        description: 'Pauses the ongoing background diagnostics thread.',
        responses: {
          '200': {
            description: 'Successfully paused',
          },
        },
      },
    },
    '/checker/resume': {
      post: {
        summary: 'Resume the global scanner',
        description: 'Resumes the paused background diagnostics thread.',
        responses: {
          '200': {
            description: 'Successfully resumed',
          },
        },
      },
    },
    '/checker/stop': {
      post: {
        summary: 'Stop the global scanner',
        description: 'Stops the ongoing background diagnostics thread completely.',
        responses: {
          '200': {
            description: 'Successfully stopped',
          },
        },
      },
    },
    '/checker/recheck': {
      post: {
        summary: 'Recheck a single URL',
        description: 'Rechecks a specific URL and updates its entry in the diagnostics results list.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['url'],
                properties: {
                  url: { type: 'string', example: 'https://example.com' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Recheck complete, returns the check result details',
          },
        },
      },
    },
    '/checker/occurrences': {
      delete: {
        summary: 'Remove a broken link occurrence from diagnostic reports',
        description: 'Instructs the checker to delete the occurrence of a broken link from the dashboard health lists.',
        parameters: [
          {
            name: 'pageId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'linkId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Occurrence removed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Missing query parameters',
          },
        },
      },
    },
  },
  components: {
    schemas: {
      GlobalSettings: {
        type: 'object',
        properties: {
          version: { type: 'string', example: '1.0.0' },
          activePageId: { type: 'string', example: 'default', nullable: true },
          globalTheme: { type: 'string', example: 'dark-glass' },
          pagesList: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                fileName: { type: 'string' },
              },
            },
          },
          backupSettings: {
            type: 'object',
            properties: {
              provider: { type: 'string', example: 'none' },
              intervalHours: { type: 'integer', example: 24 },
            },
          },
        },
      },
      PageConfig: {
        type: 'object',
        properties: {
          version: { type: 'string', example: '1.0.0' },
          id: { type: 'string', example: 'default' },
          title: { type: 'string', example: 'Home Page' },
          settings: {
            type: 'object',
            properties: {
              columns: { type: 'integer', example: 3 },
              backgroundUrl: { type: 'string' },
              customCss: { type: 'string' },
            },
          },
          widgets: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Widget',
            },
          },
        },
      },
      Widget: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'widget-welcome' },
          type: { type: 'string', enum: ['bookmarks', 'notes'], example: 'bookmarks' },
          title: { type: 'string', example: 'Welcome Links' },
          position: {
            type: 'object',
            properties: {
              col: { type: 'integer' },
              row: { type: 'integer' },
              colSpan: { type: 'integer' },
              rowSpan: { type: 'integer' },
            },
          },
          data: {
            type: 'object',
            description: 'Custom widget contents based on widget type',
          },
        },
      },
      FlatLinkInfo: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          url: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          widgetId: { type: 'string' },
          widgetTitle: { type: 'string' },
          path: { type: 'array', items: { type: 'string' } },
          pageId: { type: 'string' },
          pageTitle: { type: 'string' },
        },
      },
      BrokenResult: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          type: { type: 'string', enum: ['broken', 'redirect'] },
          status: { type: 'integer' },
          message: { type: 'string' },
          redirectUrl: { type: 'string', nullable: true },
          occurrences: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                pageId: { type: 'string' },
                pageTitle: { type: 'string' },
                widgetTitle: { type: 'string' },
                path: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    },
  },
};
