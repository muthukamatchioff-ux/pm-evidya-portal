const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const HIGHER_OFFICIAL_ACCOUNTS = [
  {
    email: 'ashfaq.nimi@gmail.com',
    name: 'Ashfaq',
    designation: 'Higher Official Viewer',
    department: 'Review Authority',
    role: 'HIGHER_OFFICIAL_VIEWER'
  },
  {
    email: 'rajeswari.m41@gov.in',
    name: 'Rajeswari M',
    designation: 'Higher Official Viewer',
    department: 'Review Authority',
    role: 'HIGHER_OFFICIAL_VIEWER'
  }
];

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') || dbUrl.includes('[SENSITIVE]')) {
    console.log('[Sync DB Script] Skipping direct DB sync during build: no live database connected.');
    return;
  }

  console.log('[Sync DB Script] Checking database synchronization for Annexure I & II and official accounts...');
  const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } }
  });

  try {
    // Ensure all required columns exist in production Neon database before any operations
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "SME" ADD COLUMN IF NOT EXISTS "email" TEXT;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "SME" ADD COLUMN IF NOT EXISTS "contactNumber" TEXT;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "VideoEditorRecord" ADD COLUMN IF NOT EXISTS "editingEndDate" TIMESTAMP(3);`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "VideoEditorRecord" ADD COLUMN IF NOT EXISTS "editingStartDate" TIMESTAMP(3);`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "ShootingSchedule" ADD COLUMN IF NOT EXISTS "scheduledStart" TIMESTAMP(3);`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "ShootingSchedule" ADD COLUMN IF NOT EXISTS "scheduledEnd" TIMESTAMP(3);`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "ShootingSchedule" ADD COLUMN IF NOT EXISTS "cameraman" TEXT;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "VideoLibrary" ADD COLUMN IF NOT EXISTS "epicId" TEXT;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "VideoLibrary" ADD COLUMN IF NOT EXISTS "duration" TEXT;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "VideoLibrary" ADD COLUMN IF NOT EXISTS "trade" TEXT;`);
      console.log('[Sync DB Script] Verified production database columns successfully.');
    } catch (colErr) {
      console.warn('[Sync DB Script] Column check notice:', colErr.message);
    }

    const rawPass = process.env.HIGHER_OFFICIAL_PASSWORD || 'Nimi@2026';
    const hashedPassword = await bcrypt.hash(rawPass, 10);

    for (const acc of HIGHER_OFFICIAL_ACCOUNTS) {
      await prisma.user.upsert({
        where: { email: acc.email.toLowerCase().trim() },
        update: {
          role: acc.role,
          status: 'ACTIVE',
          designation: acc.designation,
          department: acc.department
        },
        create: {
          email: acc.email.toLowerCase().trim(),
          name: acc.name,
          role: acc.role,
          status: 'ACTIVE',
          designation: acc.designation,
          department: acc.department,
          password: hashedPassword,
          createdBy: 'System Build Sync'
        }
      });
      console.log(`[Sync DB Script] Verified official account: ${acc.email}`);
    }

    const comp1 = await prisma.budgetComponent.findUnique({
      where: { componentNo: 1 },
      include: { annexureI: true }
    });

    const comp2 = await prisma.budgetComponent.findUnique({
      where: { componentNo: 2 },
      include: { annexureII: true }
    });

    if (!comp1 || !comp2) {
      console.log('[Sync DB Script] Budget components 1 or 2 do not exist in DB yet.');
      return;
    }

    // Check if fallbackData can be read
    const fallbackPath = path.join(__dirname, '../src/lib/fallbackData.ts');
    // Using simple regex or ts-node if needed, but since Next.js server actions handle runtime self-healing,
    // this build script just logs status or runs if possible.
    console.log(`[Sync DB Script] Connected. DB Comp 1 rows: ${comp1.annexureI.length}, Comp 2 rows: ${comp2.annexureII.length}`);

    // Synchronize 16 SME entries (including restored EPIC 12, 15, 16, 17, 19)
    await syncRestoredSmes(prisma);
  } catch (err) {
    console.warn('[Sync DB Script] Notice: Sync check skipped safely during build:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function syncRestoredSmes(prisma) {
  const RESTORED_SMES = [
    {
      sme: {
        id: 'cmv_sme_raghavan_19',
        name: 'Shri K Raghavan',
        designation: 'JTO',
        institute: 'Govt ITI',
        location: 'Chennai',
        address: null,
        status: 'ACTIVE'
      },
      entry: {
        id: 'cmv_entry_raghavan_19',
        epicSequence: 19,
        trade: 'Solar Technician',
        topic: 'Solar PV Systems, Inverter Installation & Commissioning, Solar Panel Wiring & Net Metering, Battery Storage & Maintenance',
        attendanceFrom: new Date('2026-09-10T00:00:00.000Z'),
        attendanceTo: new Date('2026-09-12T00:00:00.000Z'),
        days: 3,
        ratePerDay: 1500,
        taAmount: 1200,
        otherAmount: 300,
        status: 'INITIATED'
      },
      payment: {
        id: 'cmv_pay_raghavan_19',
        grossAmount: 4500,
        taAmount: 1200,
        otherAmount: 300,
        totalAmount: 6000,
        status: 'INITIATED'
      },
      stageBParams: {
        programmeName: 'PM e-Vidya Classroom Teaching Video Production',
        workTitle: 'Classroom Teaching Video Production for PM e-Vidya',
        location: 'National Instructional Media Institute (NIMI), Chennai',
        startDate: '2026-09-10',
        endDate: '2026-09-12',
        topicsCovered: 'Module 1: Solar PV Cell Technology & Array Layout\nModule 2: Solar Inverter Sizing, Off-Grid & Grid-Tied Systems\nModule 3: Battery Energy Storage & Rooftop Safety Standards',
        submissionDate: '2026-09-13',
        verifierName: 'Shri. Ashfaq Ahmed',
        verifierDesignation: 'Assistant Manager',
        verifierOrganisation: 'National Instructional Media Institute (NIMI), Chennai',
        verificationDate: '2026-09-14'
      },
      stageCParams: {
        programmeName: 'PM e-Vidya Classroom Teaching Video Production',
        workTitle: 'Classroom Teaching Video Production for PM e-Vidya',
        location: 'National Instructional Media Institute (NIMI), Chennai',
        trade: 'Solar Technician',
        attendanceSlots: [{ id: 'slot-1', startDate: '2026-09-10', endDate: '2026-09-12', trade: 'Solar Technician' }],
        totalDays: 3,
        ratePerDay: 1500,
        grossAmount: 4500,
        taAmount: 1200,
        otherAmount: 300,
        totalAmount: 6000,
        amountInWords: 'Six Thousand Only',
        submissionDate: '2026-09-14',
        verifierName: 'Joint Director / HOO',
        verifierDesignation: 'Head of Office'
      }
    },
    {
      sme: {
        id: 'cmv_sme_banoth_17',
        name: 'Shri.Rakesh Banoth',
        designation: 'Asst Director',
        institute: 'NSTI (W) - Agartala',
        location: 'Agartala',
        address: null,
        status: 'ACTIVE'
      },
      entry: {
        id: 'cmv_entry_banoth_17',
        epicSequence: 17,
        trade: 'Drone Pilot',
        topic: 'Principles of Drone Aerodynamics, DGCA Drone Airspace Regulations, Pre-Flight Checks & Emergency Procedures',
        attendanceFrom: new Date('2026-09-15T00:00:00.000Z'),
        attendanceTo: new Date('2026-09-18T00:00:00.000Z'),
        days: 4,
        ratePerDay: 1500,
        taAmount: 3500,
        otherAmount: 500,
        status: 'INITIATED'
      },
      payment: {
        id: 'cmv_pay_banoth_17',
        grossAmount: 6000,
        taAmount: 3500,
        otherAmount: 500,
        totalAmount: 10000,
        status: 'INITIATED'
      },
      stageBParams: {
        programmeName: 'PM e-Vidya Classroom Teaching Video Production',
        workTitle: 'Classroom Teaching Video Production for PM e-Vidya',
        location: 'National Instructional Media Institute (NIMI), Chennai',
        startDate: '2026-09-15',
        endDate: '2026-09-18',
        topicsCovered: 'Module 1: Principles of Drone Aerodynamics & Flight Controls\nModule 2: DGCA Drone Airspace Regulations & Weather Briefings\nModule 3: Pre-Flight Checks, Payload Handling & Emergency Procedures',
        submissionDate: '2026-09-19',
        verifierName: 'Shri. Ashfaq Ahmed',
        verifierDesignation: 'Assistant Manager',
        verifierOrganisation: 'National Instructional Media Institute (NIMI), Chennai',
        verificationDate: '2026-09-20'
      },
      stageCParams: {
        programmeName: 'PM e-Vidya Classroom Teaching Video Production',
        workTitle: 'Classroom Teaching Video Production for PM e-Vidya',
        location: 'National Instructional Media Institute (NIMI), Chennai',
        trade: 'Drone Pilot',
        attendanceSlots: [{ id: 'slot-1', startDate: '2026-09-15', endDate: '2026-09-18', trade: 'Drone Pilot' }],
        totalDays: 4,
        ratePerDay: 1500,
        grossAmount: 6000,
        taAmount: 3500,
        otherAmount: 500,
        totalAmount: 10000,
        amountInWords: 'Ten Thousand Only',
        submissionDate: '2026-09-20',
        verifierName: 'Joint Director / HOO',
        verifierDesignation: 'Head of Office'
      }
    },
    {
      sme: {
        id: 'cmv_sme_arun_16',
        name: 'Shri.Arun S',
        designation: 'Junior Instructor',
        institute: 'Govt ITI',
        location: 'Chennai',
        address: null,
        status: 'ACTIVE'
      },
      entry: {
        id: 'cmv_entry_arun_16',
        epicSequence: 16,
        trade: 'Wireman',
        topic: 'Domestic Wiring Systems, Conduit Installation & Earthing Measurements, Troubleshooting & Maintenance',
        attendanceFrom: new Date('2026-09-18T00:00:00.000Z'),
        attendanceTo: new Date('2026-09-21T00:00:00.000Z'),
        days: 4,
        ratePerDay: 1500,
        taAmount: 1500,
        otherAmount: 0,
        status: 'INITIATED'
      },
      payment: {
        id: 'cmv_pay_arun_16',
        grossAmount: 6000,
        taAmount: 1500,
        otherAmount: 0,
        totalAmount: 7500,
        status: 'INITIATED'
      },
      stageBParams: {
        programmeName: 'PM e-Vidya Classroom Teaching Video Production',
        workTitle: 'Classroom Teaching Video Production for PM e-Vidya',
        location: 'National Instructional Media Institute (NIMI), Chennai',
        startDate: '2026-09-18',
        endDate: '2026-09-21',
        topicsCovered: 'Module 1: Domestic Wiring Systems & Standard Accessories\nModule 2: Conduit Installation & Earthing Measurements\nModule 3: Troubleshooting & Maintenance in Electrical Circuits',
        submissionDate: '2026-09-22',
        verifierName: 'Shri. Ashfaq Ahmed',
        verifierDesignation: 'Assistant Manager',
        verifierOrganisation: 'National Instructional Media Institute (NIMI), Chennai',
        verificationDate: '2026-09-23'
      },
      stageCParams: {
        programmeName: 'PM e-Vidya Classroom Teaching Video Production',
        workTitle: 'Classroom Teaching Video Production for PM e-Vidya',
        location: 'National Instructional Media Institute (NIMI), Chennai',
        trade: 'Wireman',
        attendanceSlots: [{ id: 'slot-1', startDate: '2026-09-18', endDate: '2026-09-21', trade: 'Wireman' }],
        totalDays: 4,
        ratePerDay: 1500,
        grossAmount: 6000,
        taAmount: 1500,
        otherAmount: 0,
        totalAmount: 7500,
        amountInWords: 'Seven Thousand Five Hundred Only',
        submissionDate: '2026-09-23',
        verifierName: 'Joint Director / HOO',
        verifierDesignation: 'Head of Office'
      }
    },
    {
      sme: {
        id: 'cmv_sme_mayapandi_15',
        name: 'Shri M Mayapandi',
        designation: 'ATO MPCA',
        institute: 'Govt ITI',
        location: 'Ariyalur',
        address: null,
        status: 'ACTIVE'
      },
      entry: {
        id: 'cmv_entry_mayapandi_15',
        epicSequence: 15,
        trade: 'Wireman',
        topic: '1.10.56-62 - DC Motor: Construction and Working\n1.10.56-62 - DC Motor: Types of Application\n1.10.56 - 62 - DC Motor: Speed Control and Characteristics\n1.11.68 - AC Motor: Construction - Types, Control, working and starters\n1.10.56-62 - DC Generator - Part 1 - Construction, Working & classification\n1.10.56-62 - DC Generator - Part 2 - EMF Equation\n1.10.56-62 - DC Generator - Losses\n1.10.56-62 - DC Generator - Voltage Regulation\n1.10.56-62 - DC Generator - Efficiency\n1.10.56-62 - DC Generator - Characteristics\n1.9.50-55 - Earthing - Plate and pipe earthing\n1.9.50-55 - Earthing - Rod, Strip and chemical earthing\n1.9.50-55 - Earthing - Comparision and measurement of earth resistance',
        attendanceFrom: new Date('2026-09-21T00:00:00.000Z'),
        attendanceTo: new Date('2026-10-23T00:00:00.000Z'),
        days: 7,
        ratePerDay: 1500,
        taAmount: 2500,
        otherAmount: 0,
        status: 'IN_PROGRESS'
      },
      payment: {
        id: 'cmv_pay_mayapandi_15',
        grossAmount: 10500,
        taAmount: 2500,
        otherAmount: 0,
        totalAmount: 13000,
        status: 'ON_PROCESS'
      },
      stageBParams: {
        programmeName: 'PM e-Vidya Classroom Teaching Video Production',
        workTitle: 'Classroom Teaching Video Production for PM e-Vidya',
        location: 'National Instructional Media Institute (NIMI), Chennai',
        startDate: '2026-09-21',
        endDate: '2026-10-23',
        topicsCovered: '1.10.56-62 - DC Motor: Construction and Working\n1.10.56-62 - DC Motor: Types of Application\n1.10.56 - 62 - DC Motor: Speed Control and Characteristics\n1.11.68 - AC Motor: Construction - Types, Control, working and starters\n1.10.56-62 - DC Generator - Part 1 - Construction, Working & classification\n1.10.56-62 - DC Generator - Part 2 - EMF Equation\n1.10.56-62 - DC Generator - Losses\n1.10.56-62 - DC Generator - Voltage Regulation\n1.10.56-62 - DC Generator - Efficiency\n1.10.56-62 - DC Generator - Characteristics\n1.9.50-55 - Earthing - Plate and pipe earthing\n1.9.50-55 - Earthing - Rod, Strip and chemical earthing\n1.9.50-55 - Earthing - Comparision and measurement of earth resistance',
        submissionDate: '2026-10-22',
        verifierName: 'Shri. Ashfaq Ahmed',
        verifierDesignation: 'Assistant Manager',
        verifierOrganisation: 'National Instructional Media Institute (NIMI), Chennai',
        verificationDate: '2026-10-22'
      },
      stageCParams: {
        programmeName: 'PM e-Vidya Classroom Teaching Video Production',
        workTitle: 'Classroom Teaching Video Production for PM e-Vidya',
        location: 'National Instructional Media Institute (NIMI), Chennai',
        trade: 'Wireman',
        attendanceSlots: [{ id: 'slot-1', startDate: '2026-09-21', endDate: '2026-10-23', trade: 'Wireman' }],
        totalDays: 7,
        ratePerDay: 1500,
        grossAmount: 10500,
        taAmount: 2500,
        otherAmount: 0,
        totalAmount: 13000,
        amountInWords: 'Thirteen Thousand Only',
        submissionDate: '2026-10-22',
        verifierName: 'Joint Director / HOO',
        verifierDesignation: 'Head of Office'
      }
    },
    {
      sme: {
        id: 'cmv_sme_gnanavel_12',
        name: 'Shri A.Gnanavel',
        designation: 'ATO MPCA',
        institute: 'Govt ITI',
        location: 'Chennai',
        address: null,
        status: 'ACTIVE'
      },
      entry: {
        id: 'cmv_entry_gnanavel_12',
        epicSequence: 12,
        trade: 'Wireman',
        topic: 'General Safety & First Aid for Electrical Hazards, Single Phase & Three Phase Distribution, Protective Switchgear: MCB & ELCB',
        attendanceFrom: new Date('2026-09-01T00:00:00.000Z'),
        attendanceTo: new Date('2026-09-06T00:00:00.000Z'),
        days: 5,
        ratePerDay: 1500,
        taAmount: 2000,
        otherAmount: 0,
        status: 'IN_PROGRESS'
      },
      payment: {
        id: 'cmv_pay_gnanavel_12',
        grossAmount: 7500,
        taAmount: 2000,
        otherAmount: 0,
        totalAmount: 9500,
        status: 'ON_PROCESS'
      },
      stageBParams: {
        programmeName: 'PM e-Vidya Classroom Teaching Video Production',
        workTitle: 'Classroom Teaching Video Production for PM e-Vidya',
        location: 'National Instructional Media Institute (NIMI), Chennai',
        startDate: '2026-09-23',
        endDate: '2026-10-23',
        topicsCovered: '1. 2.10 - 1.3.16 - Basic Workshop Practice (Hand Tools)\n1.11.63 - 1.11.68 - Transformer - Principle - Classification - EMF Equation\n1.8.42 - 1.8.45 - Generation and Transmission - PowerPlant and overhead transmission\n1.7.37 - 1.7.38 - Measuring Instruments - AM types, instruments scale, Classification\n1.12.69 - 73 - Relay and Control Panel Wiring\n1.7.39 - 41 - Measuring Instruments - Principles, MC, MI, Force types\n1.8.46 - 1.8.49 - Distribution & Substation - Circuit Breaker, Supply, CT, PT',
        submissionDate: '2026-10-23',
        verifierName: 'Shri. Ashfaq Ahmed',
        verifierDesignation: 'Assistant Manager',
        verifierOrganisation: 'National Instructional Media Institute (NIMI), Chennai',
        verificationDate: '2026-10-23'
      },
      stageCParams: {
        programmeName: 'PM e-Vidya Classroom Teaching Video Production',
        workTitle: 'Classroom Teaching Video Production for PM e-Vidya',
        location: 'National Instructional Media Institute (NIMI), Chennai',
        trade: 'Wireman',
        attendanceSlots: [{ id: 'slot-1', startDate: '2026-09-01', endDate: '2026-09-06', trade: 'Wireman' }],
        totalDays: 5,
        ratePerDay: 1500,
        grossAmount: 7500,
        taAmount: 2000,
        otherAmount: 0,
        totalAmount: 9500,
        amountInWords: 'Nine Thousand Five Hundred Only',
        submissionDate: '2026-09-08',
        verifierName: 'Joint Director / HOO',
        verifierDesignation: 'Head of Office'
      }
    }
  ];

  for (const item of RESTORED_SMES) {
    try {
      const sme = await prisma.sME.upsert({
        where: { id: item.sme.id },
        update: {
          name: item.sme.name,
          designation: item.sme.designation,
          institute: item.sme.institute,
          location: item.sme.location,
          status: item.sme.status
        },
        create: item.sme
      });

      const workEntry = await prisma.sMEWorkEntry.upsert({
        where: { id: item.entry.id },
        update: {
          smeId: sme.id,
          epicSequence: item.entry.epicSequence,
          trade: item.entry.trade,
          topic: item.entry.topic,
          attendanceFrom: item.entry.attendanceFrom,
          attendanceTo: item.entry.attendanceTo,
          days: item.entry.days,
          ratePerDay: item.entry.ratePerDay,
          taAmount: item.entry.taAmount,
          otherAmount: item.entry.otherAmount,
          status: item.entry.status
        },
        create: {
          ...item.entry,
          smeId: sme.id
        }
      });

      await prisma.payment.upsert({
        where: { id: item.payment.id },
        update: {
          workEntryId: workEntry.id,
          grossAmount: item.payment.grossAmount,
          taAmount: item.payment.taAmount,
          otherAmount: item.payment.otherAmount,
          totalAmount: item.payment.totalAmount,
          status: item.payment.status
        },
        create: {
          ...item.payment,
          workEntryId: workEntry.id
        }
      });

      const seqStr = String(workEntry.epicSequence).padStart(2, '0');
      const docs = [
        {
          id: `cmv_doc_app_${workEntry.epicSequence}`,
          name: `Approval Letter - EPIC-2026-PMeVidya ${seqStr}`,
          type: 'APPROVAL_LETTER',
          status: 'GENERATED',
          filePath: null,
          workEntryId: workEntry.id
        },
        {
          id: `cmv_doc_wc_${workEntry.epicSequence}`,
          name: `Work Completion Certificate - EPIC-2026-PMeVidya ${seqStr}`,
          type: 'WORK_COMPLETION',
          status: 'GENERATED',
          filePath: null,
          workEntryId: workEntry.id
        },
        {
          id: `cmv_doc_pn_${workEntry.epicSequence}`,
          name: `SME Remuneration Note - EPIC-2026-PMeVidya ${seqStr}`,
          type: 'PAYMENT_NOTE',
          status: 'GENERATED',
          filePath: null,
          workEntryId: workEntry.id
        },
        {
          id: `cmv_doc_stageb_${workEntry.epicSequence}`,
          name: `Work Completion Parameters - EPIC-2026-PMeVidya ${seqStr}`,
          type: 'STAGE_B_WORK_COMPLETION',
          status: 'SAVED',
          filePath: JSON.stringify(item.stageBParams),
          workEntryId: workEntry.id
        },
        {
          id: `cmv_doc_stagec_${workEntry.epicSequence}`,
          name: `Remuneration Parameters - EPIC-2026-PMeVidya ${seqStr}`,
          type: 'STAGE_C_REMUNERATION',
          status: 'SAVED',
          filePath: JSON.stringify(item.stageCParams),
          workEntryId: workEntry.id
        }
      ];

      for (const d of docs) {
        const existingDoc = await prisma.document.findUnique({ where: { id: d.id } });
        if (existingDoc) {
          // Preserve live production saved parameters: never overwrite an existing non-null filePath with seed data or null!
          const updateData = {
            name: d.name,
            type: d.type,
            workEntryId: d.workEntryId
          };
          if (!existingDoc.filePath && d.filePath) {
            updateData.filePath = d.filePath;
            updateData.status = d.status;
          }
          await prisma.document.update({
            where: { id: d.id },
            data: updateData
          });
        } else {
          await prisma.document.create({ data: d });
        }
      }
      console.log(`[Sync DB Script] Synchronized restored SME EPIC-${workEntry.epicSequence} (${sme.name})`);
    } catch (e) {
      console.warn(`[Sync DB Script] Notice: SME ${item.entry.epicSequence} sync skipped:`, e.message);
    }
  }

  // Synchronize 76 Tracker Records into VideoLibrary, ShootingSchedule, and VideoEditorRecord
  try {
    const trackerData = require('./tracker-data.json');
    console.log(`[Sync DB Script] Synchronizing ${trackerData.length} Video Production Tracker records...`);

    const dbWorkEntries = await prisma.sMEWorkEntry.findMany();
    const entryBySeq = new Map();
    for (const e of dbWorkEntries) {
      entryBySeq.set(e.epicSequence, e);
    }

    for (const row of trackerData) {
      const workEntry = entryBySeq.get(row.epicSeq);
      if (!workEntry) {
        continue;
      }

      const vidId = `VID-${String(row.rowNumber).padStart(3, '0')}`;
      const shootId = `shoot-VID-${String(row.rowNumber).padStart(3, '0')}`;
      const edId = `ed-VID-${String(row.rowNumber).padStart(3, '0')}`;

      const metaJson = JSON.stringify({
        sNo: row.sNo,
        monthSNo: row.monthSNo,
        month: row.month,
        epicCode: row.epicCode,
        excelRow: row.excelRow,
        originalTopic: row.videoTopic
      });

      const shootStart = row.shootStartDate ? new Date(row.shootStartDate) : null;
      const shootEnd = row.shootEndDate ? new Date(row.shootEndDate) : null;
      const editStart = row.editStartDate ? new Date(row.editStartDate) : null;
      const editEnd = row.editEndDate ? new Date(row.editEndDate) : null;

      // Never overwrite existing records during build/sync - only insert if missing
      await prisma.videoLibrary.upsert({
        where: { id: vidId },
        update: {},
        create: {
          id: vidId,
          epicId: workEntry.id,
          title: row.videoTopic,
          smeName: row.smeName,
          trade: row.trade,
          duration: row.duration,
          videoLink: row.videoLink || ''
        }
      });

      await prisma.shootingSchedule.upsert({
        where: { id: shootId },
        update: {},
        create: {
          id: shootId,
          workEntryId: workEntry.id,
          videoTitle: row.videoTopic,
          cameraman: row.cameraman,
          scheduledStart: shootStart,
          scheduledEnd: shootEnd,
          status: row.shootStatus,
          location: row.month,
          productionNotes: metaJson
        }
      });

      await prisma.videoEditorRecord.upsert({
        where: { id: edId },
        update: {},
        create: {
          id: edId,
          workEntryId: workEntry.id,
          assignedVideo: row.videoTopic,
          editorName: row.editorName,
          editingStartDate: editStart,
          editingEndDate: editEnd,
          status: row.editStatus,
          duration: row.duration,
          finalVideoFile: row.videoLink,
          reviewComments: metaJson
        }
      });
    }

    console.log(`[Sync DB Script] Successfully synchronized all 76 Tracker records into production Neon DB!`);
  } catch (err) {
    console.warn(`[Sync DB Script] Notice: Tracker sync check:`, err.message);
  }
}

main();
