import React, { useState, useContext } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { UploadCloud, File, X, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/customSupabaseClient';
import { OrderContext } from '@/contexts/OrderContext';
import { useNavigate } from 'react-router-dom';

const LeadEnhancementForm = () => {
  const [file, setFile] = useState(null);
  const [email, setEmail] = useState('');
  const [leadCount, setLeadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { setInitialOrder } = useContext(OrderContext);
  const navigate = useNavigate();

  const pricePerLead = 0.03;
  const totalPrice = leadCount * pricePerLead;

  const onDrop = (acceptedFiles) => {
    const uploadedFile = acceptedFiles[0];
    if (uploadedFile.size > 50 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 50MB.",
        variant: "destructive",
      });
      return;
    }
    setFile(uploadedFile);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
  });

  const handleFileRemove = () => {
    setFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !email || leadCount <= 0) {
      toast({
        title: "Missing Information",
        description: "Please fill out all fields and upload a file.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);

    try {
      const fileExtension = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExtension}`;
      const filePath = `${email}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('lead_files')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const orderData = {
        orderType: 'enhanceExisting',
        email,
        leadCount,
        pricePerLead,
        totalPrice,
        productName: 'Lead Enhancement',
        metadata: {
          file_path: filePath,
        },
      };

      setInitialOrder(orderData);
      navigate('/upsell/1');

    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
          <h3 className="text-2xl font-bold text-navy-900">Enhance Your Leads</h3>
          <p className="text-navy-600 mt-1">Upload your list and let our AI work its magic.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="font-medium text-navy-800">Your Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-gray-50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="leadCount" className="font-medium text-navy-800">Number of Leads in File</Label>
          <Input
            id="leadCount"
            type="number"
            placeholder="e.g., 1000"
            value={leadCount > 0 ? leadCount : ''}
            onChange={(e) => setLeadCount(parseInt(e.target.value, 10) || 0)}
            required
            min="1"
            className="bg-gray-50"
          />
        </div>

        <div className="space-y-2">
          <Label className="font-medium text-navy-800">Upload Your Lead File</Label>
          {file ? (
            <div className="p-4 bg-gray-50 rounded-lg flex items-center justify-between border border-gray-200">
              <div className="flex items-center gap-3">
                <File className="w-6 h-6 text-orange-500" />
                <span className="text-sm font-medium text-navy-800 truncate max-w-[200px]">{file.name}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleFileRemove}>
                <X className="w-5 h-5 text-gray-500" />
              </Button>
            </div>
          ) : (
            <div
              {...getRootProps()}
              className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? 'border-orange-500 bg-orange-50' : 'border-gray-300 bg-gray-50 hover:border-orange-400'}`}
            >
              <input {...getInputProps()} />
              <UploadCloud className="w-10 h-10 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-navy-600">
                <span className="font-semibold text-orange-600">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500 mt-1">CSV, XLS, or XLSX (max. 50MB)</p>
            </div>
          )}
           <p className="text-xs text-gray-500 mt-1">For files exceeding 50MB, contact us over email for a transfer and exclude the file from your order.</p>
        </div>

        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-center">
          <p className="font-semibold text-navy-800">Total Price</p>
          <p className="text-3xl font-bold text-orange-600">${totalPrice.toFixed(2)}</p>
          <p className="text-sm text-navy-600">(${pricePerLead.toFixed(2)} per lead)</p>
        </div>

        <Button type="submit" disabled={isLoading} className="w-full text-lg font-bold py-6 bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-90">
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

export default LeadEnhancementForm;