import { NextResponse } from "next/server";
import { createBusiness } from "@/src/lib/business/create-business";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const business = await createBusiness({
      userId: Number(body.userId),
      name: body.name,
      website: body.website,
      description: body.description,
      location: body.location,
      industry: body.industry,
    });

    return NextResponse.json(business, { status: 201 });
  } catch (error) {
    console.error("Failed to create business:", error);

    return NextResponse.json(
      {
        error: "Failed to create business",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}