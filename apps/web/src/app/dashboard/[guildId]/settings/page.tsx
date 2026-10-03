import { prisma } from "@discord-hub/database";
import { getGuildChannels, getGuildRoles } from "@/lib/discord";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { updateGuildSettingsAction } from "@/app/actions/settingsActions";
import { Settings, Save, CheckCircle } from "lucide-react";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ guildId: string }> | { guildId: string };
}) {
  const resolvedParams = await params;
  const guildId = resolvedParams.guildId;

  const [config, channels, roles] = await Promise.all([
    prisma.guildConfig.findUnique({
      where: { id: guildId },
    }),
    getGuildChannels(guildId),
    getGuildRoles(guildId),
  ]);

  // Types: 0: GuildText, 4: GuildCategory, 5: GuildAnnouncement
  const textChannels = channels.filter((c) => c.type === 0 || c.type === 5);
  const categoryChannels = channels.filter((c) => c.type === 4);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Server Settings</h1>
        <p className="text-sm text-gray-400 mt-1">
          Configure automated report channels, support ticket categories, and staff role permissions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Configuration</CardTitle>
          <CardDescription>
            These settings govern the automated 24h report worker and dynamic ticket provisioning.
          </CardDescription>
        </CardHeader>

        <form
          action={async (formData: FormData) => {
            "use server";
            await updateGuildSettingsAction(guildId, formData);
          }}
          className="space-y-6"
        >
          {/* Report Channel */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase mb-2">
              📊 24-Hour Analytics Report Channel
            </label>
            <select
              name="reportChannelId"
              defaultValue={config?.reportChannelId || ""}
              className="w-full bg-[#1e2128] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#5865F2]"
            >
              <option value="">-- No Channel Selected (Reports Disabled) --</option>
              {textChannels.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1.5">
              The rich summary embed will be dispatched here daily at midnight UTC by the BullMQ worker.
            </p>
          </div>

          {/* Ticket Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase mb-2">
              📁 Support Ticket Category
            </label>
            <select
              name="ticketCategoryId"
              defaultValue={config?.ticketCategoryId || ""}
              className="w-full bg-[#1e2128] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#5865F2]"
            >
              <option value="">-- Root Level (No Parent Category) --</option>
              {categoryChannels.map((c) => (
                <option key={c.id} value={c.id}>
                  📂 {c.name.toUpperCase()}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1.5">
              New private ticket channels (e.g. #ticket-0001) will be generated inside this category.
            </p>
          </div>

          {/* Ticket Transcript Audit Channel */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase mb-2">
              📑 Closed Ticket Transcript Channel
            </label>
            <select
              name="ticketTranscriptId"
              defaultValue={config?.ticketTranscriptId || ""}
              className="w-full bg-[#1e2128] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#5865F2]"
            >
              <option value="">-- None (Only DM to Creator) --</option>
              {textChannels.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1.5">
              Full HTML transcripts generated with discord-html-transcripts will be sent here upon ticket closure.
            </p>
          </div>

          {/* Support Staff Role */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase mb-2">
              🛡️ Support Staff Role
            </label>
            <select
              name="supportRoleId"
              defaultValue={config?.supportRoleId || ""}
              className="w-full bg-[#1e2128] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#5865F2]"
            >
              <option value="">-- None (Only Admins) --</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  @{r.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1.5">
              Members holding this role receive automatic channel access and permission overrides when tickets open.
            </p>
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-end">
            <Button variant="primary" type="submit" className="gap-2">
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
