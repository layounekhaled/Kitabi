---
Task ID: 1
Agent: main
Task: Add new ISBN lookup sources and improve genre/category extraction

Work Log:
- Read and analyzed the full isbn-lookup.ts file (2400+ lines, 11 existing sources + web search)
- Added Source 11: WorldCat Classify API (OCLC) - world's largest library catalog, free, no auth
- Added Source 12: DNB SRU API (Deutsche Nationalbibliothek) - excellent international coverage, MARC21 XML parsing
- Added Source 13: SUDOC (Système Universitaire de Documentation) - French university library catalog with UNIMARC XML parsing
- Added Source 14: Inventaire.io - open-source book database, good for French books, Wikidata-style entities
- Improved BNF source: now extracts dc:subject fields as categories (was returning empty [])
- Improved Wikidata source: added genre (P136) to SPARQL queries, now returns genreLabel as categories
- Improved Web Search AI prompt: now requests categories/genre field in extraction
- Updated lookupISBN() Phase 2 to include all 4 new sources (worldcat, sudoc, dnb, inventaire)
- Updated resultScore() to include new source bonuses
- Updated file header comments to reflect 15 total sources

Stage Summary:
- Total sources: 15 (from 11 + web search)
- New API sources: WorldCat, DNB, SUDOC, Inventaire
- Genre/category extraction improved across BNF, Wikidata, and Web Search
- TypeScript compilation passes with no new errors
- Next.js build succeeds
