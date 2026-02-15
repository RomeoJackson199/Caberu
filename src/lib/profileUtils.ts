import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { logger } from '@/lib/logger';

export interface ProfileData {
  first_name: string;
  last_name: string;
  phone: string;
  date_of_birth: string;
  medical_history: string;
  address: string;
  address_street: string;
  address_house_number: string;
  address_postal_code: string;
  address_city: string;
  emergency_contact: string;
  ai_opt_out?: boolean;
  profile_picture_url?: string;
}

/** Parse a combined address string ("Street HouseNumber, PostalCode City") into parts */
export const parseAddress = (address: string): { street: string; houseNumber: string; postalCode: string; city: string } => {
  if (!address) return { street: '', houseNumber: '', postalCode: '', city: '' };
  const parts = address.split(', ');
  if (parts.length >= 2) {
    const streetPart = parts[0];
    // Try to extract house number from the end of the street part
    const streetMatch = streetPart.match(/^(.+?)\s+(\d+\S*)$/);
    const street = streetMatch ? streetMatch[1] : streetPart;
    const houseNumber = streetMatch ? streetMatch[2] : '';
    const rest = parts.slice(1).join(', ');
    const cityParts = rest.split(' ');
    const postalCode = cityParts[0] || '';
    const city = cityParts.slice(1).join(' ') || '';
    return { street, houseNumber, postalCode, city };
  }
  return { street: address, houseNumber: '', postalCode: '', city: '' };
};

/** Combine address parts into a single string ("Street HouseNumber, PostalCode City") */
export const combineAddress = (street: string, houseNumber: string, postalCode: string, city: string): string => {
  const streetWithNumber = [street, houseNumber].filter(Boolean).join(' ');
  return [
    streetWithNumber,
    [postalCode, city].filter(Boolean).join(' '),
  ].filter(Boolean).join(', ');
};

const PROFILE_READ_SOURCE = 'secure_profiles_view';

// Profanity word list (can be expanded)
const PROFANITY_LIST = [
  'fuck', 'shit', 'ass', 'bitch', 'damn', 'bastard', 'crap', 'piss',
  'dick', 'cock', 'pussy', 'slut', 'whore', 'fag', 'nigger', 'cunt',
  'asshole', 'motherfucker', 'bullshit', 'goddamn', 'hell', 'retard'
];

// Validation functions
export const validateName = (name: string): { valid: boolean; error?: string } => {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return { valid: false, error: 'Name is required' };
  }

  if (trimmedName.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }

  // Check for profanity
  const lowerName = trimmedName.toLowerCase();
  for (const word of PROFANITY_LIST) {
    if (lowerName.includes(word)) {
      return { valid: false, error: 'Name contains inappropriate language' };
    }
  }

  return { valid: true };
};

export const validatePhone = (phone: string): { valid: boolean; error?: string } => {
  const trimmedPhone = phone.trim();

  if (!trimmedPhone) {
    return { valid: false, error: 'Phone number is required' };
  }

  // Check if it starts with +32
  if (!trimmedPhone.startsWith('+32')) {
    return { valid: false, error: 'Phone number must start with +32 (Belgian format)' };
  }

  // Remove +32 and check remaining digits
  const digitsOnly = trimmedPhone.slice(3).replace(/[\s\-\(\)]/g, '');

  // Belgian phone numbers have 9 digits after +32
  if (!/^\d{9}$/.test(digitsOnly)) {
    return { valid: false, error: 'Phone number must have 9 digits after +32 (e.g., +32 123 45 67 89)' };
  }

  return { valid: true };
};

