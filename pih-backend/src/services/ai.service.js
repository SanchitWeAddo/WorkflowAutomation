const claude = require('../config/claude');
const prisma = require('../config/prisma');
const { AI_MODEL, AI_CONFIDENCE_THRESHOLD } = require('../config/env');
const logger = require('../utils/logger');

/**
 * Parse a raw text input (email, WhatsApp message, etc.) into structured task data using Claude AI.
 *
 * @param {string} rawText   - The raw text to parse.
 * @param {string} source    - Source channel (email, whatsapp, portal, etc.).
 * @param {string} sourceRef - Reference ID from the source system.
 * @returns {{ title, description, priority, category, tags, estimatedHours, confidence }}
 */
async function parseTaskFromText(rawText, source, sourceRef) {
  if (!claude) {
    logger.warn('AI client not configured – returning raw text as title');
    return {
      title: rawText.substring(0, 120).trim(),
      description: rawText,
      priority: 'NORMAL',
      category: null,
      tags: [],
      estimatedHours: null,
      confidence: 0,
      source,
      sourceRef,
    };
  }

  const systemPrompt = `You are a project management assistant. Parse the following message into a structured task.
Return ONLY valid JSON with these fields:
- title (string, concise action-oriented title, max 120 chars)
- description (string, detailed description of the work needed)
- priority (string, one of: URGENT, HIGH, NORMAL, LOW)
- category (string, one of: bug, feature, enhancement, support, maintenance, documentation, design, infrastructure)
- tags (array of strings, relevant keywords)
- estimatedHours (number or null, rough estimate of hours to complete)
- confidence (number 0-1, your confidence in the accuracy of this parsing)`;

  try {
    const response = await claude.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Source: ${source}\nReference: ${sourceRef || 'N/A'}\n\nMessage:\n${rawText}`,
        },
      ],
    });

    const content = response.content[0]?.text || '';
    // Extract JSON from the response, handling possible markdown code fences
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI response did not contain valid JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and normalize priority
    const validPriorities = ['URGENT', 'HIGH', 'NORMAL', 'LOW'];
    if (!validPriorities.includes(parsed.priority)) {
      parsed.priority = 'NORMAL';
    }

    return {
      title: String(parsed.title || '').substring(0, 120),
      description: String(parsed.description || rawText),
      priority: parsed.priority,
      category: parsed.category || null,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      estimatedHours: typeof parsed.estimatedHours === 'number' ? parsed.estimatedHours : null,
      confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5,
      source,
      sourceRef,
    };
  } catch (error) {
    logger.error('AI task parsing failed', { error: error.message, source, sourceRef });
    return {
      title: rawText.substring(0, 120).trim(),
      description: rawText,
      priority: 'NORMAL',
      category: null,
      tags: [],
      estimatedHours: null,
      confidence: 0,
      source,
      sourceRef,
    };
  }
}

/**
 * Use AI to categorize a task based on its title and description.
 *
 * @param {string} title
 * @param {string} description
 * @returns {{ category: string, confidence: number, reasoning: string }}
 */
async function categorizeTask(title, description) {
  if (!claude) {
    logger.warn('AI client not configured – skipping categorization');
    return { category: null, confidence: 0, reasoning: 'AI not configured' };
  }

  try {
    const response = await claude.messages.create({
      model: AI_MODEL,
      max_tokens: 512,
      system: `You are a task categorization engine. Categorize the task into exactly one category.
Valid categories: bug, feature, enhancement, support, maintenance, documentation, design, infrastructure.
Return ONLY valid JSON with: category (string), confidence (number 0-1), reasoning (string, one sentence).`,
      messages: [
        {
          role: 'user',
          content: `Title: ${title}\nDescription: ${description || 'N/A'}`,
        },
      ],
    });

    const content = response.content[0]?.text || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI response did not contain valid JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      category: parsed.category || null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      reasoning: parsed.reasoning || '',
    };
  } catch (error) {
    logger.error('AI categorization failed', { error: error.message, title });
    return { category: null, confidence: 0, reasoning: 'Categorization failed' };
  }
}

/**
 * Use AI to suggest the best assignee for a task based on skills, capacity, and workload.
 *
 * @param {{ title: string, description?: string, category?: string, priority?: string, tags?: string[] }} taskData
 * @param {string} orgId
 * @returns {{ suggestedUserId: string|null, userName: string|null, confidence: number, reasoning: string }}
 */
async function suggestAssignee(taskData, orgId) {
  // Fetch active team members with their current workload
  const teamMembers = await prisma.user.findMany({
    where: {
      orgId,
      isActive: true,
      role: { in: ['DEVELOPER', 'TEAM_LEAD'] },
    },
    select: {
      id: true,
      name: true,
      skills: true,
      maxCapacity: true,
      velocity: true,
      _count: {
        select: {
          tasksAssigned: {
            where: {
              status: { in: ['ASSIGNED', 'IN_PROGRESS', 'REVIEW'] },
            },
          },
        },
      },
    },
  });

  if (teamMembers.length === 0) {
    return { suggestedUserId: null, userName: null, confidence: 0, reasoning: 'No available team members' };
  }

  // Build team summary for AI
  const teamSummary = teamMembers.map((m) => ({
    id: m.id,
    name: m.name,
    skills: m.skills,
    activeTasks: m._count.tasksAssigned,
    maxCapacity: m.maxCapacity,
    utilization: m.maxCapacity > 0 ? Math.round((m._count.tasksAssigned / m.maxCapacity) * 100) : 100,
    velocity: m.velocity,
  }));

  if (!claude) {
    // Fallback: pick the team member with the lowest utilization who has a matching skill
    const taskTags = [...(taskData.tags || []), taskData.category].filter(Boolean).map((t) => t.toLowerCase());

    const scored = teamSummary
      .map((m) => {
        const skillMatch = m.skills.some((s) => taskTags.includes(s.toLowerCase())) ? 1 : 0;
        const capacityScore = 1 - m.utilization / 100;
        return { ...m, score: skillMatch * 0.6 + capacityScore * 0.4 };
      })
      .sort((a, b) => b.score - a.score);

    const best = scored[0];
    return {
      suggestedUserId: best.id,
      userName: best.name,
      confidence: 0.4,
      reasoning: 'Heuristic assignment based on skill match and capacity (AI not configured)',
    };
  }

  try {
    const response = await claude.messages.create({
      model: AI_MODEL,
      max_tokens: 512,
      system: `You are a project resource allocation assistant. Given a task and a team, recommend the best assignee.
Consider skill match, current workload/capacity, and velocity.
Return ONLY valid JSON with: suggestedUserId (string), userName (string), confidence (number 0-1), reasoning (string, 1-2 sentences).`,
      messages: [
        {
          role: 'user',
          content: `Task:\n${JSON.stringify(taskData, null, 2)}\n\nAvailable Team:\n${JSON.stringify(teamSummary, null, 2)}`,
        },
      ],
    });

    const content = response.content[0]?.text || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI response did not contain valid JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate the suggested user exists in our list
    const validMember = teamSummary.find((m) => m.id === parsed.suggestedUserId);
    if (!validMember) {
      logger.warn('AI suggested an invalid user ID, falling back', { suggested: parsed.suggestedUserId });
      const fallback = teamSummary.sort((a, b) => a.utilization - b.utilization)[0];
      return {
        suggestedUserId: fallback.id,
        userName: fallback.name,
        confidence: 0.3,
        reasoning: 'AI suggestion was invalid; assigned to least-utilized member',
      };
    }

    return {
      suggestedUserId: parsed.suggestedUserId,
      userName: parsed.userName || validMember.name,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      reasoning: parsed.reasoning || '',
    };
  } catch (error) {
    logger.error('AI assignee suggestion failed', { error: error.message });
    const fallback = teamSummary.sort((a, b) => a.utilization - b.utilization)[0];
    return {
      suggestedUserId: fallback.id,
      userName: fallback.name,
      confidence: 0.2,
      reasoning: 'AI failed; assigned to least-utilized team member',
    };
  }
}

module.exports = {
  parseTaskFromText,
  categorizeTask,
  suggestAssignee,
};
