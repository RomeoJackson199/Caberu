import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { TrendingUp, DollarSign, Users, Clock } from "lucide-react";

export const ROICalculator = () => {
  const [missedCalls, setMissedCalls] = useState(15);
  const [avgAppointmentValue, setAvgAppointmentValue] = useState(200);
  const [receptionistCost, setReceptionistCost] = useState(3500);

  // Calculations
  const appointmentsLost = Math.round(missedCalls * 0.7); // 70% of missed calls would book
  const monthlyRevenueLost = appointmentsLost * avgAppointmentValue;
  const yearlyRevenueLost = monthlyRevenueLost * 12;

  const caberuCost = 249; // Monthly cost
  const staffingSavings = receptionistCost > 0 ? receptionistCost - caberuCost : 0;
  const additionalRevenue = monthlyRevenueLost * 0.9; // Capture 90% of missed calls
  const totalMonthlySavings = staffingSavings + additionalRevenue;
  const yearlyROI = totalMonthlySavings * 12;

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
            Calculate Your Savings
          </h2>
          <p className="text-xl text-gray-600">
            See how much revenue you're losing to missed calls and how Caberu can help you capture it
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Card className="p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Your Practice Details</h3>

              <div className="space-y-6">
                {/* Missed Calls */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-medium text-gray-700">
                      Missed calls per day
                    </label>
                    <span className="text-lg font-bold text-blue-600">{missedCalls}</span>
                  </div>
                  <Slider
                    value={[missedCalls]}
                    onValueChange={(value) => setMissedCalls(value[0])}
                    max={50}
                    min={1}
                    step={1}
                    className="mb-2"
                  />
                  <p className="text-xs text-gray-500">Average dental practice misses 10-20 calls daily</p>
                </div>

                {/* Average Appointment Value */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Average appointment value ($)
                  </label>
                  <Input
                    type="number"
                    value={avgAppointmentValue}
                    onChange={(e) => setAvgAppointmentValue(Number(e.target.value))}
                    min={50}
                    max={1000}
                    step={10}
                    className="text-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">Typical range: $150-$300</p>
                </div>

                {/* Current Receptionist Cost */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monthly receptionist cost ($)
                  </label>
                  <Input
                    type="number"
                    value={receptionistCost}
                    onChange={(e) => setReceptionistCost(Number(e.target.value))}
                    min={0}
                    max={10000}
                    step={100}
                    className="text-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">Include salary + benefits. Enter 0 if none.</p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Results Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Card className="p-8 shadow-lg bg-gradient-to-br from-gray-900 to-gray-800 text-white">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-green-400" />
                Your Potential ROI
              </h3>

              <div className="space-y-6">
                {/* Monthly Lost Revenue */}
                <div className="p-4 rounded-lg bg-white/10 backdrop-blur">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-red-400" />
                    <p className="text-sm font-medium text-gray-300">Currently Losing Monthly</p>
                  </div>
                  <p className="text-3xl font-bold text-red-400">
                    ${monthlyRevenueLost.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    From ~{appointmentsLost} missed appointments/month
                  </p>
                </div>

                {/* Monthly Savings with Caberu */}
                <div className="p-4 rounded-lg bg-white/10 backdrop-blur">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-green-400" />
                    <p className="text-sm font-medium text-gray-300">Monthly Gain with Caberu</p>
                  </div>
                  <p className="text-3xl font-bold text-green-400">
                    ${totalMonthlySavings.toLocaleString()}
                  </p>
                  <div className="text-xs text-gray-400 mt-2 space-y-1">
                    {staffingSavings > 0 && (
                      <p>• ${staffingSavings.toLocaleString()} staffing savings</p>
                    )}
                    <p>• ${additionalRevenue.toLocaleString()} recovered revenue</p>
                    <p>• ${caberuCost} Caberu monthly cost</p>
                  </div>
                </div>

                {/* Yearly ROI */}
                <div className="p-4 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-5 w-5" />
                    <p className="text-sm font-medium">Annual ROI</p>
                  </div>
                  <p className="text-4xl font-bold">
                    ${yearlyROI.toLocaleString()}
                  </p>
                  <p className="text-xs mt-1 opacity-90">
                    {Math.round(yearlyROI / (caberuCost * 12))}x return on investment
                  </p>
                </div>

                {/* Time Savings */}
                <div className="p-4 rounded-lg bg-white/10 backdrop-blur">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-blue-400" />
                    <p className="text-sm font-medium text-gray-300">Time Saved</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-400">
                    ~20 hours/week
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Staff can focus on in-office patient care
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-gray-500">
            * Results based on industry averages and actual customer data. Individual results may vary.
          </p>
        </motion.div>
      </div>
    </section>
  );
};
