"use client";

import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Caberu from "@/components/Caberu";
import Timeline from "@/components/Timeline";
import Stack from "@/components/Stack";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <About />
      <Caberu />
      <Timeline />
      <Stack />
      <Contact />
      <Footer />
    </main>
  );
}
