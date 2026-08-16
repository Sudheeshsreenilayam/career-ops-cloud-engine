// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

// LinkedIn Guest Search Provider — Zero-token public search scraper.
// Endpoint: https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search
// Parameters:
//   keywords: string
//   location: string
//   f_TPR: r86400 (past 24h) or r604800 (past week)
//   start: 0, 10, 20...

const BASE_URL = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search';

/**
 * @param {string} html
 * @returns {Array<{ title: string, url: string, company: string, location: string }>}
 */
export function parseLinkedInJobCards(html) {
  const jobCardRegex = /<li[\s\S]*?<\/li>/g;
  const cards = html.match(jobCardRegex) || [];
  const jobs = [];

  for (const card of cards) {
    const titleMatch = card.match(/<h3 class="base-search-card__title">([\s\S]*?)<\/h3>/i);
    const companyMatch = card.match(/<h4 class="base-search-card__subtitle">([\s\S]*?)<\/h4>/i);
    const locationMatch = card.match(/<span class="job-search-card__location">([\s\S]*?)<\/span>/i);
    const linkMatch = card.match(/href="(https:\/\/[a-z]{2,3}\.linkedin\.com\/jobs\/view\/[^"]+)"/i);

    if (titleMatch && linkMatch) {
      const cleanTitle = titleMatch[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
      const cleanCompany = companyMatch ? companyMatch[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim() : 'Unknown';
      const cleanLocation = locationMatch ? locationMatch[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim() : '';
      let url = linkMatch[1].split('?')[0]; // strip tracking telemetry
      
      if (cleanTitle && url) {
        jobs.push({ title: cleanTitle, company: cleanCompany, location: cleanLocation, url });
      }
    }
  }
  return jobs;
}

/** @type {Provider} */
export default {
  id: 'linkedin',
  detect(entry) {
    const url = entry.careers_url || entry.api || '';
    if (/linkedin\.com\/jobs/i.test(url)) {
      return { url };
    }
    return null;
  },
  async fetch(entry, ctx) {
    const keywords = entry.searchKeywords || entry.keywords || 'Operations Manager';
    const location = entry.searchLocation || entry.location || 'Chicago, IL';
    const timeFilter = entry.timeFilter || 'r604800'; // past week
    const maxPages = entry.maxPages || 3;
    const allJobs = [];

    for (let page = 0; page < maxPages; page++) {
      const start = page * 10;
      const targetUrl = `${BASE_URL}?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}&f_TPR=${timeFilter}&start=${start}`;
      
      try {
        const res = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        });

        if (!res.ok) {
          if (res.status === 429) {
            console.log(`[linkedin] Rate limited on page ${page + 1}. Stopping pagination.`);
            break;
          }
          break;
        }

        const html = await res.text();
        const jobs = parseLinkedInJobCards(html);
        if (jobs.length === 0) break;
        allJobs.push(...jobs);

        // Friendly 2-second rate delay between pages
        if (page < maxPages - 1) {
          await new Promise(r => setTimeout(r, 2000));
        }
      } catch (err) {
        console.error(`[linkedin] Error fetching page ${page + 1}: ${err.message}`);
        break;
      }
    }

    return allJobs;
  }
};
