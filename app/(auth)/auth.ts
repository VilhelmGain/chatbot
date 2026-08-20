import { auth as clerkAuth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { isDemoMode, isTestEnvironment } from "@/lib/constants";
import {
  createUserFromClerk,
  getOrCreateUserByEmail,
  getUserByClerkId,
} from "@/lib/db/queries";

const emailSchema = z.string().email();

export type User = {
  id: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  name: string | null;
};

export type Session = {
  user: User;
};

export async function auth(): Promise<Session | null> {
  if (isTestEnvironment) {
    const cookieStore = await cookies();
    const cookieEmail = cookieStore.get("test-user")?.value;

    let email: string | undefined;
    if (cookieEmail !== undefined) {
      const parsed = emailSchema.safeParse(cookieEmail);
      if (!parsed.success) {
        return null;
      }
      email = parsed.data;
    } else if (isDemoMode) {
      email = "demo@example.com";
    }

    if (!email) {
      return null;
    }

    const dbUser = await getOrCreateUserByEmail(email);
    return { user: dbUser };
  }

  const { userId } = await clerkAuth();
  if (!userId) {
    return null;
  }

  let dbUser = await getUserByClerkId(userId);
  if (!dbUser) {
    const clerkUser = await currentUser();
    const primaryEmail = clerkUser?.emailAddresses.find(
      (address) => address.id === clerkUser.primaryEmailAddressId
    )?.emailAddress;
    const email = primaryEmail ?? clerkUser?.emailAddresses[0]?.emailAddress;

    if (!email || !emailSchema.safeParse(email).success) {
      return null;
    }

    dbUser = await createUserFromClerk({
      clerkId: userId,
      email,
      emailVerified: clerkUser?.emailAddresses.some(
        (address) => address.verification?.status === "verified"
      ),
      image: clerkUser?.imageUrl ?? null,
      name: clerkUser?.fullName ?? null,
    });
  }

  return { user: dbUser };
}
