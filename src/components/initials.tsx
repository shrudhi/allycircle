export function Initials({ name, photoPath, size = "md" }: { name: string; photoPath?: string | null; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const dim = size === "lg" ? "size-14 text-lg" : size === "sm" ? "size-8 text-xs" : "size-11 text-sm";
  if (photoPath) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photoPath} alt="" className={`${dim} rounded-full object-cover border border-[#2d2d2d]`} />
    );
  }
  return (
    <span className={`${dim} flex shrink-0 items-center justify-center rounded-full border border-[#2d2d2d] bg-[#161616] font-medium text-[#d4af37]`}>
      {initials || "A"}
    </span>
  );
}
