
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getUserByEmail } from "@/src/lib/auth/sync-user";
import { createBusiness } from "@/src/lib/business/create-business";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await getUserByEmail(session.user.email);

    if (!user) {
      return NextResponse.json(
        { error: "User account not found" },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (
      typeof body.name !== "string" ||
      !body.name.trim() ||
      typeof body.location !== "string" ||
      !body.location.trim() ||
      typeof body.industry !== "string" ||
      !body.industry.trim()
    ) {
      return NextResponse.json(
        { error: "Name, location and industry are required" },
        { status: 400 }
      );
    }

    const business = await createBusiness({
      userId: user.id,
      name: body.name.trim(),
      website: body.website,
      description: body.description,
      location: body.location.trim(),
      industry: body.industry.trim(),
    });

    return NextResponse.json(business, { status: 201 });
  } catch (error) {
    console.error("Failed to create business:", error);

    return NextResponse.json(
      { error: "Failed to create business" },
      { status: 500 }
    );
  }
}