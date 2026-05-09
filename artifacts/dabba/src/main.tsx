import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global Fetch Interceptor to route /api to the correct backend in production
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  if (typeof resource === "string" && resource.startsWith("/api")) {
    const baseUrl = import.meta.env.VITE_API_URL || "";
    resource = baseUrl + resource;
    
    // Ensure cross-origin cookies are sent for authentication
    config = config || {};
    config.credentials = "include";
  }
  return originalFetch(resource, config);
};

createRoot(document.getElementById("root")!).render(<App />);
