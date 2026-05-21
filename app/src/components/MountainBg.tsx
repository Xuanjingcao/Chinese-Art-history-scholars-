export default function MountainBg() {
  return (
    <svg
      className="fixed bottom-0 left-0 right-0 pointer-events-none"
      style={{ height: '45vh', zIndex: 0, opacity: 0.12 }}
      viewBox="0 0 1440 400"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMax meet"
    >
      <defs>
        <linearGradient id="mtn1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8a9e8a" stopOpacity="1" />
          <stop offset="100%" stopColor="#8a9e8a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="mtn2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7a9aaa" stopOpacity="1" />
          <stop offset="100%" stopColor="#7a9aaa" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0,380 Q180,200 360,260 Q540,160 720,220 Q900,140 1080,200 Q1260,160 1440,220 L1440,400 L0,400Z"
        fill="url(#mtn2)"
        opacity="0.3"
      />
      <path
        d="M0,400 Q120,280 240,320 Q360,240 520,300 Q660,220 800,280 Q960,200 1100,270 Q1260,230 1440,290 L1440,400 L0,400Z"
        fill="url(#mtn1)"
        opacity="0.4"
      />
      <path
        d="M0,400 Q200,340 400,370 Q600,320 800,360 Q1000,330 1200,355 Q1360,340 1440,360 L1440,400 L0,400Z"
        fill="#8a9e8a"
        opacity="0.25"
      />
      <rect x="100" y="280" width="300" height="8" rx="4" fill="white" opacity="0.15" transform="rotate(-2,100,280)" />
      <rect x="600" y="250" width="250" height="6" rx="3" fill="white" opacity="0.12" transform="rotate(1,600,250)" />
      <rect x="1000" y="270" width="280" height="7" rx="3" fill="white" opacity="0.1" transform="rotate(-1,1000,270)" />
      <g fill="#5c7a5c" opacity="0.5">
        <polygon points="60,360 70,340 80,360" />
        <polygon points="68,355 78,330 88,355" />
        <rect x="72" y="355" width="3" height="10" />
        <polygon points="160,370 172,345 184,370" />
        <polygon points="169,364 181,335 193,364" />
        <rect x="174" y="364" width="3" height="10" />
        <polygon points="1300,365 1312,340 1324,365" />
        <polygon points="1309,358 1321,330 1333,358" />
        <rect x="1314" y="358" width="3" height="12" />
        <polygon points="1380,375 1390,355 1400,375" />
        <rect x="1388" y="370" width="2" height="8" />
      </g>
    </svg>
  );
}
