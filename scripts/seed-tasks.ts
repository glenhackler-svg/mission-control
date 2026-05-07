/**
 * Seed script: creates projects + tasks from Asana import data.
 * Run: npx tsx scripts/seed-tasks.ts
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding tasks...");

  // Clear existing data (for idempotent re-runs)
  await prisma.timeEntry.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();

  // ─────────────────────────────────────────────────────────────────
  // PROJECT 1: NCG Telecom
  // ─────────────────────────────────────────────────────────────────
  const ncg = await prisma.project.create({
    data: {
      name: "NCG Telecom project",
      color: "aqua",
      clientName: "NCG Telecom",
    },
  });

  const ncgTasks = [
    { title: "Change Brave Search to john's CC",        status: "done",  assignee: "Glen Hackler",                dueDate: null },
    { title: "Setup File Sharing",                       status: "todo",  assignee: null,                          dueDate: null },
    { title: "Add Malware Clean up",                     status: "done",  assignee: null,                          dueDate: null },
    { title: "Setup email for claw",                     status: "done",  assignee: "Glen Hackler",                dueDate: "2026-05-05" },
    { title: "Setup Filezilla to see Storage",           status: "done",  assignee: "Glen Hackler",                dueDate: "2026-05-05" },
    { title: "Setup to access Salesforce",               status: "todo",  assignee: "Glen Hackler",                dueDate: "2026-05-05" },
    { title: "Setup Google access to mail, drive",       status: "todo",  assignee: "Glen Hackler",                dueDate: "2026-05-05" },
    { title: "Commission system build",                  status: "todo",  assignee: "Glen Hackler",                dueDate: "2026-05-06" },
    { title: "setup backup on git",                      status: "done",  assignee: null,                          dueDate: null },
    { title: "setup romeo for heartbeat",                status: "done",  assignee: null,                          dueDate: null },
    { title: "Set Up Nightly Session & Task Cleanup Cron Job", status: "done", assignee: "Glen Hackler",           dueDate: null },
    { title: "Configure Firewall",                       status: "done",  assignee: "Glen Hackler",                dueDate: null },
    { title: "Setup Codee and Scout agents",             status: "done",  assignee: "Glen Hackler",                dueDate: null },
    { title: "Setup First main agent",                   status: "done",  assignee: "Glen Hackler",                dueDate: null },
    { title: "Setup Openclaw",                           status: "done",  assignee: "Glen Hackler",                dueDate: null },
    { title: "Setup Anthropic",                          status: "done",  assignee: "Glen Hackler",                dueDate: null },
    { title: "Setup VPS",                                status: "done",  assignee: "Glen Hackler",                dueDate: "2026-05-01" },
  ];

  for (const t of ncgTasks) {
    await prisma.task.create({
      data: {
        projectId: ncg.id,
        title: t.title,
        status: t.status,
        assignee: t.assignee,
        dueDate: t.dueDate ? new Date(t.dueDate) : null,
        completedAt: t.status === "done" ? new Date() : null,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // PROJECT 2: Openclaw Installation project plan
  // ─────────────────────────────────────────────────────────────────
  const oc = await prisma.project.create({
    data: {
      name: "Openclaw Installation project plan",
      color: "blue",
      clientName: "Template",
    },
  });

  const ocTasks = [
    "Setup File Sharing",
    "Set Up Nightly Session & Task Cleanup Cron Job",
    "[READ ME] Instructions for using this project",
    "[EXAMPLE TASK] Initiative goals and targets",
    "Configure UFW Firewall on VPS",
    "[EXAMPLE TASK] Hold kickoff meeting",
    "[EXAMPLE TASK] Gather marketing and sales input",
    "[EXAMPLE TASK] Identify tracking bugs and prioritize fixes",
    "[EXAMPLE TASK] Set up tracking and revenue targets",
    "[EXAMPLE TASK] Respond to new employee feedback",
  ];

  for (const title of ocTasks) {
    await prisma.task.create({ data: { projectId: oc.id, title, status: "todo" } });
  }

  // ─────────────────────────────────────────────────────────────────
  // PROJECT 3: OIN Realty
  // ─────────────────────────────────────────────────────────────────
  const oin = await prisma.project.create({
    data: {
      name: "OIN Realty",
      color: "blue",
      clientName: "OIN Realty",
    },
  });

  const oinTasks = [
    { title: "Setup Brave Search with plugins",               status: "todo",  assignee: "homes@ownitnowrealty.com", dueDate: "2026-05-06" },
    { title: "Setup email for claw to read",                  status: "todo",  assignee: "homes@ownitnowrealty.com", dueDate: "2026-05-06" },
    { title: "setup OpenAI so the talk to text works",        status: "todo",  assignee: "homes@ownitnowrealty.com", dueDate: null },
    { title: "Setup Agent Mail for Claw",                     status: "todo",  assignee: "Glen Hackler",             dueDate: null },
    { title: "Setup Drop Box access to drive",                status: "todo",  assignee: "homes@ownitnowrealty.com", dueDate: "2026-05-06" },
    { title: "Configure it up to do automated engage new leads, keep warm contacts in rotation long-term", status: "todo", assignee: "Glen Hackler", dueDate: null },
    { title: "Monitor emails for quicker responses",          status: "todo",  assignee: null,                       dueDate: null },
    { title: "Future options to explore",                     status: "todo",  assignee: null,                       dueDate: null },
    { title: "Update escrow status to clients",               status: "todo",  assignee: null,                       dueDate: null },
    { title: "Attach current contacts and reengage them on a consistent basis", status: "todo", assignee: null, dueDate: null },
    { title: "setup backup on git",                           status: "todo",  assignee: null,                       dueDate: null },
    { title: "setup Mission control",                         status: "todo",  assignee: null,                       dueDate: null },
    { title: "Add Romeo for heartbeat",                       status: "done",  assignee: "Glen Hackler",             dueDate: null },
    { title: "Configure UFW Firewall on VPS",                 status: "done",  assignee: "Glen Hackler",             dueDate: null },
    { title: "Configure Firewall",                            status: "done",  assignee: "Glen Hackler",             dueDate: null },
    { title: "Add Malware Scan",                              status: "done",  assignee: "Glen Hackler",             dueDate: null },
    { title: "Setup two more agents",                         status: "done",  assignee: "Glen Hackler",             dueDate: null },
    { title: "Setup First main agent",                        status: "done",  assignee: "Glen Hackler",             dueDate: null },
    { title: "Setup Anthropic",                               status: "done",  assignee: "Glen Hackler",             dueDate: null },
    { title: "Setup Openclaw",                                status: "done",  assignee: "Glen Hackler",             dueDate: null },
    { title: "Set Up Nightly Session & Task Cleanup Cron Job", status: "done", assignee: null,                      dueDate: null },
    { title: "Setup VPS",                                     status: "done",  assignee: "Glen Hackler",             dueDate: "2026-05-04" },
    { title: "Perez Bros setup Hostinger",                    status: "done",  assignee: null,                       dueDate: null },
  ];

  for (const t of oinTasks) {
    await prisma.task.create({
      data: {
        projectId: oin.id,
        title: t.title,
        status: t.status,
        assignee: t.assignee,
        dueDate: t.dueDate ? new Date(t.dueDate) : null,
        completedAt: t.status === "done" ? new Date() : null,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // PROJECT 4: Realtor Client — AI Marketing Implementation
  // ─────────────────────────────────────────────────────────────────
  const realtor = await prisma.project.create({
    data: {
      name: "Realtor Client — AI Marketing Implementation",
      color: "indigo",
      clientName: "Template",
    },
  });

  const realtorTasks = [
    "Setup File Sharing",
    "Add Malware Scan",
    "Configure Firewall",
    "PHASE 1: Setup Google Workspace / Email Access",
    "PHASE 1: Setup Agent Mail (Email Monitoring)",
    "PHASE 1: Setup Brave Search Plugin",
    "PHASE 1: Setup Two Specialized Agents",
    "PHASE 1: Configure Primary AI Agent",
    "PHASE 1: Install & Configure OpenClaw",
    "PHASE 1: Setup Anthropic API",
    "PHASE 1: Setup VPS Server",
    "Set Up Nightly Session & Task Cleanup Cron Job",
    "Configure UFW Firewall on VPS",
    "Initial strategy call with client",
    "Complete client intake questionnaire",
    "Brand audit — review existing materials",
    "Set up client access & credentials",
    "Define KPIs and success metrics",
    "Domain setup and DNS configuration",
    "Design and build custom agent website",
    "Set up IDX integration for live listings",
    "Install home valuation / seller report tool",
    "Configure lead capture forms",
    "Connect website leads to CRM",
    "SEO setup — meta tags, sitemap, Google Search Console",
    "Test, review, and launch website",
    "Audit or create Google Ads account",
    "Audit or create Facebook Business Manager & Ad account",
    "Install Facebook Pixel & Google conversion tracking",
    "Define target audiences — buyers and sellers",
    "Build Google Ads campaigns (buyer + seller)",
    "Build Facebook/Instagram ad campaigns",
    "Design ad creative — images and copy",
    "Launch campaigns and set initial bids/budgets",
    "Week 1 optimization review",
    "Select and set up email platform",
    "Import existing contact database",
    "Design branded newsletter template",
    "Write and send first newsletter",
    "Build automated drip campaigns",
    "Set monthly newsletter production schedule",
    "Audit and optimize social profiles",
    "Create brand voice and content guidelines doc",
    "Build 30-day content calendar",
    "Design post templates (Canva or branded tool)",
    "Set up social scheduling tool",
    "Publish and schedule first month of content",
    "Set up ongoing monthly content production workflow",
    "Select or audit CRM platform",
    "Configure lead pipeline stages",
    "Connect all lead sources to CRM",
    "Set up automated lead response sequences",
    "Build reporting dashboard",
    "Train client on CRM and dashboard",
    "Define video content strategy",
    "Produce agent brand/intro video",
    "Set up YouTube channel",
    "Create listing video template",
    "Establish monthly video production schedule",
    "Build monthly performance report template",
    "30-day kickoff review with client",
    "90-day strategy review",
    "Set recurring monthly reporting cadence",
    "Ongoing campaign optimization (monthly)",
  ];

  for (const title of realtorTasks) {
    await prisma.task.create({ data: { projectId: realtor.id, title, status: "todo" } });
  }

  console.log("✅ Seeded 4 projects and all tasks.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
