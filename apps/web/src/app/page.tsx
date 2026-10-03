import { redirect } from "next/navigation";
import { getBotAllGuilds } from "@/lib/discord";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const guilds = await getBotAllGuilds();

  if (guilds.length > 0) {
    // Redirect directly to the primary server's broadcast & control center
    redirect(`/dashboard/${guilds[0].id}/broadcast`);
  }

  // If bot is not in any server yet, show the server connection panel
  redirect("/dashboard");
}
