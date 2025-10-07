import React, { useState, useEffect } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from "@/components/ui/use-toast";
import { getCurrentUser } from '@/services/authApi';
import { User, LogIn } from 'lucide-react';

const dialogContent = {
  "How It Works": {
    title: "How Verifies.co Works",
    description: "Our AI-powered system is designed for simplicity and power. First, upload your lead list. Our AI then enriches and validates your data in real-time, checking against thousands of data points. Finally, download your enhanced list and watch your pickup rates soar. It's that easy to turn cold leads into warm conversations.",
  },
  "Services": {
    title: "Our Services",
    description: "We offer two core services to supercharge your sales pipeline. 'Enhance Existing Leads' takes your current list and boosts its quality for maximum impact. 'Find New Leads' allows you to tap into our vast database to discover new, high-quality prospects in your target market. Both are designed to get you results, fast.",
  },
  "Pricing": {
    title: "Simple, Transparent Pricing",
    description: "No subscriptions, no hidden fees. Our pricing is straightforward and designed for any budget. It's just $0.03 per YOUR enhanced lead, or $0.08 to provide one of OUR new, AI-enhanced leads. Get enterprise-grade data quality and improve your ROI today."
  },
  "Case Studies": {
    title: "Success Stories",
    description: "Don't just take our word for it. Companies using Verifies.co see an average pickup rate increase of 200-800%. From tech startups to established sales teams, our clients have closed more deals, reduced wasted time, and achieved unprecedented outbound success. Explore our case studies to see the real-world impact.",
  },
  "About": {
    title: "About Verifies.co",
    description: "Founded by sales veterans who were tired of outdated data and low connection rates, Verifies.co was built to solve a single problem: getting you on the phone with the right people. We are obsessed with data quality and passionate about empowering sales teams to do what they do best—sell.",
  },
  "Help": {
    title: "Help & Support",
    description: "Need assistance? Our support team is here for you. Browse our comprehensive Help Center for articles and tutorials, or reach out to our team directly. We're committed to ensuring you get the most out of Verifies.co and are always happy to help with any questions you might have.",
  }
};

const NavItem = ({ label }) => {
  const content = dialogContent[label];
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-sm font-medium text-navy-700 hover:text-orange-500 hover:bg-orange-50/50 transition-colors">
          {label}
        </Button>
      </DialogTrigger>
      {content && (
        <DialogContent className="sm:max-w-md bg-white font-sans">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-navy-900 font-serif">{content.title}</DialogTitle>
            <DialogDescription className="text-navy-600 pt-2 text-base leading-relaxed">
              {content.description}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      )}
    </Dialog>
  );
};

const Header = ({ showAnnouncement }) => {
  const [hidden, setHidden] = useState(false);
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const { scrollY } = useScroll();
  const { toast } = useToast();

  // Check if user is logged in
  useEffect(() => {
    checkUserAuth();
  }, []);

  const checkUserAuth = async () => {
    const { user } = await getCurrentUser();
    setUser(user);
    setCheckingAuth(false);
  };

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious();
    if (latest > previous && latest > 150) {
      setHidden(true);
    } else {
      setHidden(false);
    }
  });

  const navItems = ["How It Works", "Services", "Pricing", "Case Studies", "About", "Help"];

  return (
    <motion.header 
      variants={{
        visible: { y: 0, opacity: 1 },
        hidden: { y: "-100%", opacity: 0 },
      }}
      animate={hidden ? "hidden" : "visible"}
      transition={{ duration: 0.35, ease: "easeInOut" }}
      className={`fixed left-0 right-0 z-50 transition-all duration-300 ${showAnnouncement ? 'top-10' : 'top-0'}`}
    >
      <div className="container mx-auto px-4">
        <div className="mt-4 flex items-center justify-between h-16 rounded-2xl bg-white/70 backdrop-blur-lg shadow-md border border-white/80 px-6">
          <Link to="/" className="flex items-center hover:opacity-80 transition">
            <span className="gradient-shimmer text-2xl font-sans font-bold">Verifies.co</span>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-2">
            {navItems.map((item) => (
              <NavItem key={item} label={item} />
            ))}
            <Button 
              onClick={() => toast({
                title: "📬 Contact Us!",
                description: "Our email is contact@verifies.co. We'd love to hear from you!",
              })}
              className="bg-white text-black hover:bg-orange-600 rounded-lg"
            >
              Contact
            </Button>
            
            {/* Login/Dashboard Button */}
            {!checkingAuth && (
              user ? (
                <Link to="/dashboard">
                  <Button className="bg-[#f97316] text-white hover:bg-blue-600 rounded-lg flex items-center gap-2">
                    <User size={18} />
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <Link to="/login">
                  <Button className="bg-[#f97316] text-white hover:bg-blue-600 rounded-lg flex items-center gap-2 shadow-md">
                    <LogIn size={18} />
                    Login
                  </Button>
                </Link>
              )
            )}
          </nav>
          
          <div className="md:hidden flex items-center gap-2">
            {!checkingAuth && (
              user ? (
                <Link to="/dashboard">
                  <Button size="sm" className="bg-blue-500 text-white hover:bg-blue-600">
                    <User size={16} />
                  </Button>
                </Link>
              ) : (
                <Link to="/login">
                  <Button size="sm" className="bg-blue-500 text-white hover:bg-blue-600">
                    <LogIn size={16} />
                  </Button>
                </Link>
              )
            )}
            <Button variant="ghost" onClick={() => toast({ title: "🚧 Mobile menu coming soon!"})}>
              Menu
            </Button>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;