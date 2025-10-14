import React, { useState, useContext } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/components/ui/use-toast";
import { OrderContext } from '@/contexts/OrderContext';
import { useNavigate } from 'react-router-dom';

const NewLeadsForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    leadCount: 1000,
    industry: '',
    jobTitle: '',
    companySize: '',
    location: '',
    revenue: '',
    technologiesUsed: '',
    keywords: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { setInitialOrder } = useContext(OrderContext);
  const navigate = useNavigate();

  const pricePerLead = 0.08;
  const totalPrice = formData.leadCount * pricePerLead;

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleLeadCountChange = (e) => {
    setFormData(prev => ({ ...prev, leadCount: parseInt(e.target.value, 10) || 0 }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || formData.leadCount <= 0 || !formData.industry) {
      toast({
        title: "Missing Information",
        description: "Please fill out at least your email, lead count, and industry.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);

    const orderData = {
      orderType: 'getNew',
      email: formData.email,
      leadCount: formData.leadCount,
      pricePerLead,
      totalPrice,
      productName: 'New Pre-Enhanced Leads',
      metadata: {
        industry: formData.industry,
        job_title: formData.jobTitle,
        company_size: formData.companySize,
        location: formData.location,
        revenue: formData.revenue,
        technologies_used: formData.technologiesUsed,
        keywords: formData.keywords,
      },
    };

    setInitialOrder(orderData);
    navigate('/upsell/1');
    setIsLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="w-full max-w-lg mx-auto"
    >
      <form onSubmit={handleSubmit} className="space-y-6 p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-navy-900">Get New Leads</h3>
          <p className="text-navy-600 mt-1">Describe your ideal customer profile below.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="email" className="font-medium text-navy-800">Your Email</Label>
            <Input id="email" type="email" placeholder="you@company.com" value={formData.email} onChange={handleChange} required className="bg-gray-50" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="leadCount" className="font-medium text-navy-800">Number of Leads to Generate</Label>
            <Input id="leadCount" type="number" placeholder="e.g., 1000" value={formData.leadCount > 0 ? formData.leadCount : ''} onChange={handleLeadCountChange} required min="1" className="bg-gray-50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="industry" className="font-medium text-navy-800">Industry</Label>
            <Input id="industry" placeholder="e.g., SaaS, E-commerce" value={formData.industry} onChange={handleChange} required className="bg-gray-50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jobTitle" className="font-medium text-navy-800">Job Title</Label>
            <Input id="jobTitle" placeholder="e.g., Head of Sales" value={formData.jobTitle} onChange={handleChange} className="bg-gray-50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companySize" className="font-medium text-navy-800">Company Size</Label>
            <Input id="companySize" placeholder="e.g., 50-200 employees" value={formData.companySize} onChange={handleChange} className="bg-gray-50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location" className="font-medium text-navy-800">Location</Label>
            <Input id="location" placeholder="e.g., North America" value={formData.location} onChange={handleChange} className="bg-gray-50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="revenue" className="font-medium text-navy-800">Company Revenue</Label>
            <Input id="revenue" placeholder="e.g., $10M - $50M ARR" value={formData.revenue} onChange={handleChange} className="bg-gray-50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="technologiesUsed" className="font-medium text-navy-800">Technologies Used</Label>
            <Input id="technologiesUsed" placeholder="e.g., Salesforce, HubSpot" value={formData.technologiesUsed} onChange={handleChange} className="bg-gray-50" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="keywords" className="font-medium text-navy-800">Other Keywords</Label>
            <Input id="keywords" placeholder="e.g., B2B, Fintech, AI" value={formData.keywords} onChange={handleChange} className="bg-gray-50" />
          </div>
        </div>

        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg text-center">
          <p className="font-semibold text-navy-800">Total Price</p>
          <p className="text-3xl font-bold text-indigo-600">${totalPrice.toFixed(2)}</p>
          <p className="text-sm text-navy-600">(${pricePerLead.toFixed(2)} per lead)</p>
        </div>

        <Button type="submit" disabled={isLoading} className="w-full text-lg font-bold py-6 bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90">
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              Continue to Next Step <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </form>
    </motion.div>
  );
};

export default NewLeadsForm;