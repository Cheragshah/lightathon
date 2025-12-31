import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AnimatePresence } from "framer-motion";
import { SplashScreen } from "./components/SplashScreen";
import { PageTransition } from "./components/PageTransition";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import Analytics from "./pages/Analytics";
import Questionnaire from "./pages/Questionnaire";
import PersonaView from "./pages/PersonaView";
import PersonaRunView from "./pages/PersonaRunView";
import CodexView from "./pages/CodexView";
import CodexDetailView from "./pages/CodexDetailView";
import SharedView from "./pages/SharedView";
import TranscriptUpload from "./pages/TranscriptUpload";
import Documentation from "./pages/Documentation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Animated Routes Component
const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Index /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/signup" element={<PageTransition><Signup /></PageTransition>} />
        <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
        <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
        <Route path="/admin" element={<PageTransition><AdminDashboard /></PageTransition>} />
        <Route path="/analytics" element={<PageTransition><Analytics /></PageTransition>} />
        <Route path="/documentation" element={<PageTransition><Documentation /></PageTransition>} />
        
        <Route path="/questionnaire" element={<PageTransition><Questionnaire /></PageTransition>} />
        <Route path="/transcript-upload" element={<PageTransition><TranscriptUpload /></PageTransition>} />
        <Route path="/persona/:id" element={<PageTransition><PersonaView /></PageTransition>} />
        <Route path="/persona-run/:id" element={<PageTransition><PersonaRunView /></PageTransition>} />
        <Route path="/codex/:id" element={<PageTransition><CodexDetailView /></PageTransition>} />
        <Route path="/share/:token" element={<PageTransition><SharedView /></PageTransition>} />
        <Route path="/persona/:personaId/codex/:codexType" element={<PageTransition><CodexView /></PageTransition>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initial app loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          
          {/* Splash Screen */}
          {showSplash && !isLoading && (
            <SplashScreen onComplete={handleSplashComplete} />
          )}
          
          <BrowserRouter>
            <AnimatedRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
