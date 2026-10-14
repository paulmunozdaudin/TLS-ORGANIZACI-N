import Link from "next/link";
import { BRAND } from "@/config/site";

export default function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`text-[1.125rem] font-semibold tracking-[-0.02em] ${className}`}>
      {BRAND}
    </Link>
  );
}
