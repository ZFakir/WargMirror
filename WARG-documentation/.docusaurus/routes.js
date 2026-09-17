import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/__docusaurus/debug',
    component: ComponentCreator('/__docusaurus/debug', '5ff'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/config',
    component: ComponentCreator('/__docusaurus/debug/config', '5ba'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/content',
    component: ComponentCreator('/__docusaurus/debug/content', 'a2b'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/globalData',
    component: ComponentCreator('/__docusaurus/debug/globalData', 'c3c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/metadata',
    component: ComponentCreator('/__docusaurus/debug/metadata', '156'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/registry',
    component: ComponentCreator('/__docusaurus/debug/registry', '88c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/routes',
    component: ComponentCreator('/__docusaurus/debug/routes', '000'),
    exact: true
  },
  {
    path: '/blog',
    component: ComponentCreator('/blog', 'e21'),
    exact: true
  },
  {
    path: '/blog/archive',
    component: ComponentCreator('/blog/archive', '182'),
    exact: true
  },
  {
    path: '/blog/authors',
    component: ComponentCreator('/blog/authors', '0b7'),
    exact: true
  },
  {
    path: '/blog/authors/all-sebastien-lorber-articles',
    component: ComponentCreator('/blog/authors/all-sebastien-lorber-articles', 'ec3'),
    exact: true
  },
  {
    path: '/blog/authors/yangshun',
    component: ComponentCreator('/blog/authors/yangshun', 'b14'),
    exact: true
  },
  {
    path: '/blog/first-blog-post',
    component: ComponentCreator('/blog/first-blog-post', '5c7'),
    exact: true
  },
  {
    path: '/blog/long-blog-post',
    component: ComponentCreator('/blog/long-blog-post', '4f6'),
    exact: true
  },
  {
    path: '/blog/mdx-blog-post',
    component: ComponentCreator('/blog/mdx-blog-post', 'e9f'),
    exact: true
  },
  {
    path: '/blog/tags',
    component: ComponentCreator('/blog/tags', '287'),
    exact: true
  },
  {
    path: '/blog/tags/docusaurus',
    component: ComponentCreator('/blog/tags/docusaurus', '096'),
    exact: true
  },
  {
    path: '/blog/tags/facebook',
    component: ComponentCreator('/blog/tags/facebook', '394'),
    exact: true
  },
  {
    path: '/blog/tags/hello',
    component: ComponentCreator('/blog/tags/hello', '731'),
    exact: true
  },
  {
    path: '/blog/tags/hola',
    component: ComponentCreator('/blog/tags/hola', '4fa'),
    exact: true
  },
  {
    path: '/blog/welcome',
    component: ComponentCreator('/blog/welcome', 'dfe'),
    exact: true
  },
  {
    path: '/markdown-page',
    component: ComponentCreator('/markdown-page', '53a'),
    exact: true
  },
  {
    path: '/docs',
    component: ComponentCreator('/docs', '84e'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', '1d1'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', '99f'),
            routes: [
              {
                path: '/docs/api-reference/args',
                component: ComponentCreator('/docs/api-reference/args', 'cf5'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/api-reference/auth',
                component: ComponentCreator('/docs/api-reference/auth', 'ef6'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/api-reference/users-and-sessions',
                component: ComponentCreator('/docs/api-reference/users-and-sessions', 'de1'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/architecture-and-design/design-principles',
                component: ComponentCreator('/docs/architecture-and-design/design-principles', '0e5'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/architecture-and-design/implementation-details',
                component: ComponentCreator('/docs/architecture-and-design/implementation-details', '8f0'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/database/schema',
                component: ComponentCreator('/docs/database/schema', '1a4'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/deployment/deployment-guide',
                component: ComponentCreator('/docs/deployment/deployment-guide', '64d'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/frontend/client-views',
                component: ComponentCreator('/docs/frontend/client-views', 'c0f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/frontend/system-flows',
                component: ComponentCreator('/docs/frontend/system-flows', 'fbc'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/intro',
                component: ComponentCreator('/docs/intro', '89a'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/overview/meetings',
                component: ComponentCreator('/docs/overview/meetings', 'd49'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/overview/methodology',
                component: ComponentCreator('/docs/overview/methodology', '87e'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/policies/git-policy',
                component: ComponentCreator('/docs/policies/git-policy', '9d1'),
                exact: true,
                sidebar: "tutorialSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/',
    component: ComponentCreator('/', '2e1'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
