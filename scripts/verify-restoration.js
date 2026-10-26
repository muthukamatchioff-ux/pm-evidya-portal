const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const v = await prisma.videoLibrary.count();
  const s = await prisma.shootingSchedule.count();
  const e = await prisma.videoEditorRecord.count();
  console.log('VideoLibrary count:', v);
  console.log('ShootingSchedule count:', s);
  console.log('VideoEditorRecord count:', e);

  // Check EPIC-15 (Mayapandi)
  const mayapandi = await prisma.videoLibrary.findMany({
    where: { epic: { epicSequence: 15 } }
  });
  console.log('\nMayapandi (EPIC-15) topics count:', mayapandi.length);
  mayapandi.forEach((m, i) => console.log('  ' + (i+1) + '. ' + m.id + ' : ' + m.title));

  // Check EPIC-19 (Raghavan)
  const raghavan = await prisma.videoLibrary.findMany({
    where: { epic: { epicSequence: 19 } }
  });
  console.log('\nRaghavan (EPIC-19) topics count:', raghavan.length);
  raghavan.forEach((r, i) => console.log('  ' + (i+1) + '. ' + r.id + ' : ' + r.title));

  // Check EPIC-12 (Gnanavel)
  const gnanavel = await prisma.videoLibrary.findMany({
    where: { epic: { epicSequence: 12 } }
  });
  console.log('\nGnanavel (EPIC-12) topics count:', gnanavel.length);
  gnanavel.forEach((g, i) => console.log('  ' + (i+1) + '. ' + g.id + ' : ' + g.title));

  // Check EPIC-17 (Banoth)
  const banoth = await prisma.videoLibrary.findMany({
    where: { epic: { epicSequence: 17 } }
  });
  console.log('\nBanoth (EPIC-17) topics count:', banoth.length);
  banoth.forEach((b, i) => console.log('  ' + (i+1) + '. ' + b.id + ' : ' + b.title));
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
