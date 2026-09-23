import User, { IUser } from '../models/User';

export const DIAMOND_COST_FOR_WOMEN_FILTER = 5;

/**
 * Checks if a user can afford the match filter and deducts diamonds if necessary.
 * @param userId The ID of the user requesting a match
 * @param genderFilter The gender filter the user selected ('Everyone', 'Male', 'Female')
 * @returns boolean indicating if the user has enough diamonds to proceed
 */
export const processMatchPayment = async (userId: string, genderFilter: string): Promise<boolean> => {
  try {
    const user = await User.findById(userId);
    if (!user) return false;

    // It is free to match with Men or Everyone.
    if (genderFilter !== 'Female') {
      return true;
    }

    // It costs diamonds to explicitly filter for Women
    if (user.diamonds < DIAMOND_COST_FOR_WOMEN_FILTER) {
      return false; // Not enough diamonds
    }

    // Deduct diamonds
    user.diamonds -= DIAMOND_COST_FOR_WOMEN_FILTER;
    await user.save();
    return true;

  } catch (error) {
    console.error('Error processing match payment:', error);
    return false;
  }
};
