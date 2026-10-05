const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const durationMap = {
  'COPA - Javascript: The Language of the Web': '1:47:43',
  'Communication for Online Training': '1:02:43',
  "Dale's Cone of Experience": '0:07:59',
  'Roles of Audio - Visual Aids': '0:29:02',
  'Transactional Analysis': '0:34:01',
  '50 Questions for Drone Technician': '1:09:27',
  'Cutting Speed & RPM Speed': '0:34:23',
  'Face Milling Programming': '0:27:59',
  'Peck Drilling Cycle on VMC': '0:25:55',
  '50 Questions for AI Programming Assistant': '0:50:20',
  'AI (Artificial Intelligence Program Assistant)': '0:34:49',
  'AI TOOLS (Artificial Intelligence)': '0:26:06',
  'Introduction of AI (Program Assistant - Computer Components)': '0:12:38',
  'Machine Learning': '0:30:00',
  'Introduction of Computer Vision in AI': '0:28:18',
  'Introduction of drone technician': '0:32:47',
  'Introduction to 3d printer & their designs': '0:23:20',
  'Sensors used in drones': '0:14:09',
  'BLDC Motors & Servo Motors in Drone': '0:25:45',
  'FLIGHT CONTROLLER BOARD & ELECTRONIC SPEED CONTROLLER IN DRONE': '0:27:45',
  'Scope and necessity of Instrumentation': '0:21:55',
  'Fundamentals of Electricity': '0:18:58',
  'Semiconductors and Diodes': '0:26:21',
  'Rectifiers & Filters': '0:21:29',
  'Pressure Measurement': '0:28:47',
  'Pressure Measurement Introduction': '0:40:11',
  'Flow Measurement': '0:36:55',
  'Level Measurement': '0:32:24',
  'Temperature Measurement': '0:21:59',
  'Unit 2: Self-Management Skills → Session 3: Self-confidence': '0:38:19',
  'Unit 2: Self-Management Skills → Session 3: Self-awareness': '0:20:49',
  'Chapter 6: Rasa Adhyaya (Rasa Theory)': '0:15:03',
  'Unit 1: Understanding the Language of the Medium → Chapter II: Aspects of Film Language': '0:16:34',
  'Chapter 6: Rasa Adhyaya — Shanta Rasa': '0:21:04'
};

async function main() {
  const videos = await prisma.videoLibrary.findMany();
  for (const v of videos) {
    if (durationMap[v.title]) {
      await prisma.videoLibrary.update({
        where: { id: v.id },
        data: { duration: durationMap[v.title] }
      });
    }
  }
  console.log('Durations updated!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
