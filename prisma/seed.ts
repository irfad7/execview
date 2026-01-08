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
        where: { id: user.id },
        update: {},
        create: {
            id: user.id,
            name: 'Demo Admin',
            firmName: 'Demo Law Firm',
            email: 'admin@lawfirm.com'
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