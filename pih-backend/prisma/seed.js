const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Organization
  const org = await prisma.organization.create({
    data: {
      name: 'Weaddo Digital',
      slug: 'weaddo',
      sector: 'Technology',
      planTier: 'px360_pro',
    },
  });

  const clientOrg = await prisma.organization.create({
    data: {
      name: 'Acme Corp',
      slug: 'acme-corp',
      sector: 'E-Commerce',
    },
  });

  const hash = await bcrypt.hash('password123', 12);

  // Users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@weaddo.app',
      name: 'Rahul Sharma',
      role: 'ADMIN',
      orgId: org.id,
      passwordHash: hash,
      skills: ['management', 'architecture'],
      maxCapacity: 8,
      velocity: 0.9,
    },
  });

  const lead = await prisma.user.create({
    data: {
      email: 'lead@weaddo.app',
      name: 'Priya Patel',
      role: 'TEAM_LEAD',
      orgId: org.id,
      passwordHash: hash,
      skills: ['react', 'node', 'aws'],
      maxCapacity: 6,
      velocity: 0.85,
    },
  });

  const dev1 = await prisma.user.create({
    data: {
      email: 'dev1@weaddo.app',
      name: 'Arjun Mehta',
      role: 'DEVELOPER',
      orgId: org.id,
      passwordHash: hash,
      skills: ['react', 'typescript', 'tailwind'],
      maxCapacity: 5,
      velocity: 0.8,
      reportsTo: lead.id,
    },
  });

  const dev2 = await prisma.user.create({
    data: {
      email: 'dev2@weaddo.app',
      name: 'Sneha Gupta',
      role: 'DEVELOPER',
      orgId: org.id,
      passwordHash: hash,
      skills: ['node', 'postgresql', 'prisma'],
      maxCapacity: 5,
      velocity: 0.75,
      reportsTo: lead.id,
    },
  });

  const client = await prisma.user.create({
    data: {
      email: 'client@acme.com',
      name: 'John Miller',
      role: 'CLIENT',
      orgId: clientOrg.id,
      passwordHash: hash,
    },
  });

  // Projects
  const project1 = await prisma.project.create({
    data: {
      name: 'Acme E-Commerce Platform',
      description: 'Full e-commerce platform with inventory management',
      orgId: org.id,
      clientId: client.id,
      status: 'active',
      slaConfig: JSON.stringify({ urgent_hours: 24, high_hours: 48, normal_hours: 96, low_hours: 168 }),
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: 'Acme Mobile App',
      description: 'React Native mobile app for Acme customers',
      orgId: org.id,
      clientId: client.id,
      status: 'active',
    },
  });

  // Tasks
  const now = new Date();
  const tasks = [
    {
      orgId: org.id,
      projectId: project1.id,
      ticketNumber: 'PIH-001',
      title: 'Implement payment gateway integration',
      description: 'Integrate Razorpay payment gateway with order checkout flow',
      category: 'feature',
      priority: 'URGENT',
      status: 'IN_PROGRESS',
      assigneeId: dev1.id,
      createdById: client.id,
      leadId: lead.id,
      source: 'portal',
      estimatedHours: 16,
      tags: ['payments', 'razorpay'],
      slaDeadline: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      acknowledgedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      assignedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      startedAt: new Date(now.getTime() - 30 * 60 * 1000),
    },
    {
      orgId: org.id,
      projectId: project1.id,
      ticketNumber: 'PIH-002',
      title: 'Fix cart total calculation bug',
      description: 'Cart total shows incorrect amount when discount codes are applied',
      category: 'bug',
      priority: 'HIGH',
      status: 'ASSIGNED',
      assigneeId: dev2.id,
      createdById: client.id,
      leadId: lead.id,
      source: 'portal',
      estimatedHours: 4,
      tags: ['bug', 'cart'],
      slaDeadline: new Date(now.getTime() + 48 * 60 * 60 * 1000),
      acknowledgedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      assignedAt: now,
    },
    {
      orgId: org.id,
      projectId: project1.id,
      ticketNumber: 'PIH-003',
      title: 'Add product search with filters',
      description: 'Implement Elasticsearch-based product search with category, price, and rating filters',
      category: 'feature',
      priority: 'NORMAL',
      status: 'SUBMITTED',
      createdById: client.id,
      source: 'portal',
      estimatedHours: 24,
      tags: ['search', 'elasticsearch'],
      slaDeadline: new Date(now.getTime() + 96 * 60 * 60 * 1000),
    },
    {
      orgId: org.id,
      projectId: project1.id,
      ticketNumber: 'PIH-004',
      title: 'Optimize product image loading',
      description: 'Implement lazy loading and WebP conversion for product images',
      category: 'enhancement',
      priority: 'LOW',
      status: 'COMPLETED',
      assigneeId: dev1.id,
      createdById: admin.id,
      leadId: lead.id,
      source: 'portal',
      estimatedHours: 8,
      actualHours: 6,
      tags: ['performance', 'images'],
      completedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    },
    {
      orgId: org.id,
      projectId: project2.id,
      ticketNumber: 'PIH-005',
      title: 'Design mobile app onboarding screens',
      description: 'Create 4-screen onboarding flow for first-time users',
      category: 'design',
      priority: 'NORMAL',
      status: 'REVIEW',
      assigneeId: dev1.id,
      createdById: lead.id,
      leadId: lead.id,
      source: 'portal',
      estimatedHours: 12,
      tags: ['mobile', 'onboarding', 'ui'],
    },
    {
      orgId: org.id,
      projectId: project2.id,
      ticketNumber: 'PIH-006',
      title: 'Setup push notifications',
      description: 'Integrate Firebase Cloud Messaging for push notifications',
      category: 'feature',
      priority: 'HIGH',
      status: 'ACKNOWLEDGED',
      createdById: client.id,
      source: 'whatsapp',
      aiParsed: true,
      aiConfidence: 0.92,
      estimatedHours: 10,
      tags: ['mobile', 'notifications', 'firebase'],
      acknowledgedAt: now,
    },
  ];

  for (const task of tasks) {
    await prisma.task.create({ data: task });
  }

  // Task events for PIH-001
  const task1 = await prisma.task.findUnique({ where: { ticketNumber: 'PIH-001' } });
  await prisma.taskEvent.createMany({
    data: [
      { taskId: task1.id, eventType: 'status_change', fromStatus: null, toStatus: 'SUBMITTED', actorId: client.id, actorType: 'user' },
      { taskId: task1.id, eventType: 'status_change', fromStatus: 'SUBMITTED', toStatus: 'ACKNOWLEDGED', actorId: lead.id, actorType: 'user' },
      { taskId: task1.id, eventType: 'assigned', toStatus: 'ASSIGNED', actorId: lead.id, actorType: 'user', note: 'Assigned to Arjun for payment integration' },
      { taskId: task1.id, eventType: 'status_change', fromStatus: 'ASSIGNED', toStatus: 'IN_PROGRESS', actorId: dev1.id, actorType: 'user' },
    ],
  });

  // Notifications
  await prisma.notification.createMany({
    data: [
      { taskId: task1.id, recipientId: dev1.id, channel: 'in_app', type: 'task_assigned', subject: 'New task assigned', content: JSON.stringify({ message: 'You have been assigned PIH-001: Implement payment gateway integration' }) },
      { taskId: task1.id, recipientId: lead.id, channel: 'in_app', type: 'sla_warning', subject: 'SLA deadline approaching', content: JSON.stringify({ message: 'PIH-001 SLA deadline is in 24 hours' }) },
      { recipientId: admin.id, channel: 'in_app', type: 'system', subject: 'Welcome to PIH', content: JSON.stringify({ message: 'Welcome to Project Intelligence Hub!' }), readAt: new Date() },
    ],
  });

  // Team capacity logs
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.teamCapacity.createMany({
    data: [
      { userId: dev1.id, date: today, activeTasks: 2, maxCapacity: 5, utilizationPct: 0.4, freeHours: 4.8, skillsInDemand: ['react', 'payments'] },
      { userId: dev2.id, date: today, activeTasks: 1, maxCapacity: 5, utilizationPct: 0.2, freeHours: 6.0, skillsInDemand: ['node', 'postgresql'] },
      { userId: lead.id, date: today, activeTasks: 3, maxCapacity: 6, utilizationPct: 0.5, freeHours: 4.0, skillsInDemand: ['architecture'] },
    ],
  });

  console.log('Seed complete!');
  console.log('');
  console.log('Login credentials (all use password: password123):');
  console.log('  Admin:     admin@weaddo.app');
  console.log('  Team Lead: lead@weaddo.app');
  console.log('  Dev 1:     dev1@weaddo.app');
  console.log('  Dev 2:     dev2@weaddo.app');
  console.log('  Client:    client@acme.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
