import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api/client';

const BillingContext = createContext(null);

export function BillingProvider({ children, currentUser, showToast }) {
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [entitlements, setEntitlements] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load public plans once
  useEffect(() => {
    let isMounted = true;
    async function loadPlans() {
      try {
        const res = await api.getBillingPlans();
        if (isMounted) {
          setPlans(res.plans || []);
        }
      } catch (err) {
        console.warn('Failed to load billing plans:', err);
      }
    }
    loadPlans();
    return () => { isMounted = false; };
  }, []);

  // Fetch subscription & entitlements for authenticated student
  const fetchBillingState = useCallback(async () => {
    if (!currentUser) {
      setSubscription(null);
      setEntitlements(null);
      setLoading(false);
      return;
    }

    try {
      const [subRes, entRes] = await Promise.all([
        api.getSubscription().catch(() => ({ subscription: null })),
        api.getEntitlements().catch(() => ({ entitlements: null }))
      ]);

      setSubscription(subRes.subscription || null);
      setEntitlements(entRes.entitlements || null);
    } catch (err) {
      console.warn('Error syncing billing state:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchBillingState();
  }, [fetchBillingState]);

  // Gating helpers
  const canAccess = useCallback((featureCode) => {
    if (!entitlements || !entitlements.features) return false;
    return Boolean(entitlements.features[featureCode]);
  }, [entitlements]);

  const getLimit = useCallback((featureCode) => {
    if (!entitlements || !entitlements.limits) return null;
    return entitlements.limits[featureCode] ?? null;
  }, [entitlements]);

  const getUsage = useCallback((featureCode) => {
    if (!entitlements || !entitlements.usage) return 0;
    return entitlements.usage[featureCode] || 0;
  }, [entitlements]);

  const getRemaining = useCallback((featureCode) => {
    if (!entitlements || !entitlements.remaining) return null;
    return entitlements.remaining[featureCode] ?? null;
  }, [entitlements]);

  // Checkout flow
  const startCheckout = async (planCode, customCallback) => {
    try {
      const callbackUrl = customCallback || `${window.location.origin}/billing/callback`;
      const res = await api.initializeCheckout(planCode, callbackUrl);

      if (res.authorizationUrl) {
        if (res.authorizationUrl.startsWith('http://') || res.authorizationUrl.startsWith('https://')) {
          window.location.href = res.authorizationUrl;
        } else {
          // Relative route callback
          return res;
        }
      }
      return res;
    } catch (err) {
      if (showToast) {
        showToast({ type: 'error', title: 'Checkout Failed', message: err.message });
      }
      throw err;
    }
  };

  // Payment Verification flow
  const confirmPayment = async (reference) => {
    try {
      const res = await api.verifyPayment(reference);
      await fetchBillingState();
      return res;
    } catch (err) {
      if (showToast) {
        showToast({ type: 'error', title: 'Verification Failed', message: err.message });
      }
      throw err;
    }
  };

  // Cancel subscription flow
  const cancelPlan = async () => {
    try {
      const res = await api.cancelSubscription();
      await fetchBillingState();
      if (showToast) {
        showToast({ type: 'info', title: 'Subscription Updated', message: res.message });
      }
      return res;
    } catch (err) {
      if (showToast) {
        showToast({ type: 'error', title: 'Cancellation Failed', message: err.message });
      }
      throw err;
    }
  };

  const isPremium = Boolean(
    subscription &&
    subscription.planCode !== 'basic' &&
    subscription.isActive
  );

  const value = {
    plans,
    subscription,
    entitlements,
    loading,
    isPremium,
    canAccess,
    getLimit,
    getUsage,
    getRemaining,
    refetchBilling: fetchBillingState,
    startCheckout,
    confirmPayment,
    cancelPlan
  };

  return (
    <BillingContext.Provider value={value}>
      {children}
    </BillingContext.Provider>
  );
}

export function useBilling() {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error('useBilling must be used within a BillingProvider');
  }
  return context;
}

export const useEntitlements = useBilling;
