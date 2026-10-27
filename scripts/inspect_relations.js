const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const vCount = await prisma.videoLibrary.count();
  const sCount = await prisma.shootingSchedule.count();
  const eCount = await prisma.videoEditorRecord.count();
  const wCount = await prisma.sMEWorkEntry.count();
  console.log('VideoLibrary count:', vCount);
  console.log('ShootingSchedule count:', sCount);
  console.log('VideoEditorRecord count:', eCount);
  console.log('SMEWorkEntry count:', wCount);

  const sampleVid = await prisma.videoLibrary.findFirst();
  console.log('Sample VideoLibrary:', sampleVid);
  
  const entries = await prisma.sMEWorkEntry.findMany({
    include: { videoLibraries: true, shootingSchedules: true, videoEditorRecords: true }
  });
  console.log('Entries total:', entries.length);
  for (const entry of entries) {
    console.log(`Entry seq ${entry.epicSequence} (${entry.id}): videos=${entry.videoLibraries.length}, schedules=${entry.shootingSchedules.length}, editors=${entry.videoEditorRecords.length}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
