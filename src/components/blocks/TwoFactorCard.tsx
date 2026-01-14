import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export function TwoFactorCard() {
  const [otp, setOtp] = useState("");
  const isComplete = otp.length === 6;

  return (
    <Card className="w-full max-w-md mx-auto bg-[hsl(var(--component-bg))] border-0 border-t border-[hsl(var(--component-border))] rounded-3xl">
      <CardHeader>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-4">
          <rect width="32" height="32" rx="8" fill="white" />
          <g clipPath="url(#clip0_65_373)">
            <path d="M20.712 9.20317C20.2135 8.45244 19.5501 7.83193 18.7752 7.39142C18.0003 6.95091 17.1355 6.70267 16.25 6.66663C16.0882 6.66663 15.9249 6.66663 15.7616 6.66663C14.8767 6.70313 14.0124 6.95158 13.238 7.39207C12.4636 7.83256 11.8008 8.45283 11.3025 9.20317C10.7943 9.95067 10.4595 10.8073 10.3237 11.7076C10.1879 12.608 10.2547 13.5282 10.5189 14.3981C10.5189 14.3981 10.5189 14.3981 10.5189 14.3981C10.5318 14.4421 10.5433 14.4862 10.5591 14.5302L14.1229 24.0716C14.2583 24.4724 14.5123 24.8201 14.8496 25.0661C15.1868 25.3122 15.5904 25.4444 16.0044 25.4444C16.4183 25.4444 16.822 25.3122 17.1592 25.0661C17.4964 24.8201 17.7504 24.4724 17.8859 24.0716L20.9226 15.9526L21.4368 14.5786L21.4497 14.5419C21.7431 13.655 21.8291 12.7098 21.701 11.7826C21.5729 10.8553 21.2341 9.9718 20.712 9.20317V9.20317ZM19.3326 15.3273L16.2887 23.4727L16.2758 23.5079C16.2596 23.5678 16.2239 23.6202 16.1747 23.6565C16.1255 23.6928 16.0657 23.7108 16.0051 23.7075C15.9449 23.7107 15.8855 23.6926 15.8368 23.6562C15.788 23.6199 15.7529 23.5675 15.7372 23.5079L13.1345 16.5398C13.2831 16.5612 13.4329 16.573 13.5829 16.575H13.6345C14.2534 16.569 14.8531 16.3541 15.3407 15.9635C15.8284 15.5728 16.1767 15.0283 16.3317 14.4142C16.4283 14.0357 16.6496 13.7031 16.9582 13.4727C17.2668 13.2424 17.6436 13.1285 18.0248 13.1504C18.2564 13.1659 18.4811 13.2376 18.6804 13.3596C18.8796 13.4815 19.0477 13.6503 19.1707 13.852C19.3085 14.0678 19.395 14.3137 19.4231 14.5699C19.4512 14.8261 19.4202 15.0855 19.3326 15.3273ZM18.1251 11.4065C18.0592 11.4065 17.9933 11.4065 17.9274 11.4065C17.1857 11.4055 16.4646 11.6567 15.8772 12.1208C15.2898 12.5849 14.8693 13.2356 14.6816 13.9709C14.6222 14.2141 14.4858 14.4302 14.2937 14.5853C14.1016 14.7405 13.8647 14.8259 13.6201 14.8282H13.59C13.2283 14.8303 12.8772 14.7026 12.5978 14.4672C12.3183 14.2317 12.1282 13.9035 12.0602 13.5394C11.9368 12.9667 11.9305 12.3741 12.0416 11.7988C12.1528 11.2235 12.3791 10.6781 12.7062 10.1969C13.0547 9.67074 13.5187 9.23566 14.061 8.92667C14.6034 8.61768 15.2089 8.4434 15.8289 8.41784C15.9464 8.41784 16.0667 8.41784 16.1813 8.41784C16.8015 8.44329 17.4073 8.61751 17.9499 8.9265C18.4925 9.23549 18.9568 9.67063 19.3054 10.1969C19.7102 10.7935 19.9592 11.4863 20.0288 12.2094C19.5008 11.7294 18.8299 11.4464 18.1251 11.4065V11.4065Z" fill="black" />
          </g>
          <defs>
            <clipPath id="clip0_65_373">
              <rect width="17.3333" height="18.7778" fill="white" transform="translate(7.33333 6.66663)" />
            </clipPath>
          </defs>
        </svg>
        <h2 className="text-[hsl(var(--component-text))] text-base font-medium mb-2">Two-Factor Authentication</h2>
        <CardDescription className="text-sm">
          Enter the 6-digit code from your authenticator app
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="w-full">
          <InputOTP maxLength={6} value={otp} onChange={setOtp} containerClassName="w-full justify-between">
            <InputOTPGroup className="w-full justify-between gap-2">
              <InputOTPSlot index={0} className="h-12 flex-1 text-lg border border-[hsl(var(--component-border))] bg-[hsl(var(--otp-input-bg))] text-[hsl(var(--component-text))] rounded-xl first:rounded-xl" />
              <InputOTPSlot index={1} className="h-12 flex-1 text-lg border border-[hsl(var(--component-border))] bg-[hsl(var(--otp-input-bg))] text-[hsl(var(--component-text))] rounded-xl" />
              <InputOTPSlot index={2} className="h-12 flex-1 text-lg border border-[hsl(var(--component-border))] bg-[hsl(var(--otp-input-bg))] text-[hsl(var(--component-text))] rounded-xl" />
              <InputOTPSlot index={3} className="h-12 flex-1 text-lg border border-[hsl(var(--component-border))] bg-[hsl(var(--otp-input-bg))] text-[hsl(var(--component-text))] rounded-xl" />
              <InputOTPSlot index={4} className="h-12 flex-1 text-lg border border-[hsl(var(--component-border))] bg-[hsl(var(--otp-input-bg))] text-[hsl(var(--component-text))] rounded-xl" />
              <InputOTPSlot index={5} className="h-12 flex-1 text-lg border border-[hsl(var(--component-border))] bg-[hsl(var(--otp-input-bg))] text-[hsl(var(--component-text))] rounded-xl last:rounded-xl" />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <div>
          <button
            disabled={!isComplete}
            className={`w-full h-10 rounded-xl font-medium transition-colors ${
              isComplete
                ? "text-white bg-[hsl(var(--auth-button-bg))] hover:bg-[hsl(var(--auth-button-hover))]"
                : "text-blue-500 cursor-not-allowed bg-[#1A224B]"
            }`}
          >
            {isComplete ? "Verify" : "Enter code to verify"}
          </button>
        </div>
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Having trouble?
          </p>
          <button className="text-xs text-muted-foreground hover:text-foreground transition-colors underline">
            Use backup code
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
