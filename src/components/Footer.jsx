import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from "@/components/ui/use-toast";
import { Twitter, Linkedin, Facebook, Rss, Github } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const footerDialogContent = {
  "Enhance Leads": {
    title: "Enhance Your Existing Leads",
    content: "Stop wasting time on dead-end calls. Upload your existing lead list, and our AI will enrich it with verified direct-dial numbers, email addresses, and key data points. We clean up outdated information, fill in the gaps, and give your sales team the accurate data they need to connect with decision-makers and boost pickup rates instantly."
  },
  "Find New Leads": {
    title: "Find High-Quality New Leads",
    content: "Grow your pipeline with fresh, targeted prospects. Define your ideal customer profile using criteria like industry, company size, location, and job titles. Our platform will generate a list of high-quality, verified leads that match your requirements, complete with the accurate contact information you need to start meaningful conversations."
  },
  "Pricing": {
    title: "Simple, Transparent Pricing",
    content: "No subscriptions, no hidden fees. Our pricing is straightforward: $0.03 per lead. Whether you're enhancing an existing list or sourcing new leads, you only pay for what you use. Get enterprise-grade data quality at a price that works for any team size. Start improving your ROI today."
  },
  "API Access": {
    title: "Powerful API Access",
    content: "Integrate the power of Verifies.co directly into your own applications and workflows. Our robust, well-documented REST API allows you to programmatically enhance leads, search for new prospects, and build custom solutions. Automate your data enrichment process and ensure your systems always have the most accurate information."
  },
  "Integrations": {
    title: "Seamless Integrations",
    content: "Connect Verifies.co with the tools you already use. We offer native integrations with popular CRMs and sales platforms like Salesforce, HubSpot, and more. Sync your data automatically, enrich leads directly within your CRM, and streamline your team's workflow to maximize efficiency and focus on selling."
  },
  "Case Studies": {
    title: "Proven Customer Success",
    content: "Companies using Verifies.co see an average pickup rate increase of 200-800%. From tech startups to established sales teams, our clients have closed more deals, reduced wasted time, and achieved unprecedented outbound success. Explore our case studies to see the real-world impact and learn how we can help you achieve similar results."
  },
  "Help Center": {
    title: "Comprehensive Help Center",
    content: "Find answers to your questions anytime in our extensive Help Center. We offer a wide range of articles, step-by-step guides, and best practice tutorials to help you get the most out of Verifies.co. Whether you're a new user or an experienced pro, our resources are here to support you."
  },
  "How it Works": {
    title: "Our Simple, Powerful Process",
    content: "Our AI-powered system is designed for simplicity and power. First, upload your lead list or define your target audience. Our AI then enriches and validates your data in real-time, checking against thousands of data points. Finally, download your enhanced list and watch your pickup rates soar. It's that easy to turn cold leads into warm conversations."
  },
  "System Status": {
    title: "Live System Status",
    content: "We are committed to transparency and reliability. You can view the real-time status of all our services on our dedicated status page. Check for any ongoing maintenance or service disruptions to stay informed. All systems are currently operational."
  },
  "Changelog": {
    title: "Latest Product Updates",
    content: "We're constantly improving Verifies.co. Our changelog provides a detailed record of all new features, enhancements, and bug fixes. See what's new, learn about recent improvements, and stay up-to-date with the evolution of our platform."
  },
  "About Us": {
    title: "Our Mission at Verifies.co",
    content: "Founded by sales veterans who were tired of outdated data and low connection rates, Verifies.co was built to solve a single problem: getting you on the phone with the right people. We are obsessed with data quality and passionate about empowering sales teams to do what they do best—sell. Our mission is to provide the most accurate, accessible, and affordable lead data on the market."
  },
  "Contact Sales": {
    title: "Contact Our Sales Team",
    content: "Have questions about enterprise plans, high-volume usage, or custom solutions? Our sales team is here to help. We can work with you to create a package that meets your specific needs and helps your organization achieve its growth targets. Reach out today to start the conversation."
  },
  "Careers": {
    title: "Join Our Team",
    content: "Want to be part of a fast-growing company that's revolutionizing the sales industry? We're always looking for talented and passionate individuals to join our team. Explore our open positions and find out how you can contribute to our mission of building the future of sales intelligence."
  },
  "Press": {
    title: "Verifies.co in the News",
    content: "For all media inquiries, please contact our press team. Here you can find our latest press releases, news coverage, and official statements. We're excited to share our story and our vision for a more efficient and effective sales world."
  },
  "Media Kit": {
    title: "Brand Assets & Media Kit",
    content: "Access our official brand assets, including logos, color palettes, and usage guidelines. Our media kit is designed for partners, press, and anyone looking to feature Verifies.co. Please ensure all usage complies with our brand standards."
  },
  "Verifies.co vs. ZoomInfo": {
    title: "Verifies.co vs. ZoomInfo",
    content: "While ZoomInfo offers a broad suite of tools, Verifies.co focuses on one thing: delivering the most accurate and affordable contact data for outbound sales. Our pay-as-you-go model means no expensive subscriptions, and our AI-driven verification process often yields higher pickup rates for a fraction of the cost. Choose us for targeted, high-ROI data enhancement."
  },
  "Verifies.co vs. Lead411": {
    title: "Verifies.co vs. Lead411",
    content: "Lead411 provides a solid platform, but Verifies.co differentiates with its simple, credit-based pricing and laser focus on pickup rates. We believe that the ultimate measure of data quality is whether you can connect with your prospect. Our specialized AI is fine-tuned for this purpose, giving you a direct path to more conversations without the platform bloat."
  },
  "Verifies.co vs. Manual Dialing": {
    title: "Verifies.co vs. Manual Dialing",
    content: "Stop burning hours on manual dialing and bad numbers. Verifies.co automates the data verification process, saving your sales team hundreds of hours and dramatically increasing their efficiency. By ensuring every number is a high-quality direct dial, we turn tedious manual labor into productive, revenue-generating conversations."
  },
  "Verifies.co vs. Data Enrichment": {
    title: "Verifies.co vs. Other Data Enrichment Tools",
    content: "Many enrichment tools simply add more data. Verifies.co adds the *right* data. We specialize in AI-verified direct-dial phone numbers—the key to boosting pickup rates. While others provide generic firmographic data, we provide the critical contact points that directly translate into more conversations and closed deals."
  },
  "Verifies.co vs. Other Vendors": {
    title: "Verifies.co vs. Other Vendors",
    content: "The sales intelligence market is crowded, but Verifies.co stands out with its transparent, pay-as-you-go pricing and unwavering focus on data that drives connections. No long-term contracts, no complex platforms—just simple, powerful, and affordable AI-verified data that delivers measurable results to your bottom line."
  },
  "How AI is Revolutionizing Cold Outreach": {
    title: "From The Blog: How AI is Revolutionizing Cold Outreach",
    content: "Artificial intelligence is no longer a futuristic concept—it's a practical tool that's transforming outbound sales. This article explores how AI-powered data verification and enrichment are helping sales teams break through the noise, connect with more prospects, and personalize their outreach at scale. Learn how to leverage AI to make every call count."
  },
  "Top 5 Metrics to Track for Outbound Sales": {
    title: "From The Blog: Top 5 Metrics to Track for Outbound Sales",
    content: "Are you tracking the right numbers? While dials and emails sent are easy to measure, they don't tell the whole story. This post breaks down the five most important metrics for a successful outbound sales strategy, with a special focus on pickup rate—the metric that most directly impacts your ability to generate revenue. Start measuring what matters."
  },
  "Why Pickup Rate is More Important Than You Think": {
    title: "From The Blog: Why Pickup Rate is More Important Than You Think",
    content: "In the world of outbound sales, one metric stands above the rest: pickup rate. It's the gateway to every conversation, every discovery call, and every closed deal. This article dives deep into why optimizing for pickup rate is the single most effective lever you can pull to increase sales performance and what you can do to improve it."
  },
  "Guide to Building a High-Quality Lead List": {
    title: "From The Blog: Guide to Building a High-Quality Lead List",
    content: "A successful sales campaign starts with a high-quality lead list. But what does 'high-quality' actually mean? This comprehensive guide walks you through the essential steps of building and maintaining a lead list that fuels your pipeline, from defining your ideal customer profile to implementing effective data hygiene practices."
  },
  "Terms of Service": {
    title: "Terms of Service",
    content: (
      <>
        <p className="mb-4">Welcome to Verifies.co. By accessing our service, you agree to these terms. Please read them carefully. Our services provide AI-powered lead enhancement. You must not misuse our services. For example, do not interfere with our services or try to access them using a method other than the interface and the instructions we provide.</p>
        <p className="mb-4">You are responsible for the data you provide. You retain ownership of any intellectual property rights that you hold in that content. When you upload data to our services, you give Verifies.co a worldwide license to use, host, store, and reproduce your data for the purpose of operating, promoting, and improving our services.</p>
        <p>We are constantly changing and improving our services. We may add or remove functionalities or features, and we may suspend or stop a service altogether.</p>
      </>
    ),
  },
  "Privacy Policy": {
    title: "Privacy Policy",
    content: (
      <>
        <p className="mb-4">Your privacy is important to us. This policy explains what information we collect and how we use it. We collect information you provide directly to us, such as when you create an account or upload a list of leads. This includes your contact information and the lead data itself.</p>
        <p className="mb-4">We use this information to operate, maintain, and provide you with the features and functionality of the service. We do not share your personal information or lead data with third parties except as necessary to provide the service or as required by law.</p>
        <p>We take reasonable measures to protect your information from unauthorized access or against loss, misuse, or alteration by third parties. However, no method of transmission over the Internet is 100% secure.</p>
      </>
    ),
  }
};

