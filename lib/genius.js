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
            
            return response.data.response.hits.map(hit => hit.result);
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
            
            // Try direct Genius API approach
            const response = await this.axiosInstance.get(url, {
                headers: BROWSER_HEADERS
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
            
            // If all else fails, try Google search
            return await this.getLyricsFromGoogle(url.split('/').pop().replace(/-/g, ' '));
            
        } catch (error) {
            console.error("Error extracting lyrics:", error.message);
            
            // Try Google search as fallback
            try {
                const searchTerms = url
                    .split('/')
                    .pop()
                    .split('?')[0]
                    .replace(/-/g, ' ')
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
            // Enhance the search query for better results with Google
            const enhancedQuery = this.enhanceSearchQuery(query);
            
            // Add "lyrics" to ensure we get song lyrics results
            let searchQuery = enhancedQuery;
            if (!searchQuery.toLowerCase().includes('lyrics')) {
                searchQuery += " lyrics";
            }
            
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
            const response = await this.axiosInstance.get(searchUrl);
            const $ = cheerio.load(response.data);
            
            let lyrics = '';
            
            // Try multiple selectors that Google might use for lyrics
            const selectors = [
                '.ujudUb', // Common lyrics selector
                '[data-lyricid]', // Another possible lyrics container
                '.hwc', // Generic content container that might have lyrics
                '.kp-wholepage .TzHB6b.cLjAic', // Knowledge panel content
                '.xpdopen', // Generic knowledge panel
                '.Oh5wg' // Another lyrics container
            ];
            
            for (const selector of selectors) {
                const elements = $(selector);
                if (elements.length > 0) {
                    elements.each((i, elem) => {
                        const text = $(elem).text().trim();
                        if (text.length > 100) { // Likely lyrics if text is long enough
                            lyrics += text + '\n';
                        }
                    });
                    
                    if (lyrics) break;
                }
            }
            
            if (lyrics) {
                return this.formatStanzaSpacing(lyrics);
            }
            
            // For one-word titles, if still no lyrics, try all associated artists
            const simplifiedQuery = query.toLowerCase().trim();
            if (!simplifiedQuery.includes(' ') && POPULAR_ONE_WORD_SONGS[simplifiedQuery] && !lyrics) {
                for (const artist of POPULAR_ONE_WORD_SONGS[simplifiedQuery]) {
                    const artistQuery = `${artist} ${simplifiedQuery} lyrics`;
                    const artistSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(artistQuery)}`;
                    try {
                        const artistResponse = await this.axiosInstance.get(artistSearchUrl);
                        const $artist = cheerio.load(artistResponse.data);
                        
                        for (const selector of selectors) {
                            const elements = $artist(selector);
                            if (elements.length > 0) {
                                elements.each((i, elem) => {
                                    const text = $artist(elem).text().trim();
                                    if (text.length > 100) {
                                        lyrics += text + '\n';
                                    }
                                });
                                
                                if (lyrics) {
                                    return this.formatStanzaSpacing(lyrics);
                                }
                            }
                        }
                    } catch (error) {
                        console.log(`Error fetching lyrics for ${artist}:`, error.message);
                    }
                }
            }
            
            // If still no lyrics, create a better "not found" message
            if (simplifiedQuery && !simplifiedQuery.includes(' ') && POPULAR_ONE_WORD_SONGS[simplifiedQuery]) {
                const suggestions = POPULAR_ONE_WORD_SONGS[simplifiedQuery]
                    .map(artist => `• ${simplifiedQuery} by ${artist}`)
                    .join('\n');
                    
                return `Couldn't find exact lyrics for "${query}".\n\nDid you mean one of these songs?\n${suggestions}\n\nTry again with a more specific search.`;
            }
            
            return `Lyrics for "${query}" could not be found automatically.\n\nTry searching manually: ${searchUrl}`;
            
        } catch (error) {
            console.error("Error extracting lyrics from Google:", error.message);
            return `Lyrics not available. Try searching online for "${query} lyrics"`;
        }
    }

    /**
     * Complete function to search for a song and get its lyrics
     * @param {string} query - Search query
     * @returns {Promise<Object>} - Song data with lyrics
     */
    async getSongLyrics(query) {
        try {
            // Search for the song
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