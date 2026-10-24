function range(points: [number, number][]): string {
  const d = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x} ${y}`).join(" ");
  return `${d} L1200 900 L0 900 Z`;
}

function Tile({ shift }: { shift: number }) {
  return (
    <g transform={`translate(${shift} 0)`}>
      <path
        d={range([
          [0, 640],
          [90, 520],
          [170, 590],
          [260, 400],
          [360, 560],
          [470, 310],
          [580, 500],
          [700, 250],
          [820, 470],
          [930, 340],
          [1040, 520],
          [1140, 430],
          [1200, 640],
        ])}
        fill="#c5ddd8"
      />
      <path
        d={range([
          [0, 700],
          [120, 560],
          [230, 640],
          [340, 460],
          [480, 600],
          [600, 390],
          [740, 560],
          [860, 300],
          [980, 520],
          [1100, 440],
          [1200, 700],
        ])}
        fill="#3d8a84"
      />
      <path d="M452 338 L470 310 L492 346 Z M672 286 L700 250 L732 294 Z M832 338 L860 300 L892 346 Z" fill="#f7f4ee" />
      <path
        d={range([
          [0, 790],
          [160, 690],
          [320, 750],
          [500, 660],
          [680, 740],
          [860, 680],
          [1040, 750],
          [1200, 790],
        ])}
        fill="#0e7c7b"
      />
      <path d="M0 760 L1200 760 L1200 900 L0 900 Z" fill="#2e3440" />
      <path d="M0 828 L1200 828" stroke="#e8913a" strokeWidth="4" strokeDasharray="28 22" />
    </g>
  );
}

export function Mountains({
  moving = false,
  showSign = false,
  crop = "road",
  drift = false,
}: {
  moving?: boolean;
  showSign?: boolean;
  crop?: "road" | "peaks";
  drift?: boolean;
}) {
  const scrolling = drift || moving;
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#d7ebe6]" aria-hidden={showSign ? undefined : true}>
      <div
        className={
          scrolling
            ? `ridge-drift absolute inset-y-0 left-0 w-[200%]${moving ? "" : " ridge-paused"}`
            : "absolute inset-0"
        }
      >
        <svg
          viewBox={scrolling ? "0 0 2400 900" : "0 0 1200 900"}
          preserveAspectRatio={crop === "peaks" ? "xMidYMid slice" : "xMidYMax slice"}
          className="h-full w-full"
        >
          <Tile shift={0} />
          {scrolling ? <Tile shift={1200} /> : null}
        </svg>
      </div>
      {showSign ? (
        <div className="absolute top-[18%] left-1/2 -translate-x-1/2">
          <div className="mx-auto h-16 w-2 bg-road" />
          <div className="-mt-1 border-4 border-road bg-paper px-4 py-3 text-center">
            <p className="text-lg font-semibold tracking-tight text-ink">Recommendations</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
