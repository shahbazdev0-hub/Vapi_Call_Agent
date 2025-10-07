import { useStripePromise } from '@/contexts/StripeContext';
import { useToast } from '@/components/ui/use-toast';

export const useStripeCheckout = () => {
  const { stripePromise } = useStripePromise();
  const { toast } = useToast();

  const redirectToCheckout = async ({ lineItems, email }) => {
    if (!stripePromise) {
      toast({
        title: "Stripe Not Configured",
        description: "The Stripe integration has not been set up yet. Please provide the publishable key.",
        variant: "destructive",
      });
      console.error("Stripe is not initialized. A publishable key is required.");
      return;
    }

    const stripe = await stripePromise;

    const { error } = await stripe.redirectToCheckout({
      lineItems,
      mode: 'payment',
      customerEmail: email,
      successUrl: `${window.location.origin}?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${window.location.origin}`,
    });

    if (error) {
      toast({
        title: "Stripe Error",
        description: error.message,
        variant: "destructive",
      });
      console.error("Stripe checkout error:", error);
    }
  };

  return { redirectToCheckout };
};