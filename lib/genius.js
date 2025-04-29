/**
 * Genius API Library
 * Provides utility functions for interacting with the Genius API
 */

const axios = require('axios');
const cheerio = require('cheerio');

// Your Genius API token
const API_TOKEN = "1XydJWs6UmOFiOYRtRWuTMig2S-0fPyuPFf1pSrWmKHUxGZxkSJV_cx3mMkujp37";

// Browser-like headers to reduce chance of being blocked
const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.google.com/',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
};

// Common artists for popular one-word songs
// This helps improve search for simple song titles
const POPULAR_ONE_WORD_SONGS = {
    'blue': ['Eiffel 65', 'Beyoncé', 'LeAnn Rimes', 'Marina', 'Blue'],
    'perfect': ['Ed Sheeran', 'One Direction', 'Simple Plan'],
    'hello': ['Adele', 'Lionel Richie', 'OMFG'],
    'titanium': ['David Guetta', 'Sia'],
    'believer': ['Imagine Dragons'],
    'havana': ['Camila Cabello'],
    'chandelier': ['Sia'],
    'radioactive': ['Imagine Dragons'],
    'unstoppable': ['Sia'],
    'royals': ['Lorde'],
    'happy': ['Pharrell Williams'],
    'shallow': ['Lady Gaga', 'Bradley Cooper'],
    'photograph': ['Ed Sheeran', 'Nickelback'],
    'dynamite': ['BTS', 'Taio Cruz'],
    'lose': ['Eminem'],
    'closer': ['The Chainsmokers'],
    'thunder': ['Imagine Dragons'],
    'shape': ['Ed Sheeran'],
    'happier': ['Marshmello', 'Ed Sheeran'],
    'demons': ['Imagine Dragons']
};

/**
 * GeniusClient class for interacting with Genius API
 */
class GeniusClient {
    /**
     * Create a new Genius API client
     * @param {string} apiToken - Genius API access token
     */
    constructor(apiToken = API_TOKEN) {
        this.apiToken = apiToken;
        this.baseUrl = "https://api.genius.com";
        this.retryCount = 2;
        this.retryDelay = 1000;
        
        // Create axios instance with default configuration
        this.axiosInstance = axios.create({
            timeout: 10000,
            headers: BROWSER_HEADERS
        });
    }

    /**
     * Sleep for specified milliseconds
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Format lyrics with proper stanza spacing for better readability
     * This enhanced version ensures each stanza appears on separate lines
     */
    formatStanzaSpacing(lyrics) {
        if (!lyrics) return '';
        
        // Step 1: Standardize line endings
        let formattedLyrics = lyrics
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');
        
        // Step 2: Handle section headers like [Verse], [Chorus], etc.
        formattedLyrics = formattedLyrics.replace(/\[([^\]]+)\]/g, '\n\n[$1]\n');
        
        // Step 3: Identify stanzas (groups of lines separated by blank lines)
        const stanzas = formattedLyrics.split(/\n\s*\n/);
        
        // Step 4: Process each stanza
        const processedStanzas = stanzas.map(stanza => {
            // Trim whitespace from each stanza
            return stanza.trim();
        });
        
        // Step 5: Join stanzas with double newlines for clear separation
        formattedLyrics = processedStanzas.join('\n\n');
        