const FooterLink = ({ label }) => {
  const content = footerDialogContent[label];
  if (!content) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="text-gray-500 hover:text-orange-500 transition-colors duration-200 text-sm text-left">
          {label}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-white font-sans max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-navy-900 font-serif mb-4">{content.title}</DialogTitle>
          <DialogDescription as="div" className="text-navy-600 pt-2 text-base leading-relaxed text-left">
            {content.content}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

const SocialIcon = ({ icon: Icon }) => {
    const { toast } = useToast();
    return (
        <button
            onClick={() => toast({ title: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀"})}
            className="text-gray-400 hover:text-orange-500 transition-colors duration-200"
        >
            <Icon className="h-5 w-5" />
        </button>
    );
};


const Footer = () => {
  const { toast } = useToast();

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    toast({
      title: "✅ Subscribed!",
      description: "Thanks for joining our newsletter. Look out for updates!",
    });
    e.target.reset();
  };

  return (
    <footer className="w-full bg-gray-50/80 border-t border-gray-200/80 z-10 font-sans">
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-10">
          
          <div className="col-span-2 lg:col-span-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div>
                <span className="gradient-shimmer text-2xl font-sans font-bold">Verifies.co</span>
                <p className="text-gray-500 text-sm mt-3 max-w-md">AI-Powered Lead Enhancement. Boost your pickup rates and close more deals.</p>
              </div>
              <div className="mt-6 sm:mt-0 w-full sm:max-w-sm">
                  <p className="font-semibold text-gray-800 mb-3">Stay Updated</p>
                  <form onSubmit={handleNewsletterSubmit} className="flex">
                    <Input type="email" placeholder="Enter your email" className="rounded-r-none focus:ring-orange-500 border-gray-300" required />
                    <Button type="submit" className="rounded-l-none bg-orange-500 hover:bg-orange-600">Subscribe</Button>
                  </form>
              </div>
            </div>
            <hr className="my-8 border-gray-200/80" />
          </div>

          <div>
            <p className="font-semibold text-gray-800 tracking-wide">Products</p>
            <div className="flex flex-col items-start mt-5 space-y-4">
              <FooterLink label="Enhance Leads" />
              <FooterLink label="Find New Leads" />
              <FooterLink label="Pricing" />
              <FooterLink label="API Access" />
              <FooterLink label="Integrations" />
            </div>
          </div>

          <div>
            <p className="font-semibold text-gray-800 tracking-wide">Resources</p>
            <div className="flex flex-col items-start mt-5 space-y-4">
              <FooterLink label="Case Studies" />
              <FooterLink label="Help Center" />
              <FooterLink label="How it Works" />
              <FooterLink label="System Status" />
              <FooterLink label="Changelog" />
            </div>
          </div>
          
          <div>
            <p className="font-semibold text-gray-800 tracking-wide">Company</p>
            <div className="flex flex-col items-start mt-5 space-y-4">
              <FooterLink label="About Us" />
              <FooterLink label="Contact Sales" />
              <FooterLink label="Careers" />
              <FooterLink label="Press" />
              <FooterLink label="Media Kit" />
            </div>
          </div>

           <div>
            <p className="font-semibold text-gray-800 tracking-wide">Compare</p>
            <div className="flex flex-col items-start mt-5 space-y-4">
              <FooterLink label="Verifies.co vs. ZoomInfo" />
              <FooterLink label="Verifies.co vs. Lead411" />
              <FooterLink label="Verifies.co vs. Manual Dialing" />
              <FooterLink label="Verifies.co vs. Data Enrichment" />
              <FooterLink label="Verifies.co vs. Other Vendors" />
            </div>
          </div>

          <div className="lg:col-span-2">
            <p className="font-semibold text-gray-800 tracking-wide">From The Blog</p>
            <div className="flex flex-col items-start mt-5 space-y-4">
              <FooterLink label="How AI is Revolutionizing Cold Outreach" />
              <FooterLink label="Top 5 Metrics to Track for Outbound Sales" />
              <FooterLink label="Why Pickup Rate is More Important Than You Think" />
              <FooterLink label="Guide to Building a High-Quality Lead List" />
            </div>
          </div>
          
        </div>
        
        <hr className="my-10 border-gray-200" />
        
        <div className="flex flex-col sm:flex-row items-center justify-between">
          <div className="flex items-center space-x-6">
            <p className="text-sm text-gray-500">© {new Date().getFullYear()} Verifies.co</p>
            <FooterLink label="Terms of Service" />
            <FooterLink label="Privacy Policy" />
          </div>
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
              <SocialIcon icon={Twitter} />
              <SocialIcon icon={Linkedin} />
              <SocialIcon icon={Facebook} />
              <SocialIcon icon={Github} />
              <SocialIcon icon={Rss} />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;