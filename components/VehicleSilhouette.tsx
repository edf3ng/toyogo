export function VehicleSilhouette({ className = "h-96" }: { className?: string }) {
  return (
    <div className={`flex items-end justify-center border border-line bg-[#f3f0ea] pb-8 ${className}`}>
      <svg viewBox="0 0 220 72" className="w-56" aria-hidden>
        <path fill="#2e3440" d="M18 50h20l16-20h78l24 16h46v14H18z" />
        <circle cx="62" cy="54" r="8" fill="#f3f0ea" stroke="#2e3440" strokeWidth="3" />
        <circle cx="164" cy="54" r="8" fill="#f3f0ea" stroke="#2e3440" strokeWidth="3" />
      </svg>
    </div>
  );
}
