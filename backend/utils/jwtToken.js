export const generateToken = (user, message, statusCode, res) => {
  const token = user.generateJsonWebToken();

  // ✅ Set token name based on user role
  let cookieName = "token";
  if (user.role === "Admin") cookieName = "adminToken";
  else if (user.role === "Patient") cookieName = "patientToken";
  else if (user.role === "Doctor") cookieName = "doctorToken"; // ✅ MUST ADD THIS

  res
    .status(statusCode)
    .cookie(cookieName, token, {
      httpOnly: true,
      secure: false, // change to true in production with HTTPS
      sameSite: "Lax",
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })
    .json({
      success: true,
      message,
      user,
      token,
    });
};
