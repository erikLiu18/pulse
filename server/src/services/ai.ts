import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function generateWeeklyInsight(data: {
  profileName: string;
  weekLabel: string;
  categoryBreakdown: { name: string; hours: number; percentage: number }[];
  previousWeek?: { name: string; hours: number }[];
  topSubcategories: { name: string; category: string; hours: number }[];
  totalHours: number;
}): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `You are a thoughtful time-management coach. Analyze this weekly time data for ${data.profileName} and provide:
1. A brief summary of how they spent their week (2-3 sentences)
2. One insight about their time patterns
3. One actionable suggestion for next week

Week: ${data.weekLabel}
Total tracked: ${data.totalHours} hours

Category breakdown:
${data.categoryBreakdown.map(c => `- ${c.name}: ${c.hours}h (${c.percentage}%)`).join('\n')}

Top activities:
${data.topSubcategories.map(s => `- ${s.name} (${s.category}): ${s.hours}h`).join('\n')}

${data.previousWeek ? `Previous week for comparison:\n${data.previousWeek.map(c => `- ${c.name}: ${c.hours}h`).join('\n')}` : 'No previous week data available.'}

Keep the tone warm, encouraging, and concise. Use plain language, no corporate jargon. Format with markdown headers (## Summary, ## Insight, ## Suggestion).`
    }]
  });

  return (message.content[0] as any).text;
}
