import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Mitchell",
    role: "Life Coach & Speaker",
    image: "SM",
    content: "CodeXAlpha transformed how I position myself in the market. The AI-generated frameworks gave me clarity I've been searching for years. I now have a complete roadmap for my coaching business.",
    rating: 5,
    highlight: "Complete business clarity in days"
  },
  {
    name: "Marcus Chen",
    role: "Executive Leadership Coach",
    image: "MC",
    content: "The level of detail in the codexes is extraordinary. What would have taken me months to develop with consultants was ready in minutes. The positioning framework alone was worth it.",
    rating: 5,
    highlight: "Saved months of consultant fees"
  },
  {
    name: "Jennifer Rodriguez",
    role: "Health & Wellness Coach",
    image: "JR",
    content: "I was skeptical about AI understanding my unique approach, but CodeXAlpha nailed it. The personalized sections feel like they were written specifically for my practice.",
    rating: 5,
    highlight: "Perfectly captured my unique voice"
  },
  {
    name: "David Thompson",
    role: "Business Strategy Coach",
    image: "DT",
    content: "The marketing codex alone has 10x'd my client acquisition. Having a complete framework has made positioning myself to premium clients effortless. Game changer!",
    rating: 5,
    highlight: "10x client acquisition"
  },
  {
    name: "Rachel Kim",
    role: "Career Transition Coach",
    image: "RK",
    content: "Finally, a tool that understands the nuances of coaching. The audience analysis was spot-on, and the offer framework helped me structure my packages perfectly.",
    rating: 5,
    highlight: "Perfect offer structure"
  },
  {
    name: "Michael O'Brien",
    role: "Performance Coach",
    image: "MO",
    content: "CodeXAlpha gave me the professional framework I needed to scale from solopreneur to agency. The brand strategy codex is now our company bible.",
    rating: 5,
    highlight: "Scaled from solo to agency"
  }
];

export const TestimonialsCarousel = () => {
  return (
    <div className="w-full">
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {testimonials.map((testimonial, index) => (
            <CarouselItem key={index} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
              <Card className="glass-card border-primary/20 hover:border-primary/40 transition-all duration-300 h-full">
                <CardContent className="p-6 flex flex-col h-full">
                  {/* Quote Icon */}
                  <Quote className="h-8 w-8 text-primary/20 mb-4" />

                  {/* Rating */}
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-primary text-primary"
                      />
                    ))}
                  </div>

                  {/* Highlight */}
                  <div className="mb-4 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium inline-block">
                    {testimonial.highlight}
                  </div>

                  {/* Content */}
                  <p className="text-muted-foreground mb-6 flex-1 leading-relaxed">
                    "{testimonial.content}"
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-3 pt-4 border-t">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
                      {testimonial.image}
                    </div>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="flex justify-center gap-4 mt-8">
          <CarouselPrevious className="static translate-y-0" />
          <CarouselNext className="static translate-y-0" />
        </div>
      </Carousel>
    </div>
  );
};