export const validateAddress = async (address: string): Promise<{ valid: boolean; error?: string }> => {
  const trimmedAddress = address.trim();

  if (!trimmedAddress) {
    return { valid: false, error: 'Address is required' };
  }

  if (trimmedAddress.length < 5) {
    return { valid: false, error: 'Address must be at least 5 characters' };
  }

  // Verify address exists using OpenStreetMap Nominatim API
  try {
    const encodedAddress = encodeURIComponent(trimmedAddress + ', Belgium');
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=be`,
      {
        headers: {
          'User-Agent': 'Caberu-App/1.0'
        }
      }
    );

    if (!response.ok) {
      // If geocoding service fails, just check basic validation
      logger.warn('Address geocoding service unavailable, skipping location verification');
      return { valid: true };
    }

    const results = await response.json();

    if (!results || results.length === 0) {
      return { valid: false, error: 'Address not found. Please enter a valid Belgian address' };
    }

    return { valid: true };
  } catch (error) {
    // If geocoding fails, just proceed with basic validation
    logger.warn('Address validation error:', error);
    return { valid: true };
  }
};

export const validateDateOfBirth = (dateOfBirth: string): { valid: boolean; error?: string } => {
  if (!dateOfBirth) {
    return { valid: false, error: 'Date of birth is required' };
  }

  const date = new Date(dateOfBirth);
  const now = new Date();

  // Check if date is valid
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }

  // Check if date is in the future
  if (date > now) {
    return { valid: false, error: 'Date of birth cannot be in the future' };
  }

  // Check if age is reasonable (not older than 150 years)
  const age = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (age > 150) {
    return { valid: false, error: 'Date of birth is too far in the past (maximum age: 150 years)' };
  }

  // Check if age is at least 1 year
  if (age < 1) {
    return { valid: false, error: 'Patient must be at least 1 year old' };
  }

  return { valid: true };
};

export const saveProfileData = async (user: User, profileData: ProfileData) => {
  try {
    // Validate first name
    const firstNameValidation = validateName(profileData.first_name);
    if (!firstNameValidation.valid) {
      throw new Error(`First name: ${firstNameValidation.error}`);
    }

    // Validate last name
    const lastNameValidation = validateName(profileData.last_name);
    if (!lastNameValidation.valid) {
      throw new Error(`Last name: ${lastNameValidation.error}`);
    }

    // Validate phone number if provided
    if (profileData.phone?.trim()) {
      const phoneValidation = validatePhone(profileData.phone);
      if (!phoneValidation.valid) {
        throw new Error(`Phone: ${phoneValidation.error}`);
      }
    }

    // Combine address parts into single string for storage
    const combinedAddress = combineAddress(
      profileData.address_street?.trim() || '',
      profileData.address_house_number?.trim() || '',
      profileData.address_postal_code?.trim() || '',
      profileData.address_city?.trim() || ''
    );
    // Update the address field with the combined value
    profileData.address = combinedAddress;

    // Validate address if provided
    if (combinedAddress) {
      const addressValidation = await validateAddress(combinedAddress);
      if (!addressValidation.valid) {
        throw new Error(`Address: ${addressValidation.error}`);
      }
    }

    // Validate date of birth if provided
    if (profileData.date_of_birth) {
      const dobValidation = validateDateOfBirth(profileData.date_of_birth);
      if (!dobValidation.valid) {
        throw new Error(`Date of birth: ${dobValidation.error}`);
      }
    }

    // Clean and prepare data - only include fields that exist in the database
    const cleanData: Record<string, unknown> = {
      first_name: profileData.first_name.trim(),
      last_name: profileData.last_name.trim(),
      phone: profileData.phone?.trim() || null,
      date_of_birth: profileData.date_of_birth || null,
      medical_history: profileData.medical_history?.trim() || null,
    };

    // Only add address and emergency_contact if they exist in the database
    // These fields were added in a later migration
    if (profileData.address !== undefined) {
      cleanData.address = profileData.address.trim() || null;
    }
    if (profileData.emergency_contact !== undefined) {
      cleanData.emergency_contact = profileData.emergency_contact.trim() || null;
    }
    // Re-enabled after migration applied
    if (profileData.ai_opt_out !== undefined) {
      cleanData.ai_opt_out = profileData.ai_opt_out;
    }
    if (profileData.profile_picture_url !== undefined) {
      cleanData.profile_picture_url = profileData.profile_picture_url || null;
    }

    // Save to database (update, then insert if missing)
    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update(cleanData)
      .eq('user_id', user.id)
      .select();

    if (updateError) {
      logger.error('Database update error:', updateError);
      throw updateError;
    }

    if (!updateData || updateData.length === 0) {
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({ user_id: user.id, ...cleanData });
      if (insertError) {
        logger.error('Database insert error:', insertError);
        throw insertError;
      }
    }

    // Verify the save by reading back
    const { data: verifyData, error: verifyError } = await supabase
      .from(PROFILE_READ_SOURCE)
      .select('first_name, last_name, phone, date_of_birth, medical_history, address, emergency_contact, ai_opt_out')
      .eq('user_id', user.id)
      .maybeSingle();

    if (verifyError) {
      logger.error('Verification error:', verifyError);
      throw new Error('Failed to verify saved data');
    }

    // Removed localStorage backup for security - sensitive PII should not be stored locally

    return { success: true, data: verifyData };
  } catch (error) {
    logger.error('Profile save failed:', error);
    throw error;
  }
};

export const loadProfileData = async (user: User): Promise<ProfileData> => {
  try {
    // Try to load from database first
    const { data, error } = await supabase
      .from(PROFILE_READ_SOURCE)
      .select('first_name, last_name, phone, date_of_birth, medical_history, address, emergency_contact, ai_opt_out, profile_picture_url')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      logger.error('Database load error:', error);
      throw error;
    }

    const rawAddress = data?.address || '';
    const parsedAddress = parseAddress(rawAddress);

    const profileData: ProfileData = {
      first_name: data?.first_name || '',
      last_name: data?.last_name || '',
      phone: data?.phone || '',
      date_of_birth: data?.date_of_birth || '',
      medical_history: data?.medical_history || '',
      address: rawAddress,
      address_street: parsedAddress.street,
      address_house_number: parsedAddress.houseNumber,
      address_postal_code: parsedAddress.postalCode,
      address_city: parsedAddress.city,
      emergency_contact: data?.emergency_contact || '',
      ai_opt_out: data?.ai_opt_out || false,
      profile_picture_url: data?.profile_picture_url || ''
    };

    return profileData;
  } catch (error) {
    logger.error('Profile load failed:', error);

    // Removed localStorage fallback for security - sensitive PII should not be stored locally
    throw error;
  }
};

export const testDatabaseConnection = async () => {
  try {
    const { data, error } = await supabase
      .from(PROFILE_READ_SOURCE)
      .select('count')
      .limit(1);

    if (error) {
      logger.error('Database connection test failed:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    logger.error('Database connection test failed:', error);
    return { success: false, error };
  }
};
