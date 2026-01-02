import logo from "@/assets/logo.png";

export const Footer = () => {
  return (
    <footer className="border-t border-border/50 bg-background mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Inner Clarity HUB" className="h-6 w-6 rounded-full opacity-80" />
            <span className="text-sm text-muted-foreground">Inner Clarity HUB</span>
          </div>
          
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Inner Clarity HUB. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
