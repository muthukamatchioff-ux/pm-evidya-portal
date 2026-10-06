import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBudgetComponents } from '@/app/budget/actions';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'read-only') {
    const annexureI = await prisma.annexureI.findMany();
    const annexureII = await prisma.annexureII.findMany();
    const annexureIII = await prisma.annexureIII.findMany();
    const components = await getBudgetComponents();

    return NextResponse.json({
      success: true,
      components: components.map((c: any) => ({
        id: c.id,
        componentNo: c.componentNo,
        name: c.name,
        approvedBudget: c.approvedBudget,
        expenditureIncurred: c.expenditureIncurred,
        annexureI_count: c.annexureI?.length,
        annexureII_count: c.annexureII?.length,
        annexureIII_count: c.annexureIII?.length,
      })),
      annexureI,
      annexureII,
      annexureIII
    });
  }

  return NextResponse.json({ error: 'invalid action' });
}
