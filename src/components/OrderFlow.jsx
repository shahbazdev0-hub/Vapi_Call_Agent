import React, { useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LeadEnhancementForm from '@/components/LeadEnhancementForm';
import NewLeadsForm from '@/components/NewLeadsForm';
import { OrderContext } from '@/contexts/OrderContext';
import { useNavigate } from 'react-router-dom';

const OrderFlow = () => {
  const [orderType, setOrderType] = useState(null);
  const { setInitialOrder } = useContext(OrderContext);
  const navigate = useNavigate();

  const handleOrderStart = (type) => {
    setOrderType(type);
  };

  const handleFormSubmit = (orderData) => {
    setInitialOrder(orderData);
    navigate('/upsell/1');
  };

  const ChoiceCard = ({ icon, title, description, onClick, gradient }) => {
    const IconComponent = icon;
    return (
      <motion.div
        whileHover={{ y: -8, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`relative p-8 rounded-2xl cursor-pointer flex flex-col text-left space-y-4 overflow-hidden ${gradient} text-white`}
        onClick={onClick}
      >
        <div className="relative z-10 flex flex-col h-full">
          <div className="p-3 bg-white/20 rounded-full w-fit mb-4">
            <IconComponent className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold">{title}</h3>
          <p className="text-base text-white/80 flex-grow">{description}</p>
          <div className="mt-6 flex items-center font-semibold">
            <span>Get Started</span>
            <ArrowRight className="w-5 h-5 ml-2" />
          </div>
        </div>
      </motion.div>
    );
  };

  const renderContent = () => {
    if (orderType === 'enhanceExisting') {
      return <LeadEnhancementForm onFormSubmit={handleFormSubmit} />;
    }
    if (orderType === 'getNew') {
      return <NewLeadsForm onFormSubmit={handleFormSubmit} />;
    }
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className="text-center w-full"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-navy-900 mb-2">Place an Order</h2>
        <p className="text-navy-600 mb-8">Choose how you want to boost your sales pipeline.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          <ChoiceCard
            icon={UploadCloud}
            title="Enhance My Leads"
            description="Upload your current lead list and we'll enrich it with our AI."
            onClick={() => handleOrderStart('enhanceExisting')}
            gradient="bg-gradient-to-br from-orange-500 to-amber-500"
          />
          <ChoiceCard
            icon={Zap}
            title="Get New Leads"
            description="Tell us your ideal customer, and we'll build a high-quality list for you."
            onClick={() => handleOrderStart('getNew')}
            gradient="bg-gradient-to-br from-indigo-500 to-purple-500"
          />
        </div>
      </motion.div>
    );
  };

  return (
    <div className="w-full max-w-3xl p-4 sm:p-8 bg-transparent">
      {orderType && (
        <Button
          variant="ghost"
          onClick={() => setOrderType(null)}
          className="mb-6 text-sm font-medium text-navy-600 hover:bg-gray-200/50 hover:text-navy-700"
        >
          &larr; Back to Order Options
        </Button>
      )}
      <AnimatePresence mode="wait">
        {renderContent()}
      </AnimatePresence>
    </div>
  );
};

export default OrderFlow;