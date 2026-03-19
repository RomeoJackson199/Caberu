"use client";

import { FOOTER } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="border-t border-border-subtle py-8">
      <div className="max-w-6xl mx-auto px-6">
        <p className="font-body text-body-text text-xs tracking-wide text-center">
          {FOOTER.copyright}
        </p>
      </div>
    </footer>
  );
}
