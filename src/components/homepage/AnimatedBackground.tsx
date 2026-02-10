import { motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect } from "react";

interface Particle {
  id: number;
  size: number;
  x: number;
  y: number;
  duration: number;
  delay: number;
  gradient: string;
}

const particles: Particle[] = Array.from({ length: 15 }, (_, i) => ({
  id: i,
  size: Math.random() * 400 + 200,
  x: Math.random() * 100,
  y: Math.random() * 100,
  duration: Math.random() * 25 + 20,
  delay: Math.random() * 5,
  gradient: [
    "from-blue-500/10 to-cyan-500/10",
    "from-indigo-500/10 to-blue-500/10",
    "from-cyan-500/10 to-blue-500/10",
    "from-emerald-500/10 to-teal-500/10"
  ][Math.floor(Math.random() * 4)]
}));

export function AnimatedBackground() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-50 via-white to-slate-50">
      {/* Mouse-reactive animated gradient orbs */}
      {particles.map((particle) => {
        const offsetX = useTransform(
          mouseX,
          [0, window.innerWidth],
          [-30, 30]
        );
        const offsetY = useTransform(
          mouseY,
          [0, window.innerHeight],
          [-30, 30]
        );

        return (
          <motion.div
            key={particle.id}
            className={`absolute rounded-full bg-gradient-to-br ${particle.gradient} blur-3xl`}
            style={{
              width: particle.size,
              height: particle.size,
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              x: offsetX,
              y: offsetY,
            }}
            animate={{
              x: [0, 50, -50, 0],
              y: [0, -60, 60, 0],
              scale: [1, 1.2, 0.8, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        );
      })}

      {/* High-end geometric accents */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Floating 3D-ish elements */}
      <motion.div
        className="absolute top-1/4 right-1/4 w-64 h-64 border border-blue-200/20 rounded-full"
        style={{ rotateX: 60 }}
        animate={{ rotateZ: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      />
      
      <motion.div
        className="absolute bottom-1/3 left-1/3 w-96 h-96 border border-purple-200/20 rounded-full"
        style={{ rotateX: 70 }}
        animate={{ rotateZ: -360 }}
        transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
      />

      {/* Vignette for focus */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(255,255,255,0.8)_100%)] pointer-events-none" />
    </div>
  );
}
