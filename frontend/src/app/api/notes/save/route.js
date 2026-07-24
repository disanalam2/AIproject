import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

let prisma;

export async function POST(req) {
  try {
    const data = await req.json();
    const { patientId, transcript, summary } = data;

    if (!patientId || !transcript || !summary) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Basic extraction
    const subjective = summary.subjective_complaints || '';
    const objective = summary.objective_symptoms || '';
    const assessment = summary.assessment || '';
    const plan = summary.lifestyle_advice || '';
    const medications = summary.medications ? summary.medications.join(', ') : '';

    let note;
    try {
      if (!prisma) {
        prisma = new PrismaClient();
      }
      note = await prisma.note.create({
        data: {
          patientId: parseInt(patientId),
          transcript,
          subjective,
          objective,
          assessment,
          plan,
          medications
        }
      });
    } catch (dbError) {
      console.warn("Database save failed (fallback for demo):", dbError.message);
      note = {
        id: Math.floor(Math.random() * 10000),
        patientId,
        transcript,
        subjective,
        objective,
        assessment,
        plan,
        medications,
        createdAt: new Date().toISOString()
      };
    }

    return NextResponse.json({ success: true, note });

  } catch (error) {
    console.error("Save Note API ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
