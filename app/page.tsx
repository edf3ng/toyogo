import { HomeCar } from "@/components/HomeCar";
import { Mountains } from "@/components/Mountains";
import { COPY } from "@/config/copy";

export default function Home() {
  return (
    <section className="relative h-dvh overflow-hidden">
      <Mountains />
      <div className="absolute inset-x-0 bottom-0 h-[70vh]">
        <HomeCar circling />
      </div>
      <p className="absolute inset-x-0 bottom-3 px-4 text-center text-xs text-paper">
        {COPY.stylisedVehicle} {COPY.footer}
      </p>
    </section>
  );
}
