// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'WARG Platform',
  tagline: 'Turn your campus into the game.',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  // TODO: update to your actual Cloudflare Pages / custom domain URL once deployed
  url: 'https://warg-docs.pages.dev',
  baseUrl: '/',

  organizationName: 'ZFakir',
  projectName: 'WargMirror',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/', // serve docs at site root instead of /docs
          sidebarPath: './sidebars.js',
          editUrl:
            'https://github.com/ZFakir/WargMirror/tree/main/warg-docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        defaultMode: 'dark',
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'WARG Platform',
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'docsSidebar',
            position: 'left',
            label: 'Docs',
          },
          {
            href: 'https://github.com/ZFakir/WargMirror',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {label: 'Team Process', to: '/process/methodology'},
              {label: 'Architecture', to: '/technical/architecture'},
              {label: 'Design System', to: '/design/colour-system'},
            ],
          },
          {
            title: 'Project',
            items: [
              {label: 'Source (GitHub)', href: 'https://github.com/ZFakir/WargMirror'},
              {label: 'Deployment Guide', href: 'https://github.com/ZFakir/WargMirror/blob/main/DEPLOYMENT.md'},
            ],
          },
        ],
        copyright: `WARG Platform — Luc and Friends — Software Design Project, University of the Witwatersrand — ${new Date().getFullYear()}`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
