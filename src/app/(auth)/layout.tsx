import { BrandMark } from "@/components/shared/brand-mark";

/** Centered, chrome-free layout for authentication pages. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex h-14 items-center px-6">
        <BrandMark />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-14">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
