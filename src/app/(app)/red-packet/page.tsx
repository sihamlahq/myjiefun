import { PageHeader, SetupCard } from "@/components/page-chrome";
import { RedPacketPanel } from "@/components/red-packet-panel";
import { loadRedPacketData } from "@/lib/wedding-data";

export default async function RedPacketPage() {
  const data = await loadRedPacketData();

  return (
    <div>
      <PageHeader
        eyebrow="Gift ledger"
        title="Red Packet"
        description="Record red packet amounts for checked-in guests, with totals by table."
      />
      {data.setupError ? <SetupCard message={data.setupError} /> : null}
      <RedPacketPanel
        guests={data.guests}
        tables={data.tables}
        passcode={data.passcode}
      />
    </div>
  );
}
