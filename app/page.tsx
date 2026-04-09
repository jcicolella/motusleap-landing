import { ParticleCanvas } from "@/components/ParticleCanvas";
import { BrandOverlay } from "@/components/BrandOverlay";

export default function Home() {
  return (
    <main className="h-dvh w-dvw overflow-hidden bg-ml-void">
      <ParticleCanvas />
      <BrandOverlay />
    </main>
  );
}
