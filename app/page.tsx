import { ParticleCanvas } from "@/components/ParticleCanvas";
import { BrandOverlay } from "@/components/BrandOverlay";
import { ForegroundCanvas } from "@/components/ForegroundCanvas";

export default function Home() {
  return (
    <main className="h-dvh w-dvw overflow-hidden">
      <ParticleCanvas />
      <BrandOverlay />
      <ForegroundCanvas />
    </main>
  );
}
