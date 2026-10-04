export const safeJsonParse = (data: any, fallback: any = null) => {
  if (typeof data !== 'string') {
    if (data instanceof Blob) {
      console.error("Attempted to JSON.parse a Blob");
      return fallback;
    }
    return fallback;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error("Failed to parse JSON", e);
    return fallback;
  }
};
