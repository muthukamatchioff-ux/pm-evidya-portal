const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

async function testProductionNeon() {
  const prodEnv = fs.readFileSync('.env.production', 'utf8');
  const line = prodEnv.split('\n').find(l => l.startsWith('DATABASE_URL='));
  let prodUrl = line ? line.replace('DATABASE_URL=', '').trim().replace(/^["']|["']$/g, '') : null;

  if (!prodUrl) {
    const vercelEnv = fs.readFileSync('.env.vercel.prod', 'utf8');
    const vline = vercelEnv.split('\n').find(l => l.startsWith('DATABASE_URL='));
    prodUrl = vline ? vline.replace('DATABASE_URL=', '').trim().replace(/^["']|["']$/g, '') : null;
  }

  console.log('Connecting to Production DATABASE_URL...');
  const prismaProd = new PrismaClient({
    datasources: {
      db: {
        url: prodUrl
      }
    }
  });

  try {
    const vCount = await prismaProd.videoLibrary.count();
    const sCount = await prismaProd.shootingSchedule.count();
    const eCount = await prismaProd.videoEditorRecord.count();
    const wCount = await prismaProd.sMEWorkEntry.count();
    console.log('Production Neon VideoLibrary count:', vCount);
    console.log('Production Neon ShootingSchedule count:', sCount);
    console.log('Production Neon VideoEditorRecord count:', eCount);
    console.log('Production Neon SMEWorkEntry count:', wCount);

    const vidIds = await prismaProd.videoLibrary.findMany({
      select: { id: true, title: true, videoLink: true },
      take: 5
    });
    console.log('Sample Production VideoLibrary ids:', vidIds);
  } finally {
    await prismaProd.$disconnect();
  }
}

testProductionNeon().catch(console.error);
