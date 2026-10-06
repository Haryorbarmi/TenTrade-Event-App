import { DisplayScreen } from "./display-screen";

export const metadata = { title: "Display · TenTrade Lagos Seminar 2026" };

// /display: the projector screen. It holds no attendee data of its own; it only
// shows what the Super Admin's Raffle page sends it (connected in the next step).
// /display?practice=1 runs a rehearsal loop with fake IDs.
export default async function DisplayPage({ searchParams }: PageProps<"/display">) {
  const { practice, step } = await searchParams;
  const freeze = typeof step === "string" && /^[0-3]$/.test(step) ? Number(step) : null;
  return <DisplayScreen practice={practice === "1"} freezeStep={freeze} />;
}
