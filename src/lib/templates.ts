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
    name: 'NIMI Official Approval Letter',
    subject: 'Invitation - as Subject Matter Expert (SME) to take Class room shooting for the PM e vidya channel for the trade {{trade}} - Reg.',
    body: 'The National Instructional Media Institute (NIMI), functioning under the Ministry of Skill Development & Entrepreneurship, Government of India, is the nodal agency engaged in the development of e-Learning content for various trades offered through Industrial Training Institutes (ITIs) and other skill development programmes.\n\nIn this connection, approval is hereby accorded for the Visit of {{smeName}}, {{designation}}, {{institute}}, to participate as a Subject Matter Expert (SME) for the PM e-Vidya Classroom Teaching Shoot for the trade "{{trade}}" for {{days}} days from {{attendanceFrom}}.\n\nThe Subject Matter Expert shall extend academic and technical support for the classroom teaching session, including content delivery, validation of instructional materials, and other activities required for the successful production of the PM e-Vidya programme. He is requested to coordinate closely with the concerned PM e-Vidya and NIMI officials regarding the content, presentation methodology, reporting schedule, and other technical requirements for the classroom teaching shoot.\n\nThe remuneration / honorarium for the assignment, along with reimbursement of Travelling Allowance (TA), shall be paid by NIMI as per the prevailing NIMI norms based on the SME designation and eligibility, subject to submission of original travel tickets, boarding passes, and other supporting documents, wherever applicable (Balmer Lawrie & Company Limited, Ashok Travels & Tours, Indian Railway Catering and Tourism Corporation Ltd - IRCTC).\n\nYour kind cooperation and valuable support towards the development of quality e-content for the Skill Development ecosystem will be highly solicited.'
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
