// Site filter management for blacklist/whitelist functionality
// Used to control which websites the extension is active on

export type FilterMode = 'disabled' | 'blacklist' | 'whitelist';

export interface SiteFilterConfig {
  mode: FilterMode;
  sites: string[];
}

const DEFAULT_CONFIG: SiteFilterConfig = {
  mode: 'disabled',
  sites: []
};

const STORAGE_KEY = 'siteFilterConfig';

/**
 * Get the current site filter configuration
 */
export async function getSiteFilterConfig(): Promise<SiteFilterConfig> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      resolve(result[STORAGE_KEY] || DEFAULT_CONFIG);
    });
  });
}

/**
 * Save site filter configuration
 */
export async function saveSiteFilterConfig(config: SiteFilterConfig): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: config }, () => {
      resolve();
    });
  });
}

/**
 * Check if the extension should be enabled on the current URL
 * @param url - The URL to check
 * @param config - The site filter configuration
 * @returns true if the extension should be enabled, false otherwise
 */
export function shouldEnableOnSite(url: string, config: SiteFilterConfig): boolean {
  // If filtering is disabled, always enable
  if (config.mode === 'disabled') {
    return true;
  }

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // Check if the site matches any pattern in the list
    const matches = config.sites.some(pattern => matchesPattern(hostname, pattern));

    // For blacklist mode: enable if NOT in the list
    // For whitelist mode: enable ONLY if in the list
    if (config.mode === 'blacklist') {
      return !matches;
    } else if (config.mode === 'whitelist') {
      return matches;
    }
  } catch (error) {
    console.error('Error checking site filter:', error);
    // On error, default to enabled
    return true;
  }

  return true;
}

/**
 * Check if a hostname matches a pattern
 * Supports wildcards (*) and exact matches
 * Examples:
 *   - "example.com" matches "example.com" and "www.example.com"
 *   - "*.example.com" matches "sub.example.com" but not "example.com"
 *   - "*example*" matches any domain containing "example"
 */
function matchesPattern(hostname: string, pattern: string): boolean {
  // Remove leading/trailing whitespace
  pattern = pattern.trim();
  hostname = hostname.toLowerCase();
  pattern = pattern.toLowerCase();

  // Exact match
  if (hostname === pattern) {
    return true;
  }

  // Check if pattern contains wildcard
  if (pattern.includes('*')) {
    // Convert wildcard pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')  // Escape dots
      .replace(/\*/g, '.*');  // Replace * with .*
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(hostname);
  }

  // For patterns without wildcard, also match if hostname ends with the pattern
  // This allows "example.com" to match "www.example.com"
  if (hostname.endsWith('.' + pattern)) {
    return true;
  }

  return false;
}

/**
 * Add a site to the filter list
 */
export async function addSiteToFilter(site: string): Promise<void> {
  const config = await getSiteFilterConfig();
  
  // Normalize the site (remove protocol, path, etc.)
  const normalizedSite = normalizeSite(site);
  
  if (normalizedSite && !config.sites.includes(normalizedSite)) {
    config.sites.push(normalizedSite);
    await saveSiteFilterConfig(config);
  }
}

/**
 * Remove a site from the filter list
 */
export async function removeSiteFromFilter(site: string): Promise<void> {
  const config = await getSiteFilterConfig();
  config.sites = config.sites.filter(s => s !== site);
  await saveSiteFilterConfig(config);
}

/**
 * Normalize a site URL to just the hostname
 * Examples:
 *   - "https://www.example.com/path" -> "www.example.com"
 *   - "example.com" -> "example.com"
 *   - "*.example.com" -> "*.example.com" (preserve wildcards)
 */
function normalizeSite(site: string): string {
  site = site.trim();
  
  // If it's already a pattern with wildcard, return as-is
  if (site.includes('*')) {
    return site;
  }
  
  try {
    // Try to parse as URL
    const url = new URL(site.startsWith('http') ? site : `https://${site}`);
    return url.hostname;
  } catch (error) {
    // If parsing fails, assume it's already a hostname
    return site;
  }
}

/**
 * Get the current site's hostname
 */
export function getCurrentSiteHostname(): string {
  try {
    return window.location.hostname;
  } catch (error) {
    return '';
  }
}
