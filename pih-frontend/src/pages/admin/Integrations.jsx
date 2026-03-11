import React from 'react';
import { Plug, Mail, MessageSquare, Bot, Webhook, CheckCircle, XCircle } from 'lucide-react';
import clsx from 'clsx';

const INTEGRATIONS = [
  {
    name: 'Claude AI',
    description: 'AI-powered task parsing, categorization, and smart assignment',
    icon: Bot,
    envKey: 'ANTHROPIC_API_KEY',
    color: 'bg-purple-100 text-purple-600',
    features: ['Task parsing from raw text', 'Auto-categorization', 'Smart assignee suggestion'],
  },
  {
    name: 'SendGrid Email',
    description: 'Email notifications for task updates, SLA alerts, and reports',
    icon: Mail,
    envKey: 'SENDGRID_API_KEY',
    color: 'bg-blue-100 text-blue-600',
    features: ['Task status notifications', 'SLA breach alerts', 'Weekly digest reports'],
  },
  {
    name: 'WhatsApp',
    description: 'WhatsApp messaging for task submissions and notifications',
    icon: MessageSquare,
    envKey: 'WHATSAPP_API_KEY',
    color: 'bg-green-100 text-green-600',
    features: ['Submit tasks via WhatsApp', 'Status update notifications', 'Client communication'],
  },
  {
    name: 'n8n Automation',
    description: 'Workflow automation for complex task routing and escalation',
    icon: Webhook,
    envKey: 'N8N_URL',
    color: 'bg-orange-100 text-orange-600',
    features: ['Auto-escalation workflows', 'Custom routing rules', 'External system integration'],
  },
];

export default function AdminIntegrations() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-sm text-gray-500">Configure external services and automations</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {INTEGRATIONS.map((integration) => (
          <div key={integration.name} className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={clsx('rounded-lg p-2', integration.color)}>
                  <integration.icon size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                  <p className="text-xs text-gray-500">{integration.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">Configure in .env</span>
              </div>
            </div>

            <div className="space-y-2">
              {integration.features.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle size={14} className="text-green-500" />
                  {feature}
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
              Env: <code className="font-mono text-brand">{integration.envKey}</code>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
