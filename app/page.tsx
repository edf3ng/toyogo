import dynamic from "next/dynamic";
import Link from "next/link";
import { COPY } from "@/config/copy";

const VehicleViewer = dynamic(() => import("@/components/VehicleViewer"), { ssr: false });

export default function Home() {
  return (
    <section className="mx-auto max-w-3xl">
      <VehicleViewer paint="#1F4E79" frame="trip" />
      <p className="mt-2 text-sm text-muted">{COPY.stylisedVehicle}</p>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        Should this Toyota switch to a hybrid or an EV?
      </h1>
      <p className="mt-2 max-w-xl text-muted">
        ToyoGo compares a standard hybrid, a plug-in, and a battery EV. The numbers are computed
        first. A written explanation can only repeat them.
      </p>
      <Link
        href="/signup"
        className="mt-6 inline-flex h-11 items-center rounded-md bg-jade px-4 text-sm font-medium text-white hover:bg-jade-800"
      >
        Check this car
      </Link>
    </section>
  );
}
