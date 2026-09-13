import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get all doctors with their schedules and department
router.get('/', async (req, res) => {
    try {
        const doctors = await prisma.doctor.findMany({
            include: {
                department: true,
                schedules: true
            }
        });
        res.json(doctors);
    } catch (error) {
        console.error("Error fetching doctors:", error);
        res.status(500).json({ error: "Failed to fetch doctors" });
    }
});

// Add a new doctor
router.post('/', async (req, res) => {
    try {
        const { tenantId, departmentName, name, email, googleCalendarId, schedules } = req.body;
        
        if (!tenantId || !name || !departmentName) {
            return res.status(400).json({ error: "tenantId, name, and departmentName are required" });
        }

        // Find or create department
        let department = await prisma.department.findFirst({
            where: { name: departmentName, tenantId: parseInt(tenantId) }
        });

        if (!department) {
            department = await prisma.department.create({
                data: { name: departmentName, tenantId: parseInt(tenantId) }
            });
        }

        // Create the doctor with schedules
        const doctor = await prisma.doctor.create({
            data: {
                tenantId: parseInt(tenantId),
                departmentId: department.id,
                name,
                email,
                googleCalendarId,
                schedules: {
                    create: schedules || []
                }
            },
            include: {
                department: true,
                schedules: true
            }
        });

        res.status(201).json(doctor);
    } catch (error) {
        console.error("Error creating doctor:", error);
        res.status(500).json({ error: "Failed to create doctor" });
    }
});

export default router;
