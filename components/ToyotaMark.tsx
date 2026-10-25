/** The Toyota lockup supplied for the inventory link. */
export function ToyotaMark({ className = "h-10 w-[4.5rem]" }: { className?: string }) {
  return (
    <img src="/toyota-mark.png?v=2" alt="" width={1024} height={560} className={className} />
  );
}
