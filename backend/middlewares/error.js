class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const errorMiddleware = (err, req, res, next) => {
  // Default error values
  err.message = err.message || "Internal Server Error";
  err.statusCode = err.statusCode || 500;

  // Modify error based on specific cases
  if (err.code === 11000) {
    const message = `Duplicate ${Object.keys(err.keyValue)} Entered`;
    err.message = message; // Directly modify err.message
    err.statusCode = 400; // Directly modify err.statusCode
  } else if (err.name === "JsonWebTokenError") {
    const message = `Json Web Token is invalid, Try again!`;
    err.message = message;
    err.statusCode = 400;
  } else if (err.name === "TokenExpiredError") {
    const message = `Json Web Token is expired, Try again!`;
    err.message = message;
    err.statusCode = 400;
  } else if (err.name === "CastError") {
    const message = `Invalid ${err.path}`;
    err.message = message;
    err.statusCode = 400;
  } else if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map(val => val.message).join(", ");
    err.message = message;
    err.statusCode = 400;
  }

  // Build the final error message for the response
  const errorMessage = err.errors
    ? Object.values(err.errors)
        .map((error) => error.message)
        .join(" ")
    : err.message;

  // Send the error response
  return res.status(err.statusCode).json({
    success: false,
    message: errorMessage,
  });
};

export default ErrorHandler;
