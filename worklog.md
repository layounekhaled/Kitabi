---
Task ID: 1
Agent: Main Agent
Task: Fix book management issues in Kitabi admin panel

Work Log:
- Explored full project structure and identified all bugs in book management
- Fixed GET /api/books status filter: added support for isPublished and isDraft query params
- Fixed admin-import.tsx: changed useState to useEffect for category loading
- Fixed admin-import.tsx: corrected bulk import results parsing (API returns {imported, duplicates, notFound, errors} not {results})
- Added i18n keys (bulkImport, isbnListLabel, importAll) in FR/AR/EN
- Replaced hardcoded English strings in admin-import with translation keys
- Cleaned up test data from database
- Verified build succeeds
- Tested all CRUD operations (create, read, update, delete) via API
- Tested status filtering (published/draft/all) works correctly
- Tested search functionality works correctly

Stage Summary:
- Book management API now properly filters by isPublished/isDraft status
- Bulk ISBN import results table now displays correctly
- Categories dropdown in import page loads properly
- All text is now translatable (FR/AR/EN)
