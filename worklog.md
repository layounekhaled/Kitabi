---
Task ID: 2
Agent: Main Agent
Task: Fix lag/infinite re-render issue in admin book management and categories

Work Log:
- Identified ROOT CAUSE: useTranslation() hook created a new `t` object on every render
- This caused infinite re-render loop: render → new t → new useCallback → useEffect triggers → fetch → setState → re-render → ...
- Fixed useTranslation() by adding useMemo to memoize the translate function based on language
- Also used useLanguageStore selector (s) => s.language to avoid unnecessary re-renders from store
- Removed `t` from useCallback dependency arrays in admin-books.tsx and admin-categories.tsx
- Added debounce (300ms) on search input in admin-books to prevent API spam on every keystroke
- Added proper error handling (check res.ok) in fetch callbacks
- Verified build succeeds and APIs work correctly

Stage Summary:
- CRITICAL FIX: Infinite re-render loop eliminated by memoizing useTranslation()
- Search is now debounced (300ms) to prevent excessive API calls
- Categories page no longer has infinite re-render issue
- Book management page loads smoothly without lag
