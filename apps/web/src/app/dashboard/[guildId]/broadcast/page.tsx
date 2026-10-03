import { getGuildChannels } from "@/lib/discord";
import { BroadcastForm } from "@/components/BroadcastForm";

export default async function BroadcastPage({
  params,
}: {
  params: Promise<{ guildId: string }> | { guildId: string };
}) {
  const resolvedParams = await params;
  const guildId = resolvedParams.guildId;

  const channels = await getGuildChannels(guildId);
  // Filter text & announcement channels
  const textChannels = channels.filter((c) => c.type === 0 || c.type === 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Send Message & Announcement</h1>
        <p className="text-sm text-gray-400 mt-1">
          Compose and dispatch immediate announcements or rich formatted embeds to any channel
        </p>
      </div>

      <BroadcastForm guildId={guildId} channels={textChannels} />
    </div>
  );
}
