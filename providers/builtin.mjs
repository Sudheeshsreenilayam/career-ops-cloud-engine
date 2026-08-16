// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

// BuiltIn & BuiltIn Chicago Provider — Zero-token regional tech portal scraper.
// Supports both national BuiltIn (builtin.com) and regional hubs like BuiltIn Chicago (builtinchicago.org).

/**
 * @param {string} html
 * @param {string} domain
 * @returns {Array<{ title: string, url: string, company: string, location: string }>}
 */
export function parseBuiltInJobs(html, domain = 'https://www.builtinchicago.org') {
  const jobs = [];
  
  // Method 1: Check for JSON-LD Structured Data
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
  if (jsonLdMatch) {
    for (const tag of jsonLdMatch) {
      try {
        const rawJson = tag.replace(/<\/?script[^>]*>/gi, '');
        const data = JSON.parse(rawJson);
        const list = data.itemListElement || (Array.isArray(data) ? data : []);
        for (const item of list) {
          const jobObj = item.item || item;
          if (jobObj && jobObj.title && jobObj.url) {
            jobs.push({
              title: jobObj.title.trim(),
              company: jobObj.hiringOrganization?.name || 'BuiltIn Company',
              location: jobObj.jobLocation?.address?.addressLocality || 'Chicago, IL',
              url: jobObj.url.startsWith('http') ? jobObj.url : `${domain}${jobObj.url}`
            });
          }
        }
      } catch (e) {}
    }
  }

  if (jobs.length > 0) return jobs;

  // Method 2: HTML card regex fallback
  const jobLinkRegex = /href="(\/job\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = jobLinkRegex.exec(html)) !== null) {
    const rawTitle = match[2].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
    const relUrl = match[1];
    if (rawTitle && rawTitle.length > 3 && !jobs.some(j => j.url.includes(relUrl))) {
      jobs.push({
        title: rawTitle,
        company: 'BuiltIn Employer',
        location: domain.includes('chicago') ? 'Chicago, IL' : 'Remote / US',
        url: `${domain}${relUrl}`
      });
    }
  }

  return jobs;
}

/** @type {Provider} */
export default {
  id: 'builtin',
  detect(entry) {
    const url = entry.careers_url || entry.api || '';
    if (/builtin(chicago)?\.org|builtin\.com/i.test(url)) {
      return { url };
    }
    return null;
  },
  async fetch(entry, ctx) {
    const domain = entry.careers_url?.includes('builtin.com') ? 'https://builtin.com' : 'https://www.builtinchicago.org';
    const category = entry.category || 'operations';
    const maxPages = entry.maxPages || 2;
    const allJobs = [];

    for (let page = 1; page <= maxPages; page++) {
      const targetUrl = `${domain}/jobs/${category}?page=${page}`;
      try {
        const res = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        });

        if (!res.ok) break;
        const html = await res.text();
        const jobs = parseBuiltInJobs(html, domain);
        if (jobs.length === 0) break;
        allJobs.push(...jobs);

        if (page < maxPages) {
          await new Promise(r => setTimeout(r, 2000));
        }
      } catch (err) {
        console.error(`[builtin] Error fetching ${targetUrl}: ${err.message}`);
        break;
      }
    }

    return allJobs;
  }
};
