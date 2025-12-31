import logo from "@/assets/logo.png";

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-background mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Inner Clarity HUB" className="h-8 w-8 rounded-full" />
            <span className="font-heading font-semibold">Inner Clarity HUB</span>
          </div>
          
          <div className="text-sm text-muted-foreground text-center md:text-right">
            <p>© {new Date().getFullYear()} Inner Clarity HUB. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};
