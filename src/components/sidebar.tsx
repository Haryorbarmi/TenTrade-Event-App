import { signOut } from "@/app/login/actions";
import { Logo } from "@/components/logo";
import { SidebarNav } from "@/components/sidebar-nav";
import { ROLE_LABELS, type Profile } from "@/lib/roles";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

// Figma: sidebar (3943:1345). The design's avatar photo is sample data, so the
// user block shows initials, the user's name and role instead.
export function Sidebar({ profile }: { profile: Profile }) {
  const logout = (
    <form action={signOut}>
      <button
        type="submit"
        className="flex w-full items-center p-[10px] text-[14px] font-light leading-none text-[rgba(253,253,253,0.75)] hover:text-white"
      >
        Logout
      </button>
    </form>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="sticky top-0 hidden h-screen w-[200px] shrink-0 justify-center overflow-y-auto bg-ink p-[10px] md:flex">
        <div className="flex w-[157px] flex-col items-start gap-[58px] py-[30px]">
          <Logo size="sm" />
          <div className="flex w-full flex-col items-start gap-[75px]">
            <p className="font-heading text-[30px] leading-none text-white">
              LAGOS
              <br />
              SEMINAR
              <br />
              2026
            </p>
            <div className="flex w-full flex-col items-start gap-[178px]">
              <div className="flex w-full flex-col items-start gap-[15px]">
                <p className="w-full border-b border-line p-[10px] text-[14px] font-semibold leading-none text-white">Features</p>
                <SidebarNav layout="column" />
              </div>
              <div className="flex w-full flex-col items-start gap-[15px]">
                <div className="flex w-full flex-col items-start gap-px">
                  <div
                    className="bg-accent-gradient flex size-[44px] items-center justify-center rounded-full text-[15px] font-semibold text-white"
                    aria-hidden
                  >
                    {initials(profile.name)}
                  </div>
                  <div className="w-full border-b border-line p-[10px]">
                    <p className="truncate text-[14px] font-semibold leading-none text-white" title={profile.name}>
                      {profile.name}
                    </p>
                    <p className="mt-[6px] text-[12px] font-light leading-none text-[rgba(253,253,253,0.75)]">
                      {ROLE_LABELS[profile.role]}
                    </p>
                  </div>
                </div>
                {logout}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile */}
      <header className="sticky top-0 z-10 flex flex-col gap-2 bg-ink px-4 py-3 md:hidden">
        <div className="flex items-center justify-between gap-3">
          <Logo size="sm" />
          <div className="flex min-w-0 items-center gap-1">
            <p className="truncate text-[12px] font-light text-[rgba(253,253,253,0.75)]">
              {profile.name} · {ROLE_LABELS[profile.role]}
            </p>
            {logout}
          </div>
        </div>
        <SidebarNav layout="row" />
      </header>
    </>
  );
}
