import { NextResponse } from 'next/server';

// Optional: GET /api/shoes
export async function GET() {
  return NextResponse.json(
    { message: 'Fetched shoes successfully', data: [] },
    { status: 200 }
  );
}

// POST /api/shoes
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Basic request body validation
    const { name, brand, price } = body;
    if (!name || !price) {
      return NextResponse.json(
        { error: 'Missing required fields: "name" and "price" are required.' },
        { status: 400 }
      );
    }

    // Replace this object with your actual database call (e.g., Prisma, Firestore, MongoDB)
    const newShoe = {
      id: Date.now().toString(),
      name,
      brand: brand || 'Generic',
      price,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(
      { message: 'Shoe added successfully', data: newShoe },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid JSON request payload or internal server error.' },
      { status: 500 }
    );
  }
}