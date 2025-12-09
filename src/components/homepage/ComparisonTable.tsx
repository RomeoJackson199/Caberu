import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ComparisonRow {
  feature: string;
  caberu: boolean | string;
  traditional: boolean | string;
  competitors: boolean | string;
}

const comparisons: ComparisonRow[] = [
  {
    feature: "Answers every call instantly",
    caberu: true,
    traditional: false,
    competitors: "Limited hours"
  },
  {
    feature: "24/7 availability",
    caberu: true,
    traditional: false,
    competitors: "Varies"
  },
  {
    feature: "Real-time appointment booking",
    caberu: true,
    traditional: "During business hours",
    competitors: "Often delayed"
  },
  {
    feature: "Monthly cost",
    caberu: "$249+",
    traditional: "$3,500+",
    competitors: "$500-1,500"
  },
  {
    feature: "Handles multiple calls simultaneously",
    caberu: true,
    traditional: false,
    competitors: false
  },
  {
    feature: "Smart emergency triage",
    caberu: true,
    traditional: "Varies",
    competitors: "Basic"
  },
  {
    feature: "Natural conversation (not IVR)",
    caberu: true,
    traditional: true,
    competitors: false
  },
  {
    feature: "Automatic call logging",
    caberu: true,
    traditional: false,
    competitors: true
  },
  {
    feature: "Multi-language support",
    caberu: true,
    traditional: "Depends on staff",
    competitors: "Limited"
  },
  {
    feature: "Practice management integration",
    caberu: true,
    traditional: false,
    competitors: "Limited"
  },
  {
    feature: "Sick days / vacation coverage",
    caberu: "Never",
    traditional: "Requires backup",
    competitors: "Varies"
  },
  {
    feature: "Training required",
    caberu: "None",
    traditional: "Weeks",
    competitors: "Moderate"
  },
  {
    feature: "Scales with practice growth",
    caberu: true,
    traditional: "Hire more staff",
    competitors: "Additional costs"
  }
];

const renderCell = (value: boolean | string, isPrimary: boolean = false) => {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className={`h-5 w-5 ${isPrimary ? 'text-green-500' : 'text-gray-400'}`} />
    ) : (
      <X className="h-5 w-5 text-red-400" />
    );
  }
  return (
    <span className={`text-sm ${isPrimary ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
      {value}
    </span>
  );
};

export const ComparisonTable = () => {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
            How Caberu Compares
          </h2>
          <p className="text-xl text-gray-600">
            See why practices choose Caberu over traditional receptionists and other solutions
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <Card className="overflow-hidden shadow-xl">
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Feature</th>
                    <th className="text-center py-4 px-6">
                      <div className="inline-flex flex-col items-center">
                        <span className="font-bold text-lg text-blue-600">Caberu AI</span>
                        <span className="text-xs text-gray-500 font-normal mt-1">Recommended</span>
                      </div>
                    </th>
                    <th className="text-center py-4 px-6 font-semibold text-gray-700">
                      Traditional<br />Receptionist
                    </th>
                    <th className="text-center py-4 px-6 font-semibold text-gray-700">
                      Other AI<br />Solutions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((row, index) => (
                    <tr
                      key={index}
                      className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        } hover:bg-blue-50/30 transition-colors`}
                    >
                      <td className="py-4 px-6 font-medium text-gray-900">{row.feature}</td>
                      <td className="py-4 px-6 text-center bg-blue-50/50">
                        {renderCell(row.caberu, true)}
                      </td>
                      <td className="py-4 px-6 text-center">{renderCell(row.traditional)}</td>
                      <td className="py-4 px-6 text-center">{renderCell(row.competitors)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden">
              {comparisons.map((row, index) => (
                <div key={index} className="border-b border-gray-200 p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">{row.feature}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-blue-50 p-2 rounded">
                      <span className="text-sm font-medium text-blue-900">Caberu AI</span>
                      <div>{renderCell(row.caberu, true)}</div>
                    </div>
                    <div className="flex justify-between items-center p-2">
                      <span className="text-sm text-gray-600">Traditional</span>
                      <div>{renderCell(row.traditional)}</div>
                    </div>
                    <div className="flex justify-between items-center p-2">
                      <span className="text-sm text-gray-600">Competitors</span>
                      <div>{renderCell(row.competitors)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-gray-500">
            Data based on industry averages and customer feedback as of 2024
          </p>
        </motion.div>
      </div>
    </section>
  );
};
