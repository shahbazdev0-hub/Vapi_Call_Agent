import React, { useContext, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { OrderContext } from '@/contexts/OrderContext';
import { Button } from '@/components/ui/button';
import DynamicBackground from '@/components/DynamicBackground';
import { Zap, BookOpen, Video } from 'lucide-react';
import { Helmet } from 'react-helmet';

const UpsellPage = () => {
  const { step } = useParams();
  const navigate = useNavigate();
  const { initialOrder, addUpsell } = useContext(OrderContext);

  const currentStep = parseInt(step, 10);

  const upsellOffers = useMemo(() => {
    const basePrice = initialOrder ? initialOrder.totalPrice : 0;
    const priorityPrice = (basePrice * 0.10).toFixed(2);

    return [
      {
        step: 1,
        title: "Want Front-of-the-Line Processing?",
        description: "For just 10% more, we'll prioritize your order. Get your enhanced leads faster and start your outreach sooner!",
        priceType: 'percentage',
        price: 0.10,
        cta: `Yes, Prioritize My Order for $${priorityPrice}!`,
        icon: Zap,
        gradient: "from-amber-500 to-orange-600",
      },
      {
        step: 2,
        title: "Get Our Top-Performing Cold Call Scripts!",
        description: "Add our 12 unique cold call openers and approaches that are crushing it for our clients nationwide. Proven to boost engagement.",
        priceType: 'fixed',
        price: 25,
        cta: (
          <>
            Yes, Add the Scripts for $25! <span className="ml-2 text-gray-300 line-through">$125</span>
          </>
        ),
        icon: BookOpen,
        gradient: "from-sky-500 to-indigo-600",
      },
      {
        step: 3,
        title: "One Last Thing... Personal Script Coaching?",
        description: "Get a 1-on-1 Zoom consultation to review your current scripts. We guarantee you'll see a positive improvement in 30 days, or your money back.",
        priceType: 'fixed',
        price: 150,
        cta: "Yes, Add the Consultation for $150!",
        icon: Video,
        gradient: "from-emerald-500 to-green-600",
      }
    ];
  }, [initialOrder]);

  const offer = upsellOffers.find(o => o.step === currentStep);

  if (!initialOrder) {
    navigate('/');
    return null;
  }
  
  if (!offer) {
    navigate('/checkout');
    return null;
  }

  const handleAccept = () => {
    addUpsell(offer);
    goToNextStep();
  };

  const handleDecline = () => {
    goToNextStep();
  };

  const goToNextStep = () => {
    const nextStep = currentStep + 1;
    if (nextStep > upsellOffers.length) {
      navigate('/checkout');
    } else {
      navigate(`/upsell/${nextStep}`);
    }
  };

  const Icon = offer.icon;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white p-4 relative overflow-hidden">
      <Helmet>
        <title>{offer.title} - Verifies.co</title>
        <meta name="description" content={offer.description} />
      </Helmet>
      <DynamicBackground />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-2xl bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 md:p-12 text-center border border-gray-200"
      >
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-gradient-to-br ${offer.gradient}`}>
          <Icon className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-navy-900 mb-4">{offer.title}</h1>
        <p className="text-lg text-navy-700 mb-8">{offer.description}</p>
        
        <div className="flex flex-col space-y-4">
          <Button
            onClick={handleAccept}
            size="lg"
            className={`w-full text-lg font-bold py-8 bg-gradient-to-br ${offer.gradient} hover:opacity-90 transition-opacity duration-300`}
          >
            {offer.cta}
          </Button>
          <Button
            variant="link"
            onClick={handleDecline}
            className="text-navy-600 font-medium hover:text-navy-800"
          >
            No, thank you
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default UpsellPage;