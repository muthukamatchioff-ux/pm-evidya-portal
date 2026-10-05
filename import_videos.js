const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const videos = [
  { smeName: 'Shri. V. Babu', title: 'COPA - Javascript: The Language of the Web', videoLink: 'https://drive.google.com/file/d/1Dt0uoxK7s2pEwJw-l1FgbFoXvArVBWk3/view?usp=sharing' },
  { smeName: 'Shri. V. Babu', title: 'Communication for Online Training', videoLink: 'https://drive.google.com/file/d/1dyTpht9-P_1nsHXPBcUUb5Pe-L0i_EKF/view?usp=drive_link' },
  { smeName: 'Shri. V. Babu', title: "Dale's Cone of Experience", videoLink: 'https://drive.google.com/file/d/1_bNKqqXmZ_Bz9kJQSTDbPNQwetqqYZPb/view?usp=drive_link' },
  { smeName: 'Shri. V. Babu', title: 'Roles of Audio - Visual Aids', videoLink: 'https://drive.google.com/file/d/1HygrEw2DwfpP44WLLKCjghgY28S6bYds/view?usp=drive_link' },
  { smeName: 'Shri. V. Babu', title: 'Transactional Analysis', videoLink: 'https://drive.google.com/file/d/13WaWnbJ79z2Cs_PpLmnE4rhUG02yQ_0k/view?usp=drive_link' },
  { smeName: 'Smt. Priya', title: '50 Questions for Drone Technician', videoLink: 'https://www.youtube.com/live/TaM7NYrEYYQ?si=t9AtzOz_82FGAjwE' },
  { smeName: 'H.A. Manukumar', title: 'Cutting Speed & RPM Speed', videoLink: 'https://drive.google.com/file/d/1Mgi-Ggq1CU_ZDKiAe8nSxCLjIrYz5ukh/view?usp=drive_link' },
  { smeName: 'H.A. Manukumar', title: 'Face Milling Programming', videoLink: 'https://drive.google.com/file/d/1GjQ1tOCse5ISo-vc9gPQY2O694PcOoiC/view?usp=drive_link' },
  { smeName: 'H.A. Manukumar', title: 'Peck Drilling Cycle on VMC', videoLink: 'https://drive.google.com/file/d/1cYkY49iMICUlDMeZjBk4dVVd4fz2Pyyw/view?usp=drive_link' },
  { smeName: 'Dr. Majji Bala Ganesh', title: '50 Questions for AI Programming Assistant', videoLink: 'https://www.youtube.com/live/NWOeFN322QY?si=CS5EgLMVsQJP_CXe' },
  { smeName: 'Dr. Majji Bala Ganesh', title: 'AI (Artificial Intelligence Program Assistant)', videoLink: 'https://drive.google.com/file/d/1FmOQB4N_qzMFIb_MBpKFXTD6D-m4YgE_/view?usp=drive_link' },
  { smeName: 'Dr. Majji Bala Ganesh', title: 'AI TOOLS (Artificial Intelligence)', videoLink: 'https://drive.google.com/file/d/1Fzuy79rbY7gRYD1xezWyVo-1WwMaXzGS/view?usp=drive_link' },
  { smeName: 'Dr. Majji Bala Ganesh', title: 'Introduction of AI (Program Assistant - Computer Components)', videoLink: 'https://drive.google.com/file/d/14UiWJmDCIFrAY1069xP9iPL2ewIBz_is/view?usp=drive_link' },
  { smeName: 'Dr. Majji Bala Ganesh', title: 'Machine Learning', videoLink: 'https://drive.google.com/file/d/10Tseq0I0DwYxcAjZC_E8rv6Ya_MXfbKs/view?usp=drive_link' },
  { smeName: 'Dr. Majji Bala Ganesh', title: 'Introduction of Computer Vision in AI', videoLink: 'https://drive.google.com/file/d/1vg7honuzlbZgCu8jTh0PcF1wsgg0rRDB/view?usp=drive_link' },
  { smeName: 'Drone SME', title: 'Introduction of drone technician', videoLink: 'https://drive.google.com/file/d/1Gg9b6yLR1cHEb8KSJgS0mMkelXMrJTIV/view?usp=drive_link' },
  { smeName: 'Drone SME', title: 'Introduction to 3d printer & their designs', videoLink: 'https://drive.google.com/file/d/1aux3YIMm26cfPfaeG0q5WYlfn2hvJvTx/view?usp=drive_link' },
  { smeName: 'Drone SME', title: 'Sensors used in drones', videoLink: 'https://drive.google.com/file/d/1VojNNyPbt4YxYI2tSIx4fmINFCCo2egf/view?usp=drive_link' },
  { smeName: 'Drone SME', title: 'BLDC Motors & Servo Motors in Drone', videoLink: 'https://drive.google.com/file/d/1cGhahnEvnosBHDRyfxQESaSIVx589kDe/view?usp=drive_link' },
  { smeName: 'Drone SME', title: 'FLIGHT CONTROLLER BOARD & ELECTRONIC SPEED CONTROLLER IN DRONE', videoLink: 'https://drive.google.com/file/d/1mh2Cqf0kBjdqx1nE6EEHshfdvrl1L_qs/view?usp=drive_link' },
  { smeName: 'Mrs. Rupasree', title: 'Scope and necessity of Instrumentation', videoLink: 'https://drive.google.com/file/d/1EDl_AusljbgYfC_RaOIscpgWkVa4kvZ_/view?usp=drive_link' },
  { smeName: 'Mrs. Rupasree', title: 'Fundamentals of Electricity', videoLink: 'https://drive.google.com/file/d/1CocCtJZa8cwR0mQ6waUFnbcypRXtiCCY/view?usp=drive_link' },
  { smeName: 'Mrs. Rupasree', title: 'Semiconductors and Diodes', videoLink: 'https://drive.google.com/file/d/1188YLAHN83z2jgR35M6d77Th9-1NAMZp/view?usp=drive_link' },
  { smeName: 'Mrs. Rupasree', title: 'Rectifiers & Filters', videoLink: 'https://drive.google.com/file/d/13JYjU3WBtqVscvSsriCMHcxd_nMpeMj3/view?usp=drive_link' },
  { smeName: 'Mrs. Rupasree', title: 'Pressure Measurement', videoLink: 'https://drive.google.com/file/d/12O97NIkGI0F0to4IrcFx6wA0cloujuaI/view?usp=drive_link' },
  { smeName: 'Mrs. Rupasree', title: 'Pressure Measurement Introduction', videoLink: 'https://drive.google.com/file/d/1mPJwb3CO5cFzcX98oLuKeH4m0DQqMuGM/view?usp=drive_link' },
  { smeName: 'Mrs. Rupasree', title: 'Flow Measurement', videoLink: 'https://drive.google.com/file/d/1Ml1W0GlliyM8ytroOsRz2BF7w34m-X97/view?usp=drive_link' },
  { smeName: 'Mrs. Rupasree', title: 'Level Measurement', videoLink: 'https://drive.google.com/file/d/1lpXV_pAb3UeKme7Ri9jcY5zjklS85qN3/view?usp=drive_link' },
  { smeName: 'Mrs. Rupasree', title: 'Temperature Measurement', videoLink: 'https://drive.google.com/file/d/10apqvSOC7R8OrD9dsHColCwutN-7Z2ZN/view?usp=drive_link' },
  { smeName: 'Media SSC Stakeholder', title: 'Unit 2: Self-Management Skills → Session 3: Self-confidence', videoLink: 'https://drive.google.com/file/d/13Ld5-n61TB7rVKl5qQm2y2r_4LdDgVeV/view?usp=sharing' },
  { smeName: 'Media SSC Stakeholder', title: 'Unit 2: Self-Management Skills → Session 3: Self-awareness', videoLink: 'https://drive.google.com/file/d/10s9Uj1p02Ja7g0e8uYwVJEL_m__klH-H/view?usp=sharing' },
  { smeName: 'Media SSC Stakeholder', title: 'Chapter 6: Rasa Adhyaya (Rasa Theory)', videoLink: 'https://drive.google.com/file/d/1YNphn-JndRd8rnYPtM5Piw-yAjOuD7OL/view?usp=sharing' },
  { smeName: 'Media SSC Stakeholder', title: 'Unit 1: Understanding the Language of the Medium → Chapter II: Aspects of Film Language', videoLink: 'https://drive.google.com/file/d/1qnOGc3EWO8y8Sw26U8o6G-KL_g4zP9zJ/view?usp=sharing' },
  { smeName: 'Media SSC Stakeholder', title: 'Chapter 6: Rasa Adhyaya — Shanta Rasa', videoLink: 'https://drive.google.com/file/d/1GmwayM3U66BxDOEnv1Kpq2ZMIJORwGGm/view?usp=sharing' }
];

async function main() {
  for (const v of videos) {
    await prisma.videoLibrary.create({ data: v });
  }
  console.log('Inserted all videos successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
