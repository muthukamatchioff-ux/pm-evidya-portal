const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const tradeMap = {
  'COPA - Javascript: The Language of the Web': 'COPA',
  'Communication for Online Training': 'POT',
  "Dale's Cone of Experience": 'POT',
  'Roles of Audio - Visual Aids': 'POT',
  'Transactional Analysis': 'POT',
  '50 Questions for Drone Technician': 'Drone Technician',
  'Cutting Speed & RPM Speed': 'Advanced CNC Machinist',
  'Face Milling Programming': 'Advanced CNC Machinist',
  'Peck Drilling Cycle on VMC': 'Advanced CNC Machinist',
  '50 Questions for AI Programming Assistant': 'AI Programming Assistant',
  'AI (Artificial Intelligence Program Assistant)': 'AI Programming Assistant',
  'AI TOOLS (Artificial Intelligence)': 'AI Programming Assistant',
  'Introduction of AI (Program Assistant - Computer Components)': 'AI Programming Assistant',
  'Machine Learning': 'AI Programming Assistant',
  'Introduction of Computer Vision in AI': 'AI Programming Assistant',
  'Introduction of drone technician': 'Drone Technician',
  'Introduction to 3d printer & their designs': 'Drone Technician',
  'Sensors used in drones': 'Drone Technician',
  'BLDC Motors & Servo Motors in Drone': 'Drone Technician',
  'FLIGHT CONTROLLER BOARD & ELECTRONIC SPEED CONTROLLER IN DRONE': 'Drone Technician',
  'Scope and necessity of Instrumentation': 'Instrument Mechanic',
  'Fundamentals of Electricity': 'Instrument Mechanic',
  'Semiconductors and Diodes': 'Instrument Mechanic',
  'Rectifiers & Filters': 'Instrument Mechanic',
  'Pressure Measurement': 'Instrument Mechanic',
  'Pressure Measurement Introduction': 'Instrument Mechanic',
  'Flow Measurement': 'Instrument Mechanic',
  'Level Measurement': 'Instrument Mechanic',
  'Temperature Measurement': 'Instrument Mechanic',
  'Unit 2: Self-Management Skills → Session 3: Self-confidence': 'Employability Skills',
  'Unit 2: Self-Management Skills → Session 3: Self-awareness': 'Employability Skills',
  'Chapter 6: Rasa Adhyaya (Rasa Theory)': 'Acting / Rasa Theory (Performing Arts)',
  'Unit 1: Understanding the Language of the Medium → Chapter II: Aspects of Film Language': 'Mass Media Studies',
  'Chapter 6: Rasa Adhyaya — Shanta Rasa': 'Acting / Rasa Theory (Performing Arts)'
};

async function main() {
  const videos = await prisma.videoLibrary.findMany();
  for (const v of videos) {
    if (tradeMap[v.title]) {
      await prisma.videoLibrary.update({
        where: { id: v.id },
        data: { trade: tradeMap[v.title] }
      });
    }
  }
  console.log('Trades updated!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
