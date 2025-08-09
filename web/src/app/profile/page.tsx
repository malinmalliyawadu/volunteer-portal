import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Your profile</h1>
      {session?.user ? (
        <div className="space-y-1 text-sm">
          <div>
            <span className="text-muted-foreground">Name:</span>{" "}
            {session.user.name ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Email:</span>{" "}
            {session.user.email ?? "—"}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Please sign in to view your profile.
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        Profile editing UI coming soon.
      </p>
    </div>
  );
}
