import { redirect } from "next/navigation";
import { getBotAllGuilds } from "@/lib/discord";

export const dynamic = "force-dynamic";

export default async function TicketsRedirectPage() {
  const guilds = await getBotAllGuilds();
  if (guilds.length > 0) {
    redirect(`/dashboard/${guilds[0].id}/tickets`);
  }
  redirect("/dashboard");
}
