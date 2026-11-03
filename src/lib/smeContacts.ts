// Authoritative SME Contact Details for PM e-Vidya Portal
// Single Source of Truth for Phone Numbers and Email IDs

export interface SmeContactInfo {
  epicSequence: number;
  name: string;
  phone: string;
  email: string | null;
}

export const SME_OFFICIAL_CONTACTS: SmeContactInfo[] = [
  { epicSequence: 1, name: 'Ms. Priya', phone: '9901001184', email: 'priya.s@gov.in' },
  { epicSequence: 2, name: 'Mr. H. A. Manukumar', phone: '8762516856', email: 'manukumar.ha@gov.in' },
  { epicSequence: 3, name: 'Mr. V. Babu', phone: '9739266816', email: 'valluru.babu@nic.in' },
  { epicSequence: 4, name: 'Shri Maria Soosai', phone: '94455 78561', email: 'msusai14@gmail.com' },
  { epicSequence: 5, name: 'Dr. Majji Bala Ganesh Reddy', phone: '7207771184', email: 'balganesh9@gmail.com' },
  { epicSequence: 6, name: 'Mr.S.Arulselvan', phone: '9444819958', email: null },
  { epicSequence: 7, name: 'Shri Reji B.K', phone: '9447698307', email: 'rejimys@gmail.com' },
  { epicSequence: 8, name: 'Mrs. Rupasree', phone: '9895399751 / 9074358734', email: 'rupasreeprakashpai@gmail.com' },
  { epicSequence: 9, name: 'Dr. T. Jayasudha', phone: '9444243017', email: 'sudha.academia@gmail.com' },
  { epicSequence: 10, name: 'Dr. Srinivasa Rao Pulichalla', phone: '9885648846', email: 'drsrinivas@apollomedskills.com' },
  { epicSequence: 11, name: 'Dr. Majji Bala Ganesh Reddy', phone: '7207771184', email: 'balganesh9@gmail.com' },
  { epicSequence: 12, name: 'Shri A.Gnanavel', phone: '7639 595 812', email: 'navelu88@gmail.com' },
  { epicSequence: 15, name: 'Shri M Mayapandi', phone: '97894 61102', email: 'josepharjun2009@gmail.com' },
  { epicSequence: 16, name: 'Shri.Arun S', phone: '7994505148', email: 'arunsahadevan92@gmail.com' },
  { epicSequence: 17, name: 'Shri.Rakesh Banoth', phone: '9391955105', email: 'rakeshatihyd@gmail.com' },
  { epicSequence: 19, name: 'Shri K Raghavan', phone: '8667393943', email: 'raghavan.skp@gmail.com' },
  { epicSequence: 20, name: 'Shri Harish Menon R', phone: '94473 11576', email: 'hmrd8555@gmail.com' }
];

export function findSmeContact(name?: string | null, epicSequence?: number | null): SmeContactInfo | undefined {
  if (epicSequence && epicSequence > 0) {
    const bySeq = SME_OFFICIAL_CONTACTS.find(c => c.epicSequence === epicSequence);
    if (bySeq) return bySeq;
  }
  if (!name) return undefined;
  const cleanTarget = name.toLowerCase().replace(/[^a-z]/g, '');
  return SME_OFFICIAL_CONTACTS.find(c => {
    const cleanC = c.name.toLowerCase().replace(/[^a-z]/g, '');
    return cleanTarget.includes(cleanC) || cleanC.includes(cleanTarget);
  });
}
