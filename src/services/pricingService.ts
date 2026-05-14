
/**
 * Centralized Pricing Engine for Student Bookings
 * Configurable platform fees and dynamic pricing calculations.
 */

export const PLATFORM_SETTINGS = {
  fee_percentage: 17, // Default 17%
};

export interface PricingProfile {
  subject: string;
  hasHourly: boolean;
  hasCourse: boolean;
  hourlyRate: number;
  coursePrice: number;
  courseDurationDays: number;
}

export const calculatePlatformFee = (baseAmount: number): number => {
  return (baseAmount * PLATFORM_SETTINGS.fee_percentage) / 100;
};

/**
 * Isolated Hourly Calculation
 */
export const calculateHourlyBookingTotal = (hourlyRate: number, dailyHours: number, days: number): number => {
  const baseAmount = hourlyRate * dailyHours * days;
  const fee = calculatePlatformFee(baseAmount);
  
  console.log('--- Hourly Calculation ---', {
    hourlyRate,
    dailyHours,
    days,
    baseAmount,
    fee,
    final: Math.ceil(baseAmount + fee)
  });

  return Math.ceil(baseAmount + fee);
};

/**
 * Isolated Course Calculation
 */
export const calculateCourseBookingTotal = (coursePrice: number): number => {
  const fee = calculatePlatformFee(coursePrice);
  
  console.log('--- Course Calculation ---', {
    coursePrice,
    fee,
    final: Math.ceil(coursePrice + fee)
  });

  return Math.ceil(coursePrice + fee);
};

export const getAvailableSessionDurations = (selectedPlan: string) => {
  if (selectedPlan === 'course') {
    return ["1.5", "2"]; // 1:30 hr, 2 hr
  }
  return ["1", "1.5", "2"];
};

export const getPlanMultiplier = (plan: string): number => {
  switch (plan) {
    case '1month':
    case 'monthly':
      return 30;
    case '3months':
      return 90;
    case '6months':
      return 180;
    case 'subscription':
      return 365;
    default:
      return 0;
  }
};

export const normalizeSubject = (subject: string = ''): string => {
  return subject.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
};
