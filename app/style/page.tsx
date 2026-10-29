import { StyleStudio } from "@/components/style-studio";

export const dynamic = "force-dynamic";

export default function StylePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <StyleStudio />
    </div>
  );
}
