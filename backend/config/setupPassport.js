import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import axios from 'axios';
import { User } from "../models/userSchema.js";

// Function to get additional user data from Google People API
const fetchGoogleUserDetails = async (accessToken) => {
  try {
    const { data } = await axios.get('https://people.googleapis.com/v1/people/me?personFields=genders,phoneNumbers', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const gender = data.genders?.[0]?.value || "Not Specified";
    const phone = data.phoneNumbers?.[0]?.value || "";

    return { gender, phone };
  } catch (error) {
    console.error("Error fetching additional user details:", error);
    return { gender: "Not Specified", phone: "" };
  }
};

// Configure Passport
const setupPassport = () => {
  passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL,
    scope: [
      'profile',
      'email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/user.gender.read', 
      'https://www.googleapis.com/auth/user.phonenumbers.read'
    ],
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Get additional user details (gender and phone)
      const { gender, phone } = await fetchGoogleUserDetails(accessToken);

      // Check if user already exists
      let user = await User.findOne({ googleId: profile.id });

      if (!user) {
        // Check if user with this email already exists
        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          // Link Google account to existing user
          user.googleId = profile.id;
          user.isVerified = true;
          user.gender = gender;
          user.phone = phone;
          await user.save();
        } else {
          // Create new user
          user = await User.create({
            fullName: profile.displayName,
            email: profile.emails[0].value,
            googleId: profile.id,
            role: "Patient",
            isVerified: true,
            phone,
            gender,
            dob: new Date(),
          });
        }
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));

  // Serialize user
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};

export default setupPassport;
