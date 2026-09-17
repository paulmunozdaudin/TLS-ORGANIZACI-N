import { colorForName, initialsForName } from "@/lib/user";

export default function Avatar({
  name,
  size = 28,
  ring = false,
}: {
  name: string;
  size?: number;
  ring?: boolean;
}) {
  return (
    <div
      title={name}
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${
        ring ? "ring-2 ring-white" : ""
      }`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        backgroundColor: colorForName(name),
      }}
    >
      {initialsForName(name)}
    </div>
  );
}
