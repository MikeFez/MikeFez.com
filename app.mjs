// @ts-check
import { defineConfig, createNotesQuery } from "./.app/app-config.js";

export default defineConfig({
  title: "MikeFez.com",
  description:
    "My spot to catalog my ideas and projects. I'm a software engineer, and I love to automate things.",
  sidebar: {
    links: [
      {
        url: "https://github.com/MikeFez",
        label: "GitHub",
        icon: "github", // https://lucide.dev/icons/
      },
      {
        url: "https://buymeacoffee.com/mikefez",
        label: "Buy me a coffee",
        icon: "coffee",
      },
    ],
    sections: [
      {
        label: "Home Automation",
        groups: [
          {
            query: createNotesQuery({
              pattern: "^/home-automation/",
            }),
          },
        ],
      },
      {
        label: "Projects",
        groups: [
          {
            query: createNotesQuery({
              pattern: "^/projects/",
            }),
          },
        ],
      },
      {
        label: "Guides",
        groups: [
          {
            label: "dev",
            query: createNotesQuery({
              pattern: "^/dev/",
              tree: {
                replace: {
                  "^/\\w+": "",
                },
              },
            }),
          },
        ],
      },
    ],
  },
  theme: {
    color: "sky",
  },
  notes: {
    pathPrefix: "/",  // Remove the prefix entirely
  },
  customProperties: {
    properties: [
      {
        name: "publishedOn",

        // Optionally, format the date.
        options: {
          date: {
            locale: "en-US",
            format: { dateStyle: "full" },
          },
        },
      },
      {
        name: "updatedOn",

        // Optionally, format the date.
        options: {
          date: {
            locale: "en-US",
            format: { dateStyle: "full" },
          },
        },
      },
      {
        path: "props",
        options: {
          date: {
            locale: "en-US",
          },
        },
      },
    ],
  },
  panel: {
    incomingLinks: false,
    outgoingLinks: false,
  },
  tags: {
    map: {
      "dynamic-content": "dynamic content",
    },
  },
});
