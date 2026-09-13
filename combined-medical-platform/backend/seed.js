import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding database...");

    const tenant = await prisma.tenant.create({
        data: {
            name: "City Hospital",
            domain: "127.0.0.1",
            activeModules: JSON.stringify(["scriber", "receptionist"])
        }
    });

    console.log("Created Tenant:", tenant);

    const passwordHash = await bcrypt.hash("password123", 10);

    const user = await prisma.clientUser.create({
        data: {
            tenantId: tenant.id,
            username: "city_admin",
            passwordHash: passwordHash
        }
    });

    console.log("Created Client User:", user);

    const phone = await prisma.tenantPhone.create({
        data: {
            tenantId: tenant.id,
            phoneNumber: "+1234567890"
        }
    });

    console.log("Created Tenant Phone:", phone);

    const patient = await prisma.patient.create({
        data: {
            tenantId: tenant.id,
            name: "John Doe",
            phone: "+9876543210"
        }
    });

    console.log("Created Patient:", patient);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
