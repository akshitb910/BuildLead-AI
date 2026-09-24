import { db } from "@/src/prisma/db";

type CreateBusinessInput = {
  userId: number;
  name: string;
  website?: string;
  description?: string;
  location: string;
  industry: string;
};

export async function createBusiness(input: CreateBusinessInput) {
  const business = await db.orm.public.Business.create({
    userId: input.userId,
    name: input.name,
    website: input.website,
    description: input.description,
    location: input.location,
    industry: input.industry,
  });

  return business;
}