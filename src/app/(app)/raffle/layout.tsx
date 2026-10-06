import { DisplayLinkProvider } from "./use-display-link";

// Keeps the projector link alive while the Super Admin switches between draws.
export default function RaffleLayout({ children }: LayoutProps<"/raffle">) {
  return <DisplayLinkProvider>{children}</DisplayLinkProvider>;
}
