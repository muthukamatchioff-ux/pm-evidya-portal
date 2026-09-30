import { promises as fs } from 'fs';
import path from 'path';

const templatesFile = path.join(process.cwd(), 'data', 'templates.json');

export interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
}

const defaultTemplates: Template[] = [
  {
    id: 'APPROVAL_LETTER',
    name: 'Approval Letter Template',
    subject: 'Engagement as Subject Matter Expert for {{trade}} - {{topic}}',
    body: 'We are pleased to inform you that your engagement as a Subject Matter Expert for the Trade "{{trade}}" covering the topic "{{topic}}" has been approved.\nThe engagement period is from {{attendanceFrom}} to {{attendanceTo}}, for a total of {{days}} days.\n\nThe honorarium is fixed at Rs. {{ratePerDay}}/- per day. The total approved amount including TA/DA (if applicable) is Rs. {{totalAmount}}/-.'
  },
  {
    id: 'PAYMENT_APPROVAL',
    name: 'Payment Approval Template',
    subject: 'Payment Approval for Subject Matter Expert - {{trade}}',
    body: 'This is to certify that the payment of Rs. {{totalAmount}}/- has been approved for {{smeName}} for their services as a Subject Matter Expert for the Trade "{{trade}}".\n\nTotal Days: {{days}}\nRate per Day: Rs. {{ratePerDay}}/-'
  }
];

async function ensureDataDir() {
  const dir = path.join(process.cwd(), 'data');
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

export async function getTemplates(): Promise<Template[]> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(templatesFile, 'utf8');
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      await saveTemplates(defaultTemplates);
      return defaultTemplates;
    }
    throw error;
  }
}

export async function getTemplate(id: string): Promise<Template | undefined> {
  const templates = await getTemplates();
  return templates.find(t => t.id === id);
}

export async function saveTemplates(templates: Template[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(templatesFile, JSON.stringify(templates, null, 2));
}

export async function updateTemplate(id: string, updates: Partial<Template>): Promise<Template> {
  const templates = await getTemplates();
  const index = templates.findIndex(t => t.id === id);
  if (index === -1) throw new Error('Template not found');
  
  templates[index] = { ...templates[index], ...updates };
  await saveTemplates(templates);
  return templates[index];
}
