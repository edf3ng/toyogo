import { HomeCar } from "@/components/HomeCar";
import { COPY } from "@/config/copy";

export default function Home() {
  return (
    <section className="relative h-dvh overflow-hidden bg-white">
      <HomeCar />
      <p className="pointer-events-none absolute inset-x-0 bottom-3 px-4 text-center text-xs text-muted">
        {COPY.stylisedVehicle} {COPY.footer}
      </p>
    </section>
  );
}
