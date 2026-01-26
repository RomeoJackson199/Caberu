import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Player, PlayerRef } from "@remotion/player";
import { OnboardingComposition, SCENE_DURATION, TOTAL_SCENES, TOTAL_FRAMES } from "../../remotion/OnboardingComposition";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const SLIDES = [
  {
    title: "Welcome to Caberu",
    description: "The smarter way to manage your dental health and stay on top of your appointments.",
  },
  {
    title: "Book in seconds",
    description: "Find available slots and book appointments with your dentist instantly.",
  },
  {
    title: "Stay connected",
    description: "Chat directly with your dental team and get real-time updates on your care.",
  },
  {
    title: "Safe & secure",
    description: "Your health data is encrypted and GDPR compliant. Privacy is our priority.",
  },
];

const Welcome = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const playerRef = useRef<PlayerRef>(null);
  const navigate = useNavigate();

  // Check if user is already authenticated
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/auth-redirect", { replace: true });
      }
    });
  }, [navigate]);

  // Seek the Remotion player to the current scene
  useEffect(() => {
    const targetFrame = currentSlide * SCENE_DURATION;
    if (playerRef.current) {
      playerRef.current.seekTo(targetFrame);
      playerRef.current.play();
    }
  }, [currentSlide]);

  const handleNext = useCallback(() => {
    if (currentSlide < TOTAL_SCENES - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      // Mark onboarding as seen and go to login
      localStorage.setItem("caberu_onboarding_seen", "true");
      navigate("/login");
    }
  }, [currentSlide, navigate]);

  const handleSkip = useCallback(() => {
    localStorage.setItem("caberu_onboarding_seen", "true");
    navigate("/login");
  }, [navigate]);

  const isLastSlide = currentSlide === TOTAL_SCENES - 1;

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col overflow-hidden">
      {/* Skip button */}
      <div className="flex justify-end p-4 pt-safe">
        <button
          onClick={handleSkip}
          className="text-sm text-white/50 hover:text-white/80 transition-colors px-3 py-1.5 rounded-lg"
        >
          Skip
        </button>
      </div>

      {/* Remotion Player area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-[390px] aspect-square rounded-2xl overflow-hidden mb-8">
          <Player
            ref={playerRef}
            component={OnboardingComposition}
            durationInFrames={TOTAL_FRAMES}
            compositionWidth={390}
            compositionHeight={400}
            fps={30}
            autoPlay
            loop
            style={{
              width: "100%",
              height: "100%",
            }}
            inputProps={{
              title: "Welcome to Caberu",
            }}
          />
        </div>

        {/* Text content */}
        <div className="w-full max-w-[340px] text-center min-h-[120px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <h1 className="text-2xl font-bold text-white mb-3 tracking-tight">
                {SLIDES[currentSlide].title}
              </h1>
              <p className="text-base text-white/60 leading-relaxed">
                {SLIDES[currentSlide].description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom section: dots + button */}
      <div className="px-6 pb-8 pb-safe space-y-6">
        {/* Dots indicator */}
        <div className="flex justify-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className="p-1"
              aria-label={`Go to slide ${i + 1}`}
            >
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentSlide
                    ? "w-8 bg-blue-500"
                    : "w-2 bg-white/20"
                }`}
              />
            </button>
          ))}
        </div>

        {/* Action button */}
        <Button
          onClick={handleNext}
          className="w-full h-14 text-base font-semibold rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-lg shadow-blue-500/25 transition-all"
        >
          {isLastSlide ? (
            <>
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          ) : (
            <>
              Next
              <ChevronRight className="ml-1 h-5 w-5" />
            </>
          )}
        </Button>

        {/* Sign in link on last slide */}
        {isLastSlide && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm text-white/40"
          >
            Already have an account?{" "}
            <button
              onClick={() => {
                localStorage.setItem("caberu_onboarding_seen", "true");
                navigate("/login");
              }}
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              Sign in
            </button>
          </motion.p>
        )}
      </div>
    </div>
  );
};

export default Welcome;
