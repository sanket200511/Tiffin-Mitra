import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

interface HeroIntroProps {
  onComplete: () => void;
}

export function HeroIntro({ onComplete }: HeroIntroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem("dabba-intro-seen")) {
      setVisible(false);
      onComplete();
      return;
    }

    const ctx = gsap.context(() => {
      gsap.set(".scene-reveal", { clipPath: "circle(0% at 50% 50%)" });
      gsap.set(".steam-waft", { opacity: 0, y: 0 });
      gsap.set(".scene-element", { opacity: 0 });
      gsap.set(".family-person", { opacity: 0, y: 24 });
      gsap.set(".scene-dabba-item", { opacity: 0, scale: 0, transformOrigin: "center center" });
      gsap.set(".sun-circle", { scale: 0, transformOrigin: "130px 95px" });
      gsap.set(".sun-ray", { opacity: 0, scale: 0 });
      gsap.set(".butterfly-g", { opacity: 0 });
      gsap.set(".scene-bird", { opacity: 0 });
      gsap.set(".scene-tree-g", { scale: 0, transformOrigin: "340px 408px" });
      gsap.set(".scene-mat-g", { scaleX: 0, transformOrigin: "center center" });
      gsap.set(".intro-tagline", { opacity: 0, y: 10 });
      gsap.set(".house-g", { opacity: 0, y: 25 });
      gsap.set(".scene-hills-g", { opacity: 0 });

      const tl = gsap.timeline({
        onComplete: () => {
          sessionStorage.setItem("dabba-intro-seen", "1");
          setVisible(false);
          onComplete();
        },
      });

      tl
        // Tiffin bounces in
        .from(".dabba-body-g", { scale: 0, duration: 0.7, ease: "back.out(1.8)", transformOrigin: "250px 285px" })
        .from(".dabba-lid-g", { y: -20, opacity: 0, duration: 0.4, ease: "power2.out" }, "-=0.15")
        .from(".boy-g", { x: -60, opacity: 0, duration: 0.55, ease: "power2.out" }, "-=0.25")

        // Boy's arm reaches for lid
        .to(".boy-arm-g", { rotation: 18, duration: 0.45, ease: "power2.inOut", transformOrigin: "164px 255px" }, "+=0.35")

        // Lid pops open
        .to(".dabba-lid-g", { y: -72, rotation: -38, duration: 0.72, ease: "back.out(1.3)", transformOrigin: "250px 265px" }, "+=0.12")

        // Steam rises
        .to(".steam-1", { opacity: 1, y: -28, duration: 0.65, ease: "power1.out" }, "-=0.25")
        .to(".steam-2", { opacity: 1, y: -22, duration: 0.55, ease: "power1.out" }, "-=0.45")
        .to(".steam-3", { opacity: 1, y: -32, duration: 0.7, ease: "power1.out" }, "-=0.4")

        // Tiffin pulses with excitement
        .to(".dabba-body-g", { scale: 1.08, duration: 0.28, ease: "power2.inOut", transformOrigin: "250px 285px" }, "+=0.18")
        .to(".dabba-body-g", { scale: 1, duration: 0.22, ease: "power2.inOut", transformOrigin: "250px 285px" })

        // SCENE EXPLOSION — tiffin interior expands to fill screen
        .to(".scene-reveal", { clipPath: "circle(150% at 50% 50%)", duration: 1.15, ease: "power3.inOut" }, "+=0.05")
        .to(".dabba-intro-layer", { opacity: 0, duration: 0.35 }, "-=0.55")

        // Scene layers draw in
        .to(".scene-hills-g", { opacity: 1, duration: 0.5 }, "-=0.15")
        .to(".sun-circle", { scale: 1, duration: 0.5, ease: "back.out(1.6)" }, "-=0.25")
        .to(".sun-ray", { opacity: 1, scale: 1, stagger: 0.04, duration: 0.28 }, "-=0.2")
        .to(".scene-bird", { opacity: 1, stagger: 0.08, duration: 0.3 }, "-=0.1")
        .to(".house-g", { opacity: 1, y: 0, stagger: 0.16, duration: 0.5, ease: "power2.out" }, "-=0.2")
        .to(".scene-tree-g", { scale: 1, duration: 0.65, ease: "back.out(1.35)" }, "-=0.3")
        .to(".scene-mat-g", { scaleX: 1, duration: 0.4, ease: "back.out(1.7)" }, "-=0.2")
        .to(".family-person", { opacity: 1, y: 0, stagger: 0.13, duration: 0.48, ease: "back.out(1.4)" }, "-=0.15")
        .to(".scene-dabba-item", { opacity: 1, scale: 1, stagger: 0.1, duration: 0.35, ease: "back.out(1.7)" }, "-=0.2")
        .to(".butterfly-g", { opacity: 1, stagger: 0.2, duration: 0.5 }, "-=0.2")

        // Kid bounces excitedly
        .to(".family-child-g", { y: -9, duration: 0.28, repeat: 4, yoyo: true, ease: "power1.inOut" }, "+=0.1")

        // Steam from scene dabbas
        .to(".scene-steam-g", { opacity: 1, y: -8, stagger: 0.1, duration: 0.5 }, "-=0.6")

        // Tagline fades in
        .to(".intro-tagline", { opacity: 1, y: 0, duration: 0.55, ease: "power2.out" }, "+=0.15")

        // Hold then fade out — target the element directly, not by class (context scopes inside the ref)
        .to(containerRef.current!, { opacity: 0, duration: 0.9, ease: "power2.inOut" }, "+=2.4");
    }, containerRef);

    return () => ctx.revert();
  }, [onComplete]);

  const handleSkip = () => {
    gsap.to(containerRef.current!, {
      opacity: 0,
      duration: 0.4,
      onComplete: () => {
        sessionStorage.setItem("dabba-intro-seen", "1");
        setVisible(false);
        onComplete();
      },
    });
  };

  if (!visible) return null;

  return (
    <div ref={containerRef} className="dabba-overlay-root fixed inset-0 z-[9999] overflow-hidden" style={{ background: "#FFF8F0" }}>
      {/* Skip */}
      <button
        onClick={handleSkip}
        className="absolute top-5 right-5 z-20 text-sm font-medium text-stone-500 bg-white/70 backdrop-blur px-4 py-2 rounded-full border border-stone-200 hover:bg-white transition-colors"
      >
        Skip intro
      </button>

      {/* === LAYER 1: Tiffin opening world === */}
      <div className="dabba-intro-layer absolute inset-0 flex items-center justify-center">
        <svg viewBox="0 0 500 420" className="w-full h-full max-h-screen" preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="bgWarm" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#FFF3E0" />
              <stop offset="100%" stopColor="#FFE0B2" />
            </radialGradient>
            <radialGradient id="dabbaShine" cx="28%" cy="28%" r="65%">
              <stop offset="0%" stopColor="#F5F5F5" />
              <stop offset="100%" stopColor="#BDBDBD" />
            </radialGradient>
            <radialGradient id="lid1" cx="28%" cy="28%" r="65%">
              <stop offset="0%" stopColor="#EEEEEE" />
              <stop offset="100%" stopColor="#C8C8C8" />
            </radialGradient>
          </defs>

          <rect width="500" height="420" fill="url(#bgWarm)" />

          {/* Floor shadow */}
          <ellipse cx="260" cy="348" rx="200" ry="18" fill="rgba(0,0,0,0.07)" />

          {/* === BOY === */}
          <g className="boy-g">
            {/* Shadow */}
            <ellipse cx="143" cy="334" rx="35" ry="8" fill="rgba(0,0,0,0.08)" />
            {/* Legs */}
            <rect x="128" y="295" width="12" height="38" rx="6" fill="#F5CBA7" />
            <rect x="148" y="295" width="12" height="38" rx="6" fill="#F5CBA7" />
            {/* Shoes */}
            <ellipse cx="134" cy="334" rx="9" ry="5" fill="#5D4037" />
            <ellipse cx="154" cy="334" rx="9" ry="5" fill="#5D4037" />
            {/* Kurta body */}
            <path d="M 122 248 Q 143 242 164 248 L 168 295 L 118 295 Z" fill="#FF8F00" />
            {/* Kurta collar */}
            <path d="M 134 248 L 143 257 L 152 248" fill="none" stroke="#E65100" strokeWidth="2" />
            {/* Kurta cuffs */}
            <rect x="116" y="268" width="12" height="8" rx="4" fill="#FFB300" />
            <rect x="158" y="268" width="12" height="8" rx="4" fill="#FFB300" />
            {/* Head */}
            <circle cx="143" cy="224" r="23" fill="#F5CBA7" />
            {/* Hair */}
            <path d="M 121 218 Q 143 208 165 218 Q 162 205 143 200 Q 124 205 121 218 Z" fill="#3E2723" />
            {/* Eyes */}
            <circle cx="136" cy="224" r="3" fill="#2C2C2C" />
            <circle cx="150" cy="224" r="3" fill="#2C2C2C" />
            <circle cx="137" cy="223" r="1" fill="white" />
            <circle cx="151" cy="223" r="1" fill="white" />
            {/* Smile */}
            <path d="M 137 232 Q 143 238 149 232" stroke="#5D4037" strokeWidth="2" fill="none" />
            {/* Ear */}
            <ellipse cx="120" cy="225" rx="5" ry="7" fill="#F5CBA7" />
            <ellipse cx="166" cy="225" rx="5" ry="7" fill="#F5CBA7" />

            {/* Arm reaching */}
            <g className="boy-arm-g">
              <path d="M 164 262 Q 192 252 208 248" stroke="#F5CBA7" strokeWidth="10" fill="none" strokeLinecap="round" />
              {/* Hand */}
              <circle cx="210" cy="246" r="10" fill="#F5CBA7" />
              {/* Fingers */}
              <path d="M 204 238 Q 198 232 202 228" stroke="#F5CBA7" strokeWidth="5" fill="none" strokeLinecap="round" />
              <path d="M 210 236 Q 208 228 212 224" stroke="#F5CBA7" strokeWidth="5" fill="none" strokeLinecap="round" />
              <path d="M 216 238 Q 217 229 221 226" stroke="#F5CBA7" strokeWidth="5" fill="none" strokeLinecap="round" />
            </g>
          </g>

          {/* === TIFFIN BODY === */}
          <g className="dabba-body-g">
            {/* Body shadow */}
            <ellipse cx="253" cy="338" rx="68" ry="10" fill="rgba(0,0,0,0.12)" />
            {/* Tier 3 - bottom */}
            <rect x="196" y="296" width="108" height="30" rx="9" fill="url(#dabbaShine)" stroke="#9E9E9E" strokeWidth="1.5" />
            {/* Groove */}
            <rect x="196" y="294" width="108" height="7" rx="3.5" fill="#BDBDBD" />
            {/* Tier 2 */}
            <rect x="200" y="268" width="100" height="30" rx="8" fill="#E0E0E0" stroke="#9E9E9E" strokeWidth="1.5" />
            {/* Groove */}
            <rect x="200" y="266" width="100" height="7" rx="3.5" fill="#C8C8C8" />
            {/* Ring handle on tier 2 */}
            <path d="M 242 263 Q 250 256 258 263" stroke="#9E9E9E" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            {/* Shine on tier 3 */}
            <path d="M 206 302 Q 230 297 260 300" stroke="white" strokeWidth="2" opacity="0.5" fill="none" />
            {/* Shine on tier 2 */}
            <path d="M 208 274 Q 230 270 256 272" stroke="white" strokeWidth="1.5" opacity="0.45" fill="none" />

            {/* Steam */}
            <g className="steam-waft steam-1" style={{ opacity: 0 }}>
              <path d="M 232 258 Q 226 244 230 230 Q 234 216 230 204" stroke="rgba(255,255,255,0.75)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            </g>
            <g className="steam-waft steam-2" style={{ opacity: 0 }}>
              <path d="M 250 253 Q 244 239 248 225 Q 252 211 248 199" stroke="rgba(255,255,255,0.75)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            </g>
            <g className="steam-waft steam-3" style={{ opacity: 0 }}>
              <path d="M 268 258 Q 274 244 270 230 Q 266 216 270 204" stroke="rgba(255,255,255,0.75)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            </g>
          </g>

          {/* === LID === */}
          <g className="dabba-lid-g">
            <rect x="200" y="248" width="100" height="24" rx="8" fill="url(#lid1)" stroke="#9E9E9E" strokeWidth="1.5" />
            {/* Knob */}
            <rect x="236" y="238" width="28" height="15" rx="7.5" fill="#BDBDBD" stroke="#9E9E9E" strokeWidth="1.5" />
            <ellipse cx="250" cy="238" rx="10" ry="4" fill="#D5D5D5" />
            {/* Shine */}
            <path d="M 208 252 Q 232 248 262 252" stroke="white" strokeWidth="2" opacity="0.5" fill="none" />
          </g>

          {/* Title */}
          <text x="250" y="78" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="36" fill="#E65100" fontWeight="bold" letterSpacing="2">
            Dabba
          </text>
          <text x="250" y="108" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="14" fill="#A1887F" letterSpacing="1">
            Something warm is coming...
          </text>
        </svg>
      </div>

      {/* === LAYER 2: Village scene === */}
      <div className="scene-reveal absolute inset-0" style={{ clipPath: "circle(0% at 50% 50%)" }}>
        <svg viewBox="0 0 900 560" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="skyDawn" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FF8F00" stopOpacity="0.55" />
              <stop offset="35%" stopColor="#FFC107" stopOpacity="0.45" />
              <stop offset="75%" stopColor="#FFF9C4" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#E8F5E9" />
            </linearGradient>
            <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFEE58" />
              <stop offset="60%" stopColor="#FFD600" />
              <stop offset="100%" stopColor="#FF8F00" stopOpacity="0.6" />
            </radialGradient>
            <linearGradient id="hillFar" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#A5D6A7" />
              <stop offset="100%" stopColor="#66BB6A" />
            </linearGradient>
            <linearGradient id="hillNear" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#81C784" />
              <stop offset="100%" stopColor="#4CAF50" />
            </linearGradient>
            <linearGradient id="treeLeaf" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#81C784" />
              <stop offset="100%" stopColor="#2E7D32" />
            </linearGradient>
            <linearGradient id="ground" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#9CCC65" />
              <stop offset="100%" stopColor="#7CB342" />
            </linearGradient>
          </defs>

          {/* SKY */}
          <rect className="scene-element" width="900" height="560" fill="url(#skyDawn)" style={{ opacity: 0 }} />

          {/* SUN */}
          <g>
            {/* Outer glow halo */}
            <circle cx="130" cy="95" r="72" fill="#FFD600" opacity="0.15" className="scene-element" style={{ opacity: 0 }} />
            <circle className="sun-circle" cx="130" cy="95" r="50" fill="url(#sunGlow)" />
            <circle cx="130" cy="95" r="36" fill="#FFEE58" opacity="0.6" className="scene-element" style={{ opacity: 0 }} />
            {/* Rays */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
              const rad = (deg * Math.PI) / 180;
              const x1 = 130 + 58 * Math.cos(rad);
              const y1 = 95 + 58 * Math.sin(rad);
              const x2 = 130 + 80 * Math.cos(rad);
              const y2 = 95 + 80 * Math.sin(rad);
              return (
                <line key={i} className="sun-ray" x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="#FFB300" strokeWidth="5" strokeLinecap="round"
                  style={{ opacity: 0, scale: 0, transformOrigin: `${130}px ${95}px` }} />
              );
            })}
          </g>

          {/* BIRDS (simple V shapes) */}
          {[[220, 78], [270, 62], [330, 84], [590, 72], [640, 56], [680, 80]].map(([x, y], i) => (
            <g key={i} className="scene-bird" style={{ opacity: 0 }}>
              <path d={`M ${x} ${y} Q ${x + 9} ${y - 9} ${x + 18} ${y}`} stroke="#78909C" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d={`M ${x + 18} ${y} Q ${x + 27} ${y - 9} ${x + 36} ${y}`} stroke="#78909C" strokeWidth="2" fill="none" strokeLinecap="round" />
            </g>
          ))}

          {/* FAR HILLS */}
          <g className="scene-hills-g" style={{ opacity: 0 }}>
            <path d="M 0 340 Q 100 255 220 295 Q 340 235 460 275 Q 570 215 680 258 Q 780 220 900 265 L 900 560 L 0 560 Z" fill="url(#hillFar)" opacity="0.5" />
            <path d="M 0 375 Q 160 305 300 345 Q 430 280 560 330 Q 680 275 900 320 L 900 560 L 0 560 Z" fill="url(#hillNear)" opacity="0.75" />
          </g>

          {/* GROUND */}
          <rect x="0" y="425" width="900" height="135" fill="url(#ground)" />
          <rect x="0" y="442" width="900" height="118" fill="#7CB342" opacity="0.5" />

          {/* Dirt path */}
          <path d="M 370 560 Q 400 500 420 465 Q 440 500 470 560" fill="#C8A97D" opacity="0.45" />

          {/* GRASS TUFTS */}
          {[[90, 430], [220, 426], [470, 428], [600, 431], [760, 427], [840, 435]].map(([x, y], i) => (
            <g key={i} className="scene-hills-g" style={{ opacity: 0 }}>
              <path d={`M ${x} ${y} Q ${x - 5} ${y - 13} ${x} ${y - 8}`} stroke="#558B2F" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <path d={`M ${x + 5} ${y} Q ${x + 7} ${y - 15} ${x + 5} ${y - 9}`} stroke="#558B2F" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <path d={`M ${x + 10} ${y} Q ${x + 14} ${y - 11} ${x + 10} ${y - 6}`} stroke="#558B2F" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            </g>
          ))}

          {/* WILDFLOWERS */}
          {[[155, 432], [510, 428], [570, 436], [190, 440], [700, 430], [780, 442]].map(([x, y], i) => (
            <g key={i} className="scene-hills-g" style={{ opacity: 0 }}>
              <circle cx={x} cy={y} r="5" fill={["#FF8A80", "#EA80FC", "#FFD740", "#80D8FF", "#CCFF90", "#FF80AB"][i]} />
              <circle cx={x} cy={y} r="2" fill="#FFEE58" />
              <line x1={x} y1={y + 5} x2={x} y2={y + 14} stroke="#558B2F" strokeWidth="1.5" />
            </g>
          ))}

          {/* HOUSE 1 — left village house */}
          <g className="house-g" style={{ opacity: 0, transform: "translateY(25px)" }}>
            {/* Main wall */}
            <rect x="42" y="305" width="125" height="128" rx="5" fill="#FFFDE7" stroke="#F9A825" strokeWidth="2" />
            {/* Terracotta roof */}
            <polygon points="30,305 179,305 105,238" fill="#EF9A9A" stroke="#E57373" strokeWidth="2" />
            {/* Roof tiles (lines) */}
            <line x1="68" y1="280" x2="105" y2="238" stroke="#EF5350" strokeWidth="1" opacity="0.4" />
            <line x1="105" y1="238" x2="142" y2="280" stroke="#EF5350" strokeWidth="1" opacity="0.4" />
            <line x1="55" y1="265" x2="105" y2="238" stroke="#EF5350" strokeWidth="1" opacity="0.4" />
            <line x1="105" y1="238" x2="156" y2="265" stroke="#EF5350" strokeWidth="1" opacity="0.4" />
            {/* Chimney */}
            <rect x="118" y="245" width="18" height="35" fill="#BCAAA4" stroke="#A1887F" strokeWidth="1" />
            <rect x="115" y="242" width="24" height="8" rx="2" fill="#A1887F" />
            {/* Chimney smoke */}
            <path d="M 127 238 Q 122 224 127 210 Q 132 196 127 183" stroke="rgba(180,180,180,0.65)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            {/* Arched door */}
            <path d="M 91 433 L 91 378 Q 109 356 127 378 L 127 433 Z" fill="#8D6E63" />
            <circle cx="122" cy="404" r="3.5" fill="#FFD54F" />
            {/* Windows */}
            <rect x="52" y="322" width="32" height="26" rx="4" fill="#B3E5FC" stroke="#81D4FA" strokeWidth="1.5" />
            <rect x="142" y="322" width="32" height="26" rx="4" fill="#B3E5FC" stroke="#81D4FA" strokeWidth="1.5" />
            <line x1="68" y1="322" x2="68" y2="348" stroke="#81D4FA" strokeWidth="1" />
            <line x1="52" y1="335" x2="84" y2="335" stroke="#81D4FA" strokeWidth="1" />
            <line x1="158" y1="322" x2="158" y2="348" stroke="#81D4FA" strokeWidth="1" />
            <line x1="142" y1="335" x2="174" y2="335" stroke="#81D4FA" strokeWidth="1" />
            {/* Flowerpot on window sill */}
            <rect x="58" y="348" width="20" height="10" rx="3" fill="#EF9A9A" />
            <ellipse cx="68" cy="348" rx="7" ry="3" fill="#A5D6A7" />
          </g>

          {/* HOUSE 2 — right village house, slightly bigger */}
          <g className="house-g" style={{ opacity: 0, transform: "translateY(25px)" }}>
            {/* Main wall */}
            <rect x="660" y="292" width="155" height="140" rx="5" fill="#FFF3E0" stroke="#FFB74D" strokeWidth="2" />
            {/* Roof */}
            <polygon points="647,292 828,292 738,218" fill="#CE93D8" stroke="#BA68C8" strokeWidth="2" />
            {/* Roof tiles */}
            <line x1="693" y1="268" x2="738" y2="218" stroke="#AB47BC" strokeWidth="1" opacity="0.4" />
            <line x1="738" y1="218" x2="783" y2="268" stroke="#AB47BC" strokeWidth="1" opacity="0.4" />
            {/* Arched door */}
            <path d="M 710 432 L 710 378 Q 730 352 750 378 L 750 432 Z" fill="#6D4C41" />
            <circle cx="745" cy="402" r="3.5" fill="#FFD54F" />
            {/* Windows */}
            <rect x="666" y="312" width="34" height="28" rx="4" fill="#E1F5FE" stroke="#81D4FA" strokeWidth="1.5" />
            <rect x="768" y="312" width="34" height="28" rx="4" fill="#E1F5FE" stroke="#81D4FA" strokeWidth="1.5" />
            <line x1="683" y1="312" x2="683" y2="340" stroke="#81D4FA" strokeWidth="1" />
            <line x1="666" y1="326" x2="700" y2="326" stroke="#81D4FA" strokeWidth="1" />
            <line x1="785" y1="312" x2="785" y2="340" stroke="#81D4FA" strokeWidth="1" />
            <line x1="768" y1="326" x2="802" y2="326" stroke="#81D4FA" strokeWidth="1" />
            {/* Festive string lights along roofline */}
            <path d="M 660 295 Q 680 303 700 296 Q 720 303 740 296 Q 760 303 780 296 Q 800 303 820 295" stroke="#FFD54F" strokeWidth="2" fill="none" />
            {[673, 700, 720, 740, 760, 780, 807].map((lx, i) => (
              <circle key={i} cx={lx} cy={300} r="3.5" fill="#FFD54F" opacity="0.95" />
            ))}
            {/* Terrace wall at top */}
            <rect x="660" y="285" width="155" height="12" rx="3" fill="#FFB74D" opacity="0.5" />
          </g>

          {/* BIG BANYAN / MANGO TREE */}
          <g className="scene-tree-g" style={{ transform: "scale(0)", transformOrigin: "340px 408px" }}>
            {/* Shadow */}
            <ellipse cx="340" cy="418" rx="100" ry="14" fill="rgba(0,60,0,0.14)" />
            {/* Aerial roots */}
            <path d="M 336 370 Q 312 378 305 405 Q 303 418 308 428" stroke="#5D4037" strokeWidth="9" fill="none" strokeLinecap="round" />
            <path d="M 345 375 Q 370 382 377 402 Q 380 415 375 428" stroke="#5D4037" strokeWidth="7" fill="none" strokeLinecap="round" />
            <path d="M 328 380 Q 308 385 302 415" stroke="#6D4C41" strokeWidth="5" fill="none" strokeLinecap="round" />
            {/* Trunk */}
            <path d="M 328 428 Q 323 392 326 355 Q 328 320 332 285" stroke="#5D4037" strokeWidth="26" fill="none" strokeLinecap="round" />
            <path d="M 346 428 Q 352 392 349 355 Q 347 320 343 285" stroke="#6D4C41" strokeWidth="20" fill="none" strokeLinecap="round" />
            {/* Branch left */}
            <path d="M 330 320 Q 285 300 260 270" stroke="#5D4037" strokeWidth="14" fill="none" strokeLinecap="round" />
            {/* Branch right */}
            <path d="M 343 315 Q 388 295 415 265" stroke="#5D4037" strokeWidth="12" fill="none" strokeLinecap="round" />
            {/* Foliage layers — deep overlapping circles */}
            <circle cx="340" cy="215" r="95" fill="#388E3C" opacity="0.85" />
            <circle cx="280" cy="240" r="72" fill="#43A047" />
            <circle cx="400" cy="232" r="78" fill="#2E7D32" />
            <circle cx="340" cy="162" r="70" fill="#66BB6A" />
            <circle cx="295" cy="192" r="60" fill="url(#treeLeaf)" />
            <circle cx="388" cy="195" r="65" fill="#388E3C" />
            <circle cx="318" cy="255" r="50" fill="#4CAF50" />
            <circle cx="365" cy="248" r="55" fill="#2E7D32" />
            <circle cx="255" cy="260" r="45" fill="#43A047" opacity="0.8" />
            <circle cx="420" cy="255" r="48" fill="#388E3C" opacity="0.8" />
            {/* Mangoes */}
            {[[318, 190], [352, 180], [288, 218], [392, 205], [340, 248], [305, 258], [374, 240], [268, 248]].map(([cx, cy], i) => (
              <g key={i}>
                <ellipse cx={cx} cy={cy} rx="9" ry="13" fill="#FF7043" />
                <ellipse cx={cx - 2} cy={cy - 4} rx="3.5" ry="5" fill="#FF8A65" opacity="0.7" />
                <line x1={cx} y1={cy - 13} x2={cx + 4} y2={cy - 20} stroke="#558B2F" strokeWidth="1.5" strokeLinecap="round" />
              </g>
            ))}
          </g>

          {/* FLOOR MAT under tree */}
          <g className="scene-mat-g" style={{ transform: "scaleX(0)", transformOrigin: "340px 450px" }}>
            <ellipse cx="340" cy="450" rx="148" ry="26" fill="#C62828" />
            <ellipse cx="340" cy="450" rx="140" ry="22" fill="#E53935" />
            {/* Mat pattern */}
            <ellipse cx="340" cy="450" rx="130" ry="18" fill="none" stroke="#FF8A80" strokeWidth="3" opacity="0.6" />
            <ellipse cx="340" cy="450" rx="110" ry="14" fill="none" stroke="#FF8A80" strokeWidth="2" opacity="0.4" />
            {/* Border fringe */}
            {Array.from({ length: 18 }, (_, i) => {
              const angle = (i / 18) * Math.PI * 2;
              const ox = 140 * Math.cos(angle);
              const oy = 22 * Math.sin(angle);
              const fx = 148 * Math.cos(angle);
              const fy = 26 * Math.sin(angle);
              return <line key={i} x1={340 + ox} y1={450 + oy} x2={340 + fx} y2={450 + fy} stroke="#B71C1C" strokeWidth="2" />;
            })}
          </g>

          {/* GRANDPARENT — far left on mat */}
          <g className="family-person" style={{ opacity: 0, transform: "translateY(24px)" }}>
            {/* Seated cross-legged body */}
            <path d="M 213 445 Q 230 432 247 445 L 244 462 L 216 462 Z" fill="#F5F5F5" />
            {/* Dhoti pattern */}
            <path d="M 213 445 Q 218 455 216 462" stroke="#E0E0E0" strokeWidth="1" fill="none" />
            {/* Kurta top */}
            <path d="M 216 420 Q 230 415 244 420 L 247 445 L 213 445 Z" fill="#FFF9C4" stroke="#F9A825" strokeWidth="1" />
            {/* Head */}
            <circle cx="230" cy="405" r="18" fill="#D4A574" />
            {/* White hair */}
            <path d="M 213 400 Q 230 392 247 400" fill="#ECEFF1" />
            <ellipse cx="230" cy="396" r="10" fill="#ECEFF1" />
            {/* Spectacles */}
            <circle cx="224" cy="406" r="5.5" fill="none" stroke="#9E9E9E" strokeWidth="1.5" />
            <circle cx="236" cy="406" r="5.5" fill="none" stroke="#9E9E9E" strokeWidth="1.5" />
            <line x1="229.5" y1="406" x2="230.5" y2="406" stroke="#9E9E9E" strokeWidth="1.5" />
            <line x1="210" y1="406" x2="218.5" y2="406" stroke="#9E9E9E" strokeWidth="1" />
            <line x1="241.5" y1="406" x2="250" y2="406" stroke="#9E9E9E" strokeWidth="1" />
            {/* Eyes and smile */}
            <circle cx="224" cy="406" r="2" fill="#4E342E" />
            <circle cx="236" cy="406" r="2" fill="#4E342E" />
            <path d="M 224 414 Q 230 419 236 414" stroke="#5D4037" strokeWidth="1.5" fill="none" />
            {/* Arm resting */}
            <path d="M 213 432 Q 200 440 196 452" stroke="#D4A574" strokeWidth="8" fill="none" strokeLinecap="round" />
          </g>

          {/* FATHER — left-center on mat */}
          <g className="family-person" style={{ opacity: 0, transform: "translateY(24px)" }}>
            <path d="M 283 448 Q 300 435 317 448 L 314 466 L 286 466 Z" fill="#E3F2FD" />
            {/* Kurta */}
            <path d="M 285 420 Q 300 415 315 420 L 317 448 L 283 448 Z" fill="#1565C0" />
            <path d="M 293 420 L 300 427 L 307 420" fill="none" stroke="#0D47A1" strokeWidth="1.5" />
            {/* Head */}
            <circle cx="300" cy="403" r="19" fill="#F5CBA7" />
            <path d="M 282 398 Q 300 389 318 398" fill="#3E2723" />
            <ellipse cx="300" cy="392" r="11" fill="#333" />
            {/* Moustache */}
            <path d="M 293 410 Q 300 415 307 410" stroke="#4A4A4A" strokeWidth="2.5" fill="none" />
            <circle cx="294" cy="403" r="2.5" fill="#333" />
            <circle cx="306" cy="403" r="2.5" fill="#333" />
            {/* Talking open mouth */}
            <path d="M 295 410 Q 300 416 305 410" stroke="#795548" strokeWidth="1.5" fill="none" />
            {/* Arms gesturing + holding */}
            <path d="M 315 428 Q 328 422 335 430" stroke="#F5CBA7" strokeWidth="9" fill="none" strokeLinecap="round" />
            <path d="M 285 428 Q 272 424 265 436" stroke="#F5CBA7" strokeWidth="9" fill="none" strokeLinecap="round" />
          </g>

          {/* CHILD — center, most excited */}
          <g className="family-child-g family-person" style={{ opacity: 0, transform: "translateY(24px)" }}>
            <path d="M 332 450 Q 348 438 364 450 L 361 468 L 335 468 Z" fill="#FFF9C4" />
            {/* Bright kurta */}
            <path d="M 334 422 Q 348 417 362 422 L 364 450 L 332 450 Z" fill="#FF6D00" />
            {/* Head */}
            <circle cx="348" cy="406" r="17" fill="#F5CBA7" />
            <ellipse cx="348" cy="396" r="11" fill="#2C2C2C" />
            <path d="M 332 400 Q 348 392 364 400" fill="#2C2C2C" />
            {/* Big excited eyes */}
            <circle cx="342" cy="408" r="3.5" fill="#2C2C2C" />
            <circle cx="354" cy="408" r="3.5" fill="#2C2C2C" />
            <circle cx="343" cy="407" r="1.3" fill="white" />
            <circle cx="355" cy="407" r="1.3" fill="white" />
            {/* Wide open smile */}
            <path d="M 341 415 Q 348 422 355 415" stroke="#333" strokeWidth="1.5" fill="none" />
            {/* Excited arms up */}
            <path d="M 362 432 Q 374 424 384 428" stroke="#F5CBA7" strokeWidth="8" fill="none" strokeLinecap="round" />
            <path d="M 334 432 Q 322 424 312 430" stroke="#F5CBA7" strokeWidth="8" fill="none" strokeLinecap="round" />
          </g>

          {/* MOTHER — right on mat, serving */}
          <g className="family-person" style={{ opacity: 0, transform: "translateY(24px)" }}>
            <path d="M 390 447 Q 408 434 426 447 L 423 464 L 393 464 Z" fill="#FF8F00" />
            {/* Saree blouse */}
            <path d="M 393 419 Q 408 414 423 419 L 426 447 L 390 447 Z" fill="#F57F17" />
            {/* Saree pallu */}
            <path d="M 423 419 Q 438 414 444 428 Q 442 438 433 440" fill="#FFB300" opacity="0.75" />
            {/* Head */}
            <circle cx="408" cy="402" r="18" fill="#C8956B" />
            {/* Bun */}
            <ellipse cx="408" cy="388" r="11" fill="#3E2723" />
            <circle cx="415" cy="386" r="7" fill="#4E342E" />
            {/* Bindi */}
            <circle cx="408" cy="398" r="3" fill="#D32F2F" />
            {/* Earring */}
            <circle cx="392" cy="408" r="4" fill="#FFD54F" opacity="0.9" />
            <circle cx="424" cy="408" r="4" fill="#FFD54F" opacity="0.9" />
            {/* Eyes */}
            <circle cx="402" cy="403" r="2.5" fill="#333" />
            <circle cx="414" cy="403" r="2.5" fill="#333" />
            {/* Warm smile */}
            <path d="M 402 411 Q 408 417 414 411" stroke="#5D4037" strokeWidth="1.5" fill="none" />
            {/* Arm serving */}
            <path d="M 423 428 Q 436 424 445 434" stroke="#C8956B" strokeWidth="8" fill="none" strokeLinecap="round" />
            {/* Ladle in hand */}
            <circle cx="451" cy="440" r="10" fill="#BDBDBD" stroke="#9E9E9E" strokeWidth="1.5" />
            <path d="M 451 450 L 455 468" stroke="#9E9E9E" strokeWidth="3.5" strokeLinecap="round" />
            {/* Food on ladle */}
            <ellipse cx="451" cy="438" rx="6" ry="3" fill="#FF8F00" opacity="0.8" />
          </g>

          {/* DABBAS on mat */}
          {/* Grandparent's */}
          <g className="scene-dabba-item" style={{ opacity: 0, scale: 0 }}>
            <ellipse cx="205" cy="466" rx="20" ry="7" fill="rgba(0,0,0,0.12)" />
            <ellipse cx="205" cy="460" rx="19" ry="10" fill="#BDBDBD" stroke="#9E9E9E" strokeWidth="1.5" />
            <ellipse cx="205" cy="453" rx="19" ry="6" fill="#E0E0E0" stroke="#9E9E9E" strokeWidth="1.5" />
            <ellipse cx="205" cy="451" rx="13" ry="4" fill="#FFCC02" opacity="0.75" />
          </g>
          {/* Father's */}
          <g className="scene-dabba-item" style={{ opacity: 0, scale: 0 }}>
            <ellipse cx="272" cy="466" rx="20" ry="7" fill="rgba(0,0,0,0.12)" />
            <ellipse cx="272" cy="460" rx="19" ry="10" fill="#BDBDBD" stroke="#9E9E9E" strokeWidth="1.5" />
            <ellipse cx="272" cy="453" rx="19" ry="6" fill="#E0E0E0" stroke="#9E9E9E" strokeWidth="1.5" />
            <ellipse cx="272" cy="451" rx="13" ry="4" fill="#66BB6A" opacity="0.75" />
          </g>
          {/* Child's */}
          <g className="scene-dabba-item" style={{ opacity: 0, scale: 0 }}>
            <ellipse cx="342" cy="467" rx="17" ry="6" fill="rgba(0,0,0,0.12)" />
            <ellipse cx="342" cy="461" rx="16" ry="9" fill="#BDBDBD" stroke="#9E9E9E" strokeWidth="1.5" />
            <ellipse cx="342" cy="454" rx="16" ry="5.5" fill="#E0E0E0" stroke="#9E9E9E" strokeWidth="1.5" />
            <ellipse cx="342" cy="452" rx="11" ry="3.5" fill="#FF5722" opacity="0.75" />
          </g>
          {/* Mother's big serving vessel */}
          <g className="scene-dabba-item" style={{ opacity: 0, scale: 0 }}>
            <ellipse cx="418" cy="466" rx="25" ry="8" fill="rgba(0,0,0,0.12)" />
            <ellipse cx="418" cy="458" rx="24" ry="12" fill="#BDBDBD" stroke="#9E9E9E" strokeWidth="1.5" />
            <ellipse cx="418" cy="450" rx="24" ry="7" fill="#E0E0E0" stroke="#9E9E9E" strokeWidth="1.5" />
            <ellipse cx="418" cy="448" rx="17" ry="4.5" fill="#FF8F00" opacity="0.75" />
          </g>

          {/* STEAM from dabbas */}
          {[[205, 443], [272, 443], [342, 444], [418, 441]].map(([x, y], i) => (
            <g key={i} className="scene-steam-g" style={{ opacity: 0 }}>
              <path d={`M ${x} ${y} Q ${x - 5} ${y - 14} ${x} ${y - 24} Q ${x + 5} ${y - 34} ${x} ${y - 44}`}
                stroke="rgba(255,255,255,0.65)" strokeWidth="3" fill="none" strokeLinecap="round" />
            </g>
          ))}

          {/* BUTTERFLIES */}
          <g className="butterfly-g" style={{ opacity: 0 }}>
            <path d="M 510 298 Q 497 285 493 296 Q 497 308 510 298 Z" fill="#FF80AB" opacity="0.85" />
            <path d="M 510 298 Q 523 285 527 296 Q 523 308 510 298 Z" fill="#FF4081" opacity="0.85" />
            <path d="M 510 298 Q 499 311 495 305 Q 499 315 510 298 Z" fill="#F8BBD0" opacity="0.7" />
            <path d="M 510 298 Q 521 311 525 305 Q 521 315 510 298 Z" fill="#F48FB1" opacity="0.7" />
            <circle cx="510" cy="298" r="2.5" fill="#AD1457" />
          </g>
          <g className="butterfly-g" style={{ opacity: 0 }}>
            <path d="M 185 318 Q 173 305 169 316 Q 173 328 185 318 Z" fill="#80DEEA" opacity="0.85" />
            <path d="M 185 318 Q 197 305 201 316 Q 197 328 185 318 Z" fill="#26C6DA" opacity="0.85" />
            <path d="M 185 318 Q 175 331 171 325 Q 175 335 185 318 Z" fill="#B2EBF2" opacity="0.7" />
            <path d="M 185 318 Q 195 331 199 325 Q 195 335 185 318 Z" fill="#80DEEA" opacity="0.7" />
            <circle cx="185" cy="318" r="2.5" fill="#00838F" />
          </g>
          <g className="butterfly-g" style={{ opacity: 0 }}>
            <path d="M 620 340 Q 608 327 604 338 Q 608 350 620 340 Z" fill="#CE93D8" opacity="0.85" />
            <path d="M 620 340 Q 632 327 636 338 Q 632 350 620 340 Z" fill="#AB47BC" opacity="0.85" />
            <path d="M 620 340 Q 610 353 606 347 Q 610 357 620 340 Z" fill="#E1BEE7" opacity="0.7" />
            <path d="M 620 340 Q 630 353 634 347 Q 630 357 620 340 Z" fill="#CE93D8" opacity="0.7" />
            <circle cx="620" cy="340" r="2.5" fill="#6A1B9A" />
          </g>

          {/* TAGLINE CARD */}
          <g className="intro-tagline" style={{ opacity: 0 }}>
            <rect x="240" y="22" width="420" height="72" rx="18" fill="rgba(255,255,255,0.88)" />
            <rect x="240" y="22" width="420" height="72" rx="18" fill="none" stroke="rgba(230,100,0,0.2)" strokeWidth="1.5" />
            <text x="450" y="54" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="28" fill="#E65100" fontWeight="bold" letterSpacing="2">
              Dabba
            </text>
            <text x="450" y="80" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="13.5" fill="#795548" letterSpacing="0.5">
              The warmth of ghar ka khana, delivered.
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
