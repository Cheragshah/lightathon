import { useState, useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AnimatePresence } from "framer-motion";
import { SplashScreen } from "./components/SplashScreen";
import { PageTransition } from "./components/PageTransition";
import { TagMangoAuthProvider } from "./components/TagMangoAuthProvider";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { useComingSoonRedirect } from "./hooks/useComingSoonRedirect";
import { useUserRole } from "./hooks/useUserRole";

// Lazy load all pages for code splitting
const Landing = lazy(() => import("./pages/Landing"));
const ComingSoon = lazy(() => import("./pages/ComingSoon"));
const Auth = lazy(() => import("./pages/Auth"));
const Signup = lazy(() => import("./pages/Signup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Questionnaire = lazy(() => import("./pages/Questionnaire"));
const ContinueQuestionnaire = lazy(() => import("./pages/ContinueQuestionnaire"));
const PersonaView = lazy(() => import("./pages/PersonaView"));
const PersonaRunView = lazy(() => import("./pages/PersonaRunView"));
const CodexView = lazy(() => import("./pages/CodexView"));
const CodexDetailView = lazy(() => import("./pages/CodexDetailView"));
const SharedView = lazy(() => import("./pages/SharedView"));
const TranscriptUpload = lazy(() => import("./pages/TranscriptUpload"));
const Documentation = lazy(() => import("./pages/Documentation"));
const Lightathon = lazy(() => import("./pages/Lightathon"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Home route with coming soon redirect logic (admins can bypass)
const HomeRoute = () => {
  const { isComingSoonEnabled, isLoading: comingSoonLoading } = useComingSoonRedirect();
  const { isAdmin, loading: roleLoading } = useUserRole();

  const isLoading = comingSoonLoading || roleLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Admins can bypass coming soon mode
  if (isComingSoonEnabled && !isAdmin) {
    return <Navigate to="/coming-soon" replace />;
  }

  return (
    <PageTransition>
      <Landing />
    </PageTransition>
  );
};

// Animated Routes Component
const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<LoadingSpinner />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/coming-soon" element={<PageTransition><ComingSoon /></PageTransition>} />
          <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
          <Route path="/signup" element={<PageTransition><Signup /></PageTransition>} />
          <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
          <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
          <Route path="/admin" element={<PageTransition><AdminDashboard /></PageTransition>} />
          <Route path="/analytics" element={<PageTransition><Analytics /></PageTransition>} />
          <Route path="/documentation" element={<PageTransition><Documentation /></PageTransition>} />
          
          <Route path="/questionnaire" element={<PageTransition><Questionnaire /></PageTransition>} />
          <Route path="/continue-questionnaire/:personaRunId" element={<PageTransition><ContinueQuestionnaire /></PageTransition>} />
          <Route path="/transcript-upload" element={<PageTransition><TranscriptUpload /></PageTransition>} />
          <Route path="/persona/:id" element={<PageTransition><PersonaView /></PageTransition>} />
          <Route path="/persona-run/:id" element={<PageTransition><PersonaRunView /></PageTransition>} />
          <Route path="/codex/:id" element={<PageTransition><CodexDetailView /></PageTransition>} />
          <Route path="/share/:token" element={<PageTransition><SharedView /></PageTransition>} />
          <Route path="/persona/:personaId/codex/:codexType" element={<PageTransition><CodexView /></PageTransition>} />
          <Route path="/lightathon/:enrollmentId" element={<PageTransition><Lightathon /></PageTransition>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </Suspense>
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
            <TagMangoAuthProvider>
              <AnimatedRoutes />
            </TagMangoAuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
