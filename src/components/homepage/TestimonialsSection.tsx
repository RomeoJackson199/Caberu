import { Star, Quote, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Testimonial {
  name: string;
  role: string;
  practice: string;
  content: string;
  rating: number;
  image?: string;
}

// Real early adopters — replace quotes with actual feedback from your dentists
const testimonials: Testimonial[] = [
  {
    name: "Early Adopter",
    role: "Practice Owner",
    practice: "General Dentistry Practice",
    content: "We switched to Caberu to streamline our scheduling and patient records. The setup was straightforward and the team has been responsive to our feedback as we get everything dialed in.",
    rating: 5,
  },
  {
    name: "Early Adopter",
    role: "Dentist",
    practice: "Private Dental Practice",
    content: "Having everything in one place — appointments, notes, billing — has cut down on the admin work after each patient. It's still early days but the workflow improvements are already noticeable.",
    rating: 5,
  },
];

export const TestimonialsSection = () => {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
            What Our Early Adopters Say
          </h2>
          <p className="text-xl text-gray-600">
            We're working closely with dental practices to build the tool they actually need
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div key={index}>
              <Card className="p-6 h-full relative">
                <Quote className="absolute top-4 right-4 h-8 w-8 text-blue-100" />

                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                <p className="text-gray-700 mb-6 leading-relaxed">
                  "{testimonial.content}"
                </p>

                <div className="flex items-center gap-3 mt-auto">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                    <p className="text-sm text-gray-500">{testimonial.practice}</p>
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-blue-50 border border-blue-200">
            <p className="text-sm font-medium text-gray-700">
              Currently onboarding dental practices —{" "}
              <span className="font-bold text-blue-700">get early access</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
