import { StyleStudio } from "@/components/style-studio";
import { isDemoMode } from "@/lib/youcam/config";

export default function StylePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <StyleStudio demoMode={isDemoMode()} />
    </div>
  );
}
