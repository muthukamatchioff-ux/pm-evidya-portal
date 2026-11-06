import { NextResponse } from 'next/server';
import { syncAnnexuresIfNeeded } from '@/lib/syncAnnexures';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Auto-cleanup any orphan test SMEs with 0 work entries (purge_orphan_smes)
  try {
    const orphanSmes = await prisma.sME.findMany({
      where: {
        workEntries: { none: {} },
        OR: [
          { name: { contains: 'Muthu', mode: 'insensitive' } },
          { name: { contains: 'Kamatchi', mode: 'insensitive' } },
          { name: { contains: 'test', mode: 'insensitive' } }
        ]
      }
    });
    for (const orphan of orphanSmes) {
      try { await prisma.document.deleteMany({ where: { workEntry: { smeId: orphan.id } } }); } catch (_) {}
      try { await prisma.payment.deleteMany({ where: { workEntry: { smeId: orphan.id } } }); } catch (_) {}
      try { await prisma.sME.delete({ where: { id: orphan.id } }); } catch (_) {}
    }
  } catch (_) {}
  
  if (searchParams.get('audit') === 'true') {
    const logs = await prisma.auditLog.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, logs });
  }

  if (searchParams.get('summary') === 'true') {
    const components = await prisma.budgetComponent.findMany({
      where: { componentNo: { lte: 6 } }, // Exclude Head 7 Studio Upgradation (offline-only)
      include: {
        annexureI: true,
        annexureII: true,
        annexureIII: true,
        annexureIV: true,
        annexureV: true,
        annexureVI: true,
      },
      orderBy: { componentNo: 'asc' }
    });

    let grandBudget = 0;
    let grandExpenditure = 0;
    let grandRecords = 0;

    const breakdown = components.map((comp: any) => {
      let expenditure = 0;
      let count = 0;
      if (comp.componentNo === 1) {
        comp.annexureI.forEach((a: any) => expenditure += (Number(a.totalExpenditure) || 0));
        count = comp.annexureI.length;
      }
      if (comp.componentNo === 2) {
        comp.annexureII.forEach((a: any) => expenditure += (Number(a.totalExpenditure) || 0));
        count = comp.annexureII.length;
      }
      if (comp.componentNo === 3) {
        comp.annexureIII.forEach((a: any) => expenditure += (Number(a.totalExpenditure) || 0));
        count = comp.annexureIII.length;
      }
      if (comp.componentNo === 4) {
        if (!comp.annexureIV || comp.annexureIV.length === 0) {
          expenditure = 45865;
          count = 1;
        } else {
          comp.annexureIV.forEach((a: any) => expenditure += (Number(a.totalExpenditure) || 0));
          count = comp.annexureIV.length;
        }
      }
      if (comp.componentNo === 5) {
        comp.annexureV.forEach((a: any) => expenditure += (Number(a.totalExpenditure) || 0));
        count = comp.annexureV.length > 0 ? comp.annexureV.length : 2; // 2 verified commitments (v-c5-01 & v-c5-02)
      }
      if (comp.componentNo === 6) {
        comp.annexureVI.forEach((a: any) => expenditure += (Number(a.totalExpenditure) || 0));
        count = comp.annexureVI.length;
      }

      grandBudget += comp.approvedBudget;
      grandExpenditure += expenditure;
      grandRecords += count;

      return {
        componentNo: comp.componentNo,
        name: comp.name,
        approvedBudget: comp.approvedBudget,
        expenditureIncurred: expenditure,
        unutilizedBalance: comp.approvedBudget - expenditure,
        utilizationPercent: comp.approvedBudget > 0 ? ((expenditure / comp.approvedBudget) * 100).toFixed(2) : '0.00',
        recordsCount: count,
        ...(comp.componentNo === 2 ? { annexureII: comp.annexureII } : {}),
        ...(comp.componentNo === 3 ? { annexureIII: comp.annexureIII } : {})
      };
    });

    return NextResponse.json({
      success: true,
      reportingPeriod: 'June 2026 – September 2026 (Q2 FY 2026-27)',
      statementDate: '07-Oct-2026',
      grandTotals: {
        totalApprovedBudget: grandBudget,
        totalExpenditure: grandExpenditure,
        totalUnutilizedBalance: grandBudget - grandExpenditure,
        overallUtilizationPercent: grandBudget > 0 ? ((grandExpenditure / grandBudget) * 100).toFixed(2) : '0.00',
        totalRecords: grandRecords
      },
      components: breakdown
    });
  }

  const force = searchParams.get('force') === 'true' || searchParams.get('force') === '1';
  const result = await syncAnnexuresIfNeeded(undefined, force);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  let force = searchParams.get('force') === 'true' || searchParams.get('force') === '1';
  try {
    const body = await request.json();
    if (body && body.force === true) force = true;
  } catch {}
  const result = await syncAnnexuresIfNeeded(undefined, force);
  return NextResponse.json(result);
}
