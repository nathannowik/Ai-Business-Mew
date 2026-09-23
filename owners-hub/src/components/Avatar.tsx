const COLORS = ["bg-indigo-600", "bg-emerald-600", "bg-amber-600", "bg-rose-600", "bg-sky-600", "bg-violet-600"];

function colorFor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function Avatar({ user, size = "sm" }: { user: { id: string; name: string }; size?: "sm" | "md" }) {
  const dim = size === "md" ? "h-9 w-9 text-sm" : "h-6 w-6 text-[11px]";
  return (
    <span
      title={user.name}
      className={`${dim} ${colorFor(user.id)} inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white`}
    >
      {user.name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
