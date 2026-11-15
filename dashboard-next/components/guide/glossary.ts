export const glossary = {
  account: "The name you choose for URLs and billing. Example: abdullah gets hello-abdullah.localhost.",
  app: "A Docker image running on this computer with its own web address.",
  url: "The link where your app answers in the browser on this machine.",
  pod: "One running copy of your app. More copies share traffic when CPU is high.",
  sla: "A score for uptime. Each app should answer at least 99.5% of health checks.",
  invoice: "This month's charge for pod time, CPU, and memory.",
} as const;