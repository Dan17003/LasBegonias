import "dotenv/config";

export const obtenerJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters.");
  }
  return secret;
};
