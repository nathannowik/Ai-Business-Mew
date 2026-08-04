import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // ---- Company profile (shared fields for every permit) ----
  const companyCount = await prisma.company.count();
  if (companyCount === 0) {
    await prisma.company.create({
      data: {
        name: 'Summit Home Solutions',
        legalName: 'Summit Home Solutions LLC',
        address: '4820 Commerce Pkwy, Suite 120',
        city: 'Grand Rapids',
        state: 'MI',
        zip: '49512',
        phone: '(616) 555-0142',
        email: 'permits@summithome.example',
        website: 'summithome.example',
        ein: '82-1934765',
        contactName: 'Nathan Nowik',
        contactTitle: 'Operations Manager',
        insuranceCarrier: 'Midwest Commercial Insurance',
        insurancePolicyNum: 'MCI-2291884',
        bondNumber: 'BND-55120',
        natureOfBusiness: 'Door-to-door sales of home improvement services',
      },
    });
  }

  // ---- Area groups ----
  const areaData = [
    { name: 'Area 1', description: 'West Michigan lakeshore', color: '#2563eb' },
    { name: 'Area 2', description: 'Grand Rapids metro', color: '#7c3aed' },
    { name: 'Area 3', description: 'Kent & Ottawa suburbs', color: '#0891b2' },
  ];
  const areas: Record<string, string> = {};
  for (const a of areaData) {
    const rec = await prisma.areaGroup.upsert({
      where: { name: a.name },
      update: { description: a.description, color: a.color },
      create: a,
    });
    areas[a.name] = rec.id;
  }

  // ---- Employees ----
  const employees = [
    { firstName: 'Marcus', lastName: 'Reid', area: 'Area 3', photo: 'complete', bg: 'complete', fp: 'complete', dl: 'R500-8821-3390', dlState: 'MI', dob: '1994-06-12' },
    { firstName: 'Ava', lastName: 'Delgado', area: 'Area 3', photo: 'complete', bg: 'complete', fp: 'pending', dl: 'D120-4590-1122', dlState: 'MI', dob: '1998-02-03' },
    { firstName: 'Tyler', lastName: 'Okafor', area: 'Area 3', photo: 'pending', bg: 'complete', fp: 'missing', dl: 'O884-1200-5567', dlState: 'MI', dob: '1991-11-20' },
    { firstName: 'Jenna', lastName: 'Whitmore', area: 'Area 2', photo: 'complete', bg: 'complete', fp: 'complete', dl: 'W220-9981-3345', dlState: 'MI', dob: '1996-08-30' },
    { firstName: 'Diego', lastName: 'Santos', area: 'Area 2', photo: 'complete', bg: 'pending', fp: 'missing', dl: 'S771-2233-9080', dlState: 'MI', dob: '2000-01-15' },
    { firstName: 'Priya', lastName: 'Nair', area: 'Area 1', photo: 'missing', bg: 'missing', fp: 'missing', dl: 'N345-6677-2201', dlState: 'MI', dob: '1999-04-09' },
  ];
  for (const e of employees) {
    const existing = await prisma.employee.findFirst({ where: { firstName: e.firstName, lastName: e.lastName } });
    if (existing) continue;
    await prisma.employee.create({
      data: {
        firstName: e.firstName,
        lastName: e.lastName,
        email: `${e.firstName.toLowerCase()}.${e.lastName.toLowerCase()}@summithome.example`,
        phone: '(616) 555-0' + Math.floor(100 + Math.random() * 899),
        address: `${100 + employees.indexOf(e) * 37} Maple Ave`,
        city: 'Grand Rapids',
        state: 'MI',
        zip: '49503',
        dob: new Date(e.dob),
        driverLicense: e.dl,
        driverLicenseState: e.dlState,
        vehicleMakeModel: 'Honda Civic',
        vehicleColor: 'Silver',
        vehiclePlate: 'MI-' + (1000 + employees.indexOf(e)),
        photoStatus: e.photo,
        backgroundCheckStatus: e.bg,
        backgroundCheckDate: e.bg === 'complete' ? new Date('2026-05-01') : null,
        fingerprintStatus: e.fp,
        fingerprintDate: e.fp === 'complete' ? new Date('2026-05-05') : null,
        areaGroupId: areas[e.area],
      },
    });
  }

  // ---- Townships (varied requirements) ----
  const townships = [
    {
      name: 'Cascade Township', state: 'MI', county: 'Kent', area: 'Area 3',
      clerkOfficeName: 'Cascade Township Clerk', clerkName: 'Susan Brandt',
      clerkEmail: 'clerk@cascadetwp.example', clerkPhone: '(616) 555-2100',
      officeAddress: '2865 Thornhills Ave SE', officeCity: 'Grand Rapids', officeZip: '49546',
      permitFee: 35, processingDays: 5, permitDurationDays: 180,
      reqFee: true, reqBackgroundCheck: true, reqPhoto2x2: true, reqDriverLicense: true,
      extraRequirements: JSON.stringify(['Completed township application form', 'List of streets to be canvassed']),
    },
    {
      name: 'Ada Township', state: 'MI', county: 'Kent', area: 'Area 3',
      clerkOfficeName: 'Ada Township Clerk', clerkName: 'Gregory Hall',
      clerkEmail: 'clerk@adatownship.example', clerkPhone: '(616) 555-3300',
      officeAddress: '7330 Thornapple River Dr SE', officeCity: 'Ada', officeZip: '49301',
      permitFee: 50, processingDays: 10, permitDurationDays: 90,
      reqFee: true, reqFingerprints: true, reqBackgroundCheck: true, reqPhoto2x2: true,
      reqInsurance: true, reqInPerson: true, reqDriverLicense: true,
      extraRequirements: JSON.stringify(['Fingerprinting at sheriff’s office', 'Notarized affidavit of good conduct']),
      status: 'active',
    },
    {
      name: 'Gaines Township', state: 'MI', county: 'Kent', area: 'Area 3',
      clerkOfficeName: 'Gaines Charter Township Clerk', clerkName: 'Michelle Ortiz',
      clerkEmail: 'clerk@gainestwp.example', clerkPhone: '(616) 555-4400',
      officeAddress: '8555 Kalamazoo Ave SE', officeCity: 'Caledonia', officeZip: '49316',
      permitFee: 25, processingDays: 3, permitDurationDays: 365,
      reqFee: true, reqBackgroundCheck: true, reqVehicleInfo: true,
      status: 'needs_info',
      notes: 'Waiting on confirmation of whether photos are required.',
    },
    {
      name: 'Georgetown Township', state: 'MI', county: 'Ottawa', area: 'Area 3',
      clerkOfficeName: 'Georgetown Township Clerk', clerkName: 'Daniel Pham',
      clerkEmail: 'clerk@georgetown-mi.example', clerkPhone: '(616) 555-5500',
      officeAddress: '1515 Baldwin St', officeCity: 'Jenison', officeZip: '49428',
      permitFee: 40, processingDays: 7, permitDurationDays: 180,
      reqFee: true, reqBackgroundCheck: true, reqPhoto2x2: true, reqBond: true, reqNotarized: true,
      extraRequirements: JSON.stringify(['$5,000 surety bond', 'Two local references']),
    },
    {
      name: 'Byron Township', state: 'MI', county: 'Kent', area: 'Area 2',
      clerkOfficeName: 'Byron Township Clerk', clerkName: 'Karen Willis',
      clerkEmail: 'clerk@byrontwp.example', clerkPhone: '(616) 555-6600',
      officeAddress: '8085 Byron Center Ave SW', officeCity: 'Byron Center', officeZip: '49315',
      permitFee: 30, processingDays: 5, permitDurationDays: 180,
      reqFee: true, reqBackgroundCheck: true, reqDriverLicense: true,
    },
  ];
  for (const t of townships) {
    const { area, ...rest } = t;
    const exists = await prisma.township.findFirst({ where: { name: t.name, state: t.state, county: t.county } });
    if (exists) continue;
    await prisma.township.create({ data: { ...rest, areaGroupId: areas[area] } });
  }

  // ---- New township requests ----
  const requestCount = await prisma.townshipRequest.count();
  if (requestCount === 0) {
    await prisma.townshipRequest.createMany({
      data: [
        { townshipName: 'Alpine Township', state: 'MI', county: 'Kent', requestedBy: 'Marcus Reid', priority: 'high', status: 'researching', areaGroupId: areas['Area 3'], notes: 'High-value neighborhood on the north end. Need permit before next month.' },
        { townshipName: 'Plainfield Township', state: 'MI', county: 'Kent', requestedBy: 'Ava Delgado', priority: 'normal', status: 'info_needed', areaGroupId: areas['Area 3'], knownRequirements: 'Background check; possibly fingerprints', notes: 'Clerk has not returned call about fingerprint requirement.' },
        { townshipName: 'Wyoming', state: 'MI', county: 'Kent', requestedBy: 'Jenna Whitmore', priority: 'normal', status: 'new', areaGroupId: areas['Area 2'] },
      ],
    });
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
