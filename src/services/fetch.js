export default async function fetch(url, fetchOptions, options) {
  options = { format: "json", ...options };
  const response = await window.fetch(url, fetchOptions);
  if (response.ok) {
    return response[options.format]();
  } else {
    try {
      const body = response[options.format]();
      throw new FetchError(response.status, response.statusText, body);
    } catch {
      throw new FetchError(response.status, response.statusText);
    }
  }
}

class FetchError extends Error {
  constructor(statusCode, statusText, body) {
    super(`Fetch failed with HTTP ${statusCode}: ${statusText}; ${body}`);
    this.statusText = statusText;
    this.body = body;
  }
}
