const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const passwordHash = "$2b$12$5YWrRpEsXi87uO/N6FccFuFEAmEyuNz6zu/UliFwepyjJtw4Luigu";

  const staffMembers = [
    // Cameramen
    { email: 'antony.alcander@gmail.com', name: 'Antony Alcander', role: 'CAMERAMAN', designation: 'Camera Operator' },
    { email: 'parasuraman.cam@nimi.org', name: 'Parasuraman', role: 'CAMERAMAN', designation: 'Lead Cameraman' },
    { email: 'antony.parasuraman@nimi.org', name: 'Antony Parasuraman', role: 'CAMERAMAN', designation: 'Camera Operator' },
    // Editors
    { email: 'hassan.antony@nimi.org', name: 'Hassan & Antony', role: 'EDITOR', designation: 'Senior Video Editor' },
    { email: 'hassan@nimi.org', name: 'Hassan', role: 'EDITOR', designation: 'Video Editor' },
    { email: 'bala@nimi.org', name: 'Bala', role: 'EDITOR', designation: 'Video Editor' },
    { email: 'ramaswamy@nimi.org', name: 'Ramaswamy', role: 'EDITOR', designation: 'Audio & Video Editor' },
    { email: 'parandhaman@nimi.org', name: 'Parandhaman', role: 'EDITOR', designation: 'Motion Graphics & Editor' },
  ];

  for (const staff of staffMembers) {
    const existing = await prisma.user.findUnique({ where: { email: staff.email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          email: staff.email,
          name: staff.name,
          role: staff.role,
          status: 'ACTIVE',
          designation: staff.designation,
          department: '[1,2,3,4,5,6,7,8,9,10,11,12,15,16,17]',
          password: passwordHash,
          createdBy: 'System Provisioning'
        }
      });
      console.log(`Created registered ${staff.role}: ${staff.name} <${staff.email}>`);
    } else {
      console.log(`Already registered ${staff.role}: ${staff.name} <${staff.email}>`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
