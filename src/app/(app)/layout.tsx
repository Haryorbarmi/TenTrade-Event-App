import { Sidebar } from "@/components/sidebar";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const profile = await requireUser();

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      <Sidebar profile={profile} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