        // Step 6: Final cleanup to standardize spacing
        return formattedLyrics
            .replace(/\n{4,}/g, '\n\n')  // Replace more than 3 newlines with just 2
            .replace(/^\s+|\s+$/g, '');  // Trim whitespace from beginning and end
    }

    /**
     * Enhance a simple song query with potential artist information
     * @param {string} query - Original search query
     * @returns {string} - Enhanced query with artist information if applicable
     */
    enhanceSearchQuery(query) {
        // Check if the query is just a simple one-word song title
        const simplifiedQuery = query.toLowerCase().trim();
        
        // Check if this might be an Indian song based on common words or patterns
        const mightBeIndianSong = /hindi|bollywood|punjabi|tamil|telugu|kannada|malayalam|bengali|marathi|bhojpuri|gujarati|urdu|arijit|shreya|sonu|atif|neha|kumar sanu|alka|udit|lata|kishore|rafi|asha|himesh|darshan|yo yo|badshah|diljit|jubin|dhvani|tulsi|vishal|shankar|pritam|sid sriram|mohit|sunidhi|kanika/i.test(simplifiedQuery);
        
        // If it might be an Indian song, don't apply Western artist matching
        if (mightBeIndianSong || /^[^\u0000-\u007F]+/.test(query)) { // Non-Latin characters likely indicate non-Western song
            // For Indian songs, check if we should add artist info
            if (simplifiedQuery === "tum hi ho" || simplifiedQuery === "tumhiho") {
                return "Arijit Singh Tum Hi Ho Aashiqui 2";
            } else if (simplifiedQuery === "moh moh ke dhaage" || simplifiedQuery === "mohmohkedhaage") {
                return "Papon Moh Moh Ke Dhaage";
            } else if (simplifiedQuery === "kaise hua" || simplifiedQuery === "kaisehua") {
                return "Vishal Mishra Kaise Hua Kabir Singh";
            } else if (simplifiedQuery === "raatan lambiyan" || simplifiedQuery === "raataan lambiyan" || simplifiedQuery.includes("lambiyan")) {
                return "Jubin Nautiyal Raatan Lambiyan Shershaah";
            } else if (simplifiedQuery === "chaiyya chaiyya" || simplifiedQuery === "chaiyyachaiyya") {
                return "Sukhwinder Singh Chaiyya Chaiyya";
            } else if (simplifiedQuery === "kun faya kun" || simplifiedQuery === "kunfayakun") {
                return "AR Rahman Kun Faya Kun";
            } else if (simplifiedQuery === "tumse hi" || simplifiedQuery === "tumsehi") {
                return "Mohit Chauhan Tumse Hi Jab We Met";
            } else if (simplifiedQuery === "kesariya") {
                return "Arijit Singh Kesariya Brahmastra";
            } else if (simplifiedQuery === "gerua") {
                return "Arijit Singh Gerua Dilwale";
            } else if (simplifiedQuery === "agar tum saath ho" || simplifiedQuery === "agartum") {
                return "Arijit Singh Alka Yagnik Agar Tum Saath Ho Tamasha";
            } else if (simplifiedQuery === "channa mereya" || simplifiedQuery === "channamereya") {
                return "Arijit Singh Channa Mereya Ae Dil Hai Mushkil";
            }
            
            // Return original query for other Indian songs
            return query;
        }
        
        // For one-word song titles, try to add popular artists to improve search
        if (!simplifiedQuery.includes(' ') && POPULAR_ONE_WORD_SONGS[simplifiedQuery]) {
            // Get the first artist associated with this song title
            const artist = POPULAR_ONE_WORD_SONGS[simplifiedQuery][0];
            return `${artist} ${simplifiedQuery}`;
        }
        
        // For already specific searches with artist info, keep as is
        if (simplifiedQuery.includes(' - ') || simplifiedQuery.includes(' by ')) {
            return query;
        }
        
        return query;
    }

    /**
     * Search for songs on Genius
     * @param {string} query - Search query
     * @param {number} limit - Maximum number of results to return
     * @returns {Promise<Array>} - Array of search results
     */
    async searchSong(query, limit = 10) {
        try {
            // Check if this is likely an Indian song
            const isLikelyIndianSong = /hindi|punjabi|bollywood|tamil|telugu|kannada|malayalam|bengali|marathi|bhojpuri|gujarati|urdu|arijit|shreya|sonu|atif|neha|kumar sanu|alka|udit|lata|kishore|rafi|asha|himesh|darshan|yo yo|badshah|diljit|arjit|jubin|dhvani|tulsi|vishal|shankar|pritam|tum hi ho|raabta|kaise hua|raatan lambiyan|moh moh ke|chaiyya|kun faya kun|channa mereya|gerua|kesariya|malhari|ae dil hai mushkil|deewani mastani|agar tum saath ho|zaalima|bulleya|hawayein|bekhayali|kalank|shayad|thodi jagah/i.test(query.toLowerCase());
            
            // For Indian songs, skip Genius API and go directly to Indian lyrics sources
            if (isLikelyIndianSong) {
                console.log(`[Genius] Query "${query}" identified as likely Indian song, trying specialized sources first`);
                
                // Try to get lyrics from specialized Indian sources first
                try {
                    // First try LyricsBGM which is good for Indian songs
                    const enhancedQuery = this.enhanceSearchQuery(query);
                    console.log(`[Genius] Using enhanced query for Indian song: "${enhancedQuery}"`);
                    
                    // For some very specific popular Hindi songs, return custom results
                    const lowerQuery = query.toLowerCase().trim();
                    
                    // Special handling for commonly searched Hindi songs to ensure correct results
                    if (lowerQuery === "tum hi ho" || lowerQuery === "tum hi ho lyrics" || lowerQuery.includes("tum hi ho arijit")) {
                        return [{
                            title: "Tum Hi Ho",
                            primary_artist: { name: 'Arijit Singh' },
                            url: `https://www.google.com/search?q=${encodeURIComponent("Arijit Singh Tum Hi Ho Aashiqui 2 lyrics")}`,
                            id: 0
                        }];
                    }
                    else if (lowerQuery === "kaise hua" || lowerQuery === "kaise hua lyrics" || lowerQuery.includes("kaise hua vishal")) {
                        return [{
                            title: "Kaise Hua",
                            primary_artist: { name: 'Vishal Mishra' },
                            url: `https://www.google.com/search?q=${encodeURIComponent("Vishal Mishra Kaise Hua Kabir Singh lyrics")}`,
                            id: 0
                        }];
                    }
                    else if (lowerQuery === "raatan lambiyan" || lowerQuery === "raataan lambiyan" || lowerQuery.includes("lambiyan")) {
                        return [{
                            title: "Raataan Lambiyan",
                            primary_artist: { name: 'Jubin Nautiyal' },
                            url: `https://www.google.com/search?q=${encodeURIComponent("Jubin Nautiyal Raataan Lambiyan Shershaah lyrics")}`,
                            id: 0
                        }];
                    }
                    // Continue with normal search if not a special case
                } catch (indianErr) {
                    console.log(`[Genius] Error in Indian song specialized handling: ${indianErr.message}`);
                    // Continue with normal search
                }
            }
            
            // First, enhance the query for better search results
            const enhancedQuery = this.enhanceSearchQuery(query);
            
            console.log(`[Genius] Searching for: "${enhancedQuery}" (original: "${query}")`);
            
            const response = await axios.get(
                `${this.baseUrl}/search?q=${encodeURIComponent(enhancedQuery)}&per_page=${limit}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`
                    }
                }
            );
            
            // Log API response status for debugging
            console.log(`[Genius] API response status: ${response.status}, found ${response.data.response.hits.length} results`);
            
            if (response.data.response.hits.length === 0) {
                // If no results and we used an enhanced query, try the original
                if (enhancedQuery !== query) {
                    console.log(`[Genius] No results with enhanced query, trying original query: "${query}"`);
                    return this.searchSong(query, limit);
                }
                
                // Try also with "lyrics" added to the query
                if (!query.toLowerCase().includes('lyrics')) {
                    console.log(`[Genius] No results, trying with 'lyrics' added: "${query} lyrics"`);
                    return this.searchSong(query + ' lyrics', limit);
                }
                
                console.log(`[Genius] No results found for "${query}"`);
                return [];
            }
            
            // If this is likely an Indian song, filter the results to prioritize Indian artists/titles
            let hits = response.data.response.hits;
            
            if (isLikelyIndianSong) {
                console.log(`[Genius] Filtering results to prioritize Indian content for "${query}"`);
                
                // First try to find results with Indian artists or Hindi keywords
                const indianResults = hits.filter(hit => {
                    const title = hit.result.title.toLowerCase();
                    const artistName = hit.result.primary_artist.name.toLowerCase();
                    
                    return /arijit|shreya|sonu|atif|neha|kumar|alka|udit|lata|kishore|rafi|asha|himesh|darshan|badshah|diljit|jubin|dhvani|tulsi|vishal|pritam|bollywood|hindi/i.test(artistName) ||
                           /hindi|bollywood|punjabi|tamil|telugu|urdu|aashiqui|kabir singh|shershaah/i.test(title);
                });
                
                if (indianResults.length > 0) {
                    console.log(`[Genius] Found ${indianResults.length} Indian results, prioritizing these`);
                    hits = indianResults;
                }
            }
            
            return hits.map(hit => hit.result);
        } catch (error) {
            console.error(`[Genius] Search error: ${error.message}`);
            if (error.response) {
                console.error(`[Genius] Status: ${error.response.status}, Data:`, JSON.stringify(error.response.data));
            }
            
            // Fallback: Try to search using AZLyrics
            try {
                console.log(`[Genius] Falling back to AZLyrics search for: "${query}"`);
                const azResults = await this.searchAZLyrics(query);
                if (azResults.length > 0) {
                    console.log(`[Genius] AZLyrics found ${azResults.length} results`);
                    return azResults;
                }
                console.log(`[Genius] AZLyrics found no results`);
            } catch (fallbackError) {
                console.error(`[Genius] AZLyrics fallback search failed: ${fallbackError.message}`);
            }
            
            // Return dummy result as last resort
            console.log(`[Genius] Returning dummy result for: "${query}"`);
            return [{
                title: query,
                primary_artist: { name: 'Unknown Artist' },
                url: `https://www.google.com/search?q=${encodeURIComponent(query + " lyrics")}`,
                id: 0
            }];
        }
    }
    
    /**
     * Search AZLyrics for songs
     */
    async searchAZLyrics(query) {
        try {
            // Format query for better results
            const searchQuery = query.trim().replace(/\s+/g, '+');
            const searchUrl = `https://search.azlyrics.com/search.php?q=${encodeURIComponent(searchQuery)}`;
            
            const response = await this.axiosInstance.get(searchUrl);
            const $ = cheerio.load(response.data);
            
            const results = [];
            
            // Process song results
            $('table.table-condensed').first().find('tr').each((i, elem) => {
                if (i >= 5) return; // Limit to 5 results
                
                const titleElem = $(elem).find('td a').first();
                const title = titleElem.text().trim();
                const url = titleElem.attr('href');
                
                // Extract artist from the second td
                const artistText = $(elem).find('td').eq(1).text().trim();
                const artistMatch = artistText.match(/by:\s*(.*?)$/i);
                const artistName = artistMatch ? artistMatch[1].trim() : 'Unknown Artist';
                
                if (title && url) {
                    results.push({
                        title: title,
                        primary_artist: { name: artistName },
                        url: url,
                        id: i
                    });
                }
            });
            
            return results;
        } catch (error) {
            console.error("Error searching AZLyrics:", error.message);
            return [];
        }
    }
    
    /**
     * Extract lyrics from AZLyrics
     */
    async getLyricsFromAZLyrics(url) {
        try {
            const response = await this.axiosInstance.get(url);
            const $ = cheerio.load(response.data);
            
            // AZLyrics has the lyrics in a div with no class between specific comment markers
            let lyrics = '';
            const divs = $('div');
            
            // Find the lyrics div (usually between start/end comments)
            divs.each((i, elem) => {
                const prevNode = $(elem).prev();
                const nextNode = $(elem).next();
                
                if (prevNode && prevNode.get(0).type === 'comment' && 
                    nextNode && nextNode.get(0).type === 'comment' &&
                    prevNode.get(0).data.includes('start') && 
                    nextNode.get(0).data.includes('end')) {
                    lyrics = $(elem).text().trim();
                }
            });
            
            // If not found with comments, try another approach
            if (!lyrics) {
                // The lyrics div typically has no class and is after ringtone div
                $('.ringtone').nextAll('div').each((i, elem) => {
                    if (!$(elem).attr('class') && $(elem).text().trim().length > 100) {
                        lyrics = $(elem).text().trim();
                    }
                });
            }
            
            if (lyrics) {
                return this.formatStanzaSpacing(lyrics);
            }
            
            throw new Error("Could not extract lyrics from AZLyrics");
        } catch (error) {
            console.error("Error extracting lyrics from AZLyrics:", error.message);
            throw error;
        }
    }

    /**
     * Get lyrics for a song by scraping the Genius webpage
     * @param {string} url - Genius song URL
     * @returns {Promise<string>} - Song lyrics
     */
    async getLyrics(url) {
        try {
            // If it's an AZLyrics URL
            if (url.includes('azlyrics.com')) {
                return await this.getLyricsFromAZLyrics(url);
            }
            
            // Enhanced headers specifically for hosting environments
            const enhancedHeaders = {
                ...BROWSER_HEADERS,
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'sec-ch-ua': '"Google Chrome";v="123", "Not:A-Brand";v="8"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"'
            };
            
            try {
                // Try direct Genius API approach with enhanced headers
                const response = await this.axiosInstance.get(url, {
                    headers: enhancedHeaders,
                    timeout: 15000 // Longer timeout for hosting environments
                });
                
                const $ = cheerio.load(response.data);
                
                // Extract lyrics from the page with improved selector handling
                let lyrics = '';
                
                // Try modern selector
                const lyricsContainers = $('[data-lyrics-container="true"]');
                if (lyricsContainers.length > 0) {
                    lyricsContainers.each((i, elem) => {
                        lyrics += $(elem).text() + "\n";
                    });
                }
                
                // If no lyrics found, try legacy selector
                if (!lyrics.trim()) {
                    const lyricsDiv = $('.lyrics');
                    if (lyricsDiv.length > 0) {
                        lyrics = lyricsDiv.text().trim();
                    }
                }
                
                // Try to extract from structured JSON data if still not found
                if (!lyrics.trim()) {
                    $('script').each((i, elem) => {
                        const scriptContent = $(elem).html() || '';
                        if (scriptContent.includes('window.__PRELOADED_STATE__')) {
                            try {
                                const match = scriptContent.match(/window\.__PRELOADED_STATE__ = JSON\.parse\('(.+?)'\)/);
                                if (match && match[1]) {
                                    const jsonData = JSON.parse(match[1].replace(/\\/g, ''));
                                    if (jsonData.songPage && jsonData.songPage.lyricsData) {
                                        lyrics = jsonData.songPage.lyricsData.body.plain || '';
                                    }
                                }
                            } catch (e) {
                                console.log('Error extracting lyrics from script:', e.message);
                            }
                        }
                    });
                }
                
                // Clean up the lyrics
                if (lyrics.trim()) {
                    lyrics = lyrics
                        .replace(/\n{3,}/g, '\n\n')
                        .replace(/\[/g, '\n[')
                        .replace(/\]\n/g, ']\n\n')
                        .trim();
                    
                    // Process lyrics to add proper spacing between stanzas
                    return this.formatStanzaSpacing(lyrics);
                }
            } catch (geniusError) {
                console.log(`[Genius] Direct scraping failed: ${geniusError.message}. Trying alternative methods...`);
                // Continue to alternative methods below
            }
            
            // If direct approach fails, immediately try Google as a more reliable source
            console.log("[Genius] Trying Google search fallback for lyrics");
            const songTitle = url.split('/').pop().replace(/-lyrics$/, '').replace(/-/g, ' ');
            return await this.getLyricsFromGoogle(songTitle);
            
        } catch (error) {
            console.error("Error extracting lyrics:", error.message);
            
            // Try Google search as fallback
            try {
                const searchTerms = url
                    .split('/')
                    .pop()
                    .split('?')[0]
                    .replace(/-/g, ' ')
                    .replace(/-lyrics$/, '')
                    .replace(/\.(html|php|asp)/g, '')
                    .trim();
                    
                return await this.getLyricsFromGoogle(searchTerms);
            } catch (googleError) {
                throw new Error(`Failed to extract lyrics: ${error.message}`);
            }
        }
    }
    
    /**
     * Get lyrics directly from Google
     */
    async getLyricsFromGoogle(query) {
        try {
            // Better detection of Indian songs
            const isIndianSong = /hindi|punjabi|bollywood|tamil|telugu|kannada|malayalam|bengali|marathi|bhojpuri|gujarati|urdu|arijit|shreya|sonu|atif|neha|kumar sanu|alka|udit|lata|kishore|rafi|asha|himesh|darshan|badshah|diljit|arjit|jubin|dhvani|tulsi|vishal|shankar|pritam/i.test(query.toLowerCase()) || 
                /tum hi ho|raabta|kaise hua|raatan lambiyan|moh moh ke|chaiyya|kun faya kun|channa mereya|gerua|kesariya|malhari|ae dil hai mushkil|deewani mastani|agar tum saath ho|zaalima|bulleya|hawayein|bekhayali|kalank|shayad|thodi jagah/i.test(query.toLowerCase());
            
            // Enhance the search query for better results with Google
            let enhancedQuery = this.enhanceSearchQuery(query);
            
            // For Indian songs, add specific keywords to improve search results
            if (isIndianSong || /^[^\u0000-\u007F]+/.test(query)) { // If contains non-Latin characters or identified as Indian
                if (!enhancedQuery.toLowerCase().includes('lyrics')) {
                    enhancedQuery += " lyrics";
                }
                
                // For specific common Hindi songs, be more specific
                const lowercaseQuery = query.toLowerCase();
                if (lowercaseQuery === "tum hi ho") {
                    enhancedQuery = "Arijit Singh Tum Hi Ho Aashiqui 2 lyrics";
                } else if (lowercaseQuery === "kaise hua") {
                    enhancedQuery = "Vishal Mishra Kaise Hua Kabir Singh lyrics";
                } else if (lowercaseQuery === "raatan lambiyan") {
                    enhancedQuery = "Jubin Nautiyal Raatan Lambiyan Shershaah lyrics";
                } else {
                    enhancedQuery += " bollywood song";
                }
            } else if (!enhancedQuery.toLowerCase().includes('lyrics')) {
                enhancedQuery += " lyrics";
            }
            
            console.log(`[Genius] Trying to find lyrics for "${enhancedQuery}" via alternative sources`);
            
            // Try multiple sources in sequence
            let lyrics = '';
            
            // Try with LyricsBGM first (good for Indian songs)
            if (isIndianSong) {
                try {
                    lyrics = await this.getLyricsFromLyricsBGM(query);
                    if (lyrics) {
                        console.log("[Genius] Successfully found lyrics on LyricsBGM");
                        return lyrics;
                    }
                } catch (lyricsbgmError) {
                    console.log(`[Genius] LyricsBGM failed: ${lyricsbgmError.message}`);
                }
            }
            
            // Try Google directly
            try {
                const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(enhancedQuery)}`;
                
                // Create new axios instance with specific headers for this request
                const response = await axios.get(googleUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Referer': 'https://www.google.com/',
                        'Cache-Control': 'max-age=0'
                    },
                    timeout: 15000,
                    maxRedirects: 5
                });
                
                const $ = cheerio.load(response.data);
                
                // Try Google's native lyrics display
                const lyricSelectors = [
                    '.ujudUb', // Common Google lyrics selector
                    '[data-lyricid]', // Another lyrics container
                    '.kp-wholepage .TzHB6b.cLjAic.LMRCfc', // Knowledge panel lyrics
                    '.hwc', // Generic content container
                ];
                
                for (const selector of lyricSelectors) {
                    const elements = $(selector);
                    if (elements.length > 0) {
                        elements.each((i, elem) => {
                            const text = $(elem).text().trim();
                            if (text.length > 100) { // Likely lyrics if text is long enough
                                lyrics += text + '\n';
                            }
                        });
                        
                        if (lyrics) {
                            console.log("[Genius] Successfully found lyrics via Google");
                            return this.formatStanzaSpacing(lyrics);
                        }
                    }
                }
                
                // If Google's native display didn't work, check for links to common lyrics sites
                const lyricsPageLinks = [];
                $('a').each((i, elem) => {
                    const href = $(elem).attr('href') || '';
                    const text = $(elem).text().toLowerCase();
                    
                    if ((href.includes('lyric') || 
                         href.includes('azlyrics.com') || 
                         href.includes('musixmatch') ||
                         href.includes('lyrics.com') ||
                         href.includes('lyricsbogie') ||
                         href.includes('lyricsbgm') ||
                         href.includes('lyricsted') ||
                         href.includes('lyricsbell')) && 
                        !href.includes('google')) {
                        
                        // Extract full URL from Google's redirect URLs
                        let fullUrl = href;
                        if (href.startsWith('/url?')) {
                            const urlParams = new URLSearchParams(href.split('?')[1]);
                            fullUrl = urlParams.get('q') || href;
                        }
                        
                        // Don't include YouTube or social media
                        if (!fullUrl.includes('youtube') && 
                            !fullUrl.includes('facebook') && 
                            !fullUrl.includes('twitter') && 
                            !fullUrl.includes('instagram')) {
                            lyricsPageLinks.push(fullUrl);
                        }
                    }
                });
                
                // Try to fetch lyrics from the first 2 lyrics sites found
                for (let i = 0; i < Math.min(2, lyricsPageLinks.length); i++) {
                    try {
                        let pageUrl = lyricsPageLinks[i];
                        // Fix relative URLs
                        if (pageUrl.startsWith('/')) {
                            if (pageUrl.startsWith('/url?')) {
                                const urlParams = new URLSearchParams(pageUrl.split('?')[1]);
                                pageUrl = urlParams.get('q') || pageUrl;
                            } else {
                                pageUrl = 'https://www.google.com' + pageUrl;
                            }
                        }
                        
                        console.log(`[Genius] Trying lyrics page: ${pageUrl}`);
                        
                        const lyricsResponse = await axios.get(pageUrl, {
                            headers: BROWSER_HEADERS,
                            timeout: 10000
                        });
                        
                        const lyricsPage = cheerio.load(lyricsResponse.data);
                        
                        // Common selectors for lyrics on various sites
                        const contentSelectors = [
                            '.lyricbox', // LyricWiki
                            '.songLyricsV14', // AZLyrics
                            '.lyrics', // Genius
                            '.mxm-lyrics', // Musixmatch
                            '.entry-content', // WordPress blogs
                            '.main-page', // LyricsBGM
                            '.main-content', // Generic
                            '.content-text', // Generic
                            '[class*="lyric"]', // Any class containing "lyric"
                            '[class*="Lyric"]', // Any class containing "Lyric"
                            '.entry', // Blog posts
                            'article', // Generic articles
                            '.main' // Main content
                        ];
                        
                        for (const selector of contentSelectors) {
                            const lyricsContent = lyricsPage(selector).first();
                            if (lyricsContent.length) {
                                const text = lyricsContent.text().trim();
                                if (text.length > 200 && 
                                    (text.includes('\n\n') || 
                                     text.split('\n').length > 5)) {
                                    console.log(`[Genius] Found lyrics on ${pageUrl} using selector ${selector}`);
                                    return this.formatStanzaSpacing(text);
                                }
                            }
                        }
                        
                        // Last resort: look for any div with substantial text content that looks like lyrics
                        lyricsPage('div').each((i, elem) => {
                            const text = lyricsPage(elem).text().trim();
                            if (text.length > 300 && 
                                text.split('\n').length > 10 &&
                                !text.includes('cookie') &&
                                !text.includes('Copyright') &&
                                !text.toLowerCase().includes('javascript')) {
                                console.log(`[Genius] Found potential lyrics content on ${pageUrl}`);
                                lyrics = text;
                                return false; // Break the loop
                            }
                        });
                        
                        if (lyrics) {
                            return this.formatStanzaSpacing(lyrics);
                        }
                    } catch (pageError) {
                        console.log(`[Genius] Error fetching lyrics page: ${pageError.message}`);
                    }
                }
            } catch (googleError) {
                console.log(`[Genius] Google search failed: ${googleError.message}`);
            }
            
            // Try with DuckDuckGo if Google failed
            try {
                console.log(`[Genius] Trying DuckDuckGo search for lyrics`);
                const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(enhancedQuery)}`;
                const response = await axios.get(ddgUrl, {
                    headers: {
                        ...BROWSER_HEADERS,
                        'Referer': 'https://duckduckgo.com/'
                    },
                    timeout: 15000
                });
                
                const $ = cheerio.load(response.data);
                
                // Extract links to lyrics sites from DDG results
                const lyricsLinks = [];
                $('.result__a').each((i, elem) => {
                    const href = $(elem).attr('href') || '';
                    const text = $(elem).text().toLowerCase();
                    
                    if ((text.includes('lyric') || 
                         href.includes('lyric') ||
                         href.includes('musixmatch') ||
                         href.includes('lyricsbell') ||
                         href.includes('lyricsbogie'))) {
                        
                        // Extract URL from DDG's redirect
                        if (href.includes('/d.js?')) {
                            const urlMatch = href.match(/uddg=([^&]+)/);
                            if (urlMatch && urlMatch[1]) {
                                try {
                                    const decodedUrl = decodeURIComponent(urlMatch[1]);
                                    lyricsLinks.push(decodedUrl);
                                } catch (e) {
                                    lyricsLinks.push(href);
                                }
                            } else {
                                lyricsLinks.push(href);
                            }
                        } else {
                            lyricsLinks.push(href);
                        }
                    }
                });
                
                // Try each lyrics link
                for (let i = 0; i < Math.min(2, lyricsLinks.length); i++) {
                    try {
                        const lyricsUrl = lyricsLinks[i];
                        console.log(`[Genius] Trying lyrics link from DDG: ${lyricsUrl}`);
                        
                        const lyricsResponse = await axios.get(lyricsUrl, {
                            headers: BROWSER_HEADERS, 
                            timeout: 10000
                        });
                        
                        const lyricsPage = cheerio.load(lyricsResponse.data);
                        let extractedLyrics = '';
                        
                        // Try common lyrics containers
                        const contentSelectors = [
                            '.lyricbox', '.songLyricsV14', '.lyrics',
                            '.mxm-lyrics', '.entry-content', '[class*="lyric"]',
                            'article', '.main', '.content', '.entry'
                        ];
                        
                        for (const selector of contentSelectors) {
                            const content = lyricsPage(selector).first();
                            if (content.length) {
                                extractedLyrics = content.text().trim();
                                if (extractedLyrics.length > 200) {
                                    console.log(`[Genius] Found lyrics via DDG link using selector ${selector}`);
                                    return this.formatStanzaSpacing(extractedLyrics);
                                }
                            }
                        }
                    } catch (linkError) {
                        console.log(`[Genius] Error with DDG lyrics link: ${linkError.message}`);
                    }
                }
            } catch (ddgError) {
                console.log(`[Genius] DuckDuckGo search failed: ${ddgError.message}`);
            }
            
            // Special handling for specific languages/regions if all else failed
            if (isIndianSong) {
                try {
                    console.log(`[Genius] Trying specialized search for Indian song`);
                    return await this.getIndianSongLyrics(query);
                } catch (specialError) {
                    console.log(`[Genius] Specialized Indian lyrics search failed: ${specialError.message}`);
                }
            }
            
            // If we got here, we couldn't find lyrics
            return `Couldn't find lyrics for "${query}".\n\nTry searching with a more specific query like "Artist Name - Song Title".\n\nExample: "Arijit Singh - Tum Hi Ho" instead of just "Tum Hi Ho".`;
        } catch (error) {
            console.error(`[Genius] All lyrics search methods failed for "${query}": ${error.message}`);
            return `Lyrics not available. Try searching online for "${query} lyrics"`;
        }
    }
    
    /**
     * Get lyrics from LyricsBGM
     */
    async getLyricsFromLyricsBGM(query) {
        try {
            // Format search query for LyricsBGM
            const searchQuery = query.replace(/\s+/g, '+');
            const searchUrl = `https://www.lyricsbgm.com/?s=${encodeURIComponent(searchQuery)}`;
            
            const response = await axios.get(searchUrl, {
                headers: {
                    ...BROWSER_HEADERS,
                    'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8'
                },
                timeout: 15000
            });
            
            const $ = cheerio.load(response.data);
            
            // Get the first search result
            const firstResult = $('.post-title a').first();
            
            if (firstResult.length === 0) {
                throw new Error('No results found on LyricsBGM');
            }
            
            const lyricsPageUrl = firstResult.attr('href');
            if (!lyricsPageUrl) {
                throw new Error('No lyrics link found');
            }
            
            // Visit the lyrics page
            const lyricsResponse = await axios.get(lyricsPageUrl, {
                headers: {
                    ...BROWSER_HEADERS,
                    'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8'
                },
                timeout: 15000
            });
            
            const lyricsPage = cheerio.load(lyricsResponse.data);
            
            // Extract lyrics from the page
            let lyrics = '';
            
            // Try multiple possible containers
            const containers = [
                '.entry-content',
                '.post-content',
                '.entry',
                'article'
            ];
            
            for (const container of containers) {
                const content = lyricsPage(container).first();
                if (content.length) {
                    // Remove ads, headers, and other unnecessary elements
                    content.find('script, style, .adsbygoogle, .ads, ins, iframe, .sharedaddy').remove();
                    
                    // Get the text content
                    let text = content.text().trim();
                    
                    // Clean up the text
                    text = text
                        .replace(/(Click to share)(.*)/s, '') // Remove sharing text
                        .replace(/(Please share)(.*)/s, '')    // Remove sharing requests
                        .replace(/(Join us on)(.*)/s, '')      // Remove social media requests
                        .replace(/(Follow us)(.*)/s, '')       // Remove follow requests
                        .replace(/Source:(.*)/s, '')           // Remove source info
                        .replace(/\n{3,}/g, '\n\n')            // Normalize line breaks
                        .trim();
                        
                    if (text.length > 200) {
                        lyrics = text;
                        break;
                    }
                }
            }
            
            return lyrics ? this.formatStanzaSpacing(lyrics) : '';
            
        } catch (error) {
            console.error(`Error with LyricsBGM: ${error.message}`);
            return '';
        }
    }
    
    /**
     * Special method for Indian songs that combines multiple sources
     */
    async getIndianSongLyrics(query) {
        try {
            // Try multiple Indian lyrics sites
            const sites = [
                { name: "LyricsBGM", url: `https://www.lyricsbgm.com/?s=${encodeURIComponent(query)}` },
                { name: "HindiLyrics", url: `https://www.hindilyrics.net/search.php?search=${encodeURIComponent(query)}` },
                { name: "LyricsBogie", url: `https://www.lyricsbogie.com/search?q=${encodeURIComponent(query)}` },
                { name: "LyricsBell", url: `https://www.lyricsbell.com/?s=${encodeURIComponent(query)}` }
            ];
            
            for (const site of sites) {
                try {
                    console.log(`[Genius] Trying ${site.name} for Indian song lyrics`);
                    const response = await axios.get(site.url, {
                        headers: {
                            ...BROWSER_HEADERS,
                            'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8'
                        },
                        timeout: 15000
                    });
                    
                    const $ = cheerio.load(response.data);
                    
                    // Find the first result link 
                    let firstResultLink = '';
                    
                    if (site.name === "LyricsBGM") {
                        firstResultLink = $('.post-title a').first().attr('href');
                    } else if (site.name === "HindiLyrics") {
                        firstResultLink = $('.search_results a').first().attr('href');
                    } else if (site.name === "LyricsBogie") {
                        firstResultLink = $('.entry-title a').first().attr('href');
                    } else if (site.name === "LyricsBell") {
                        firstResultLink = $('.entry-title a').first().attr('href');
                    }
                    
                    if (firstResultLink) {
                        // Visit the lyrics page
                        const lyricsResponse = await axios.get(firstResultLink, {
                            headers: BROWSER_HEADERS,
                            timeout: 15000
                        });
                        
                        const lyricsPage = cheerio.load(lyricsResponse.data);
                        
                        // Common content containers
                        const contentSelectors = [
                            '.entry-content',
                            '.post-content',
                            '.lyrics',
                            '.lyric-content',
                            '.entry',
                            'article',
                            '.main-content'
                        ];
                        
                        for (const selector of contentSelectors) {
                            const content = lyricsPage(selector).first();
                            if (content.length) {
                                // Remove ads and other elements
                                content.find('script, style, .adsbygoogle, .ads, ins, iframe').remove();
                                
                                const text = content.text().trim();
                                if (text.length > 200) {
                                    console.log(`[Genius] Successfully found lyrics on ${site.name}`);
                                    return this.formatStanzaSpacing(text);
                                }
                            }
                        }
                    }
                } catch (siteError) {
                    console.log(`[Genius] Error with ${site.name}: ${siteError.message}`);
                }
            }
            
            throw new Error('No lyrics found on any Indian lyrics sites');
        } catch (error) {
            console.error(`[Genius] Indian lyrics search failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Complete function to search for a song and get its lyrics
     * @param {string} query - Search query
     * @returns {Promise<Object>} - Song data with lyrics
     */
    async getSongLyrics(query) {
        try {
            // If not in cache, proceed with the normal search
            const songs = await this.searchSong(query, 1);
            if (!songs || songs.length === 0) {
                throw new Error(`No songs found matching "${query}"`);
            }
            
            // Get the first result
            const song = songs[0];
            
            // Get the lyrics
            const lyrics = await this.getLyrics(song.url);
            
            // Return all the song data along with lyrics
            return {
                ...song,
                lyrics
            };
        } catch (error) {
            console.error("Error in getSongLyrics:", error.message);
            
            // Create a minimal result to avoid completely failing
            return {
                title: query,
                primary_artist: { name: "Unknown Artist" },
                url: `https://www.google.com/search?q=${encodeURIComponent(query + " lyrics")}`,
                lyrics: `Couldn't find lyrics for "${query}".\n\nPlease try another search or check the song name.`
            };
        }
    }

    /**
     * Test connectivity to the Genius API
     * @returns {Promise<string>} - Result of the test
     */
    async testApiConnection() {
        try {
            console.log(`[Genius] Testing API connection with token: ${this.apiToken.substring(0, 5)}...${this.apiToken.substring(this.apiToken.length - 5)}`);
            
            const response = await axios.get(
                `${this.baseUrl}/search?q=test`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`
                    }
                }
            );
            
            if (response.status === 200 && response.data && response.data.meta) {
                const hitCount = response.data.response.hits ? response.data.response.hits.length : 0;
                return `Connection successful!\n• Status: ${response.status}\n• API Status: ${response.data.meta.status}\n• Message: ${response.data.meta.message || 'OK'}\n• Results found: ${hitCount}\n• Token valid: Yes`;
            } else {
                return `Connection received but with unexpected response:\n• Status: ${response.status}\n• Check console for details`;
            }
        } catch (error) {
            console.error(`[Genius] API Test Error: ${error.message}`);
            
            let errorDetails = '';
            if (error.response) {
                const status = error.response.status;
                const data = error.response.data || {};
                
                errorDetails = `• Status: ${status}\n`;
                
                if (status === 401) {
                    errorDetails += '• Problem: Authentication failed - Invalid API token\n• Solution: Get a new API token from https://genius.com/api-clients';
                } else if (status === 403) {
                    errorDetails += '• Problem: Permission denied\n• Solution: Check API token permissions';
                } else if (status === 404) {
                    errorDetails += '• Problem: API endpoint not found\n• Solution: Check baseUrl value';
                } else if (status === 429) {
                    errorDetails += '• Problem: Rate limit exceeded\n• Solution: Wait before making more requests';
                } else {
                    errorDetails += `• Response data: ${JSON.stringify(data)}\n`;
                }
            } else if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
                errorDetails = '• Problem: Network connection issue\n• Solution: Check your internet connection';
            } else {
                errorDetails = `• Error type: ${error.name}\n• Message: ${error.message}`;
            }
            
            throw new Error(`API test failed!\n${errorDetails}`);
        }
    }

    /**
     * Format song lyrics with enhanced styling for WhatsApp
     * Improved to ensure proper stanza separation
     */
    formatLyrics(songData, originalQuery) {
        const albumInfo = songData.album ? `\n💿 Album: *${songData.album.name}*` : '';
        const releaseDate = songData.release_date ? `\n📅 Released: *${songData.release_date}*` : '';
        
        // Clean up the lyrics with extra processing for stanzas
        let cleanedLyrics = songData.lyrics;
        
        // Additional processing for better stanza display
        cleanedLyrics = cleanedLyrics
            // Ensure section headers stand out
            .replace(/\[([^\]]+)\]/g, '*[$1]*')
            // Add bullet points to each line for better visual separation
            // Commented out as it might make lyrics look too cluttered
            // .replace(/^(?!\*\[)(.+)$/gm, '• $1')
            // Make sure stanzas have proper spacing
            .split('\n\n').join('\n\n');
        
        // Format the final output
        const formattedLyrics = `*🎵 ${songData.title}*\n*👤 ${songData.primary_artist.name}*${albumInfo}${releaseDate}\n\n───────────────\n\n${cleanedLyrics}\n\n───────────────\n\n📜 Source: Lyrics Finder`;
        
        return formattedLyrics;
    }
}

module.exports = GeniusClient;