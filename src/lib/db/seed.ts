import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { professionalFields } from "@/lib/config/fields";
import { topicsForField } from "@/lib/config/topics";
import {
  availabilityWindows,
  profiles,
  user,
  userTopics,
} from "@/lib/db/schema";
import type { getDb } from "@/lib/db";

type Db = Awaited<ReturnType<typeof getDb>>;

export const TEST_PASSWORD = "Practice123!";

export const testPeople = [
  { email: "avery.chen@test.allycircle.local", name: "Avery Chen (Test)", fieldId: "product-management", title: "Senior Product Manager", company: "Northwind", years: 7, topics: ["Product strategy", "Product sense"] },
  { email: "jordan.patel@test.allycircle.local", name: "Jordan Patel (Test)", fieldId: "product-management", title: "Product Manager", company: "Brightline", years: 5, topics: ["Execution / delivery"] },
  { email: "sam.okonkwo@test.allycircle.local", name: "Sam Okonkwo (Test)", fieldId: "product-management", title: "Principal PM", company: "Harbor", years: 10, topics: ["Product strategy", "Behavioral"] },
  { email: "riley.nguyen@test.allycircle.local", name: "Riley Nguyen (Test)", fieldId: "product-management", title: "PM", company: "Lumen", years: 3, topics: [] },
  { email: "casey.brooks@test.allycircle.local", name: "Casey Brooks (Test)", fieldId: "product-management", title: "Group PM", company: "Atlas", years: 8, topics: ["Metrics & experimentation"] },
  { email: "morgan.das@test.allycircle.local", name: "Morgan Das (Test)", fieldId: "product-management", title: "Product Lead", company: "Keel", years: 6, topics: ["Product sense"] },
  { email: "quinn.adeyemi@test.allycircle.local", name: "Quinn Adeyemi (Test)", fieldId: "product-management", title: "Senior PM", company: "Fieldnote", years: 7, topics: [] },
  { email: "harper.stein@test.allycircle.local", name: "Harper Stein (Test)", fieldId: "product-management", title: "PM, Platform", company: "Nimbus", years: 4, topics: ["Execution / delivery"] },
  { email: "drew.kline@test.allycircle.local", name: "Drew Kline (Test)", fieldId: "product-management", title: "Staff PM", company: "Sable", years: 9, topics: ["Product strategy"] },
  { email: "jamie.ortiz@test.allycircle.local", name: "Jamie Ortiz (Test)", fieldId: "product-management", title: "Associate PM", company: "Cove", years: 2, topics: ["Behavioral"] },
  { email: "noah.berg@test.allycircle.local", name: "Noah Berg (Test)", fieldId: "product-management", title: "PM", years: 5, topics: ["Product sense", "Behavioral"] },
  { email: "sasha.iyer@test.allycircle.local", name: "Sasha Iyer (Test)", fieldId: "product-management", title: "Senior PM", company: "Vesper", years: 6, topics: ["Product strategy"] },
  { email: "leo.park@test.allycircle.local", name: "Leo Park (Test)", fieldId: "software-engineering", title: "Staff Engineer", company: "Northwind", years: 9, topics: ["System design", "Coding"] },
  { email: "mina.rossi@test.allycircle.local", name: "Mina Rossi (Test)", fieldId: "design-ux", title: "Product Designer", company: "Brightline", years: 6, topics: ["Portfolio walkthrough"] },
];

export async function seedDevelopmentData(db: Db) {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_TEST_SEED !== "true") {
    return;
  }
  const existing = await db.select().from(user).where(eq(user.email, testPeople[0].email)).limit(1);
  const { getAuth } = await import("@/lib/auth");
  const auth = await getAuth();
  const now = new Date();

  for (const [index, person] of testPeople.entries()) {
    let [account] = await db.select().from(user).where(eq(user.email, person.email)).limit(1);
    if (!account) {
      const created = await auth.api.signUpEmail({
        body: {
          email: person.email,
          password: TEST_PASSWORD,
          name: person.name,
        },
      });
      const userId = created.user.id;
      await db.update(user).set({ emailVerified: true, updatedAt: now }).where(eq(user.id, userId));
      account = { ...(created.user as { id: string; name: string; email: string; emailVerified: boolean; image?: string | null }), createdAt: now, updatedAt: now, deletedAt: null };
    }
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, account.id)).limit(1);
    if (profile) continue;
    await db.insert(profiles).values({
      userId: account.id,
      fullName: person.name,
      stage: "working_professional",
      fieldId: person.fieldId,
      currentTitle: person.title,
      experienceYears: person.years,
      currentCompany: person.company,
      timezone: "America/New_York",
      bio: "Happy to run a focused mock interview and swap notes afterward.",
      openToBeInterviewed: true,
      openToInterviewOthers: true,
      onboardingComplete: true,
      lastMeaningfulAt: new Date(now.getTime() - index * 6 * 60 * 60 * 1000),
      isTestUser: true,
      createdAt: now,
      updatedAt: now,
    });
    for (const label of person.topics) {
      const topic = topicsForField(person.fieldId).find((item) => item.label === label);
      await db.insert(userTopics).values({
        id: nanoid(),
        userId: account.id,
        topicId: topic?.id,
        label,
      });
    }
    await db.insert(availabilityWindows).values({
      id: nanoid(),
      userId: account.id,
      weekday: 2,
      startMinutes: 18 * 60,
      endMinutes: 21 * 60,
    });
    await db.insert(availabilityWindows).values({
      id: nanoid(),
      userId: account.id,
      weekday: 4,
      startMinutes: 12 * 60,
      endMinutes: 14 * 60,
    });
  }

  if (!existing.length) {
    console.info(`[seed] Loaded labelled test allies. Password for all: ${TEST_PASSWORD}`);
    console.info(
      `[seed] Professional fields available: ${professionalFields.map((field) => field.label).join(", ")}`
    );
  }
}
