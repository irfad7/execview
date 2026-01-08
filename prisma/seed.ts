import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // Create demo user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const user = await prisma.user.upsert({
        where: { email: 'admin@lawfirm.com' },
        update: {},
        create: {
            email: 'admin@lawfirm.com',
            password: hashedPassword
        }
    });

    console.log('Created user:', user.email);

    // Create default profile
    await prisma.profile.upsert({
        where: { userId: user.id },
        update: {},
        create: {
            userId: user.id,
            name: 'Demo Admin',
            firmName: 'Demo Law Firm',
            email: 'admin@lawfirm.com',
            practiceAreas: JSON.stringify([
                'Criminal Defense',
                'DUI/DWI',
                'Traffic',
                'Family Law'
            ]),
            timezone: 'America/New_York',
            businessHours: JSON.stringify({
                monday: { start: '09:00', end: '17:00' },
                tuesday: { start: '09:00', end: '17:00' },
                wednesday: { start: '09:00', end: '17:00' },
                thursday: { start: '09:00', end: '17:00' },
                friday: { start: '09:00', end: '17:00' },
                saturday: { start: '09:00', end: '13:00' },
                sunday: { start: 'closed', end: 'closed' }
            })
        }
    });

    console.log('Created profile for user');

    // Create default API configs
    const services = ['clio', 'execview', 'quickbooks'];
    
    for (const service of services) {
        await prisma.apiConfig.upsert({
            where: { 
                service_userId: { 
                    service, 
                    userId: user.id 
                } 
            },
            update: {},
            create: {
                service,
                userId: user.id
            }
        });
        console.log(`Created API config for ${service}`);
    }

    console.log('✅ Database seeded successfully!');
    console.log('Demo credentials:');
    console.log('Email: admin@lawfirm.com');
    console.log('Password: admin123');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });