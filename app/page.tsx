import { ParticleCanvas } from "@/components/ParticleCanvas";
import { BrandOverlay } from "@/components/BrandOverlay";

export default function Home() {
  return (
    <main className="h-dvh w-dvw overflow-hidden">
      <ParticleCanvas />
      <BrandOverlay />
    </main>
  );
}
