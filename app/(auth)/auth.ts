import { auth as clerkAuth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { isTestEnvironment } from "@/lib/constants";
import {
  createUserFromClerk,
  getOrCreateUserByEmail,
  getUserByClerkId,
} from "@/lib/db/queries";

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
    const email = cookieStore.get("test-user")?.value;
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

    dbUser = await createUserFromClerk({
      clerkId: userId,
      email: email ?? "",
      emailVerified: clerkUser?.emailAddresses.some(
        (address) => address.verification?.status === "verified"
      ),
      image: clerkUser?.imageUrl ?? null,
      name: clerkUser?.fullName ?? null,
    });
  }

  return { user: dbUser };
}
